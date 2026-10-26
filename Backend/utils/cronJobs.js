import cron from "node-cron";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import { sendWeeklySummary } from "./emailService.js";

/**
 * Har Sunday 9:00 AM pe weekly summary bhejo
 */
export const startCronJobs = () => {
  // Weekly summary — har Sunday 9 AM
  cron.schedule(
    "0 9 * * 0",
    async () => {
      console.log("⏰ Running weekly summary cron...");
      try {
        const users = await User.find({ alertsEnabled: true });

        for (const user of users) {
          const weekEnd = new Date();
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - 7);

          const transactions = await Transaction.find({
            user: user._id,
            date: { $gte: weekStart, $lte: weekEnd },
          });

          if (transactions.length === 0) continue;

          const income = transactions
            .filter((t) => t.type === "income")
            .reduce((sum, t) => sum + t.amount, 0);

          const expense = transactions
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0);

          // Top category
          const categories = {};
          transactions
            .filter((t) => t.type === "expense")
            .forEach((t) => {
              categories[t.category] = (categories[t.category] || 0) + t.amount;
            });

          const topCategory = Object.entries(categories)
            .sort((a, b) => b[1] - a[1])
            .map(([category, total]) => ({ category, total }))[0];

          await sendWeeklySummary(user, {
            weekStart,
            weekEnd,
            income,
            expense,
            topCategory,
            transactionCount: transactions.length,
          });
        }

        console.log("✅ Weekly summaries sent");
      } catch (error) {
        console.error("Weekly summary cron error:", error.message);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log("⏰ Cron jobs scheduled");
};