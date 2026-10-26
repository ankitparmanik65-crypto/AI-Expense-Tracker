import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/api";
import Navbar from "../components/Navbar";
import TransactionForm from "../components/TransactionForm";

export default function EditTransaction() {
  const { id } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const { data } = await API.get(`/transactions/${id}`);
        setTransaction(data);
      } catch (err) {
        setError("Transaction not found");
      } finally {
        setLoading(false);
      }
    };
    fetchTransaction();
  }, [id]);

  const handleSubmit = async (payload) => {
    setSaving(true);
    setError("");
    try {
      await API.put(`/transactions/${id}`, payload);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Edit Transaction
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Update your transaction
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {transaction && (
          <TransactionForm
            initialData={transaction}
            onSubmit={handleSubmit}
            loading={saving}
          />
        )}
      </div>
    </div>
  );
}