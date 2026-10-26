import Transaction from "../models/Transaction.js";

/**
 * Pichle 30 days ka analysis data collect karo
 */
export const gatherAnalyticsData = async (userId) => {
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  // This period (last 30 days)
  const thisPeriod = await Transaction.aggregate([
    { $match: { user: userId, date: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: { type: "$type", category: "$category" },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  // Previous period (30-60 days ago) for comparison
  const prevPeriod = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        date: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: { type: "$type", category: "$category" },
        total: { $sum: "$amount" },
      },
    },
  ]);

  // Build category-wise totals
  const current = { income: {}, expense: {} };
  const previous = { income: {}, expense: {} };

  thisPeriod.forEach((item) => {
    const t = item._id.type;
    const cat = item._id.category;
    if (!current[t][cat]) current[t][cat] = { total: 0, count: 0 };
    current[t][cat].total = item.total;
    current[t][cat].count = item.count;
  });

  prevPeriod.forEach((item) => {
    const t = item._id.type;
    const cat = item._id.category;
    if (!previous[t][cat]) previous[t][cat] = { total: 0 };
    previous[t][cat].total = item.total;
  });

  // Totals
  const currentIncome = Object.values(current.income).reduce(
    (a, b) => a + b.total,
    0
  );
  const currentExpense = Object.values(current.expense).reduce(
    (a, b) => a + b.total,
    0
  );
  const prevExpense = Object.values(previous.expense).reduce(
    (a, b) => a + b.total,
    0
  );

  // Top categories
  const topCategories = Object.entries(current.expense)
    .map(([cat, data]) => ({
      category: cat,
      total: data.total,
      count: data.count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Category-wise change vs previous period
  const categoryChanges = topCategories.map((cat) => {
    const prev = previous.expense[cat.category]?.total || 0;
    const change = prev > 0 ? ((cat.total - prev) / prev) * 100 : 0;
    return {
      category: cat.category,
      current: cat.total,
      previous: prev,
      changePercent: Math.round(change),
    };
  });

  return {
    period: "last 30 days",
    totalIncome: currentIncome,
    totalExpense: currentExpense,
    savings: currentIncome - currentExpense,
    savingsRate:
      currentIncome > 0
        ? Math.round(((currentIncome - currentExpense) / currentIncome) * 100)
        : 0,
    prevExpense,
    expenseChangePercent:
      prevExpense > 0
        ? Math.round(((currentExpense - prevExpense) / prevExpense) * 100)
        : 0,
    topCategories,
    categoryChanges,
    transactionCount: thisPeriod.reduce((a, b) => a + b.count, 0),
  };
};