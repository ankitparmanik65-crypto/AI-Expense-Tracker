import { Link } from "react-router-dom";

export default function TransactionItem({ transaction, onDelete }) {
  const isIncome = transaction.type === "income";

  const formatINR = (num) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num || 0);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 hover:shadow-sm transition-colors">
      <Link
        to={`/edit/${transaction._id}`}
        className="flex items-center gap-3 min-w-0 flex-1"
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${
            isIncome
              ? "bg-green-100 dark:bg-green-900/30"
              : "bg-red-100 dark:bg-red-900/30"
          }`}
        >
          {isIncome ? "💰" : "💸"}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-gray-800 dark:text-gray-100 truncate">
            {transaction.description || transaction.category}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {transaction.category} · {formatDate(transaction.date)}
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-3 shrink-0">
        <span
          className={`font-bold ${
            isIncome
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {isIncome ? "+" : "-"}
          {formatINR(transaction.amount)}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(transaction._id);
          }}
          className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition text-lg"
          title="Delete"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}