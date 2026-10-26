import Groq from "groq-sdk";
import { gatherAnalyticsData } from "./analyticsService.js";
import { AI_MODEL } from "../config/aiConfig.js";
import { groqWithRetry } from "./groqHelper.js";

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

export const generateInsights = async (userId) => {
  const data = await gatherAnalyticsData(userId);

  if (data.transactionCount === 0) {
    return [
      {
        type: "info",
        title: "No data yet",
        message:
          "Add a few transactions to unlock AI-powered insights about your spending patterns.",
        icon: "📊",
      },
    ];
  }

  const groq = getGroqClient();

  const prompt = `You are a financial advisor AI. Analyze this user's spending data and generate 3 to 5 short, actionable insights.

User's financial data (last 30 days):
${JSON.stringify(data, null, 2)}

Generate insights as a JSON array. Each insight should have:
- "type": "warning" | "tip" | "info" | "success"
- "title": short headline (max 6 words)
- "message": one clear sentence with specific numbers
- "icon": single emoji

Rules:
- Be specific with numbers (use ₹ and Indian format).
- Mix positive and negative insights if applicable.
- If expense increased, warn. If savings good, praise.
- If a category is way above others, mention it.
- Keep messages short and actionable.
- Reply ONLY with valid JSON array. No other text.

Example format:
[
  {"type": "warning", "title": "Food spending up 30%", "message": "Food expenses increased by ₹1,500 compared to last month.", "icon": "🍔"},
  {"type": "success", "title": "Great savings rate", "message": "You saved 35% of your income this month. Keep it up!", "icon": "🎉"}
]`;

  try {
    const completion = await groqWithRetry(groq, {
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a financial advisor. Reply only with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0].message.content;

    let parsed = JSON.parse(responseText);
    let insights = Array.isArray(parsed)
      ? parsed
      : parsed.insights || parsed.data || [];

    insights = insights
      .filter((i) => i.title && i.message)
      .map((i) => ({
        type: i.type || "info",
        title: String(i.title).slice(0, 100),
        message: String(i.message).slice(0, 300),
        icon: i.icon || "💡",
      }))
      .slice(0, 5);

    return insights;
  } catch (error) {
    console.error("Insight generation error:", error.message);
    return generateFallbackInsights(data);
  }
};

const generateFallbackInsights = (data) => {
  const insights = [];

  if (data.expenseChangePercent > 10) {
    insights.push({
      type: "warning",
      title: `Expense up ${data.expenseChangePercent}%`,
      message: `You spent ${data.expenseChangePercent}% more than the previous 30 days.`,
      icon: "⚠️",
    });
  } else if (data.expenseChangePercent < -10) {
    insights.push({
      type: "success",
      title: `Expense down ${Math.abs(data.expenseChangePercent)}%`,
      message: `Great! Your spending dropped by ${Math.abs(data.expenseChangePercent)}% vs last period.`,
      icon: "🎉",
    });
  }

  if (data.savingsRate > 20) {
    insights.push({
      type: "success",
      title: "Healthy savings",
      message: `You're saving ${data.savingsRate}% of your income. Excellent!`,
      icon: "💰",
    });
  } else if (data.savingsRate < 10) {
    insights.push({
      type: "warning",
      title: "Low savings rate",
      message: `You're only saving ${data.savingsRate}% of your income. Try to cut down expenses.`,
      icon: "📉",
    });
  }

  if (data.topCategories.length > 0) {
    const top = data.topCategories[0];
    const percentage = Math.round((top.total / data.totalExpense) * 100);
    insights.push({
      type: "info",
      title: `Top: ${top.category}`,
      message: `${top.category} accounts for ${percentage}% of your expenses (₹${top.total}).`,
      icon: "🔝",
    });
  }

  return insights.slice(0, 5);
};