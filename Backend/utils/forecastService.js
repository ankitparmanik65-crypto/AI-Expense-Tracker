import Transaction from "../models/Transaction.js";
import Groq from "groq-sdk";
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

const getMonthlyExpenses = async (userId, months = 6) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const data = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        type: "expense",
        date: { $gte: start },
      },
    },
    {
      $group: {
        _id: { year: { $year: "$date" }, month: { $month: "$date" } },
        total: { $sum: "$amount" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const result = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    const found = data.find(
      (item) => item._id.year === year && item._id.month === month
    );

    result.push({
      year,
      month,
      label: `${monthNames[month - 1]} ${String(year).slice(2)}`,
      total: found?.total || 0,
    });
  }

  return result;
};

const calculateForecast = (monthlyData) => {
  if (monthlyData.length === 0) {
    return { predicted: 0, method: "no-data" };
  }

  const totals = monthlyData.map((m) => m.total);
  const nonZeroTotals = totals.filter((t) => t > 0);

  if (nonZeroTotals.length === 0) {
    return { predicted: 0, method: "no-data" };
  }

  const avg = totals.reduce((a, b) => a + b, 0) / totals.length;

  let weightedSum = 0;
  let weightTotal = 0;
  totals.forEach((val, idx) => {
    const weight = idx + 1;
    weightedSum += val * weight;
    weightTotal += weight;
  });
  const weightedAvg = weightTotal > 0 ? weightedSum / weightTotal : avg;

  const n = totals.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = totals.reduce((a, b) => a + b, 0);
  const sumXY = totals.reduce((sum, y, x) => sum + x * y, 0);
  const sumX2 = totals.reduce((sum, _, x) => sum + x * x, 0);

  const slope =
    n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;

  let predicted = weightedAvg + slope;
  predicted = Math.max(predicted, 0);

  return {
    predicted: Math.round(predicted),
    average: Math.round(avg),
    weightedAvg: Math.round(weightedAvg),
    trend: Math.round(slope),
    method: "weighted-moving-average",
  };
};

export const generateForecast = async (userId) => {
  const monthlyData = await getMonthlyExpenses(userId, 6);
  const forecast = calculateForecast(monthlyData);

  let explanation = "";
  let tips = [];

  const hasData = monthlyData.some((m) => m.total > 0);

  if (hasData) {
    try {
      const groq = getGroqClient();

      const prompt = `Analyze this user's monthly expense data and provide a short explanation of the forecast.

Past 6 months expenses (in ₹):
${monthlyData.map((m) => `${m.label}: ₹${m.total}`).join("\n")}

Predicted next month expense: ₹${forecast.predicted}
Average: ₹${forecast.average}
Trend slope: ₹${forecast.trend} per month (positive = increasing, negative = decreasing)

Return ONLY a JSON object with this format:
{
  "explanation": "2-3 sentence explanation in Hinglish about why this forecast makes sense. Mention specific months and trends.",
  "tips": ["tip 1", "tip 2", "tip 3"]
}

Rules:
- Explanation should be friendly, use ₹ amounts, mention specific months
- Tips should be actionable, max 10 words each
- Reply ONLY with valid JSON, no other text.`;

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
        max_tokens: 800,
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(completion.choices[0].message.content);
      explanation = parsed.explanation || "";
      tips = Array.isArray(parsed.tips) ? parsed.tips.slice(0, 3) : [];
    } catch (err) {
      console.error("Forecast AI error:", err.message);
      explanation =
        `Aapka average monthly expense ₹${forecast.average} hai. ` +
        (forecast.trend > 0
          ? "Expenses badh rahe hain, dhyan rakho."
          : forecast.trend < 0
          ? "Expenses kam ho rahe hain, acha chal raha hai."
          : "Expenses stable hain.");
    }
  } else {
    explanation =
      "Abhi tak koi expense record nahi hua. Kuch transactions add karo taaki forecast ban sake.";
  }

  return {
    monthlyData,
    predicted: forecast.predicted,
    average: forecast.average,
    trend: forecast.trend,
    trendDirection:
      forecast.trend > 50
        ? "increasing"
        : forecast.trend < -50
        ? "decreasing"
        : "stable",
    explanation,
    tips,
    confidence:
      monthlyData.filter((m) => m.total > 0).length >= 3 ? "high" : "low",
  };
};