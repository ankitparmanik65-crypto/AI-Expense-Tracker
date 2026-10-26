import Budget from "../models/Budget.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import { sendBudgetAlert } from "./emailService.js";

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
 * Budget check karo aur alert bhejo agar 80%/100% cross hua
 */
export const checkBudgetAndAlert = async (userId, category) => {
  const user = await User.findById(userId);
  if (!user || !user.alertsEnabled) return;

  const month = getCurrentMonth();
  const { start, end } = getMonthRange(month);

  const budget = await Budget.findOne({ user: userId, category, month });
  if (!budget) return;

  // Category ka is month ka spending
  const result = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        type: "expense",
        category,
        date: { $gte: start, $lte: end },
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const spent = result[0]?.total || 0;
  const percentage = Math.round((spent / budget.limit) * 100);

  // 80% ya 100% cross hua?
  const crossed80 = percentage >= 80 && percentage < 100;
  const crossed100 = percentage >= 100;

  if (crossed80 || crossed100) {
    await sendBudgetAlert(user, {
      category,
      spent,
      limit: budget.limit,
      percentage,
    });
  }
};