import { useEffect, useState, useRef } from "react";
import API from "../services/api";
import Navbar from "../components/Navbar";
import Button from "../components/Button";

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Backup/Restore state
  const fileInputRef = useRef(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [pendingBackup, setPendingBackup] = useState(null);
  const [restoreMode, setRestoreMode] = useState("merge");
  const [restoring, setRestoring] = useState(false);

  // Backup history
  const [backupHistory, setBackupHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/alerts/settings");
      setSettings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBackupHistory = async () => {
    try {
      const { data } = await API.get("/backup/history");
      setBackupHistory(data);
    } catch (err) {
      console.error("Backup history error:", err);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchBackupHistory();
  }, []);

  const showMessage = (type, text, duration = 3000) => {
    setMessage({ type, text });
    if (duration) setTimeout(() => setMessage({ type: "", text: "" }), duration);
  };

  const handleToggle = async () => {
    try {
      const { data } = await API.patch("/alerts/toggle");
      setSettings({ ...settings, alertsEnabled: data.alertsEnabled });
      showMessage("success", data.message);
    } catch (err) {
      showMessage("error", "Failed to update");
    }
  };

  const handleTestEmail = async () => {
    setSending(true);
    setMessage({ type: "", text: "" });
    try {
      const { data } = await API.post("/alerts/test");
      showMessage("success", data.message);
    } catch (err) {
      showMessage(
        "error",
        err.response?.data?.message || "Failed to send test email"
      );
    } finally {
      setSending(false);
    }
  };

  // ===== BACKUP / RESTORE =====

  const handleExport = async () => {
    setBackupLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await API.get("/backup", {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `ai-expense-tracker-backup-${new Date()
          .toISOString()
          .slice(0, 10)}.json`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showMessage("success", "Backup downloaded successfully!");
      await fetchBackupHistory();
    } catch (err) {
      showMessage("error", "Failed to export backup");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      showMessage("error", "Please select a .json backup file");
      return;
    }

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      const { data } = await API.post("/backup/preview", { backup });
      setPreview(data);
      setPendingBackup(backup);
      setMessage({ type: "", text: "" });
    } catch (err) {
      showMessage(
        "error",
        err.response?.data?.message || "Invalid backup file"
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRestore = async () => {
    if (!pendingBackup) return;

    const confirmMsg =
      restoreMode === "replace"
        ? "⚠️ This will DELETE all your current data and replace it with the backup. Are you sure?"
        : "This will ADD the backup data to your existing data. Continue?";

    if (!window.confirm(confirmMsg)) return;

    setRestoring(true);
    try {
      const { data } = await API.post("/backup/restore", {
        backup: pendingBackup,
        mode: restoreMode,
      });

      showMessage(
        "success",
        `Restore complete! ${data.stats.transactions} transactions, ${data.stats.accounts} accounts, ${data.stats.budgets} budgets imported.`,
        5000
      );

      setPreview(null);
      setPendingBackup(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      setTimeout(() => window.location.reload(), 2500);
    } catch (err) {
      showMessage("error", err.response?.data?.message || "Restore failed");
      setRestoring(false);
    }
  };

  const cancelRestore = () => {
    setPreview(null);
    setPendingBackup(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
            Settings
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Manage your alerts and preferences
          </p>
        </div>

        {message.text && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            Loading...
          </div>
        ) : settings ? (
          <>
            {/* ===== EMAIL ALERTS ===== */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
              <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-4">
                🔔 Email Alerts
              </h2>

              <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    Enable Email Alerts
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {settings.email}
                  </p>
                </div>
                <button
                  onClick={handleToggle}
                  className={`relative inline-flex h-6 w-11 rounded-full transition ${
                    settings.alertsEnabled
                      ? "bg-blue-600"
                      : "bg-gray-300 dark:bg-gray-700"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition ${
                      settings.alertsEnabled
                        ? "translate-x-5"
                        : "translate-x-0.5"
                    } mt-0.5`}
                  />
                </button>
              </div>

              <div className="py-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                  Ye alerts milenge:
                </p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span>📊</span>
                    <span>Budget alerts (80% aur 100% cross hone pe)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>📈</span>
                    <span>Weekly summary (har Sunday 9 AM)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>🚨</span>
                    <span>Unusual transaction warnings</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-800">
                <Button onClick={handleTestEmail} disabled={sending}>
                  {sending ? "Sending..." : "✉️ Send Test Email"}
                </Button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Apni email settings verify karne ke liye test email bhejo.
                </p>
              </div>
            </div>

            {/* ===== BACKUP & RESTORE ===== */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 mt-4">
              <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-1">
                💾 Backup & Restore
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Save your data as JSON file, or restore from a previous backup.
              </p>

              {/* Preview Modal */}
              {preview && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-sm text-blue-900 dark:text-blue-200">
                        📋 Backup Preview
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                        Exported:{" "}
                        {new Date(preview.exportedAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <button
                      onClick={cancelRestore}
                      className="text-blue-500 hover:text-blue-700 text-lg leading-none"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3 text-xs">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center">
                      <p className="text-gray-500 dark:text-gray-400">
                        Transactions
                      </p>
                      <p className="font-bold text-gray-800 dark:text-gray-100">
                        {preview.counts.transactions}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center">
                      <p className="text-gray-500 dark:text-gray-400">
                        Accounts
                      </p>
                      <p className="font-bold text-gray-800 dark:text-gray-100">
                        {preview.counts.accounts}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center">
                      <p className="text-gray-500 dark:text-gray-400">
                        Budgets
                      </p>
                      <p className="font-bold text-gray-800 dark:text-gray-100">
                        {preview.counts.budgets}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center">
                      <p className="text-gray-500 dark:text-gray-400">
                        Goals
                      </p>
                      <p className="font-bold text-gray-800 dark:text-gray-100">
                        {preview.counts.goals}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center">
                      <p className="text-gray-500 dark:text-gray-400">
                        Tax
                      </p>
                      <p className="font-bold text-gray-800 dark:text-gray-100">
                        {preview.counts.taxInvestments}
                      </p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-2">
                      Restore Mode:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setRestoreMode("merge")}
                        className={`p-2 rounded-lg text-xs font-medium transition ${
                          restoreMode === "merge"
                            ? "bg-blue-600 text-white"
                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        🔀 Merge
                        <span className="block text-[10px] opacity-80 font-normal mt-0.5">
                          Add to existing
                        </span>
                      </button>
                      <button
                        onClick={() => setRestoreMode("replace")}
                        className={`p-2 rounded-lg text-xs font-medium transition ${
                          restoreMode === "replace"
                            ? "bg-red-600 text-white"
                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        🔄 Replace
                        <span className="block text-[10px] opacity-80 font-normal mt-0.5">
                          Delete & restore
                        </span>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleRestore}
                    disabled={restoring}
                    className={`w-full py-2.5 rounded-xl font-medium text-sm transition disabled:opacity-50 ${
                      restoreMode === "replace"
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {restoring
                      ? "Restoring..."
                      : restoreMode === "replace"
                      ? "⚠️ Replace All Data"
                      : "✓ Restore Backup"}
                  </button>
                </div>
              )}

              {/* Export Button */}
              <div className="mb-3">
                <button
                  onClick={handleExport}
                  disabled={backupLoading}
                  className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {backupLoading
                    ? "Preparing..."
                    : "📥 Download Backup (JSON)"}
                </button>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
                  Includes transactions, accounts, budgets, goals, tax data.
                </p>
              </div>

              {/* Backup History */}
              {backupHistory.length > 0 && (
                <div className="mb-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1"
                  >
                    📜 {showHistory ? "Hide" : "Show"} Backup History (
                    {backupHistory.length})
                  </button>

                  {showHistory && (
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {backupHistory.map((log) => (
                        <div
                          key={log._id}
                          className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-700 dark:text-gray-200">
                              {new Date(log.exportedAt).toLocaleString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {(log.fileSize / 1024).toFixed(1)} KB
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                            <span>📊 {log.counts.transactions} txns</span>
                            <span>💳 {log.counts.accounts} accounts</span>
                            <span>💰 {log.counts.budgets} budgets</span>
                            <span>🎯 {log.counts.goals} goals</span>
                            <span>📋 {log.counts.taxInvestments} tax</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Restore Upload */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="backup-upload"
                />
                <label
                  htmlFor="backup-upload"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 font-medium text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  📤 Upload Backup File to Restore
                </label>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
                  Select a .json file exported from this app.
                </p>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}