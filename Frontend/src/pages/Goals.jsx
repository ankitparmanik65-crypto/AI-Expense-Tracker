import { useEffect, useState } from "react";
import API from "../services/api";
import Navbar from "../components/Navbar";
import Button from "../components/Button";
import Input from "../components/Input";

const ICONS = ["🎯", "🏍️", "🚗", "💻", "📱", "✈️", "🏠", "🎓", "💍", "🎁", "💰", "🚴"];

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    targetAmount: "",
    savedAmount: "",
    deadline: "",
    icon: "🎯",
    note: "",
  });

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/goals");
      setGoals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      targetAmount: "",
      savedAmount: "",
      deadline: "",
      icon: "🎯",
      note: "",
    });
    setEditingId(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.targetAmount) {
      setError("Name and target amount required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        targetAmount: Number(form.targetAmount),
        savedAmount: Number(form.savedAmount) || 0,
        deadline: form.deadline || null,
        icon: form.icon,
        note: form.note,
      };

      if (editingId) {
        await API.put(`/goals/${editingId}`, payload);
      } else {
        await API.post("/goals", payload);
      }

      resetForm();
      setShowForm(false);
      fetchGoals();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save goal");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (goal) => {
    setForm({
      name: goal.name,
      targetAmount: goal.targetAmount,
      savedAmount: goal.savedAmount,
      deadline: goal.deadline ? goal.deadline.slice(0, 10) : "",
      icon: goal.icon || "🎯",
      note: goal.note || "",
    });
    setEditingId(goal._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this goal?")) return;
    try {
      await API.delete(`/goals/${id}`);
      fetchGoals();
    } catch (err) {
      alert("Delete failed");
    }
  };

  const handleQuickAdd = async (id) => {
    const amount = prompt("How much to add?");
    if (!amount || Number(amount) <= 0) return;
    try {
      await API.patch(`/goals/${id}/add`, { amount: Number(amount) });
      fetchGoals();
    } catch (err) {
      alert("Failed to add");
    }
  };

  const formatINR = (num) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num || 0);

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "No deadline";

  const daysLeft = (deadline) => {
    if (!deadline) return null;
    const diff = Math.ceil(
      (new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24)
    );
    return diff;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              Goals
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Track your savings targets
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
          >
            {showForm ? "Cancel" : "+ New Goal"}
          </Button>
        </div>

        {showForm && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 mb-6">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-4">
              {editingId ? "Edit Goal" : "Create Goal"}
            </h2>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-sm p-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setForm({ ...form, icon: ic })}
                      className={`text-2xl w-11 h-11 rounded-lg transition ${
                        form.icon === ic
                          ? "bg-blue-100 dark:bg-blue-900/50 ring-2 ring-blue-500"
                          : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Goal Name"
                name="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Buy a bike"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Target Amount (₹)"
                  type="number"
                  name="targetAmount"
                  value={form.targetAmount}
                  onChange={(e) =>
                    setForm({ ...form, targetAmount: e.target.value })
                  }
                  placeholder="80000"
                />

                <Input
                  label="Already Saved (₹)"
                  type="number"
                  name="savedAmount"
                  value={form.savedAmount}
                  onChange={(e) =>
                    setForm({ ...form, savedAmount: e.target.value })
                  }
                  placeholder="0"
                  required={false}
                />
              </div>

              <Input
                label="Deadline (optional)"
                type="date"
                name="deadline"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                required={false}
              />

              <Input
                label="Note (optional)"
                name="note"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Royal Enfield Hunter 350"
                required={false}
              />

              <div className="mt-4">
                <Button type="submit" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Goal"
                    : "Create Goal"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            Loading...
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No goals yet. Create one to start saving!
            </p>
            <Button onClick={() => setShowForm(true)}>
              + Create First Goal
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((g) => {
              const pct = g.progress || 0;
              const isComplete = g.completed || pct >= 100;
              const dLeft = daysLeft(g.deadline);

              return (
                <div
                  key={g._id}
                  className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm border p-5 ${
                    isComplete
                      ? "border-green-200 dark:border-green-800"
                      : "border-gray-100 dark:border-gray-800"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-3xl shrink-0">{g.icon}</span>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate">
                          {g.name}
                        </h3>
                        {g.note && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {g.note}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleEdit(g)}
                        className="text-gray-400 dark:text-gray-500 hover:text-blue-500 transition text-sm"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(g._id)}
                        className="text-gray-400 dark:text-gray-500 hover:text-red-500 transition text-sm"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        {formatINR(g.savedAmount)} /{" "}
                        {formatINR(g.targetAmount)}
                      </span>
                      <span
                        className={`font-bold ${
                          isComplete
                            ? "text-green-600 dark:text-green-400"
                            : "text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isComplete
                            ? "bg-green-500"
                            : pct >= 70
                            ? "bg-blue-500"
                            : "bg-blue-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 text-xs">
                    <div className="text-gray-500 dark:text-gray-400">
                      {isComplete ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          ✅ Goal achieved!
                        </span>
                      ) : (
                        <>
                          {formatDate(g.deadline)}
                          {dLeft !== null && dLeft >= 0 && (
                            <span className="ml-2 text-gray-400 dark:text-gray-500">
                              ({dLeft}d left)
                            </span>
                          )}
                          {dLeft !== null && dLeft < 0 && (
                            <span className="ml-2 text-red-500 dark:text-red-400">
                              (Overdue)
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {!isComplete && (
                      <button
                        onClick={() => handleQuickAdd(g._id)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                      >
                        + Add savings
                      </button>
                    )}
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