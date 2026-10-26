import { useEffect, useState } from "react";
import API from "../services/api";
import Navbar from "../components/Navbar";
import Button from "../components/Button";
import Input from "../components/Input";

const RISK_OPTIONS = [
  {
    value: "conservative",
    label: "🛡️ Conservative",
    desc: "Low risk, 8% returns",
  },
  {
    value: "moderate",
    label: "⚖️ Moderate",
    desc: "Balanced, 12% returns",
  },
  {
    value: "aggressive",
    label: "🚀 Aggressive",
    desc: "High risk, 14% returns",
  },
];

export default function Planning() {
  const [profile, setProfile] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    age: "",
    retirementAge: "60",
    monthlyIncome: "",
    dependents: "0",
    riskAppetite: "moderate",
    existingSavings: "",
    existingInvestments: "",
    existingDebt: "",
    city: "",
    occupation: "",
    notes: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profileRes, planRes] = await Promise.all([
        API.get("/planning/profile"),
        API.get("/planning/plan").catch(() => ({ data: null })),
      ]);

      setProfile(profileRes.data);
      setPlan(planRes.data);

      if (profileRes.data && !profileRes.data.isNew) {
        setForm({
          age: profileRes.data.age || "",
          retirementAge: profileRes.data.retirementAge || "60",
          monthlyIncome: profileRes.data.monthlyIncome || "",
          dependents: profileRes.data.dependents || "0",
          riskAppetite: profileRes.data.riskAppetite || "moderate",
          existingSavings: profileRes.data.existingSavings || "",
          existingInvestments: profileRes.data.existingInvestments || "",
          existingDebt: profileRes.data.existingDebt || "",
          city: profileRes.data.city || "",
          occupation: profileRes.data.occupation || "",
          notes: profileRes.data.notes || "",
        });
      } else {
        setShowProfileForm(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const { data } = await API.post("/planning/profile", form);
      setProfile(data);
      setShowProfileForm(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePlan = async () => {
    setGenerating(true);
    setError("");
    try {
      const { data } = await API.post("/planning/plan/generate");
      setPlan(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to generate plan. Please try again."
      );
    } finally {
      setGenerating(false);
    }
  };

  const formatINR = (num) => {
    if (!num) return "₹0";
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
    return `₹${num}`;
  };

  const formatINRFull = (num) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num || 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="text-center py-12 text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
              🎯 Financial Planning
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Your personalized financial roadmap
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => setShowProfileForm(!showProfileForm)}
              variant="secondary"
            >
              {showProfileForm ? "Cancel" : "⚙️ Profile"}
            </Button>
            {profile && !profile.isNew && (
              <Button onClick={handleGeneratePlan} disabled={generating}>
                {generating
                  ? "Generating..."
                  : plan
                  ? "↻ Refresh Plan"
                  : "✨ Generate Plan"}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Profile Form */}
        {showProfileForm && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-5 mb-6">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-4">
              {profile?.isNew ? "Fill Your Financial Profile" : "Edit Profile"}
            </h2>

            <form onSubmit={handleSaveProfile}>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
                <Input
                  label="Your Age"
                  type="number"
                  name="age"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  placeholder="30"
                />
                <Input
                  label="Retirement Age"
                  type="number"
                  name="retirementAge"
                  value={form.retirementAge}
                  onChange={(e) =>
                    setForm({ ...form, retirementAge: e.target.value })
                  }
                  placeholder="60"
                />
              </div>

              <Input
                label="Monthly Income (₹)"
                type="number"
                name="monthlyIncome"
                value={form.monthlyIncome}
                onChange={(e) =>
                  setForm({ ...form, monthlyIncome: e.target.value })
                }
                placeholder="50000"
                required={false}
              />

              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
                <Input
                  label="Dependents"
                  type="number"
                  name="dependents"
                  value={form.dependents}
                  onChange={(e) =>
                    setForm({ ...form, dependents: e.target.value })
                  }
                  placeholder="0"
                  required={false}
                />
                <Input
                  label="City"
                  name="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Mumbai"
                  required={false}
                />
              </div>

              <Input
                label="Occupation"
                name="occupation"
                value={form.occupation}
                onChange={(e) =>
                  setForm({ ...form, occupation: e.target.value })
                }
                placeholder="Software Engineer"
                required={false}
              />

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Risk Appetite
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {RISK_OPTIONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setForm({ ...form, riskAppetite: r.value })}
                      className={`p-3 rounded-xl text-left transition border-2 ${
                        form.riskAppetite === r.value
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                        {r.label}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {r.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <Input
                  label="Existing Savings (₹)"
                  type="number"
                  name="existingSavings"
                  value={form.existingSavings}
                  onChange={(e) =>
                    setForm({ ...form, existingSavings: e.target.value })
                  }
                  placeholder="50000"
                  required={false}
                />
                <Input
                  label="Existing Investments (₹)"
                  type="number"
                  name="existingInvestments"
                  value={form.existingInvestments}
                  onChange={(e) =>
                    setForm({ ...form, existingInvestments: e.target.value })
                  }
                  placeholder="100000"
                  required={false}
                />
                <Input
                  label="Existing Debt (₹)"
                  type="number"
                  name="existingDebt"
                  value={form.existingDebt}
                  onChange={(e) =>
                    setForm({ ...form, existingDebt: e.target.value })
                  }
                  placeholder="0"
                  required={false}
                />
              </div>

              <div className="mt-4">
                <Button type="submit" fullWidth disabled={saving}>
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Empty State */}
        {!plan && !showProfileForm && profile && !profile.isNew && !generating && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 text-center">
            <p className="text-4xl mb-3">🎯</p>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Profile ready! Apna personalized financial plan generate karo.
            </p>
            <Button onClick={handleGeneratePlan}>
              ✨ Generate My Financial Plan
            </Button>
          </div>
        )}

        {/* Loading State */}
        {generating && (
          <div className="bg-linear-to-br from-purple-500 to-blue-500 rounded-2xl p-8 text-center text-white mb-6">
            <p className="text-4xl mb-3 animate-pulse">🎯</p>
            <p className="font-bold text-lg">Generating your plan...</p>
            <p className="text-sm opacity-90 mt-1">
              Formula calculations + AI enhancement
            </p>
          </div>
        )}

        {/* Plan Display */}
        {plan && !generating && (
          <>
            {/* Overview Hero */}
            <div className="bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-5 sm:p-6 mb-4 text-white">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div>
                  <p className="text-xs opacity-90">
                    Generated{" "}
                    {new Date(plan.generatedAt).toLocaleDateString("en-IN")}
                  </p>
                  <h2 className="text-2xl font-bold mt-1">
                    Your Financial Roadmap
                  </h2>
                </div>
                <span className="text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full whitespace-nowrap">
                  {plan.aiEnhanced ? "✨ AI Enhanced" : "📊 Formula Based"}
                </span>
              </div>

              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 mb-3">
                <p className="text-xs font-semibold opacity-90 mb-1">
                  📍 Current Status
                </p>
                <p className="text-sm leading-relaxed">
                  {plan.overview?.currentStatus}
                </p>
              </div>

              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3">
                <p className="text-xs font-semibold opacity-90 mb-1">
                  🎯 Target
                </p>
                <p className="text-sm leading-relaxed">
                  {plan.overview?.targetStatus}
                </p>
              </div>
            </div>

            {/* Summary */}
            {plan.overview?.summaryText && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 mb-4">
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                  💡 {plan.overview.summaryText}
                </p>
              </div>
            )}

            {/* Warnings */}
            {plan.warnings?.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-4">
                <p className="font-bold text-red-900 dark:text-red-200 mb-2 text-sm">
                  ⚠️ Important Warnings
                </p>
                <ul className="space-y-1.5">
                  {plan.warnings.map((w, i) => (
                    <li
                      key={i}
                      className="text-xs text-red-800 dark:text-red-300 flex items-start gap-2"
                    >
                      <span>•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Retirement Plan */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5 mb-4">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                🏖️ Retirement Plan
              </h3>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Target Age
                  </p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {plan.retirementPlan.targetAge} yrs
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Years Left
                  </p>
                  <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                    {plan.retirementPlan.yearsLeft} yrs
                  </p>
                </div>
              </div>

              <div className="bg-linear-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 rounded-xl p-4 mb-4">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Corpus Needed
                </p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {formatINR(plan.retirementPlan.estimatedCorpus)}
                </p>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-indigo-200 dark:border-indigo-800 text-xs">
                  <span className="text-gray-600 dark:text-gray-400">
                    Monthly SIP needed:
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {formatINRFull(plan.retirementPlan.monthlyInvestmentNeeded)}
                  </span>
                </div>
              </div>

              {/* Allocation */}
              {plan.retirementPlan.recommendedAllocation?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    💼 Recommended Allocation
                  </p>
                  <div className="space-y-2">
                    {plan.retirementPlan.recommendedAllocation.map((a, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-gray-700 dark:text-gray-200">
                            {a.asset}
                          </span>
                          <span className="font-bold text-gray-800 dark:text-gray-100">
                            {a.percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-indigo-500 to-purple-500"
                            style={{ width: `${a.percentage}%` }}
                          />
                        </div>
                        {a.reason && (
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {a.reason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              {plan.retirementPlan.tips?.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    💡 Retirement Tips
                  </p>
                  <ul className="space-y-1.5">
                    {plan.retirementPlan.tips.map((t, i) => (
                      <li
                        key={i}
                        className="text-xs text-gray-600 dark:text-gray-300 flex items-start gap-2"
                      >
                        <span className="text-indigo-500">•</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Emergency Fund */}
            {plan.emergencyFund && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5 mb-4">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                  🚨 Emergency Fund
                </h3>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Recommended
                    </p>
                    <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                      {formatINR(plan.emergencyFund.recommended)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Current
                    </p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {formatINR(plan.emergencyFund.current)}
                    </p>
                  </div>
                </div>

                {plan.emergencyFund.gap > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                    <p className="text-xs text-amber-900 dark:text-amber-200">
                      ⚠️ {formatINR(plan.emergencyFund.gap)} ki kami hai. Pehle
                      ye pura karo.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Goal Plans */}
            {plan.goalPlans?.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5 mb-4">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3">
                  🎯 Goal Plans
                </h3>
                <div className="space-y-2">
                  {plan.goalPlans.map((g, i) => (
                    <div
                      key={i}
                      className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                          {g.goalName}
                        </span>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          {formatINR(g.targetAmount)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>⏱️ {g.yearsToGoal} yrs</span>
                        <span>💰 {formatINRFull(g.monthlyInvestmentNeeded)}/mo</span>
                      </div>
                      {g.recommendation && (
                        <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1.5">
                          {g.recommendation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly Budget Plan */}
            {plan.monthlyBudgetPlan && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5 mb-4">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3">
                  📊 Monthly Budget (50/30/20 Rule)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Needs (50%)
                    </p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatINRFull(plan.monthlyBudgetPlan.needs)}
                    </p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Wants (30%)
                    </p>
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      {formatINRFull(plan.monthlyBudgetPlan.wants)}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Savings (20%)
                    </p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {formatINRFull(plan.monthlyBudgetPlan.savings)}
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Investment (20%)
                    </p>
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {formatINRFull(plan.monthlyBudgetPlan.investment)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Steps */}
            {plan.actionSteps?.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5 mb-4">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3">
                  ✅ Action Steps
                </h3>
                <div className="space-y-3">
                  {plan.actionSteps.map((s, i) => {
                    const priorityStyles = {
                      high: {
                        border: "border-red-200 dark:border-red-800",
                        bg: "bg-red-50 dark:bg-red-900/20",
                        text: "text-red-700 dark:text-red-300",
                      },
                      medium: {
                        border: "border-amber-200 dark:border-amber-800",
                        bg: "bg-amber-50 dark:bg-amber-900/20",
                        text: "text-amber-700 dark:text-amber-300",
                      },
                      low: {
                        border: "border-blue-200 dark:border-blue-800",
                        bg: "bg-blue-50 dark:bg-blue-900/20",
                        text: "text-blue-700 dark:text-blue-300",
                      },
                    };
                    const st = priorityStyles[s.priority] || priorityStyles.medium;

                    return (
                      <div
                        key={i}
                        className={`rounded-xl p-3 border ${st.border} ${st.bg}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl shrink-0">{s.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                                {s.title}
                              </p>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase ${st.text}`}
                              >
                                {s.priority}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              {s.description}
                            </p>
                            {s.timeline && (
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                                ⏱️ {s.timeline}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}