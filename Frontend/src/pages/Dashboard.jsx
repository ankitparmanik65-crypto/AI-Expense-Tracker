import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import Navbar from "../components/Navbar";
import SummaryCards from "../components/SummaryCards";
import TransactionItem from "../components/TransactionItem";
import CategoryPieChart from "../components/CategoryPieChart";
import MonthlyBarChart from "../components/MonthlyBarChart";
import InsightsCard from "../components/InsightsCard";
import ForecastCard from "../components/ForecastCard";
import HealthScoreCard from "../components/HealthScoreCard";
import AnomalyCard from "../components/AnomalyCard";
import RecurringCard from "../components/RecurringCard";
import Button from "../components/Button";

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    income: 0,
    expense: 0,
    balance: 0,
  });
  const [categoryData, setCategoryData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [insights, setInsights] = useState([]);
  const [insightsGeneratedAt, setInsightsGeneratedAt] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [health, setHealth] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [recurring, setRecurring] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchData = async () => {
    try {
      setLoading(true);
      const query = filter === "all" ? "" : `?type=${filter}`;

      const [
        summaryRes,
        txRes,
        catRes,
        monthRes,
        insightRes,
        forecastRes,
        healthRes,
        anomalyRes,
        recurringRes,
      ] = await Promise.all([
        API.get("/transactions/summary"),
        API.get(`/transactions${query}`),
        API.get("/transactions/category-summary?type=expense"),
        API.get("/transactions/monthly-summary"),
        API.get("/insights"),
        API.get("/forecast"),
        API.get("/health-score"),
        API.get("/anomalies"),
        API.get("/recurring"),
      ]);

      setSummary(summaryRes.data);
      setTransactions(txRes.data);
      setCategoryData(catRes.data);
      setMonthlyData(monthRes.data);
      setInsights(insightRes.data.insights);
      setInsightsGeneratedAt(insightRes.data.generatedAt);
      setForecast(forecastRes.data);
      setHealth(healthRes.data);
      setAnomalies(anomalyRes.data);
      setRecurring(recurringRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await API.delete(`/transactions/${id}`);
      fetchData();
    } catch (err) {
      alert("Delete failed");
    }
  };

  const handleExportCSV = async () => {
    try {
      const query = filter === "all" ? "" : `?type=${filter}`;
      const response = await API.get(`/export/csv${query}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `transactions-${filter}-${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      if (err.response?.status === 404) {
        alert("No transactions to export");
      } else {
        alert("Export failed. Please try again.");
      }
    }
  };

  const handleRefreshInsights = async () => {
    try {
      const { data } = await API.get("/insights?refresh=true");
      setInsights(data.insights);
      setInsightsGeneratedAt(data.generatedAt);
    } catch (err) {
      console.error("Refresh insights failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              Dashboard
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              A quick look at your finances
            </p>
          </div>
          <Link to="/add">
            <Button>+ Add Transaction</Button>
          </Link>
        </div>

        <SummaryCards summary={summary} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <CategoryPieChart data={categoryData} />
          <MonthlyBarChart data={monthlyData} />
        </div>

        <HealthScoreCard health={health} />

        <AnomalyCard data={anomalies} />

        <RecurringCard data={recurring} />

        <InsightsCard
          insights={insights}
          generatedAt={insightsGeneratedAt}
          onRefresh={handleRefreshInsights}
        />

        <ForecastCard forecast={forecast} />

        <div className="mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-4">
            <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">
              Recent Transactions
            </h2>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleExportCSV}
                className="px-3 py-1 text-xs sm:text-sm rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/50 transition font-medium"
              >
                📄 Export CSV
              </button>

              {["all", "income", "expense"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs sm:text-sm rounded-lg capitalize transition ${
                    filter === f
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              Loading...
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No transactions yet. Start by adding one!
              </p>
              <Link to="/add">
                <Button>+ Add Transaction</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((t) => (
                <TransactionItem
                  key={t._id}
                  transaction={t}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}