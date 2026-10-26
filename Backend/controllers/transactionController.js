import Transaction from "../models/Transaction.js";
import mongoose from "mongoose";
import {
  updateBalanceOnCreate,
  updateBalanceOnUpdate,
  updateBalanceOnDelete,
  handleAccountChange,
} from "../utils/balanceHelper.js";

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private
export const createTransaction = async (req, res) => {
  try {
    const {
      type,
      amount,
      category,
      description,
      paymentMethod,
      date,
      tags,
      account,
    } = req.body;

    // ⚠️ Duplicate check
    const checkDate = date ? new Date(date) : new Date();
    const start = new Date(checkDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(checkDate);
    end.setHours(23, 59, 59, 999);

    const exactDuplicate = await Transaction.findOne({
      user: req.user._id,
      type,
      amount: Number(amount),
      category,
      description: (description || "").trim(),
      date: { $gte: start, $lte: end },
    });

    if (exactDuplicate) {
      return res.status(409).json({
        message: "Duplicate transaction detected",
        duplicate: {
          _id: exactDuplicate._id,
          amount: exactDuplicate.amount,
          category: exactDuplicate.category,
          description: exactDuplicate.description,
          date: exactDuplicate.date,
        },
      });
    }

    const transaction = await Transaction.create({
      user: req.user._id,
      type,
      amount,
      category,
      description,
      paymentMethod,
      account: account || null,
      date: date || Date.now(),
      tags: tags || [],
    });

    // 💰 Account balance update karo
    if (account) {
      try {
        await updateBalanceOnCreate(account, type, amount);
      } catch (err) {
        console.error("Balance update error:", err.message);
      }
    }

    // 🔔 Budget alert check
    if (type === "expense") {
      try {
        const { checkBudgetAndAlert } = await import(
          "../utils/budgetAlertHelper.js"
        );
        checkBudgetAndAlert(req.user._id, category).catch((err) =>
          console.error("Budget alert error:", err.message)
        );
      } catch (err) {
        console.error("Budget alert import error:", err.message);
      }
    }

    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private
export const getTransactions = async (req, res) => {
  try {
    const { type, category, startDate, endDate, search, sort, account } =
      req.query;

    const filter = { user: req.user._id };

    if (type) filter.type = type;
    if (category) filter.category = category;
    if (account) filter.account = account;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    let sortOption = { date: -1 };
    if (sort === "oldest") sortOption = { date: 1 };
    if (sort === "amount_high") sortOption = { amount: -1 };
    if (sort === "amount_low") sortOption = { amount: 1 };

    const transactions = await Transaction.find(filter)
      .populate("account", "name icon color")
      .sort(sortOption);

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
export const getTransactionById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }

    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate("account", "name icon color");

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
export const updateTransaction = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }

    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Purane values save karo — balance adjust ke liye
    const oldType = transaction.type;
    const oldAmount = transaction.amount;
    const oldAccount = transaction.account;

    const allowedFields = [
      "type",
      "amount",
      "category",
      "description",
      "paymentMethod",
      "date",
      "tags",
      "account",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        transaction[field] = req.body[field];
      }
    });

    const updated = await transaction.save();

    // 💰 Balance adjust karo
    try {
      const newAccount = updated.account;

      if (oldAccount?.toString() !== newAccount?.toString()) {
        // Account change hua
        await handleAccountChange(
          oldAccount,
          newAccount,
          updated.type,
          updated.amount
        );
      } else if (newAccount) {
        // Same account — type/amount change ho sakta hai
        await updateBalanceOnUpdate(
          newAccount,
          oldType,
          oldAmount,
          updated.type,
          updated.amount
        );
      }
    } catch (err) {
      console.error("Balance update error:", err.message);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
export const deleteTransaction = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }

    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // 💰 Balance revert karo (delete se pehle)
    if (transaction.account) {
      try {
        await updateBalanceOnDelete(
          transaction.account,
          transaction.type,
          transaction.amount
        );
      } catch (err) {
        console.error("Balance revert error:", err.message);
      }
    }

    await transaction.deleteOne();

    res.json({ message: "Transaction deleted", id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get summary
// @route   GET /api/transactions/summary
// @access  Private
export const getSummary = async (req, res) => {
  try {
    const summary = await Transaction.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]);

    let income = 0;
    let expense = 0;

    summary.forEach((item) => {
      if (item._id === "income") income = item.total;
      if (item._id === "expense") expense = item.total;
    });

    res.json({ income, expense, balance: income - expense });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get category-wise breakdown
// @route   GET /api/transactions/category-summary
// @access  Private
export const getCategorySummary = async (req, res) => {
  try {
    const { type = "expense", startDate, endDate } = req.query;
    const match = { user: req.user._id, type };

    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }

    const data = await Transaction.aggregate([
      { $match: match },
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

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Monthly trend
// @route   GET /api/transactions/monthly-summary
// @access  Private
export const getMonthlySummary = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const data = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            type: "$type",
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        income: 0,
        expense: 0,
      });
    }

    data.forEach((item) => {
      const m = months.find(
        (x) => x.year === item._id.year && x.month === item._id.month
      );
      if (m) {
        if (item._id.type === "income") m.income = item.total;
        if (item._id.type === "expense") m.expense = item.total;
      }
    });

    res.json(
      months.map((m) => ({
        label: m.label,
        income: m.income,
        expense: m.expense,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check duplicate
// @route   POST /api/transactions/check-duplicate
// @access  Private
export const checkDuplicate = async (req, res) => {
  try {
    const { amount, date, category, description, type } = req.body;

    if (!amount || !date || !category) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const duplicates = await Transaction.find({
      user: req.user._id,
      type,
      amount: Number(amount),
      category,
      date: { $gte: start, $lte: end },
    }).limit(5);

    const results = duplicates.map((d) => {
      const sameDesc =
        (d.description || "").trim().toLowerCase() ===
        (description || "").trim().toLowerCase();

      return {
        _id: d._id,
        amount: d.amount,
        category: d.category,
        description: d.description,
        date: d.date,
        paymentMethod: d.paymentMethod,
        matchLevel: sameDesc ? "exact" : "similar",
      };
    });

    results.sort((a, b) =>
      a.matchLevel === "exact" && b.matchLevel !== "exact"
        ? -1
        : a.matchLevel !== "exact" && b.matchLevel === "exact"
        ? 1
        : 0
    );

    res.json({ hasDuplicates: results.length > 0, duplicates: results });
  } catch (error) {
    console.error("Check duplicate error:", error);
    res.status(500).json({ message: error.message });
  }
};