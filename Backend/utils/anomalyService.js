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

const getCategoryStats = async (userId) => {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const stats = await Transaction.aggregate([
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
        amounts: { $push: "$amount" },
        count: { $sum: 1 },
        avg: { $avg: "$amount" },
        max: { $max: "$amount" },
      },
    },
  ]);

  stats.forEach((s) => {
    const sorted = [...s.amounts].sort((a, b) => a - b);
    const n = sorted.length;

    const mid = Math.floor(n / 2);
    s.median = n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

    const q1Idx = Math.floor(n * 0.25);
    const q3Idx = Math.floor(n * 0.75);
    s.q1 = sorted[q1Idx];
    s.q3 = sorted[q3Idx];
    s.iqr = s.q3 - s.q1;
    s.iqrUpperBound = s.q3 + 1.5 * s.iqr;
  });

  return stats;
};

const calculateStdDev = (amounts, mean) => {
  if (amounts.length < 2) return 0;
  const variance =
    amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) /
    amounts.length;
  return Math.sqrt(variance);
};

export const detectAnomalies = async (userId) => {
  const stats = await getCategoryStats(userId);

  if (stats.length === 0) {
    return { anomalies: [], hasData: false };
  }

  const categoryStats = {};
  stats.forEach((s) => {
    const mean = s.avg;
    const stdDev = calculateStdDev(s.amounts, mean);
    categoryStats[s._id] = {
      mean,
      stdDev,
      max: s.max,
      count: s.count,
      median: s.median,
      q1: s.q1,
      q3: s.q3,
      iqr: s.iqr,
      iqrUpperBound: s.iqrUpperBound,
    };
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentTransactions = await Transaction.find({
    user: userId,
    type: "expense",
    date: { $gte: thirtyDaysAgo },
  })
    .sort({ date: -1 })
    .limit(50);

  const anomalies = [];

  for (const tx of recentTransactions) {
    const stat = categoryStats[tx.category];
    if (!stat) continue;
    if (stat.count < 3) continue;

    const zScore = stat.stdDev > 0 ? (tx.amount - stat.mean) / stat.stdDev : 0;
    const multiplier = tx.amount / stat.median;
    const isIqrOutlier = tx.amount > stat.iqrUpperBound;

    const isAnomaly =
      multiplier >= 2.5 &&
      tx.amount > stat.mean &&
      (zScore > 1.5 || isIqrOutlier);

    if (isAnomaly) {
      anomalies.push({
        transaction: {
          _id: tx._id,
          amount: tx.amount,
          category: tx.category,
          description: tx.description,
          date: tx.date,
        },
        categoryAvg: Math.round(stat.mean),
        categoryMedian: Math.round(stat.median),
        categoryMax: stat.max,
        multiplier: Math.round(multiplier * 10) / 10,
        zScore: Math.round(zScore * 10) / 10,
        severity:
          multiplier >= 5 || zScore > 3
            ? "high"
            : multiplier >= 3
            ? "medium"
            : "low",
      });
    }
  }

  anomalies.sort((a, b) => b.multiplier - a.multiplier);
  const topAnomalies = anomalies.slice(0, 5);

  let aiSummary = "";
  if (topAnomalies.length > 0) {
    try {
      const groq = getGroqClient();

      const prompt = `Analyze these unusual transactions detected for a user.

Anomalies:
${topAnomalies
  .map(
    (a, i) =>
      `${i + 1}. ₹${a.transaction.amount} on ${a.transaction.category} ("${
        a.transaction.description || "no description"
      }") — ${a.multiplier}x higher than usual (median ₹${a.categoryMedian})`
  )
  .join("\n")}

Return ONLY a JSON object:
{
  "summary": "1-2 sentence summary in Hinglish explaining these anomalies and whether the user should review them"
}

Rules:
- Friendly, non-alarming tone
- Mention specific categories with amounts
- Suggest action (verify, review)
- Reply ONLY with valid JSON`;

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
        max_tokens: 400,
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(completion.choices[0].message.content);
      aiSummary = parsed.summary || "";
    } catch (err) {
      console.error("Anomaly AI error:", err.message);
      aiSummary = `${topAnomalies.length} unusual transaction${
        topAnomalies.length > 1 ? "s" : ""
      } detected. Review them to ensure accuracy.`;
    }
  }

  return {
    anomalies: topAnomalies,
    totalAnomalies: anomalies.length,
    aiSummary,
    hasData: true,
  };
};