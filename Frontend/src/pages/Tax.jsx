import { useEffect, useState } from "react";
import API from "../services/api";
import Navbar from "../components/Navbar";
import Button from "../components/Button";
import Input from "../components/Input";

const SECTIONS = [
  { value: "80C", label: "80C — PPF, ELSS, LIC, EPF", limit: 150000 },
  { value: "80D", label: "80D — Health Insurance", limit: 25000 },
  { value: "80CCD1B", label: "80CCD(1B) — NPS", limit: 50000 },
  { value: "24b", label: "24(b) — Home Loan Interest", limit: 200000 },
  { value: "80E", label: "80E — Education Loan", limit: null },
  { value: "80G", label: "80G — Donations", limit: null },
  { value: "HRA", label: "HRA — House Rent", limit: null },
  { value: "Other", label: "Other", limit: null },
];

// Current FY
const getCurrentFY = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
};

// Get last 5 FYs
const getFYOptions = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const currentStart = month >= 4 ? year : year - 1;
  const options = [];
  for (let i = 0; i < 5; i++) {
    const startYear = currentStart - i;
    options.push(`${startYear}-${String(startYear + 1).slice(2)}`);
  }
  return options;
};

export default function Tax() {
  const [fy, setFy] = useState(getCurrentFY());
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expandedSection, setExpandedSection] = useState(null);

  const [form, setForm] = useState({
    section: "80C",
    name: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    provider: "",
    note: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [investRes, summaryRes] = await Promise.all([
        API.get(`/tax?fy=${fy}`),
        API.get(`/tax/summary?fy=${fy}`),
      ]);
      setData(investRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fy]);

  const resetForm = () => {
    setForm({
      section: "80C",
      name: "",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      provider: "",
      note: "",
    });
    setEditingId(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.amount) {
      setError("Name and amount are required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        section: form.section,
        name: form.name,
        amount: Number(form.amount),
        date: form.date,
        provider: form.provider,
        note: form.note,
      };

      if (editingId) {
        await API.put(`/tax/${editingId}`, payload);
      } else {
        await API.post("/tax", payload);
      }

      resetForm();
      setShowForm(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (inv) => {
    setForm({
      section: inv.section,
      name: inv.name,
      amount: inv.amount,
      date: new Date(inv.date).toISOString().slice(0, 10),
      provider: inv.provider || "",
      note: inv.note || "",
    });
    setEditingId(inv._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this investment?")) return;
    try {
      await API.delete(`/tax/${id}`);
      fetchData();
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

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
              📋 Tax Savings
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Track your tax-saving investments (80C, 80D, etc.)
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            fullWidth
          >
            {showForm ? "Cancel" : "+ Add Investment"}
          </Button>
        </div>

        {/* FY Selector */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {getFYOptions().map((year) => (
            <button
              key={year}
              onClick={() => setFy(year)}
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg transition whitespace-nowrap font-medium ${
                fy === year
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
              }`}
            >
              FY {year}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        {!loading && data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                💰 Total Invested
              </p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {formatINR(data.summary.totalInvested)}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                📊 Total Deductions
              </p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {formatINR(data.summary.totalDeductions)}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                of {formatINR(data.summary.maxPossibleDeduction)} possible
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                💵 Est. Tax Saved
              </p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {formatINR(data.summary.estimatedTaxSaved)}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                @ 30% slab + 4% cess
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-5 mb-6">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-4">
              {editingId ? "Edit Investment" : "Add Tax Investment"}
            </h2>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-sm p-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Tax Section
                </label>
                <select
                  value={form.section}
                  onChange={(e) =>
                    setForm({ ...form, section: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SECTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                      {s.limit ? ` — ₹${s.limit.toLocaleString("en-IN")} limit` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Investment Name"
                name="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="PPF Deposit"
              />

              <Input
                label="Amount (₹)"
                type="number"
                name="amount"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="50000"
              />

              <Input
                label="Date"
                type="date"
                name="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />

              <Input
                label="Provider (optional)"
                name="provider"
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                placeholder="SBI / HDFC Life"
                required={false}
              />

              <Input
                label="Note (optional)"
                name="note"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Paid via netbanking"
                required={false}
              />

              <div className="mt-4">
                <Button type="submit" disabled={saving} fullWidth>
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Investment"
                    : "Add Investment"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* AI Summary */}
        {summary && (summary.aiSummary || summary.aiSuggestions?.length > 0) && (
          <div className="bg-linear-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-4 sm:p-5 mb-6">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
              ✨ AI Tax Advisor
            </h3>

            {summary.aiSummary && (
              <div className="bg-white dark:bg-gray-900 rounded-xl p-3 mb-3">
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                  💡 {summary.aiSummary}
                </p>
              </div>
            )}

            {summary.aiSuggestions?.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  🎯 Suggestions
                </p>
                <ul className="space-y-1.5">
                  {summary.aiSuggestions.map((s, i) => (
                    <li
                      key={i}
                      className="text-xs text-gray-600 dark:text-gray-300 flex items-start gap-2"
                    >
                      <span className="text-indigo-500 dark:text-indigo-400">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Section Progress Cards */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            Loading...
          </div>
        ) : !data || data.sections.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">
              No tax investments yet. Start tracking!
            </p>
            <Button onClick={() => setShowForm(true)}>
              + Add First Investment
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {data.sections.map((sec) => {
              const isExpanded = expandedSection === sec.section;
              const hasLimit = sec.limit !== null;
              const barColor = !hasLimit
                ? "bg-blue-500"
                : sec.percentage >= 100
                ? "bg-green-500"
                : sec.percentage >= 70
                ? "bg-blue-500"
                : sec.percentage >= 30
                ? "bg-amber-500"
                : "bg-red-500";

              return (
                <div
                  key={sec.section}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedSection(isExpanded ? null : sec.section)
                    }
                    className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                  >
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-gray-800 dark:text-gray-100 text-sm">
                            {sec.section}
                          </span>
                          {hasLimit && sec.percentage >= 100 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-medium">
                              MAXED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {sec.label}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">
                          {formatINR(sec.used)}
                        </p>
                        {hasLimit && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            of {formatINR(sec.limit)}
                          </p>
                        )}
                      </div>
                    </div>

                    {hasLimit && (
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${barColor}`}
                          style={{ width: `${Math.min(sec.percentage, 100)}%` }}
                        />
                      </div>
                    )}

                    <div className="flex justify-between mt-1.5 text-xs">
                      <span className="text-gray-500 dark:text-gray-400">
                        {sec.count} investment{sec.count !== 1 ? "s" : ""}
                      </span>
                      {hasLimit && (
                        <span
                          className={`font-medium ${
                            sec.remaining > 0
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-green-600 dark:text-green-400"
                          }`}
                        >
                          {sec.remaining > 0
                            ? `${formatINR(sec.remaining)} left`
                            : "Limit reached"}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Expanded investments list */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-800 p-3 bg-gray-50 dark:bg-gray-800/30">
                      {sec.investments.map((inv) => (
                        <div
                          key={inv._id}
                          className="flex items-center justify-between p-2 mb-1 rounded-lg bg-white dark:bg-gray-900"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                              {inv.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(inv.date).toLocaleDateString("en-IN")}
                              {inv.provider && ` · ${inv.provider}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                              {formatINR(inv.amount)}
                            </span>
                            <button
                              onClick={() => handleEdit(inv)}
                              className="text-gray-400 hover:text-blue-500 transition text-sm p-1"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(inv._id)}
                              className="text-gray-400 hover:text-red-500 transition text-sm p-1"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}