import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import Goal from "../models/Goal.js";
import Groq from "groq-sdk";
import { AI_MODEL } from "../config/aiConfig.js";

let groqClient = null;

const getGroqClient = () => {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not set in .env");
    }
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
};

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const getMonthRange = (monthStr) => {
  const [year, month] = monthStr.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  return { start, end };
};

/**
 * 1. Savings Rate Score (0-30)
 */
const calcSavingsScore = (income, expense) => {
  if (income <= 0) return { score: 0, value: 0, label: "No income data" };

  const savingsRate = ((income - expense) / income) * 100;

  let score = 0;
  if (savingsRate >= 30) score = 30;
  else if (savingsRate >= 20) score = 25;
  else if (savingsRate >= 10) score = 18;
  else if (savingsRate >= 0) score = 10;
  else score = 0;

  return {
    score,
    value: Math.round(savingsRate),
    label: `${Math.round(savingsRate)}% of income saved`,
  };
};

/**
 * 2. Budget Adherence Score (0-25)
 */
const calcBudgetScore = async (userId) => {
  const month = getCurrentMonth();
  const { start, end } = getMonthRange(month);

  const budgets = await Budget.find({ user: userId, month }).lean();
  if (budgets.length === 0) {
    return { score: 10, value: 0, label: "No budgets set" };
  }

  const spending = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        type: "expense",
        date: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: "$category",
        spent: { $sum: "$amount" },
      },
    },
  ]);

  const spendingMap = {};
  spending.forEach((s) => {
    spendingMap[s._id] = s.spent;
  });

  let onTrack = 0;
  let warning = 0;
  let exceeded = 0;

  budgets.forEach((b) => {
    const spent = spendingMap[b.category] || 0;
    const pct = (spent / b.limit) * 100;
    if (pct >= 100) exceeded++;
    else if (pct >= 80) warning++;
    else onTrack++;
  });

  const total = budgets.length;
  const score = Math.round(
    ((onTrack * 1 + warning * 0.5 + exceeded * 0) / total) * 25,
  );

  return {
    score,
    value: total,
    label: `${onTrack}/${total} budgets on track`,
    breakdown: { onTrack, warning, exceeded, total },
  };
};

/**
 * 3. Spending Consistency Score (0-20)
 * Monthly expense ka standard deviation check karo
 */
const calcConsistencyScore = async (userId) => {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const data = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        type: "expense",
        date: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" },
        },
        total: { $sum: "$amount" },
      },
    },
  ]);

  const totals = data.map((d) => d.total).filter((t) => t > 0);

  if (totals.length < 2) {
    return { score: 8, value: 0, label: "Not enough data" };
  }

  const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
  const variance =
    totals.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / totals.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean; // coefficient of variation

  // CV kam = zyada consistent
  let score = 0;
  if (cv <= 0.15) score = 20;
  else if (cv <= 0.3) score = 15;
  else if (cv <= 0.5) score = 10;
  else score = 5;

  return {
    score,
    value: Math.round(cv * 100),
    label:
      cv <= 0.3
        ? "Very consistent spending"
        : cv <= 0.5
          ? "Moderate variation"
          : "High fluctuation",
  };
};

/**
 * 4. Goal Progress Score (0-15)
 */
const calcGoalScore = async (userId) => {
  const goals = await Goal.find({ user: userId }).lean();
  if (goals.length === 0) {
    return { score: 5, value: 0, label: "No goals set" };
  }

  const totalProgress =
    goals.reduce((sum, g) => {
      const pct = Math.min((g.savedAmount / g.targetAmount) * 100, 100);
      return sum + pct;
    }, 0) / goals.length;

  let score = 0;
  if (totalProgress >= 80) score = 15;
  else if (totalProgress >= 50) score = 12;
  else if (totalProgress >= 25) score = 8;
  else score = 4;

  return {
    score,
    value: Math.round(totalProgress),
    label: `${Math.round(totalProgress)}% avg goal progress`,
  };
};

/**
 * 5. Expense-to-Income Ratio Score (0-10)
 */
const calcExpenseRatioScore = (income, expense) => {
  if (income <= 0) return { score: 0, value: 0, label: "No income data" };

  const ratio = (expense / income) * 100;

  let score = 0;
  if (ratio <= 50) score = 10;
  else if (ratio <= 70) score = 8;
  else if (ratio <= 90) score = 5;
  else if (ratio <= 100) score = 2;
  else score = 0;

  return {
    score,
    value: Math.round(ratio),
    label: `Expenses are ${Math.round(ratio)}% of income`,
  };
};

/**
 * Main function
 */
export const generateHealthScore = async (userId) => {
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get 30-day totals
  const totals = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        date: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);

  let income = 0;
  let expense = 0;
  totals.forEach((t) => {
    if (t._id === "income") income = t.total;
    if (t._id === "expense") expense = t.total;
  });

  // Calculate each factor
  const savings = calcSavingsScore(income, expense);
  const budget = await calcBudgetScore(userId);
  const consistency = await calcConsistencyScore(userId);
  const goal = await calcGoalScore(userId);
  const expenseRatio = calcExpenseRatioScore(income, expense);

  // Total score
  const totalScore =
    savings.score +
    budget.score +
    consistency.score +
    goal.score +
    expenseRatio.score;

  // Grade
  let grade, gradeColor;
  if (totalScore >= 80) {
    grade = "Excellent";
    gradeColor = "green";
  } else if (totalScore >= 60) {
    grade = "Good";
    gradeColor = "blue";
  } else if (totalScore >= 40) {
    grade = "Fair";
    gradeColor = "amber";
  } else {
    grade = "Needs Improvement";
    gradeColor = "red";
  }

  const breakdown = {
    savings: {
      score: savings.score,
      max: 30,
      value: savings.value,
      label: savings.label,
    },
    budget: {
      score: budget.score,
      max: 25,
      value: budget.value,
      label: budget.label,
    },
    consistency: {
      score: consistency.score,
      max: 20,
      value: consistency.value,
      label: consistency.label,
    },
    goal: {
      score: goal.score,
      max: 15,
      value: goal.value,
      label: goal.label,
    },
    expenseRatio: {
      score: expenseRatio.score,
      max: 10,
      value: expenseRatio.value,
      label: expenseRatio.label,
    },
  };

  // AI summary
  let aiSummary = "";
  let topRecommendations = [];

  try {
    const groq = getGroqClient();

    const prompt = `Analyze this user's financial health data and give a short summary + top 3 recommendations.

Overall Health Score: ${totalScore}/100 (${grade})

Breakdown:
- Savings Rate: ${savings.score}/30 — ${savings.label}
- Budget Adherence: ${budget.score}/25 — ${budget.label}
- Spending Consistency: ${consistency.score}/20 — ${consistency.label}
- Goal Progress: ${goal.score}/15 — ${goal.label}
- Expense Ratio: ${expenseRatio.score}/10 — ${expenseRatio.label}

Return ONLY a JSON object:
{
  "summary": "2-3 sentence summary in Hinglish about the user's financial health. Mention the score, grade, and 1-2 key strengths/weaknesses.",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}

Rules:
- Summary friendly and specific, mention actual numbers
- Recommendations actionable, max 12 words each, focus on lowest-scoring areas
- Reply ONLY with valid JSON`;


    let completion;
    let lastError;

    // 3 baar retry karo json_validate_failed pe
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        completion = await groq.chat.completions.create({
          model: AI_MODEL,
          messages: [
            {
              role: "system",
              content:
                "You are a financial advisor. Reply only with valid JSON.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.5,
          max_tokens: 1000,
          response_format: { type: "json_object" },
        });
        break; // Success
      } catch (err) {
        lastError = err;
        if (err.message?.includes("json_validate_failed") && attempt < 3) {
          console.log(`⏳ Health score retry ${attempt}/3...`);
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        throw err;
      }
    }

    const parsed = JSON.parse(completion.choices[0].message.content);
    aiSummary = parsed.summary || "";
    topRecommendations = Array.isArray(parsed.recommendations)
      ? parsed.recommendations.slice(0, 3)
      : [];
  } catch (err) {
    console.error("Health score AI error:", err.message);
    aiSummary = `Aapka financial health score ${totalScore}/100 hai (${grade}). ${
      totalScore >= 60
        ? "Overall achi position hai, thodi aur improvement kar sakte ho."
        : "Kuch areas me improvement ki zaroorat hai."
    }`;
    topRecommendations = [
      "Savings rate badhane ki koshish karo",
      "Budgets regularly review karo",
      "Goals set karke save karo",
    ];
  }

  return {
    score: totalScore,
    grade,
    gradeColor,
    breakdown,
    aiSummary,
    recommendations: topRecommendations,
    hasData: income > 0 || expense > 0,
  };
};
