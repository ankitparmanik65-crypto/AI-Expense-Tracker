import { useState, useRef, useEffect } from "react";
import API from "../services/api";
import Navbar from "../components/Navbar";

const SUGGESTIONS = [
  "Is month kitna kharch hua?",
  "Food pe kitna gaya?",
  "Last month se compare karo",
  "Top spending categories?",
  "Recent transactions dikhao",
];

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! Main aapka AI financial assistant hu. Aap mujhse apne kharchon ke baare me kuch bhi puch sakte ho — jaise 'Is month kitna kharch hua?' ya 'Food pe kitna gaya?'",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text) => {
    const userMessage = text || input.trim();
    if (!userMessage || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await API.post("/ai/chat", { message: userMessage });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, kuch problem aa gayi. Please thodi der baad try karo.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors">
      <Navbar />

      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            🤖 AI Assistant
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Apne finances ke baare me kuch bhi pucho
          </p>
        </div>

        <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-y-auto p-4 mb-4 min-h-100 max-h-125">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-3 flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start mb-3">
              <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-2xl text-sm text-gray-500 dark:text-gray-400">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce">●</span>
                  <span
                    className="animate-bounce"
                    style={{ animationDelay: "0.15s" }}
                  >
                    ●
                  </span>
                  <span
                    className="animate-bounce"
                    style={{ animationDelay: "0.3s" }}
                  >
                    ●
                  </span>
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something..."
            disabled={loading}
            className="flex-1 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-blue-600 text-white px-5 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}