import { useState, useEffect } from "react";
import Input from "./Input";
import Button from "./Button";
import API from "../services/api";
import ReceiptUpload from "./ReceiptUpload";
import VoiceInput from "./VoiceInput";

const CATEGORIES = [
  "Food",
  "Travel",
  "Rent",
  "Shopping",
  "Bills",
  "Health",
  "Education",
  "Entertainment",
  "Salary",
  "Freelance",
  "Investment",
  "Other",
];

const PAYMENT_METHODS = ["cash", "upi", "card", "netbanking", "other"];

export default function TransactionForm({ initialData, onSubmit, loading }) {
  const [form, setForm] = useState({
    type: initialData?.type || "expense",
    amount: initialData?.amount || "",
    category: initialData?.category || "Food",
    description: initialData?.description || "",
    paymentMethod: initialData?.paymentMethod || "upi",
    account: initialData?.account?._id || initialData?.account || "",
    date: initialData?.date
      ? new Date(initialData.date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    tags: initialData?.tags?.join(", ") || "",
  });

  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiConfidence, setAiConfidence] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(null);

  // Accounts load karo
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const { data } = await API.get("/accounts");
        setAccounts(data.accounts);
      } catch (err) {
        console.error("Failed to load accounts:", err);
      }
    };
    fetchAccounts();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
    setAiConfidence(null);
    setShowDuplicateWarning(false);
  };

  const handleAISuggest = async () => {
    if (!form.description || form.description.trim() === "") {
      setError("Please enter a description first");
      return;
    }

    setAiLoading(true);
    setError("");

    try {
      const { data } = await API.post("/ai/categorize", {
        description: form.description,
        type: form.type,
      });

      setForm({ ...form, category: data.category });
      setAiConfidence(data.confidence);
    } catch (err) {
      setError("AI suggestion failed. Please select manually.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleReceiptExtracted = (data) => {
    setForm((prev) => ({
      ...prev,
      amount: data.amount ?? prev.amount,
      category: data.category || prev.category,
      description: data.description || prev.description,
      date: data.date || prev.date,
    }));
    setAiConfidence(data.confidence);
  };

  const handleVoiceExtracted = (data) => {
    setForm((prev) => ({
      ...prev,
      amount: data.amount ?? prev.amount,
      type: data.type || prev.type,
      category: data.category || prev.category,
      description: data.description || prev.description,
    }));
    setAiConfidence(data.confidence);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setDuplicates([]);

    if (!form.amount || Number(form.amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    const payload = {
      type: form.type,
      amount: Number(form.amount),
      category: form.category,
      description: form.description,
      paymentMethod: form.paymentMethod,
      account: form.account || null,
      date: form.date,
      tags: form.tags
        ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
    };

    // Duplicate check — sirf naye transactions pe
    if (!initialData) {
      try {
        const { data } = await API.post("/transactions/check-duplicate", {
          amount: payload.amount,
          date: payload.date,
          category: payload.category,
          description: payload.description,
          type: payload.type,
        });

        if (data.hasDuplicates) {
          setDuplicates(data.duplicates);
          setPendingSubmit(payload);
          setShowDuplicateWarning(true);
          return;
        }
      } catch (err) {
        console.error("Duplicate check failed:", err);
      }
    }

    onSubmit(payload);
  };

  const handleConfirmDuplicate = () => {
    if (pendingSubmit) {
      onSubmit(pendingSubmit);
    }
    setShowDuplicateWarning(false);
    setPendingSubmit(null);
    setDuplicates([]);
  };

  const handleCancelDuplicate = () => {
    setShowDuplicateWarning(false);
    setPendingSubmit(null);
    setDuplicates([]);
  };

  return (
    <>
      {/* Duplicate Warning Modal */}
      {showDuplicateWarning && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-3xl">⚠️</span>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">
                  Duplicate Detected
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {duplicates.some((d) => d.matchLevel === "exact")
                    ? "Ye exact same transaction pehle se hai."
                    : "Same amount aur category ka transaction pehle se hai us din."}
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {duplicates.map((d) => (
                <div
                  key={d._id}
                  className={`p-3 rounded-xl border ${
                    d.matchLevel === "exact"
                      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                      : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                      {d.category}
                    </span>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                      ₹{d.amount}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                    {d.description || "(no description)"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(d.date).toLocaleDateString("en-IN")} ·{" "}
                    {d.paymentMethod?.toUpperCase()}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancelDuplicate}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDuplicate}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition"
              >
                Add Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 transition-colors"
      >
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <VoiceInput onExtracted={handleVoiceExtracted} />
        <ReceiptUpload onExtracted={handleReceiptExtracted} />

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Type
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <button
              type="button"
              onClick={() => setForm({ ...form, type: "expense" })}
              className={`py-2 rounded-md text-sm font-semibold transition ${
                form.type === "expense"
                  ? "bg-red-500 text-white shadow"
                  : "text-gray-600 dark:text-gray-300"
              }`}
            >
              💸 Expense
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, type: "income" })}
              className={`py-2 rounded-md text-sm font-semibold transition ${
                form.type === "income"
                  ? "bg-green-500 text-white shadow"
                  : "text-gray-600 dark:text-gray-300"
              }`}
            >
              💰 Income
            </button>
          </div>
        </div>

        <Input
          label="Amount (₹)"
          type="number"
          name="amount"
          value={form.amount}
          onChange={handleChange}
          placeholder="450"
        />

        <Input
          label="Description (optional)"
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Swiggy order"
          required={false}
        />

        {form.description && (
          <div className="mb-4">
            <button
              type="button"
              onClick={handleAISuggest}
              disabled={aiLoading}
              className="text-sm bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition font-medium disabled:opacity-50"
            >
              {aiLoading ? "✨ Thinking..." : "✨ AI Suggest Category"}
            </button>

            {aiConfidence !== null && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                AI confidence: {(aiConfidence * 100).toFixed(0)}%
                {aiConfidence < 0.6 && (
                  <span className="text-amber-600 dark:text-amber-400 ml-2">
                    ⚠️ Low — please verify
                  </span>
                )}
              </p>
            )}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Category
          </label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
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
          label="Date"
          type="date"
          name="date"
          value={form.date}
          onChange={handleChange}
        />

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Payment Method
          </label>
          <select
            name="paymentMethod"
            value={form.paymentMethod}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Account Selector */}
        {accounts.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Account
            </label>
            <select
              name="account"
              value={form.account}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No account</option>
              {accounts.map((acc) => (
                <option key={acc._id} value={acc._id}>
                  {acc.icon} {acc.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Selecting an account will auto-update its balance
            </p>
          </div>
        )}

        <Input
          label="Tags (comma separated, optional)"
          name="tags"
          value={form.tags}
          onChange={handleChange}
          placeholder="office, trip, urgent"
          required={false}
        />

        <div className="mt-6">
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "Saving..." : initialData ? "Update" : "Add Transaction"}
          </Button>
        </div>
      </form>
    </>
  );
}