import { useState } from "react";

const TYPE_STYLES = {
  warning:
    "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200",
  tip: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200",
  info: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200",
  success:
    "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-200",
};

export default function InsightsCard({ insights, generatedAt, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 mt-6 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            ✨ AI Insights
          </h3>
          {generatedAt && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Generated {new Date(generatedAt).toLocaleString("en-IN")}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition font-medium disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      {!insights || insights.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
          No insights yet. Add some transactions first.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className={`border rounded-xl p-3 ${
                TYPE_STYLES[insight.type] || TYPE_STYLES.info
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-xl shrink-0">{insight.icon}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{insight.title}</p>
                  <p className="text-xs mt-1 opacity-90">{insight.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}