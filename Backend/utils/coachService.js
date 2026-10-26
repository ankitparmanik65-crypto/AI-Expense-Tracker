import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import Goal from "../models/Goal.js";
import CoachPlan from "../models/CoachPlan.js";
import Groq from "groq-sdk";
import { AI_MODEL } from "../config/aiConfig.js";
import { groqWithRetry } from "./groqHelper.js";

let groqClient = null;

const getGroqClient = () => {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY not set");
    }
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
};

// Helper: string me se number nikaalo ("₹4,000" → 4000)
const extractNumber = (val) => {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[^0-9.-]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

// Get Monday of current week
const getWeekStart = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

// Get Sunday (week end)
const getWeekEnd = (weekStart) => {
  const sunday = new Date(weekStart);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
};

// Gather user's financial data for AI (90 days window)
const gatherUserData = async (userId) => {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // 90-day summary
  const summary = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        date: { $gte: ninetyDaysAgo },
      },
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  summary.forEach((s) => {
    if (s._id === "income") {
      totalIncome = s.total;
      incomeCount = s.count;
    }
    if (s._id === "expense") {
      totalExpense = s.total;
      expenseCount = s.count;
    }
  });

  // Top expense categories (90 days)
  const topCategories = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        type: "expense",
        date: { $gte: ninetyDaysAgo },
      },
    },
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 5 },
  ]);

  // Budgets (current month)
  const currentMonth = `${new Date().getFullYear()}-${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`;

  const budgets = await Budget.find({
    user: userId,
    month: currentMonth,
  });

  const budgetStatus = [];
  for (const b of budgets) {
    const spent = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: "expense",
          category: b.category,
          date: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            $lte: new Date(),
          },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    budgetStatus.push({
      category: b.category,
      limit: b.limit,
      spent: spent[0]?.total || 0,
      percentage: Math.round(((spent[0]?.total || 0) / b.limit) * 100),
    });
  }

  // Goals
  const goals = await Goal.find({ user: userId, completed: false }).limit(3);

  return {
    window: "90 days",
    summary: {
      totalIncome,
      totalExpense,
      savings: totalIncome - totalExpense,
      savingsRate:
        totalIncome > 0
          ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100)
          : 0,
      incomeCount,
      expenseCount,
    },
    topCategories: topCategories.map((c) => ({
      category: c._id,
      total: c.total,
      count: c.count,
    })),
    budgetStatus,
    goals: goals.map((g) => ({
      name: g.name,
      target: g.targetAmount,
      saved: g.savedAmount,
      progress: Math.round((g.savedAmount / g.targetAmount) * 100),
    })),
  };
};

// Main: Generate weekly plan
export const generateWeeklyPlan = async (userId, forceRegenerate = false) => {
  const userData = await gatherUserData(userId);

  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd(weekStart);

  // Existing check (unless force regenerate)
  if (!forceRegenerate) {
    const existing = await CoachPlan.findOne({
      user: userId,
      weekStart,
    });

    if (existing) {
      return existing;
    }
  } else {
    await CoachPlan.deleteOne({ user: userId, weekStart });
  }

  // Agar data hi nahi hai
  if (
    userData.summary.totalIncome === 0 &&
    userData.summary.totalExpense === 0
  ) {
    const emptyPlan = await CoachPlan.create({
      user: userId,
      weekStart,
      weekEnd,
      greeting: "Hi there! 👋",
      summary:
        "Abhi tak koi transaction record nahi hua. Pehle kuch transactions add karo, phir main tumhare liye weekly plan banaunga.",
      focusAreas: [],
      dailyMissions: [],
      challenges: [],
      motivationalMessage:
        "Har bada safar chhote kadam se shuru hota hai. Aaj se start karo!",
      basedOnData: {
        totalIncome: 0,
        totalExpense: 0,
        topCategories: [],
        savingsRate: 0,
      },
    });
    return emptyPlan;
  }

  try {
    const groq = getGroqClient();

    const prompt = `You are an Indian personal finance coach. Create a personalized 7-day weekly action plan for this user based on their financial data.

USER'S DATA (LAST 90 DAYS WINDOW):
${JSON.stringify(userData)}

IMPORTANT CONTEXT:
- All numbers are for the last 90 days
- Income: ₹${userData.summary.totalIncome}
- Expense: ₹${userData.summary.totalExpense}
- Savings Rate: ${userData.summary.savingsRate}%
- Top spending categories: ${userData.topCategories.map((c) => `${c.category} (₹${c.total})`).join(", ")}

Return ONLY a JSON object:
{
  "greeting": "Personalized greeting using user's name if available (2-5 words)",
  "summary": "2-3 sentence summary in Hinglish of user's current financial situation — MUST mention the exact numbers from above (income, expense, top category)",
  "focusAreas": [
    {
      "category": "Food",
      "currentSpend": 4500,
      "targetSpend": 3500,
      "reason": "1-line reason in Hinglish why this needs attention"
    }
  ],
  "dailyMissions": [
    {"day": "Monday", "mission": "Specific actionable task in Hinglish", "icon": "🎯"},
    {"day": "Tuesday", "mission": "...", "icon": "💡"},
    {"day": "Wednesday", "mission": "...", "icon": "📊"},
    {"day": "Thursday", "mission": "...", "icon": "💰"},
    {"day": "Friday", "mission": "...", "icon": "🎯"},
    {"day": "Saturday", "mission": "...", "icon": "🍔"},
    {"day": "Sunday", "mission": "...", "icon": "📈"}
  ],
  "challenges": ["Challenge 1 - measurable and specific", "Challenge 2", "Challenge 3"],
  "motivationalMessage": "1-2 sentence encouraging message in Hinglish, personalized"
}

RULES:
- CRITICAL: In summary, mention the exact totalExpense (₹${userData.summary.totalExpense}) and top category amounts
- Focus areas: pick top 2-3 categories that need improvement
- Each focus area: set realistic target (10-25% lower than current)
- Daily missions: each mission should be a SMALL, actionable task for that day
- Mix categories — don't make all days about Food
- Challenges: 3 specific weekly challenges
- Keep everything encouraging, not preachy
- Mention ₹ amounts in Indian format
- IMPORTANT: currentSpend and targetSpend MUST be plain numbers (e.g., 4000 not "₹4,000")
- Reply ONLY with valid JSON, no other text`;

    const completion = await groqWithRetry(groq, {
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a supportive Indian financial coach. Reply only with valid JSON. Always use the exact numbers provided in the data — do not make up or round numbers.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 2500,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(completion.choices[0].message.content);

    // Sanitize focus areas
    const sanitizedFocusAreas = (parsed.focusAreas || [])
      .slice(0, 3)
      .map((f) => ({
        category: String(f.category || "").slice(0, 50),
        currentSpend: extractNumber(f.currentSpend),
        targetSpend: extractNumber(f.targetSpend),
        reason: String(f.reason || "").slice(0, 200),
      }))
      .filter((f) => f.category && f.currentSpend > 0);

    // Sanitize daily missions
    const sanitizedMissions = (parsed.dailyMissions || [])
      .slice(0, 7)
      .map((m) => ({
        day: String(m.day || "").slice(0, 20),
        mission: String(m.mission || "").slice(0, 200),
        icon: String(m.icon || "🎯").slice(0, 5),
      }))
      .filter((m) => m.day && m.mission);

    // Sanitize challenges
    const sanitizedChallenges = (parsed.challenges || [])
      .slice(0, 3)
      .map((c) => String(c).slice(0, 200))
      .filter(Boolean);

    const plan = await CoachPlan.create({
      user: userId,
      weekStart,
      weekEnd,
      greeting: String(parsed.greeting || "Hello! 👋").slice(0, 100),
      summary: String(parsed.summary || "").slice(0, 500),
      focusAreas: sanitizedFocusAreas,
      dailyMissions: sanitizedMissions,
      challenges: sanitizedChallenges,
      motivationalMessage: String(parsed.motivationalMessage || "").slice(
        0,
        300
      ),
      basedOnData: {
        totalIncome: userData.summary.totalIncome,
        totalExpense: userData.summary.totalExpense,
        topCategories: userData.topCategories.map((c) => c.category),
        savingsRate: userData.summary.savingsRate,
      },
    });

    return plan;
  } catch (error) {
    console.error("Coach plan error:", error.message);

    // Fallback plan (based on real data)
    const fallback = await CoachPlan.create({
      user: userId,
      weekStart,
      weekEnd,
      greeting: "Hello! 👋",
      summary: `Aapne last 90 days me ₹${userData.summary.totalExpense} kharch kiye aur ₹${userData.summary.totalIncome} kamaye. Savings rate ${userData.summary.savingsRate}% hai.`,
      focusAreas: userData.topCategories.slice(0, 3).map((c) => ({
        category: c.category,
        currentSpend: c.total,
        targetSpend: Math.round(c.total * 0.8),
        reason: `${c.category} me ₹${Math.round(c.total * 0.2)} kam kar sakte ho`,
      })),
      dailyMissions: [
        { day: "Monday", mission: "Aaj ke sab expenses note karo", icon: "📝" },
        { day: "Tuesday", mission: "Ek subscription review karo", icon: "🔍" },
        { day: "Wednesday", mission: "Ghar pe khana banao", icon: "🍳" },
        { day: "Thursday", mission: "Aaj ₹500 se kam kharch karo", icon: "💰" },
        { day: "Friday", mission: "Weekly budget check karo", icon: "📊" },
        {
          day: "Saturday",
          mission: "Ek savings goal ke liye ₹200 daalo",
          icon: "🎯",
        },
        { day: "Sunday", mission: "Is hafte ka review karo", icon: "📈" },
      ],
      challenges: [
        "Is hafte 2 baar se kam food delivery order karo",
        "Har din ke expenses likho",
        "Ek unnecessary subscription cancel karo",
      ],
      motivationalMessage:
        "Chhote changes se bade results aate hain. Aaj se shuru karo! 💪",
      basedOnData: {
        totalIncome: userData.summary.totalIncome,
        totalExpense: userData.summary.totalExpense,
        topCategories: userData.topCategories.map((c) => c.category),
        savingsRate: userData.summary.savingsRate,
      },
    });

    return fallback;
  }
};

// Get current plan (or generate)
export const getCurrentPlan = async (userId) => {
  const weekStart = getWeekStart();
  const plan = await CoachPlan.findOne({ user: userId, weekStart });

  if (plan) return plan;
  return await generateWeeklyPlan(userId);
};

// Get past plans
export const getPastPlans = async (userId, limit = 5) => {
  return await CoachPlan.find({ user: userId })
    .sort({ weekStart: -1 })
    .limit(limit);
};