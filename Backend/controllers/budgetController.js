import Budget from "../models/Budget.js";
import Transaction from "../models/Transaction.js";

// Helper: current month string
const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

// Helper: month ke start aur end dates
const getMonthRange = (monthStr) => {
  const [year, month] = monthStr.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  return { start, end };
};

// @desc    Create or update budget
// @route   POST /api/budgets
// @access  Private
export const createOrUpdateBudget = async (req, res) => {
  try {
    const { category, limit, period = "monthly" } = req.body;

    if (!category || !limit) {
      return res.status(400).json({ message: "Category and limit required" });
    }

    const month = getCurrentMonth();

    // Upsert - agar exist karta hai to update, warna create
    const budget = await Budget.findOneAndUpdate(
      { user: req.user._id, category, month },
      { limit, period },
      {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    res.status(201).json(budget);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all budgets with spending progress
// @route   GET /api/budgets
// @access  Private
export const getBudgets = async (req, res) => {
  try {
    const month = req.query.month || getCurrentMonth();
    const { start, end } = getMonthRange(month);

    // User ke budgets
    const budgets = await Budget.find({ user: req.user._id, month }).lean();

    if (budgets.length === 0) {
      return res.json({ month, budgets: [] });
    }

    // Har category ka is month ka spending nikaalo
    const spending = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
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

    // Budgets me progress add karo
    const budgetsWithProgress = budgets.map((b) => {
      const spent = spendingMap[b.category] || 0;
      const percentage = Math.round((spent / b.limit) * 100);
      let status = "safe"; // safe | warning | exceeded
      if (percentage >= 100) status = "exceeded";
      else if (percentage >= 80) status = "warning";

      return {
        _id: b._id,
        category: b.category,
        limit: b.limit,
        period: b.period,
        month: b.month,
        spent,
        remaining: Math.max(b.limit - spent, 0),
        percentage,
        status,
      };
    });

    res.json({ month, budgets: budgetsWithProgress });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete budget
// @route   DELETE /api/budgets/:id
// @access  Private
export const deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({ message: "Budget not found" });
    }

    res.json({ message: "Budget deleted", id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
