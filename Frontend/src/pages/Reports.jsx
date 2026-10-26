import { useEffect, useState } from "react";
import API from "../services/api";
import Navbar from "../components/Navbar";
import Button from "../components/Button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const CATEGORIES = [
  "Food", "Travel", "Rent", "Shopping", "Bills", "Health",
  "Education", "Entertainment", "Salary", "Freelance", "Investment", "Other",
];

// Date helpers
const toInputDate = (d) => {
  const date = new Date(d);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getPresets = () => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  return {
    thisMonth: { start: toInputDate(startOfMonth), end: toInputDate(today) },
    lastMonth: { start: toInputDate(startOfLastMonth), end: toInputDate(endOfLastMonth) },
    last3Months: { start: toInputDate(threeMonthsAgo), end: toInputDate(today) },
    thisYear: { start: toInputDate(startOfYear), end: toInputDate(today) },
  };
};

export default function Reports() {
  const presets = getPresets();
  const [startDate, setStartDate] = useState(presets.thisMonth.start);
  const [endDate, setEndDate] = useState(presets.thisMonth.end);
  const [account, setAccount] = useState("all");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");

  const [accounts, setAccounts] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Fetch accounts for filter dropdown
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const { data } = await API.get("/accounts");
        setAccounts(data.accounts);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAccounts();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (account !== "all") params.append("account", account);
      if (type !== "all") params.append("type", type);
      if (category !== "all") params.append("category", category);

      const { data } = await API.get(`/reports?${params.toString()}`);
      setReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, account, type, category]);

  const applyPreset = (key) => {
    const p = presets[key];
    setStartDate(p.start);
    setEndDate(p.end);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (account !== "all") params.append("account", account);
      if (type !== "all") params.append("type", type);
      if (category !== "all") params.append("category", category);

      const response = await API.get(`/reports/export?${params.toString()}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `report-${startDate}-to-${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      if (err.response?.status === 404) {
        alert("No transactions in this range");
      } else {
        alert("Export failed");
      }
    } finally {
      setExporting(false);
    }
  };

  const formatINR = (num) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num || 0);

  const shortINR = (num) => {
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(0)}k`;
    return `₹${num}`;
  };

  const maxExpenseTotal = report?.expenseCategories?.[0]?.total || 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
              Reports
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Detailed financial analysis
            </p>
          </div>
          <Button onClick={handleExport} disabled={exporting || !report}>
            {exporting ? "Exporting..." : "📄 Export CSV"}
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 mb-4">
          {/* Date presets */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {[
              { key: "thisMonth", label: "This Month" },
              { key: "lastMonth", label: "Last Month" },
              { key: "last3Months", label: "Last 3 Months" },
              { key: "thisYear", label: "This Year" },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition whitespace-nowrap font-medium"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Filters grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                From
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                To
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                Account
              </label>
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full px-2 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.icon} {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-2 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-2 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            Loading report...
          </div>
        ) : !report ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            No data
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  💰 Income
                </p>
                <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">
                  {formatINR(report.summary.income)}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  {report.summary.incomeCount} txn
                </p>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  💸 Expense
                </p>
                <p className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400">
                  {formatINR(report.summary.expense)}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  {report.summary.expenseCount} txn
                </p>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  💵 Net Savings
                </p>
                <p
                  className={`text-lg sm:text-xl font-bold ${
                    report.summary.net >= 0
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {report.summary.net >= 0 ? "+" : ""}
                  {formatINR(report.summary.net)}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  {report.summary.income > 0
                    ? `${Math.round(
                        (report.summary.net / report.summary.income) * 100
                      )}% savings rate`
                    : "—"}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  📊 Total Transactions
                </p>
                <p className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
                  {report.summary.totalCount}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  {startDate} → {endDate}
                </p>
              </div>
            </div>

            {/* Charts */}
            {report.monthlyTrend.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5 mb-4">
                <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-4">
                  📈 Monthly Trend
                </h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={report.monthlyTrend} barGap={4}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#374151"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={shortINR}
                      tick={{ fontSize: 12, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => formatINR(value)}
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #374151",
                        fontSize: 12,
                        backgroundColor: "rgba(31, 41, 55, 0.95)",
                        color: "#f3f4f6",
                      }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: 12 }}
                      formatter={(value) => (
                        <span className="text-gray-600 dark:text-gray-300 capitalize">
                          {value}
                        </span>
                      )}
                    />
                    <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="expense" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Expense Categories */}
              {report.expenseCategories.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5">
                  <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-4">
                    📊 Expense by Category
                  </h2>
                  <div className="space-y-3">
                    {report.expenseCategories.map((cat) => {
                      const pct = Math.round((cat.total / maxExpenseTotal) * 100);
                      return (
                        <div key={cat.category}>
                          <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="text-gray-700 dark:text-gray-200 font-medium">
                              {cat.category}
                            </span>
                            <div className="text-right">
                              <span className="font-bold text-gray-800 dark:text-gray-100">
                                {formatINR(cat.total)}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                ({cat.count})
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-linear-to-r from-red-500 to-orange-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Income Categories */}
              {report.incomeCategories.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5">
                  <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-4">
                    💰 Income by Category
                  </h2>
                  <div className="space-y-3">
                    {report.incomeCategories.map((cat) => (
                      <div key={cat.category}>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="text-gray-700 dark:text-gray-200 font-medium">
                            {cat.category}
                          </span>
                          <div className="text-right">
                            <span className="font-bold text-gray-800 dark:text-gray-100">
                              {formatINR(cat.total)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                              ({cat.count})
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-green-500 to-emerald-500"
                            style={{ width: `${Math.min((cat.total / report.summary.income) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Account Breakdown */}
            {report.accountBreakdown.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5 mb-4">
                <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-4">
                  💳 Account-wise Breakdown
                </h2>
                <div className="space-y-3">
                  {report.accountBreakdown.map((acc) => (
                    <div
                      key={acc.accountId}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                        style={{ backgroundColor: `${acc.color}30` }}
                      >
                        {acc.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">
                          {acc.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {acc.count} transactions
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                          +{formatINR(acc.income)}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                          -{formatINR(acc.expense)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transactions List */}
            {report.transactions.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5">
                <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-4">
                  📋 Transactions ({report.transactions.length}
                  {report.transactions.length === 100 ? "+" : ""})
                </h2>
                <div className="space-y-2 max-h-150 overflow-y-auto">
                  {report.transactions.map((t) => (
                    <div
                      key={t._id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                          {t.description || t.category}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t.category}
                          {t.account?.name && ` · ${t.account.name}`} ·{" "}
                          {new Date(t.date).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-bold shrink-0 ml-3 ${
                          t.type === "income"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {t.type === "income" ? "+" : "-"}
                        {formatINR(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}