import { useEffect, useState } from "react";
import API from "../services/api";
import Navbar from "../components/Navbar";
import Button from "../components/Button";
import Input from "../components/Input";
import { Link } from "react-router-dom";

const ACCOUNT_TYPES = [
  { value: "bank", label: "🏦 Bank Account" },
  { value: "credit_card", label: "💳 Credit Card" },
  { value: "wallet", label: "📱 Wallet (Paytm/GPay)" },
  { value: "cash", label: "💵 Cash" },
  { value: "investment", label: "📈 Investment" },
];

const ICONS = ["🏦", "💳", "📱", "💵", "📈", "💰", "🏧", "🪙", "💎", "🎯"];
const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    type: "bank",
    initialBalance: "",
    icon: "🏦",
    color: "#3b82f6",
    note: "",
  });

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/accounts");
      setAccounts(data.accounts);
      setTotalBalance(data.totalBalance);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      type: "bank",
      initialBalance: "",
      icon: "🏦",
      color: "#3b82f6",
      note: "",
    });
    setEditingId(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name) {
      setError("Account name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        type: form.type,
        icon: form.icon,
        color: form.color,
        note: form.note,
      };

      if (editingId) {
        await API.put(`/accounts/${editingId}`, payload);
      } else {
        payload.initialBalance = Number(form.initialBalance) || 0;
        await API.post("/accounts", payload);
      }

      resetForm();
      setShowForm(false);
      fetchAccounts();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save account");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (acc) => {
    setForm({
      name: acc.name,
      type: acc.type,
      initialBalance: acc.initialBalance,
      icon: acc.icon || "🏦",
      color: acc.color || "#3b82f6",
      note: acc.note || "",
    });
    setEditingId(acc._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id, name) => {
    if (
      !window.confirm(
        `Delete account "${name}"? Transactions linked to this account will block deletion.`
      )
    )
      return;

    try {
      await API.delete(`/accounts/${id}`);
      fetchAccounts();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const handleRecalculate = async (id) => {
    try {
      await API.patch(`/accounts/${id}/recalculate`);
      fetchAccounts();
      alert("Balance recalculated from transactions");
    } catch (err) {
      alert("Recalculate failed");
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
              Accounts
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Manage all your money sources
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            fullWidth
          >
            {showForm ? "Cancel" : "+ New Account"}
          </Button>
        </div>

        {/* Total Balance Card */}
        {!loading && accounts.length > 0 && (
          <div className="bg-linear-to-br from-blue-500 to-purple-600 rounded-2xl p-5 mb-4 sm:mb-6 text-white">
            <p className="text-xs sm:text-sm opacity-90 mb-1">
              Total Balance (All Accounts)
            </p>
            <p className="text-3xl sm:text-4xl font-bold">
              {formatINR(totalBalance)}
            </p>
            <p className="text-xs opacity-80 mt-2">
              Across {accounts.length} account{accounts.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-5 mb-4 sm:mb-6">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-4">
              {editingId ? "Edit Account" : "Create Account"}
            </h2>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-sm p-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Icon + Color Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Icon
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {ICONS.map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setForm({ ...form, icon: ic })}
                        className={`text-lg w-9 h-9 rounded-lg transition ${
                          form.icon === ic
                            ? "bg-blue-100 dark:bg-blue-900/50 ring-2 ring-blue-500"
                            : "bg-gray-100 dark:bg-gray-800"
                        }`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, color: c })}
                        className={`w-9 h-9 rounded-lg transition ${
                          form.color === c
                            ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900"
                            : ""
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <Input
                label="Account Name"
                name="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="SBI Savings"
              />

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Account Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {!editingId && (
                <Input
                  label="Opening Balance (₹)"
                  type="number"
                  name="initialBalance"
                  value={form.initialBalance}
                  onChange={(e) =>
                    setForm({ ...form, initialBalance: e.target.value })
                  }
                  placeholder="50000"
                  required={false}
                />
              )}

              <Input
                label="Note (optional)"
                name="note"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Salary account"
                required={false}
              />

              <div className="mt-4">
                <Button type="submit" disabled={saving} fullWidth>
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Account"
                    : "Create Account"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Accounts List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            Loading...
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">
              No accounts yet. Create one to start tracking.
            </p>
            <Button onClick={() => setShowForm(true)}>
              + Create First Account
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accounts.map((acc) => (
              <div
                key={acc._id}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition overflow-hidden"
              >
                <Link to={`/accounts/${acc._id}`} className="block p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0"
                        style={{ backgroundColor: `${acc.color}20` }}
                      >
                        {acc.icon}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate text-sm">
                          {acc.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {acc.type.replace("_", " ")}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons — Link ke andar, event stop karo */}
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEdit(acc);
                        }}
                        className="text-gray-400 hover:text-blue-500 transition text-sm p-1"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(acc._id, acc.name);
                        }}
                        className="text-gray-400 hover:text-red-500 transition text-sm p-1"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      Current Balance
                    </p>
                    <p
                      className={`text-2xl font-bold ${
                        acc.balance >= 0
                          ? "text-gray-800 dark:text-gray-100"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {formatINR(acc.balance)}
                    </p>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1.5 font-medium">
                      Tap to view details →
                    </p>
                  </div>
                </Link>

                {/* Recalculate button — Link ke bahar */}
                <div className="px-4 pb-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleRecalculate(acc._id);
                    }}
                    className="text-[11px] text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                  >
                    ↻ Recalculate from transactions
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}