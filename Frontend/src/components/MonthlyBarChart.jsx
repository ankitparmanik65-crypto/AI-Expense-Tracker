import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function MonthlyBarChart({ data }) {
  const formatINR = (num) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num || 0);

  const shortINR = (num) => {
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(0)}k`;
    return `₹${num}`;
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 transition-colors">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4">
          Monthly Trend
        </h3>
        <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
          No data yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 transition-colors">
      <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4">
        Monthly Trend (Last 6 months)
      </h3>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} barGap={4}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#374151"
            opacity={0.3}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={shortINR}
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => formatINR(value)}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #374151",
              fontSize: 12,
              backgroundColor: "rgba(31, 41, 55, 0.95)",
              color: "#f3f4f6",
            }}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => (
              <span className="text-gray-600 dark:text-gray-300 capitalize">
                {value}
              </span>
            )}
          />
          <Bar
            dataKey="income"
            fill="#10b981"
            radius={[6, 6, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="expense"
            fill="#ef4444"
            radius={[6, 6, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}