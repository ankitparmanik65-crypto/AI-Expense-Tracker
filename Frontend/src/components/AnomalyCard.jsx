export default function AnomalyCard({ data }) {
  // Agar data nahi hai ya koi anomaly nahi hai to kuch show mat karo
  if (!data || !data.hasData || !data.anomalies || data.anomalies.length === 0) {
    return null;
  }

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

  const severityStyles = {
    high: {
      border: "border-red-200 dark:border-red-800",
      bg: "bg-red-50 dark:bg-red-900/20",
      badge: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
      icon: "🚨",
    },
    medium: {
      border: "border-amber-200 dark:border-amber-800",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      badge:
        "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
      icon: "⚠️",
    },
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-5 mt-6 transition-colors">
      <div className="flex items-start justify-between mb-4 gap-2">
        <div>
          <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            🚨 Unusual Transactions
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {data.totalAnomalies} detected in last 30 days
          </p>
        </div>
        <span className="text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-full font-medium whitespace-nowrap">
          Review needed
        </span>
      </div>

      {/* AI Summary */}
      {data.aiSummary && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-4">
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
            💡 {data.aiSummary}
          </p>
        </div>
      )}

      {/* Anomalies List */}
      <div className="space-y-2">
        {data.anomalies.map((a, idx) => {
          const style = severityStyles[a.severity] || severityStyles.medium;
          return (
            <div
              key={idx}
              className={`border rounded-xl p-3 ${style.border} ${style.bg}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{style.icon}</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                      {a.transaction.category}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase ${style.badge}`}
                    >
                      {a.severity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                    {a.transaction.description || "No description"} ·{" "}
                    {formatDate(a.transaction.date)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span className="font-semibold text-gray-800 dark:text-gray-100">
                      {formatINR(a.transaction.amount)}
                    </span>{" "}
                    — <span className="text-red-600 dark:text-red-400 font-medium">
                      {a.multiplier}x
                    </span>{" "}
                    higher than usual ({formatINR(a.categoryAvg)})
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}