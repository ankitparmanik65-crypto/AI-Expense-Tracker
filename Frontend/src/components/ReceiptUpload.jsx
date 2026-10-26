import { useState, useRef } from "react";
import Tesseract from "tesseract.js";
import API from "../services/api";

export default function ReceiptUpload({ onExtracted }) {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setProgress(0);
    setStage("");

    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);

    setProcessing(true);
    setStage("ocr");

    try {
      const result = await Tesseract.recognize(file, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const rawText = result.data.text;
      if (!rawText || rawText.trim().length < 5) {
        throw new Error("Couldn't read text from image. Try a clearer photo.");
      }

      setStage("ai");
      setProgress(0);

      const { data } = await API.post("/ai/receipt/parse", { rawText });

      if (data.error) {
        throw new Error(data.error);
      }

      onExtracted(data);

      setStage("done");
      setTimeout(() => {
        setStage("");
        setProcessing(false);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to process receipt");
      setProcessing(false);
      setStage("");
    }
  };

  const handleReset = () => {
    setPreview(null);
    setError("");
    setProgress(0);
    setStage("");
    setProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="bg-receipt-to-br from-purple-50 to-blue-50 dark:from-purple-950/40 dark:to-blue-950/40 border border-purple-100 dark:border-purple-900/50 rounded-2xl p-4 mb-5 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            🧾 Scan Receipt
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Upload a bill photo, AI will fill the form
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-xs p-2 rounded-lg mb-3">
          {error}
        </div>
      )}

      {!preview ? (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="receipt-upload"
          />
          <label
            htmlFor="receipt-upload"
            className="flex items-center justify-center gap-2 w-full py-3 bg-white dark:bg-gray-900 border-2 border-dashed border-purple-300 dark:border-purple-800 rounded-xl text-purple-700 dark:text-purple-300 font-medium text-sm cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 transition"
          >
            📷 Choose Receipt Image
          </label>
        </>
      ) : (
        <div className="space-y-3">
          <img
            src={preview}
            alt="Receipt"
            className="w-full max-h-48 object-contain rounded-xl bg-white dark:bg-gray-900"
          />

          {processing && (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-3">
              {stage === "ocr" && (
                <>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                    🔍 Reading text from image... {progress}%
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              )}
              {stage === "ai" && (
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  ✨ AI is parsing the receipt...
                </p>
              )}
            </div>
          )}

          {stage === "done" && (
            <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs p-2 rounded-lg">
              ✅ Done! Form filled automatically.
            </div>
          )}

          {!processing && stage !== "done" && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
            >
              Try another image
            </button>
          )}
        </div>
      )}
    </div>
  );
}