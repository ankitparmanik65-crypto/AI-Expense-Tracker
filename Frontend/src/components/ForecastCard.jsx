export default function ForecastCard({ forecast }) {
  if (!forecast) return null;

  const formatINR = (num) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num || 0);

  const trendStyles = {
    increasing: {
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-900/30",
      icon: "📈",
      label: "Badh raha hai",
    },
    decreasing: {
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-900/30",
      icon: "📉",
      label: "Ghat raha hai",
    },
    stable: {
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/30",
      icon: "➡️",
      label: "Stable",
    },
  };

  const trend = trendStyles[forecast.trendDirection] || trendStyles.stable;

  const confidenceBadge =
    forecast.confidence === "high"
      ? {
          text: "High confidence",
          color:
            "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300",
        }
      : {
          text: "Low confidence",
          color:
            "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
        };

  return (
    <div className="bg-linear-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-5 mt-6 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            📈 Expense Forecast
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            AI prediction for next month
          </p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${confidenceBadge.color}`}
        >
          {confidenceBadge.text}
        </span>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Predicted next month expense
            </p>
            <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              {formatINR(forecast.predicted)}
            </p>
          </div>
          <div
            className={`flex flex-col items-center px-3 py-2 rounded-lg ${trend.bg}`}
          >
            <span className="text-2xl">{trend.icon}</span>
            <span className={`text-xs font-medium ${trend.color}`}>
              {trend.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              6-month avg
            </p>
            <p className="font-semibold text-gray-800 dark:text-gray-100">
              {formatINR(forecast.average)}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Monthly trend
            </p>
            <p
              className={`font-semibold ${
                forecast.trend > 0
                  ? "text-red-600 dark:text-red-400"
                  : forecast.trend < 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-800 dark:text-gray-100"
              }`}
            >
              {forecast.trend > 0 ? "+" : ""}
              {formatINR(forecast.trend)}
            </p>
          </div>
        </div>
      </div>

      {forecast.explanation && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
            💡 {forecast.explanation}
          </p>
        </div>
      )}

      {forecast.tips && forecast.tips.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">
            🎯 Suggestions
          </p>
          <ul className="space-y-1">
            {forecast.tips.map((tip, i) => (
              <li
                key={i}
                className="text-xs text-gray-600 dark:text-gray-300 flex items-start gap-2"
              >
                <span className="text-indigo-500 dark:text-indigo-400">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}