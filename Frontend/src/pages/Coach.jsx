import { useEffect, useState } from "react";
import API from "../services/api";
import Navbar from "../components/Navbar";
import Button from "../components/Button";

export default function Coach() {
  const [plan, setPlan] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [planRes, historyRes] = await Promise.all([
        API.get("/coach"),
        API.get("/coach/history"),
      ]);
      setPlan(planRes.data);
      setHistory(historyRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegenerate = async () => {
    if (!window.confirm("Generate a fresh plan? Ye current plan replace kar dega.")) return;

    setRegenerating(true);
    try {
      const { data } = await API.post("/coach/regenerate");
      setPlan(data);
    } catch (err) {
      alert("Failed to regenerate");
    } finally {
      setRegenerating(false);
    }
  };

  const formatINR = (num) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num || 0);

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />

      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
              🧠 AI Coach
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Your personalized weekly financial plan
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowHistory(!showHistory)}
              variant="secondary"
            >
              {showHistory ? "Hide History" : "📜 History"}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            Generating your weekly plan...
          </div>
        ) : !plan ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            No plan available
          </div>
        ) : (
          <>
            {/* Hero Card */}
            <div className="bg-linear-to-br from-purple-500 via-indigo-500 to-blue-500 rounded-2xl p-5 sm:p-6 mb-4 text-white">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs opacity-90">
                    {formatDate(plan.weekStart)} — {formatDate(plan.weekEnd)}
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-bold mt-1">
                    {plan.greeting}
                  </h2>
                </div>
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="text-xs bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 py-1.5 rounded-lg transition font-medium disabled:opacity-50 whitespace-nowrap"
                >
                  {regenerating ? "Regenerating..." : "↻ New Plan"}
                </button>
              </div>

              {plan.summary && (
                <p className="text-sm leading-relaxed opacity-95">
                  {plan.summary}
                </p>
              )}
            </div>

            {/* Based On Data */}
            {plan.basedOnData && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 mb-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                  📊 Based on your last 30 days
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Income
                    </p>
                    <p className="font-bold text-green-600 dark:text-green-400 text-sm">
                      {formatINR(plan.basedOnData.totalIncome)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Expense
                    </p>
                    <p className="font-bold text-red-600 dark:text-red-400 text-sm">
                      {formatINR(plan.basedOnData.totalExpense)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Savings
                    </p>
                    <p className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                      {plan.basedOnData.savingsRate}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Focus Areas */}
            {plan.focusAreas?.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5 mb-4">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3">
                  🎯 Focus Areas
                </h3>
                <div className="space-y-3">
                  {plan.focusAreas.map((f, i) => {
                    const reduction = f.currentSpend - f.targetSpend;
                    return (
                      <div
                        key={i}
                        className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-xl p-3"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                            {f.category}
                          </span>
                          <div className="text-right">
                            <span className="text-xs text-gray-500 dark:text-gray-400 line-through mr-2">
                              {formatINR(f.currentSpend)}
                            </span>
                            <span className="font-bold text-amber-700 dark:text-amber-300 text-sm">
                              {formatINR(f.targetSpend)}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          {f.reason}
                        </p>
                        {reduction > 0 && (
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">
                            Save up to {formatINR(reduction)}/month
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Daily Missions */}
            {plan.dailyMissions?.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5 mb-4">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3">
                  📅 This Week's Missions
                </h3>
                <div className="space-y-2">
                  {plan.dailyMissions.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                    >
                      <div className="text-xl shrink-0 mt-0.5">{m.icon}</div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                          {m.day}
                        </p>
                        <p className="text-sm text-gray-800 dark:text-gray-100 mt-0.5">
                          {m.mission}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly Challenges */}
            {plan.challenges?.length > 0 && (
              <div className="bg-linear-to-br from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/40 border border-rose-100 dark:border-rose-900/50 rounded-2xl p-4 sm:p-5 mb-4">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3">
                  🏆 Weekly Challenges
                </h3>
                <div className="space-y-2">
                  {plan.challenges.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200"
                    >
                      <span className="text-rose-500 dark:text-rose-400 font-bold shrink-0">
                        #{i + 1}
                      </span>
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Motivational Message */}
            {plan.motivationalMessage && (
              <div className="bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 border border-green-100 dark:border-green-900/50 rounded-2xl p-4 sm:p-5 mb-4">
                <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed italic">
                  💬 {plan.motivationalMessage}
                </p>
              </div>
            )}
          </>
        )}

        {/* History */}
        {showHistory && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 mt-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3">
              📜 Past Plans
            </h3>
            {history.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No past plans yet.
              </p>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div
                    key={h._id}
                    className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                  >
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(h.weekStart)} — {formatDate(h.weekEnd)}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-200 mt-1 line-clamp-2">
                      {h.summary}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}