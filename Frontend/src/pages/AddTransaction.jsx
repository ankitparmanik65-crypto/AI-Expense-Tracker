import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import Navbar from "../components/Navbar";
import TransactionForm from "../components/TransactionForm";

export default function AddTransaction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (payload) => {
    setLoading(true);
    setError("");
    try {
      await API.post("/transactions", payload);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Add Transaction
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Record your income or expense
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <TransactionForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  );
}