import FinancialProfile from "../models/FinancialProfile.js";
import FinancialPlan from "../models/FinancialPlan.js";
import Transaction from "../models/Transaction.js";
import Goal from "../models/Goal.js";
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

// Format INR helper
const formatINR = (num) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num || 0);

// Gather current financial data
const gatherCurrentData = async (userId) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const summary = await Transaction.aggregate([
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

  let monthlyIncome = 0;
  let monthlyExpense = 0;
  summary.forEach((s) => {
    if (s._id === "income") monthlyIncome = s.total;
    if (s._id === "expense") monthlyExpense = s.total;
  });

  const goals = await Goal.find({ user: userId, completed: false });

  return {
    monthlyIncome,
    monthlyExpense,
    monthlySavings: monthlyIncome - monthlyExpense,
    savingsRate:
      monthlyIncome > 0
        ? Math.round(((monthlyIncome - monthlyExpense) / monthlyIncome) * 100)
        : 0,
    activeGoals: goals.map((g) => ({
      name: g.name,
      target: g.targetAmount,
      saved: g.savedAmount,
      progress: Math.round((g.savedAmount / g.targetAmount) * 100),
      deadline: g.deadline,
    })),
  };
};

// ========== LAYER 1: FORMULA-BASED PLAN ==========

const calculatePlanWithFormulas = (profile, currentData) => {
  const age = Number(profile.age) || 30;
  const retirementAge = Number(profile.retirementAge) || 60;
  const yearsToRetirement = Math.max(retirementAge - age, 1);

  const monthlyIncome =
    currentData.monthlyIncome || Number(profile.monthlyIncome) || 0;
  const monthlyExpense =
    currentData.monthlyExpense || Math.round(monthlyIncome * 0.7);
  const monthlySavings = monthlyIncome - monthlyExpense;

  // ===== RETIREMENT =====
  const annualExpense = monthlyExpense * 12;
  const retirementCorpus = Math.round(annualExpense * 30);
  const currentSavings =
    (Number(profile.existingSavings) || 0) +
    (Number(profile.existingInvestments) || 0);

  // Corpus gap — existing savings grow at 10% for years left
  const projectedExisting = Math.round(
    currentSavings * Math.pow(1.1, yearsToRetirement)
  );
  const corpusGap = Math.max(retirementCorpus - projectedExisting, 0);

  // Return rate based on risk appetite
  const annualReturn =
    profile.riskAppetite === "conservative"
      ? 0.08
      : profile.riskAppetite === "aggressive"
      ? 0.14
      : 0.12;
  const monthlyRate = annualReturn / 12;
  const months = yearsToRetirement * 12;

  let monthlyInvestmentNeeded = 0;
  if (months > 0 && monthlyRate > 0 && corpusGap > 0) {
    monthlyInvestmentNeeded = Math.round(
      (corpusGap * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1)
    );
  }

  // ===== ASSET ALLOCATION (100 - age rule) =====
  let equityPercent = Math.max(100 - age, 20);
  let debtPercent = 100 - equityPercent;

  if (profile.riskAppetite === "aggressive") {
    equityPercent = Math.min(equityPercent + 10, 90);
    debtPercent = 100 - equityPercent;
  } else if (profile.riskAppetite === "conservative") {
    equityPercent = Math.max(equityPercent - 20, 20);
    debtPercent = 100 - equityPercent;
  }

  const recommendedAllocation = [
    {
      asset: "Equity Mutual Funds / Stocks",
      percentage: equityPercent,
      reason: `${age} saal ki age ke liye ${equityPercent}% equity recommend (100 - age rule)`,
    },
    {
      asset: "PPF / Debt Funds / Bonds",
      percentage: debtPercent,
      reason: `${debtPercent}% safe investments stability ke liye`,
    },
  ];

  // ===== EMERGENCY FUND =====
  const emergencyFundRecommended = Math.round(monthlyExpense * 6);
  const emergencyFundCurrent = Number(profile.existingSavings) || 0;
  const emergencyFundGap = Math.max(
    emergencyFundRecommended - emergencyFundCurrent,
    0
  );

  // ===== MONTHLY BUDGET (50/30/20) =====
  const monthlyBudgetPlan = {
    needs: Math.round(monthlyIncome * 0.5),
    wants: Math.round(monthlyIncome * 0.3),
    savings: Math.round(monthlyIncome * 0.2),
    investment: Math.round(monthlyIncome * 0.2),
  };

  // ===== GOAL PLANS =====
  const goalPlans = [];

  // User's existing goals
  currentData.activeGoals?.forEach((goal) => {
    const yearsLeft = goal.deadline
      ? Math.max(
          Math.ceil(
            (new Date(goal.deadline) - new Date()) /
              (365 * 24 * 60 * 60 * 1000)
          ),
          1
        )
      : 3;
    const remaining = goal.target - goal.saved;
    const monthsLeft = yearsLeft * 12;
    const goalMonthlyRate = 0.1 / 12;
    const monthlyNeeded =
      monthsLeft > 0 && goalMonthlyRate > 0
        ? Math.round(
            (remaining * goalMonthlyRate) /
              (Math.pow(1 + goalMonthlyRate, monthsLeft) - 1)
          )
        : remaining;

    goalPlans.push({
      goalName: goal.name,
      goalType: "custom",
      targetAmount: goal.target,
      yearsToGoal: yearsLeft,
      monthlyInvestmentNeeded: Math.max(monthlyNeeded, 0),
      recommendation: `₹${monthlyNeeded.toLocaleString(
        "en-IN"
      )}/month invest karo (10% return assume karke)`,
    });
  });

  // Emergency fund as a goal
  if (emergencyFundGap > 0) {
    goalPlans.push({
      goalName: "Emergency Fund (6 months)",
      goalType: "emergency",
      targetAmount: emergencyFundRecommended,
      yearsToGoal: 1,
      monthlyInvestmentNeeded: Math.round(emergencyFundGap / 12),
      recommendation: "Liquid fund ya high-interest savings account me rakho",
    });
  }

  // ===== ACTION STEPS =====
  const actionSteps = [];

  if (emergencyFundGap > 0) {
    actionSteps.push({
      priority: "high",
      title: "Emergency fund setup karo",
      description: `${formatINR(
        emergencyFundGap
      )} ka emergency fund banao (6 months of expenses)`,
      timeline: "Next 6 months",
      icon: "🚨",
    });
  }

  if (currentData.savingsRate < 20) {
    actionSteps.push({
      priority: "high",
      title: "Savings rate badhao",
      description: `Current savings rate ${currentData.savingsRate}% hai. Target 20%+.`,
      timeline: "Next 3 months",
      icon: "💰",
    });
  }

  if (monthlyInvestmentNeeded > 0) {
    actionSteps.push({
      priority: "high",
      title: "Retirement SIP shuru karo",
      description: `₹${monthlyInvestmentNeeded.toLocaleString(
        "en-IN"
      )}/month ka SIP ₹${(retirementCorpus / 10000000).toFixed(
        2
      )} Cr retirement corpus ke liye`,
      timeline: "Immediately",
      icon: "📈",
    });
  }

  if ((Number(profile.existingDebt) || 0) > 0) {
    actionSteps.push({
      priority: "high",
      title: "Debt clear karo",
      description: `Existing debt ${formatINR(
        profile.existingDebt
      )} hai. High-interest debt pehle clear karo.`,
      timeline: "Ongoing",
      icon: "💳",
    });
  }

  actionSteps.push({
    priority: "medium",
    title: "Tax-saving investments karo",
    description: "80C me ₹1.5L, 80D me ₹25K, NPS me ₹50K tak invest karo",
    timeline: "Before March 31",
    icon: "📋",
  });

  actionSteps.push({
    priority: "medium",
    title: "Health insurance lo",
    description: "Family floater ₹10L+ ka health cover zaroor lo",
    timeline: "Next 3 months",
    icon: "🏥",
  });

  actionSteps.push({
    priority: "low",
    title: "Term life insurance review karo",
    description: "Annual income ka 10-15x ka term cover lo",
    timeline: "Next 6 months",
    icon: "🛡️",
  });

  // ===== WARNINGS =====
  const warnings = [];

  if (currentData.savingsRate < 10 && monthlyIncome > 0) {
    warnings.push(
      `Savings rate sirf ${currentData.savingsRate}% hai — minimum 20% target karo`
    );
  }

  if (
    (Number(profile.existingDebt) || 0) > 0 &&
    monthlyIncome > 0 &&
    Number(profile.existingDebt) > monthlyIncome * 12
  ) {
    warnings.push("Debt aapki annual income se zyada hai — priority me clear karo");
  }

  if (emergencyFundGap > 0) {
    warnings.push(
      "Emergency fund nahi hai — kisi bhi emergency me loan lena padega"
    );
  }

  if (age > 50 && currentSavings < retirementCorpus * 0.3) {
    warnings.push(
      "Retirement ke liye time kam hai — aggressive saving karo abhi se"
    );
  }

  if (monthlyInvestmentNeeded > monthlySavings && monthlyIncome > 0) {
    warnings.push(
      `Required investment (₹${monthlyInvestmentNeeded.toLocaleString(
        "en-IN"
      )}) current savings (₹${monthlySavings.toLocaleString(
        "en-IN"
      )}) se zyada hai — expenses kam karne padenge`
    );
  }

  // ===== OVERVIEW =====
  const overview = {
    currentStatus: `Aap ${age} saal ke ho, ${yearsToRetirement} saal retirement ke liye bache hain. Monthly income ₹${monthlyIncome.toLocaleString(
      "en-IN"
    )} aur expense ₹${monthlyExpense.toLocaleString("en-IN")} hai.`,
    targetStatus: `Retirement pe ₹${(retirementCorpus / 10000000).toFixed(
      2
    )} Cr ka corpus chahiye hoga. Uske liye ₹${monthlyInvestmentNeeded.toLocaleString(
      "en-IN"
    )}/month invest karna hoga.`,
    summaryText: `Aapko monthly ₹${monthlyInvestmentNeeded.toLocaleString(
      "en-IN"
    )} invest karna chahiye retirement ke liye. Emergency fund me ₹${emergencyFundGap.toLocaleString(
      "en-IN"
    )} ki kami hai — pehle ye pura karo.`,
  };

  return {
    basedOnProfile: {
      age,
      retirementAge,
      monthlyIncome,
      riskAppetite: profile.riskAppetite,
      existingSavings: Number(profile.existingSavings) || 0,
      existingInvestments: Number(profile.existingInvestments) || 0,
      existingDebt: Number(profile.existingDebt) || 0,
    },
    overview,
    retirementPlan: {
      targetAge: retirementAge,
      yearsLeft: yearsToRetirement,
      estimatedCorpus: retirementCorpus,
      currentSavings,
      monthlyInvestmentNeeded,
      recommendedAllocation,
      tips: [
        "Har saal SIP amount 10% badhao (step-up SIP)",
        "Equity me long-term invest karo (10+ years)",
        "Retirement ke 5 saal pehle portfolio debt-heavy karo",
        "EPF/NPS ka full tax benefit lo",
      ],
    },
    goalPlans,
    emergencyFund: {
      recommended: emergencyFundRecommended,
      current: emergencyFundCurrent,
      gap: emergencyFundGap,
      months: 6,
    },
    actionSteps,
    monthlyBudgetPlan,
    warnings,
  };
};

// ========== LAYER 2: AI ENHANCEMENT (OPTIONAL) ==========

const enhancePlanWithAI = async (formulaPlan, profile, currentData) => {
  const groq = getGroqClient();

  const prompt = `You are an Indian financial planner. A formula-based plan is ready. Enhance the WORDING with personalized, warm, actionable text in Hinglish.

PROFILE:
- Age: ${profile.age}
- Retirement age: ${profile.retirementAge}
- Risk: ${profile.riskAppetite}
- City: ${profile.city || "Not specified"}
- Occupation: ${profile.occupation || "Not specified"}
- Dependents: ${profile.dependents || 0}

FORMULA PLAN (already computed numbers — DO NOT change):
${JSON.stringify(formulaPlan, null, 2)}

Return ONLY a JSON object:
{
  "overview": {
    "currentStatus": "1-2 sentences in Hinglish, personalized (mention city/occupation if given)",
    "targetStatus": "1-2 sentences about the future goal",
    "summaryText": "3-4 sentence warm, motivational summary"
  },
  "retirementTips": ["4-5 SPECIFIC tips based on their age, income, risk appetite"],
  "actionSteps": [
    {"priority": "high|medium|low", "title": "Better worded title", "description": "Warmer description", "timeline": "timeline", "icon": "🎯"}
  ]
}

RULES:
- Numbers MUST stay the same as formula plan — don't invent
- Make it warm, personal, encouraging (not preachy)
- Mention Indian context (SIP, PPF, ELSS, NPS, etc.)
- Action steps: use the formula steps but improve the wording
- Reply ONLY with valid JSON`;

  const completion = await groqWithRetry(groq, {
    model: AI_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are an Indian financial planner. Reply only with valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.5,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });

  const parsed = JSON.parse(completion.choices[0].message.content);

  return {
    overview: {
      currentStatus:
        parsed.overview?.currentStatus || formulaPlan.overview.currentStatus,
      targetStatus:
        parsed.overview?.targetStatus || formulaPlan.overview.targetStatus,
      summaryText:
        parsed.overview?.summaryText || formulaPlan.overview.summaryText,
    },
    retirementPlan: {
      ...formulaPlan.retirementPlan,
      tips: (
        parsed.retirementTips || formulaPlan.retirementPlan.tips
      ).slice(0, 5),
    },
    actionSteps: (parsed.actionSteps || formulaPlan.actionSteps)
      .slice(0, 8)
      .map((s) => ({
        priority: ["high", "medium", "low"].includes(s.priority)
          ? s.priority
          : "medium",
        title: String(s.title || "").slice(0, 150),
        description: String(s.description || "").slice(0, 400),
        timeline: String(s.timeline || "").slice(0, 50),
        icon: String(s.icon || "🎯").slice(0, 5),
      })),
  };
};

// ========== MAIN: Generate Plan ==========

export const generateFinancialPlan = async (userId) => {
  const profile = await FinancialProfile.findOne({ user: userId });

  if (!profile) {
    throw new Error(
      "Financial profile not found. Please fill your profile first."
    );
  }

  if (!profile.age) {
    throw new Error("Please add your age in profile to generate plan.");
  }

  const currentData = await gatherCurrentData(userId);

  // LAYER 1: Formula-based (always works)
  const formulaPlan = calculatePlanWithFormulas(profile, currentData);

  // LAYER 2: AI enhancement (optional)
  let finalPlan = { ...formulaPlan, aiEnhanced: false };

  try {
    const aiEnhancements = await enhancePlanWithAI(
      formulaPlan,
      profile,
      currentData
    );

    finalPlan = {
      ...formulaPlan,
      ...aiEnhancements,
      aiEnhanced: true,
    };
  } catch (err) {
    console.log(
      "AI enhancement failed, using formula-only plan:",
      err.message
    );
    // Keep formulaPlan as-is
  }

  const plan = await FinancialPlan.create({
    user: userId,
    ...finalPlan,
  });

  return plan;
};

// Get latest plan
export const getLatestPlan = async (userId) => {
  return await FinancialPlan.findOne({ user: userId }).sort({
    generatedAt: -1,
  });
};

// Get plan history
export const getPlanHistory = async (userId, limit = 5) => {
  return await FinancialPlan.find({ user: userId })
    .sort({ generatedAt: -1 })
    .limit(limit);
};