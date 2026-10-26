import Account from "../models/Account.js";
import Transaction from "../models/Transaction.js";
import mongoose from "mongoose";

// @desc    Create account
// @route   POST /api/accounts
// @access  Private
export const createAccount = async (req, res) => {
  try {
    const { name, type, initialBalance, icon, color, note } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Account name is required" });
    }

    // Duplicate name check
    const existing = await Account.findOne({
      user: req.user._id,
      name: name.trim(),
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: "Account with this name already exists" });
    }

    const balance = Number(initialBalance) || 0;

    const account = await Account.create({
      user: req.user._id,
      name: name.trim(),
      type: type || "bank",
      initialBalance: balance,
      balance,
      icon: icon || "🏦",
      color: color || "#3b82f6",
      note: note || "",
    });

    res.status(201).json(account);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all accounts with balances
// @route   GET /api/accounts
// @access  Private
export const getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({ user: req.user._id }).sort({
      createdAt: 1,
    });

    // Total balance across all accounts
    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

    res.json({
      accounts,
      totalBalance,
      count: accounts.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single account
// @route   GET /api/accounts/:id
// @access  Private
export const getAccountById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid account ID" });
    }

    const account = await Account.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Transaction count
    const txCount = await Transaction.countDocuments({
      user: req.user._id,
      account: req.params.id,
    });

    res.json({ ...account.toObject(), transactionCount: txCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update account
// @route   PUT /api/accounts/:id
// @access  Private
export const updateAccount = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid account ID" });
    }

    const account = await Account.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    const allowedFields = ["name", "type", "icon", "color", "note"];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        account[field] = req.body[field];
      }
    });

    const updated = await account.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete account (with transaction check)
// @route   DELETE /api/accounts/:id
// @access  Private
export const deleteAccount = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid account ID" });
    }

    const account = await Account.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Agar transactions linked hain to block karo
    const txCount = await Transaction.countDocuments({
      user: req.user._id,
      account: req.params.id,
    });

    if (txCount > 0) {
      return res.status(400).json({
        message: `Cannot delete account. ${txCount} transactions are linked to it. Delete those transactions first or transfer them to another account.`,
        transactionCount: txCount,
      });
    }

    await account.deleteOne();
    res.json({ message: "Account deleted", id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Recalculate account balance from transactions
// @route   PATCH /api/accounts/:id/recalculate
// @access  Private
export const recalculateBalance = async (req, res) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Transactions se income/expense sum karo
    const result = await Transaction.aggregate([
      { $match: { user: req.user._id, account: account._id } },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]);

    let income = 0;
    let expense = 0;

    result.forEach((r) => {
      if (r._id === "income") income = r.total;
      if (r._id === "expense") expense = r.total;
    });

    account.balance = account.initialBalance + income - expense;
    await account.save();

    res.json({
      message: "Balance recalculated",
      balance: account.balance,
      income,
      expense,
      initialBalance: account.initialBalance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get account detail with stats
// @route   GET /api/accounts/:id/detail
// @access  Private
export const getAccountDetail = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid account ID" });
    }

    const account = await Account.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    const { days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - Number(days));

    // Account-wise summary (income, expense, net)
    const summary = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          account: account._id,
          date: { $gte: since },
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

    let income = 0;
    let expense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    summary.forEach((s) => {
      if (s._id === "income") {
        income = s.total;
        incomeCount = s.count;
      }
      if (s._id === "expense") {
        expense = s.total;
        expenseCount = s.count;
      }
    });

    // Category breakdown (sirf expense)
    const categoryBreakdown = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          account: account._id,
          type: "expense",
          date: { $gte: since },
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
      {
        $project: {
          _id: 0,
          category: "$_id",
          total: 1,
          count: 1,
        },
      },
    ]);

    // Recent transactions
    const transactions = await Transaction.find({
      user: req.user._id,
      account: account._id,
    })
      .sort({ date: -1 })
      .limit(50);

    res.json({
      account,
      period: { days: Number(days), since },
      summary: {
        income,
        expense,
        net: income - expense,
        incomeCount,
        expenseCount,
        totalCount: incomeCount + expenseCount,
      },
      categoryBreakdown,
      transactions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};