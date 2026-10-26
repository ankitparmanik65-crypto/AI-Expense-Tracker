export default function SummaryCards({ summary }) {
  const cards = [
    {
      label: "Income",
      value: summary.income,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-900/30",
      icon: "📈",
    },
    {
      label: "Expense",
      value: summary.expense,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-900/30",
      icon: "📉",
    },
    {
      label: "Balance",
      value: summary.balance,
      color:
        summary.balance >= 0
          ? "text-blue-600 dark:text-blue-400"
          : "text-red-600 dark:text-red-400",
      bg: "bg-blue-50 dark:bg-blue-900/30",
      icon: "💵",
    },
  ];

  const formatINR = (num) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num || 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {card.label}
            </span>
            <span className={`text-2xl ${card.bg} rounded-full p-2`}>
              {card.icon}
            </span>
          </div>
          <p className={`text-2xl font-bold ${card.color}`}>
            {formatINR(card.value)}
          </p>
        </div>
      ))}
    </div>
  );
}