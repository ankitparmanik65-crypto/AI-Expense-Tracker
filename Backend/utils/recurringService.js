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

const normalizeDescription = (desc) => {
  if (!desc) return "";
  return desc
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 3)
    .join(" ");
};

const detectFrequency = (dates) => {
  if (dates.length < 2) return null;

  const sorted = [...dates].sort((a, b) => new Date(a) - new Date(b));
  const gaps = [];

  for (let i = 1; i < sorted.length; i++) {
    const gap = Math.round(
      (new Date(sorted[i]) - new Date(sorted[i - 1])) / (1000 * 60 * 60 * 24)
    );
    gaps.push(gap);
  }

  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

  if (avgGap >= 5 && avgGap <= 9) return { freq: "weekly", days: avgGap, perMonth: 4 };
  if (avgGap >= 12 && avgGap <= 18) return { freq: "biweekly", days: avgGap, perMonth: 2 };
  if (avgGap >= 25 && avgGap <= 35) return { freq: "monthly", days: avgGap, perMonth: 1 };
  if (avgGap >= 55 && avgGap <= 70) return { freq: "bimonthly", days: avgGap, perMonth: 0.5 };
  if (avgGap >= 85 && avgGap <= 95) return { freq: "quarterly", days: avgGap, perMonth: 0.33 };
  if (avgGap >= 350 && avgGap <= 380) return { freq: "yearly", days: avgGap, perMonth: 0.083 };

  return null;
};

export const detectRecurring = async (userId) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

  const transactions = await Transaction.find({
    user: userId,
    type: "expense",
    date: { $gte: sixMonthsAgo },
  }).sort({ date: 1 });

  if (transactions.length < 3) {
    return { recurring: [], totalMonthly: 0, hasData: false };
  }

  const groups = {};

  transactions.forEach((tx) => {
    const key = normalizeDescription(tx.description || tx.category);
    if (!key) return;

    if (!groups[key]) {
      groups[key] = { key, transactions: [], categories: new Set() };
    }

    groups[key].transactions.push(tx);
    groups[key].categories.add(tx.category);
  });

  const recurring = [];

  Object.values(groups).forEach((group) => {
    if (group.transactions.length < 2) return;

    const amounts = group.transactions.map((t) => t.amount);
    const sortedAmounts = [...amounts].sort((a, b) => a - b);
    const mid = Math.floor(sortedAmounts.length / 2);
    const median =
      sortedAmounts.length % 2 === 0
        ? (sortedAmounts[mid - 1] + sortedAmounts[mid]) / 2
        : sortedAmounts[mid];

    const allSimilar = amounts.every(
      (a) => Math.abs(a - median) / median <= 0.2
    );

    if (!allSimilar) return;

    const dates = group.transactions.map((t) => t.date);
    const frequency = detectFrequency(dates);

    if (!frequency) return;

    const lastDate = new Date(Math.max(...dates.map((d) => new Date(d).getTime())));
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + Math.round(frequency.days));

    recurring.push({
      name: group.transactions[0].description || "Unknown",
      category: group.transactions[0].category,
      avgAmount: Math.round(median),
      occurrences: group.transactions.length,
      frequency: frequency.freq,
      monthlyCost: Math.round(median * frequency.perMonth),
      lastDate: lastDate.toISOString(),
      nextExpectedDate: nextDate.toISOString(),
      transactions: group.transactions.map((t) => ({
        _id: t._id,
        amount: t.amount,
        date: t.date,
        description: t.description,
      })),
    });
  });

  recurring.sort((a, b) => b.monthlyCost - a.monthlyCost);

  const topRecurring = recurring.slice(0, 10);
  const totalMonthly = topRecurring.reduce((sum, r) => sum + r.monthlyCost, 0);

  let aiSummary = "";
  if (topRecurring.length > 0) {
    try {
      const groq = getGroqClient();

      const prompt = `Analyze these recurring transactions detected for a user.

Recurring payments:
${topRecurring
  .map(
    (r, i) =>
      `${i + 1}. ${r.name} (${r.category}) — ₹${r.avgAmount} ${r.frequency} (${r.occurrences} times)`
  )
  .join("\n")}

Total monthly commitment: ₹${totalMonthly}

Return ONLY a JSON object:
{
  "summary": "1-2 sentence summary in Hinglish about the user's recurring expenses and whether it's high or reasonable. Mention total monthly commitment."
}

Rules:
- Friendly, informational tone
- Mention total monthly amount
- Suggest reviewing if total seems high
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
      console.error("Recurring AI error:", err.message);
      aiSummary = `Aapke ₹${totalMonthly}/month ke recurring payments detected hain. Review karke check karo ki sab zaroori hain.`;
    }
  }

  return {
    recurring: topRecurring,
    totalMonthly,
    count: topRecurring.length,
    aiSummary,
    hasData: true,
  };
};