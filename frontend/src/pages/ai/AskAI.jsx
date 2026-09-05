import { useRef, useState } from "react";
import toast from "react-hot-toast";
import axiosClient from "../../api/axiosClient";
import MarkdownLite from "../../components/MarkdownLite";

const SUGGESTIONS = [
  { label: "Best sellers this month", q: "Which product sold the most this month?" },
  { label: "Low stock alert", q: "Which products are low in stock?" },
  { label: "Last week's sales", q: "What were total sales last week?" },
  { label: "Top revenue category", q: "Which category generated the highest revenue?" },
];

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm px-4 py-3"
        style={{ background: "#f1f5f9" }}
      >
        <span className="typing-dot" style={{ background: "#94a3b8" }} />
        <span className="typing-dot" style={{ background: "#94a3b8" }} />
        <span className="typing-dot" style={{ background: "#94a3b8" }} />
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}>
      {!isUser && (
        <div
          className="mr-2.5 flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-full text-sm"
          style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
        >
          <span className="text-white">✨</span>
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
          isUser ? "rounded-tr-sm" : "rounded-tl-sm"
        }`}
        style={
          isUser
            ? {
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                color: "#fff",
                boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
              }
            : msg.error
            ? {
                background: "#fff1f2",
                color: "#9f1239",
                border: "1px solid #fecdd3",
              }
            : {
                background: "#f8fafc",
                color: "#1e293b",
                border: "1px solid #f1f5f9",
              }
        }
      >
        <MarkdownLite text={msg.text} />
        {msg.toolsCalled?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {msg.toolsCalled.map((t) => (
              <span
                key={t}
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ background: "rgba(99,102,241,0.1)", color: "#4f46e5" }}
              >
                📊 {t}
              </span>
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <div
          className="ml-2.5 flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-full text-xs font-bold text-white"
          style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
        >
          Y
        </div>
      )}
    </div>
  );
}

export default function AskAI() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  async function ask(q) {
    const text = (q ?? question).trim();
    if (!text) return;
    if (text.length < 3) {
      toast.error("Question must be at least 3 characters.");
      return;
    }
    setMessages((m) => [...m, { role: "user", text }]);
    setQuestion("");
    setLoading(true);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    try {
      const res = await axiosClient.post("/ai/ask", { question: text });
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text: res.data.data.answer,
          toolsCalled: res.data.data.toolsCalled,
        },
      ]);
    } catch (err) {
      toast.error(err.message);
      setMessages((m) => [
        ...m,
        { role: "ai", text: `Error: ${err.message}`, error: true },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    ask();
  }

  return (
    <div className="animate-fade-in flex h-[calc(100vh-5rem)] flex-col">
      {/* Header */}
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold text-slate-900">Ask AI</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Ask business questions in plain English — answers grounded in your real POS data
        </p>
      </div>

      {/* Suggestions */}
      {messages.length === 0 && (
        <div className="mb-4 shrink-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Try asking:
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.q}
                onClick={() => ask(s.q)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 space-y-4 overflow-y-auto rounded-2xl bg-white p-4"
        style={{
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        {messages.length === 0 && !loading && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
              style={{
                background: "linear-gradient(135deg, #eef2ff, #f5f3ff)",
                border: "1px solid #c7d2fe",
              }}
            >
              ✨
            </div>
            <p className="text-base font-semibold text-slate-700">
              Your AI Business Assistant
            </p>
            <p className="mt-1 max-w-xs text-sm text-slate-400">
              Ask anything about sales, inventory, products, or revenue — all answers
              come from your real store data.
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} msg={m} />
        ))}

        {loading && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2 shrink-0">
        <input
          id="ask-ai-input"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about sales, inventory, or revenue…"
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
          disabled={loading}
        />
        <button
          id="ask-ai-submit"
          type="submit"
          disabled={loading || question.trim().length < 3}
          className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all disabled:opacity-40"
          style={{
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
          }}
          onMouseEnter={(e) => {
            if (!loading && question.trim().length >= 3)
              e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "none";
          }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.925A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.896 28.896 0 0 0 15.293-7.154.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.289Z" />
          </svg>
          {loading ? "…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
