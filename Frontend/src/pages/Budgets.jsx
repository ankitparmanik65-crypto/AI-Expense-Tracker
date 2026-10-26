import { useEffect, useState } from "react";
import API from "../services/api";
import Navbar from "../components/Navbar";
import Button from "../components/Button";
import Input from "../components/Input";

const CATEGORIES = [
  "Food",
  "Travel",
  "Rent",
  "Shopping",
  "Bills",
  "Health",
  "Education",
  "Entertainment",
  "Other",
];

const STATUS_STYLES = {
  safe: {
    bar: "bg-green-500",
    bg: "bg-green-50 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
    label: "On track",
  },
  warning: {
    bar: "bg-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    label: "Nearing limit",
  },
  exceeded: {
    bar: "bg-red-500",
    bg: "bg-red-50 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
    label: "Exceeded",
  },
};

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "Food", limit: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/budgets");
      setBudgets(data.budgets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.limit || Number(form.limit) <= 0) {
      setError("Please enter a valid limit");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await API.post("/budgets", {
        category: form.category,
        limit: Number(form.limit),
      });
      setForm({ category: "Food", limit: "" });
      setShowForm(false);
      fetchBudgets();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save budget");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this budget?")) return;
    try {
      await API.delete(`/budgets/${id}`);
      fetchBudgets();
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              Budgets
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Set monthly limits per category
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ New Budget"}
          </Button>
        </div>

        {showForm && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 mb-6">
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-sm p-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Monthly Limit (₹)"
                  type="number"
                  name="limit"
                  value={form.limit}
                  onChange={(e) => setForm({ ...form, limit: e.target.value })}
                  placeholder="5000"
                />
              </div>

              <div className="mt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Budget"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            Loading...
          </div>
        ) : budgets.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No budgets yet. Set one to start tracking!
            </p>
            <Button onClick={() => setShowForm(true)}>
              + Create First Budget
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {budgets.map((b) => {
              const style = STATUS_STYLES[b.status] || STATUS_STYLES.safe;
              const cappedPercentage = Math.min(b.percentage, 100);

              return (
                <div
                  key={b._id}
                  className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-800 dark:text-gray-100">
                        {b.category}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatINR(b.spent)} of {formatINR(b.limit)} spent
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${style.bg} ${style.text}`}
                      >
                        {style.label}
                      </span>
                      <button
                        onClick={() => handleDelete(b._id)}
                        className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${style.bar}`}
                      style={{ width: `${cappedPercentage}%` }}
                    />
                  </div>

                  <div className="flex justify-between mt-2">
                    <span className={`text-xs font-medium ${style.text}`}>
                      {b.percentage}% used
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {b.percentage >= 100
                        ? `${formatINR(b.spent - b.limit)} over`
                        : `${formatINR(b.remaining)} left`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}