const FREQ_LABELS = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  bimonthly: "Every 2 months",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export default function RecurringCard({ data }) {
  // Agar data nahi hai ya koi recurring nahi mila
  if (!data || !data.hasData || !data.recurring || data.recurring.length === 0) {
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

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-5 mt-6 transition-colors">
      <div className="flex items-start justify-between mb-4 gap-2">
        <div>
          <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            🔄 Recurring Payments
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {data.count} detected · Total ~{formatINR(data.totalMonthly)}/month
          </p>
        </div>
        <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full font-medium whitespace-nowrap">
          Auto-detected
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

      {/* Recurring List */}
      <div className="space-y-2">
        {data.recurring.map((r, idx) => (
          <div
            key={idx}
            className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 bg-gray-50/50 dark:bg-gray-800/40"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">
                    {r.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">
                    {FREQ_LABELS[r.frequency] || r.frequency}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {r.category} · {r.occurrences} times
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Next: {formatDate(r.nextExpectedDate)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                  {formatINR(r.avgAmount)}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  ~{formatINR(r.monthlyCost)}/mo
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
          Total monthly commitment
        </span>
        <span className="text-base font-bold text-gray-800 dark:text-gray-100">
          {formatINR(data.totalMonthly)}
        </span>
      </div>
    </div>
  );
}