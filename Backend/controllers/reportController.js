
import Transaction from "../models/Transaction.js";
import mongoose from "mongoose";

// Helper: Date range parse karo local timezone me
const buildDateFilter = (startDate, endDate) => {
  const dateFilter = {};
  if (startDate) {
    const [y, m, d] = startDate.split("-").map(Number);
    dateFilter.$gte = new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  if (endDate) {
    const [y, m, d] = endDate.split("-").map(Number);
    dateFilter.$lte = new Date(y, m - 1, d, 23, 59, 59, 999);
  }
  return dateFilter;
};

// @desc    Get report with filters
// @route   GET /api/reports
// @access  Private
export const getReport = async (req, res) => {
  try {
    const { startDate, endDate, account, type, category } = req.query;

    const filter = { user: req.user._id };

    if (startDate || endDate) {
      filter.date = buildDateFilter(startDate, endDate);
    }

    if (account && account !== "all") {
      filter.account = new mongoose.Types.ObjectId(account);
    }
    if (type && type !== "all") filter.type = type;
    if (category && category !== "all") filter.category = category;

    // Summary
    const summaryAgg = await Transaction.aggregate([
      { $match: filter },
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

    summaryAgg.forEach((s) => {
      if (s._id === "income") {
        income = s.total;
        incomeCount = s.count;
      }
      if (s._id === "expense") {
        expense = s.total;
        expenseCount = s.count;
      }
    });

    // Category breakdown
    const categoryAgg = await Transaction.aggregate([
      {
        $match: {
          ...filter,
          type: type === "income" ? "income" : "expense",
        },
      },
      {
        $group: {
          _id: { category: "$category", type: "$type" },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const expenseCategories = [];
    const incomeCategories = [];

    categoryAgg.forEach((c) => {
      const item = {
        category: c._id.category,
        total: c.total,
        count: c.count,
      };
      if (c._id.type === "expense") expenseCategories.push(item);
      if (c._id.type === "income") incomeCategories.push(item);
    });

    // Monthly trend
    const monthlyAgg = await Transaction.aggregate([
      { $match: filter },
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

    const monthlyMap = {};
    monthlyAgg.forEach((m) => {
      const key = `${m._id.year}-${String(m._id.month).padStart(2, "0")}`;
      if (!monthlyMap[key]) {
        monthlyMap[key] = {
          year: m._id.year,
          month: m._id.month,
          label: `${monthNames[m._id.month - 1]} ${String(m._id.year).slice(2)}`,
          income: 0,
          expense: 0,
        };
      }
      if (m._id.type === "income") monthlyMap[key].income = m.total;
      if (m._id.type === "expense") monthlyMap[key].expense = m.total;
    });

    const monthlyTrend = Object.values(monthlyMap).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    // Account-wise breakdown — sirf tab jab account filter 'all' ho
    let accountAgg = [];
    if (!account || account === "all") {
      accountAgg = await Transaction.aggregate([
        { $match: { ...filter, account: { $ne: null } } },
        {
          $group: {
            _id: "$account",
            income: {
              $sum: {
                $cond: [{ $eq: ["$type", "income"] }, "$amount", 0],
              },
            },
            expense: {
              $sum: {
                $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
              },
            },
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "accounts",
            localField: "_id",
            foreignField: "_id",
            as: "accountInfo",
          },
        },
        { $unwind: "$accountInfo" },
        {
          $project: {
            _id: 0,
            accountId: "$_id",
            name: "$accountInfo.name",
            icon: "$accountInfo.icon",
            color: "$accountInfo.color",
            income: 1,
            expense: 1,
            count: 1,
          },
        },
        { $sort: { expense: -1 } },
      ]);
    }

    // Transactions list
    const transactions = await Transaction.find(filter)
      .populate("account", "name icon color")
      .sort({ date: -1 })
      .limit(100);

    res.json({
      filters: { startDate, endDate, account, type, category },
      summary: {
        income,
        expense,
        net: income - expense,
        incomeCount,
        expenseCount,
        totalCount: incomeCount + expenseCount,
      },
      expenseCategories,
      incomeCategories,
      monthlyTrend,
      accountBreakdown: accountAgg,
      transactions,
    });
  } catch (error) {
    console.error("Report error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Export filtered transactions as CSV
// @route   GET /api/reports/export
// @access  Private
export const exportReportCSV = async (req, res) => {
  try {
    const { startDate, endDate, account, type, category } = req.query;

    const filter = { user: req.user._id };

    if (startDate || endDate) {
      filter.date = buildDateFilter(startDate, endDate);
    }

    if (account && account !== "all") {
      filter.account = new mongoose.Types.ObjectId(account);
    }
    if (type && type !== "all") filter.type = type;
    if (category && category !== "all") filter.category = category;

    const transactions = await Transaction.find(filter)
      .populate("account", "name")
      .sort({ date: -1 });

    if (transactions.length === 0) {
      return res
        .status(404)
        .json({ message: "No transactions in this range" });
    }

    const headers = [
      "Date",
      "Type",
      "Category",
      "Amount (INR)",
      "Description",
      "Payment Method",
      "Account",
      "Tags",
    ];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = transactions.map((t) => {
      const date = new Date(t.date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      return [
        date,
        t.type,
        t.category,
        t.amount,
        t.description || "",
        t.paymentMethod || "",
        t.account?.name || "",
        (t.tags || []).join("; "),
      ]
        .map(escapeCSV)
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    const today = new Date().toISOString().slice(0, 10);
    const filename = `report-${startDate || "all"}-to-${endDate || today}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    res.send("\uFEFF" + csv);
  } catch (error) {
    console.error("Report export error:", error);
    res.status(500).json({ message: "Failed to export report" });
  }
};