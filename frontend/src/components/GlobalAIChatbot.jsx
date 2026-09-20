import { useState, useRef } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import axiosClient from "../api/axiosClient";
import MarkdownLite from "./MarkdownLite";

const SUGGESTIONS = [
  { label: "Best sellers this month", q: "Which product sold the most this month?" },
  { label: "Low stock alert", q: "Which products are low in stock?" },
  { label: "Last week's sales", q: "What were total sales last week?" },
  { label: "Top revenue category", q: "Which category generated the highest revenue?" },
];

function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in">
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

function ChatMessage({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}>
      {!isUser && (
        <div
          className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center self-end rounded-full text-xs text-white"
          style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
        >
          ✨
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
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
          <div className="mt-1.5 flex flex-wrap gap-1">
            {msg.toolsCalled.map((t) => (
              <span
                key={t}
                className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
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
          className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center self-end rounded-full text-[10px] font-bold text-white"
          style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
        >
          A
        </div>
      )}
    </div>
  );
}

export default function GlobalAIChatbot() {
  const user = useSelector((s) => s.auth.user);
  const isAdmin = user?.role === "admin";

  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  if (!isAdmin) return null;

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
      toast.error(err.message || "Failed to query AI");
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
    <>
      {/* ── Chat Window Dialog ────────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col w-[360px] sm:w-[420px] h-[520px] rounded-3xl bg-white shadow-2xl border border-slate-200/80 animate-fade-in overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3.5 text-white"
            style={{ background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)" }}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md text-sm">
                ✨
              </div>
              <div>
                <h4 className="text-xs font-bold leading-tight tracking-wide">Ask AI Assistant</h4>
                <p className="text-[10px] text-indigo-100/80 font-medium">Grounded in POS Live Data</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
              title="Minimize chat"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>

          {/* Prompt Suggestion Chips */}
          {messages.length === 0 && (
            <div className="border-b border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Quick Prompts:
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.q}
                    onClick={() => ask(s.q)}
                    className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-2xs hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages List */}
          <div className="flex-1 space-y-3 overflow-y-auto p-3.5 bg-slate-50">
            {messages.length === 0 && !loading && (
              <div className="flex h-full flex-col items-center justify-center text-center p-4">
                <div
                  className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                  style={{
                    background: "linear-gradient(135deg, #eef2ff, #f5f3ff)",
                    border: "1px solid #c7d2fe",
                  }}
                >
                  ✨
                </div>
                <p className="text-xs font-bold text-slate-700">Admin AI Assistant</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                  Ask questions about real-time sales, product stock, or revenue directly from any page.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <ChatMessage key={i} msg={m} />
            ))}

            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="border-t border-slate-100 p-3 bg-white flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about sales, stock, revenue..."
              className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || question.trim().length < 3}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              }}
            >
              Ask
            </button>
          </form>
        </div>
      )}

      {/* ── Floating Bubble Button (as requested in user image) ────────────────── */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95 group"
        style={{
          background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
          boxShadow: "0 8px 24px rgba(79, 70, 229, 0.45)",
        }}
        title="Open Ask AI Assistant"
      >
        <div className="relative flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-7 h-7 text-amber-300 transition-transform duration-200 group-hover:rotate-12"
          >
            {/* Sparkles icon matching user attached image */}
            <path
              d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2L12 2Z"
              fill="url(#sparkle-grad)"
            />
            <path
              d="M19 16L19.9 19.1L23 20L19.9 20.9L19 24L18.1 20.9L15 20L18.1 19.1L19 16Z"
              fill="url(#sparkle-grad)"
              transform="scale(0.5) translate(14, 12)"
            />
            <defs>
              <linearGradient id="sparkle-grad" x1="4" y1="2" x2="20" y2="18" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FCD34D" />
                <stop offset="1" stopColor="#F59E0B" />
              </linearGradient>
            </defs>
          </svg>
          {messages.length > 0 && !isOpen && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          )}
        </div>
      </button>
    </>
  );
}
