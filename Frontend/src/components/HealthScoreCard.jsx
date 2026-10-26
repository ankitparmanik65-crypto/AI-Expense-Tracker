import { useState } from "react";

const GRADE_STYLES = {
  green: {
    ring: "stroke-green-500",
    bg: "bg-green-50 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
    bar: "bg-green-500",
  },
  blue: {
    ring: "stroke-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    bar: "bg-blue-500",
  },
  amber: {
    ring: "stroke-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    bar: "bg-amber-500",
  },
  red: {
    ring: "stroke-red-500",
    bg: "bg-red-50 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
    bar: "bg-red-500",
  },
};

export default function HealthScoreCard({ health }) {
  const [expanded, setExpanded] = useState(false);

  if (!health) return null;

  if (!health.hasData) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 mt-6 transition-colors">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">
          ❤️ Financial Health Score
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Add some transactions to unlock your health score.
        </p>
      </div>
    );
  }

  const style = GRADE_STYLES[health.gradeColor] || GRADE_STYLES.blue;
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (health.score / 100) * circumference;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 mt-6 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            ❤️ Financial Health Score
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Based on 5 key factors
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition font-medium"
        >
          {expanded ? "Hide details" : "Show details"}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative shrink-0">
          <svg width="140" height="140" className="-rotate-90">
            <circle
              cx="70"
              cy="70"
              r="54"
              fill="none"
              className="stroke-gray-100 dark:stroke-gray-800"
              strokeWidth="12"
            />
            <circle
              cx="70"
              cy="70"
              r="54"
              fill="none"
              className={style.ring}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              {health.score}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              / 100
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div
            className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${style.bg} ${style.text} mb-3`}
          >
            {health.grade}
          </div>
          {health.aiSummary && (
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
              {health.aiSummary}
            </p>
          )}
        </div>
      </div>

      {health.recommendations && health.recommendations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">
            🎯 Top Recommendations
          </p>
          <ul className="space-y-1">
            {health.recommendations.map((rec, i) => (
              <li
                key={i}
                className="text-xs text-gray-600 dark:text-gray-300 flex items-start gap-2"
              >
                <span className="text-blue-500 dark:text-blue-400">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {expanded && health.breakdown && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">
            📊 Score Breakdown
          </p>
          {Object.entries(health.breakdown).map(([key, item]) => {
            const pct = (item.score / item.max) * 100;
            return (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-300 capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                  <span className="font-medium text-gray-800 dark:text-gray-100">
                    {item.score}/{item.max}
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${style.bar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {item.label}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}