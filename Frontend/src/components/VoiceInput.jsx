import { useState, useRef, useEffect } from "react";
import API from "../services/api";

export default function VoiceInput({ onExtracted }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t;
        } else {
          interimTranscript += t;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        handleParse(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech error:", event.error);
      if (event.error === "not-allowed") {
        setError("Microphone permission denied. Please allow access.");
      } else if (event.error === "no-speech") {
        setError("No speech detected. Try again.");
      } else if (event.error === "audio-capture") {
        setError("Microphone not detected. Check your system settings.");
      } else {
        setError("Voice recognition failed. Try again.");
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const handleParse = async (text) => {
    setProcessing(true);
    setError("");

    try {
      const { data } = await API.post("/ai/voice/parse", { text });

      if (!data.success) {
        throw new Error(data.error || "Could not understand");
      }

      onExtracted(data);
      setTranscript("");

      setTimeout(() => {
        setProcessing(false);
      }, 1000);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to parse voice input"
      );
      setProcessing(false);
    }
  };

  const startListening = () => {
    if (!supported) return;

    setError("");
    setTranscript("");
    setListening(true);

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error(err);
      setListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setListening(false);
  };

  if (!supported) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-5">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          🎤 Voice input is not supported in this browser. Try Chrome or Edge.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-linear-to-br from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/40 border border-rose-100 dark:border-rose-900/50 rounded-2xl p-4 mb-5 transition-colors">
      <div className="mb-3">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          🎤 Voice Input
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Bol ke transaction add karo — "500 ka petrol", "Swiggy 450"
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-xs p-2 rounded-lg mb-3">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={listening ? stopListening : startListening}
          disabled={processing}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition ${
            listening
              ? "bg-red-500 text-white animate-pulse"
              : "bg-white dark:bg-gray-900 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-900/20"
          } disabled:opacity-50`}
        >
          <span className="text-lg">{listening ? "⏹️" : "🎤"}</span>
          {listening ? "Listening... (click to stop)" : "Start Speaking"}
        </button>

        {processing && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ✨ AI is parsing...
          </span>
        )}
      </div>

      {transcript && (
        <div className="mt-3 bg-white dark:bg-gray-900 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            You said:
          </p>
          <p className="text-sm text-gray-800 dark:text-gray-100 italic">
            "{transcript}"
          </p>
        </div>
      )}

      {listening && !transcript && (
        <p className="text-xs text-rose-600 dark:text-rose-400 mt-3 animate-pulse">
          ● Listening... bolo ab
        </p>
      )}
    </div>
  );
}