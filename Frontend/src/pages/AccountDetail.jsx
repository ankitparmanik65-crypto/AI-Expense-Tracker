import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API from "../services/api";
import Navbar from "../components/Navbar";
import Button from "../components/Button";
import TransactionItem from "../components/TransactionItem";

const PERIODS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "3 months", value: 90 },
  { label: "All time", value: 3650 },
];

export default function AccountDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [error, setError] = useState("");

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const { data } = await API.get(`/accounts/${id}/detail?days=${period}`);
      setData(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load account");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id, period]);

  const handleDeleteTransaction = async (txId) => {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await API.delete(`/transactions/${txId}`);
      fetchDetail();
    } catch (err) {
      alert("Delete failed");
    }
  };

  const formatINR = (num) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num || 0);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="text-center py-12 text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-red-500 mb-4">{error || "Account not found"}</p>
          <Link to="/accounts">
            <Button>← Back to Accounts</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { account, summary, categoryBreakdown, transactions } = data;
  const maxCategoryTotal = categoryBreakdown[0]?.total || 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Back button */}
        <button
          onClick={() => navigate("/accounts")}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4 flex items-center gap-1"
        >
          ← Back to Accounts
        </button>

        {/* Account Header */}
        <div
          className="rounded-2xl p-5 mb-4 sm:mb-6 text-white"
          style={{
            background: `linear-gradient(135deg, ${account.color}, ${account.color}dd)`,
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="text-4xl">{account.icon}</div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{account.name}</h1>
              <p className="text-xs opacity-90 capitalize">
                {account.type.replace("_", " ")}
              </p>
            </div>
          </div>
          <p className="text-xs opacity-80 mb-0.5">Current Balance</p>
          <p className="text-3xl sm:text-4xl font-bold">
            {formatINR(account.balance)}
          </p>
        </div>

        {/* Period Filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg transition whitespace-nowrap font-medium ${
                period === p.value
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Income
              </span>
              <span className="text-lg">📈</span>
            </div>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatINR(summary.income)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {summary.incomeCount} transaction{summary.incomeCount !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Expense
              </span>
              <span className="text-lg">📉</span>
            </div>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {formatINR(summary.expense)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {summary.expenseCount} transaction{summary.expenseCount !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Net Change
              </span>
              <span className="text-lg">💵</span>
            </div>
            <p
              className={`text-xl font-bold ${
                summary.net >= 0
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {summary.net >= 0 ? "+" : ""}
              {formatINR(summary.net)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {summary.totalCount} total
            </p>
          </div>
        </div>

        {/* Category Breakdown */}
        {categoryBreakdown.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5 mb-6">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-4">
              📊 Where the money went
            </h2>
            <div className="space-y-3">
              {categoryBreakdown.map((cat) => {
                const pct = Math.round((cat.total / maxCategoryTotal) * 100);
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
                        className="h-full rounded-full bg-linear-to-r from-blue-500 to-purple-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transactions List */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">
            Recent Transactions
          </h2>

          {transactions.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No transactions in this period.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((t) => (
                <TransactionItem
                  key={t._id}
                  transaction={t}
                  onDelete={handleDeleteTransaction}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}