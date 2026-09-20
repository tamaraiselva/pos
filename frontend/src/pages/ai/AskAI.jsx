import { useRef, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import axiosClient from "../../api/axiosClient";
import MarkdownLite from "../../components/MarkdownLite";

const SUGGESTIONS = [
  { label: "Best sellers this month", q: "Which product sold the most this month?" },
  { label: "Low stock alert", q: "Which products are low in stock?" },
  { label: "Last week's sales", q: "What were total sales last week?" },
  { label: "Top revenue category", q: "Which category generated the highest revenue?" },
];

const WIDGET_TYPES = [
  { id: "full", label: "Full Page", icon: "🖥️", desc: "Expanded full-screen conversation view" },
  { id: "floating", label: "Floating Bubble", icon: "💬", desc: "Docked bottom-right interactive popover" },
  { id: "compact", label: "Compact Panel", icon: "📱", desc: "Side-by-side quick lookup panel" },
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

function MessageBubble({ msg, compact = false }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}>
      {!isUser && (
        <div
          className={`mr-2 flex shrink-0 items-center justify-center self-end rounded-full ${
            compact ? "h-6 w-6 text-xs" : "h-8 w-8 text-sm"
          }`}
          style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
        >
          <span className="text-white">✨</span>
        </div>
      )}
      <div
        className={`max-w-[88%] sm:max-w-[80%] rounded-2xl ${
          compact ? "px-3 py-2 text-xs" : "px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm"
        } ${isUser ? "rounded-tr-sm" : "rounded-tl-sm"}`}
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
          className={`ml-2 flex shrink-0 items-center justify-center self-end rounded-full font-bold text-white ${
            compact ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs"
          }`}
          style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
        >
          Y
        </div>
      )}
    </div>
  );
}

function AdminWidgetTypeSelector({ currentType, onChange }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl bg-white p-3.5 border border-indigo-100 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 text-sm font-bold">
          ⚡
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              AI Widget Type
            </span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-indigo-700">
              Admin Only Control
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Select how the Ask AI interface renders for your session
          </p>
        </div>
      </div>

      <div className="flex w-full sm:w-auto items-center gap-1 rounded-xl bg-slate-100 p-1">
        {WIDGET_TYPES.map((w) => {
          const isActive = currentType === w.id;
          return (
            <button
              key={w.id}
              onClick={() => onChange(w.id)}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-white text-indigo-600 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title={w.desc}
            >
              <span>{w.icon}</span>
              <span>{w.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AskAI() {
  const user = useSelector((s) => s.auth.user);
  const isAdmin = user?.role === "admin";

  const [widgetType, setWidgetType] = useState(() => {
    return localStorage.getItem("ai_widget_type") || "full";
  });
  const [isFloatingOpen, setIsFloatingOpen] = useState(true);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Sync settings with server on load if admin
  useEffect(() => {
    if (isAdmin) {
      axiosClient
        .get("/settings/ai")
        .then((res) => {
          if (res.data?.data?.widgetType) {
            setWidgetType(res.data.data.widgetType);
            localStorage.setItem("ai_widget_type", res.data.data.widgetType);
          }
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  async function handleWidgetTypeChange(newType) {
    if (!isAdmin) {
      toast.error("Only Administrators can change the AI widget type.");
      return;
    }
    setWidgetType(newType);
    localStorage.setItem("ai_widget_type", newType);
    toast.success(`Switched AI Widget mode to ${newType.toUpperCase()}`);

    try {
      await axiosClient.put("/settings/ai", { widgetType: newType });
    } catch {
      // Non-blocking fallback
    }
  }

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

  /* ─────────────────────────────────────────────────────────────
     RENDER: Floating Bubble Widget Mode
  ───────────────────────────────────────────────────────────── */
  if (widgetType === "floating") {
    return (
      <div className="animate-fade-in relative min-h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Ask AI (Floating Widget)</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            Interactive floating assistant widget docked to the bottom right
          </p>
        </div>

        {/* Admin Widget Selector */}
        {isAdmin && (
          <div className="mb-4">
            <AdminWidgetTypeSelector currentType={widgetType} onChange={handleWidgetTypeChange} />
          </div>
        )}

        {/* Workspace Banner */}
        <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 p-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-2xl text-white shadow-lg">
            💬
          </div>
          <h3 className="text-base font-bold text-slate-800">Floating Chat Widget Enabled</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
            Your AI assistant is docked in the bottom-right corner. Click the chat button to open or collapse the assistant panel while browsing your POS workspace.
          </p>
          <button
            onClick={() => setIsFloatingOpen(true)}
            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-700 transition-all"
          >
            Open Floating Widget
          </button>
        </div>

        {/* Floating Trigger & Popup Dialog */}
        {isFloatingOpen && (
          <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[360px] sm:w-[400px] h-[520px] rounded-2xl bg-white shadow-2xl border border-slate-200 animate-slide-up overflow-hidden">
            {/* Widget Title Bar */}
            <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs">
                  ✨
                </span>
                <div>
                  <h4 className="text-xs font-bold leading-tight">Ask AI Assistant</h4>
                  <p className="text-[10px] text-slate-400">Grounded in POS Data</p>
                </div>
              </div>
              <button
                onClick={() => setIsFloatingOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                title="Minimize widget"
              >
                ✕
              </button>
            </div>

            {/* Suggestions pill strip */}
            {messages.length === 0 && (
              <div className="border-b border-slate-100 bg-slate-50 p-2.5">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Quick Prompt:
                </p>
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.q}
                      onClick={() => ask(s.q)}
                      className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:bg-indigo-50"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Body */}
            <div className="flex-1 space-y-3 overflow-y-auto p-3 bg-slate-50">
              {messages.length === 0 && !loading && (
                <div className="flex h-full flex-col items-center justify-center text-center p-4">
                  <span className="text-2xl mb-1">✨</span>
                  <p className="text-xs font-semibold text-slate-700">How can I help you today?</p>
                  <p className="text-[11px] text-slate-400 mt-1">Ask questions about your sales, stock levels, or revenue.</p>
                </div>
              )}

              {messages.map((m, i) => (
                <MessageBubble key={i} msg={m} compact />
              ))}

              {loading && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSubmit} className="border-t border-slate-100 p-2.5 bg-white flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask AI…"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-400"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || question.trim().length < 3}
                className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-40"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {/* Floating Bubble Button */}
        {!isFloatingOpen && (
          <button
            onClick={() => setIsFloatingOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-2xl transition-transform hover:scale-110"
            title="Open Ask AI"
          >
            <span className="text-2xl">✨</span>
          </button>
        )}
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     RENDER: Compact Panel Widget Mode
  ───────────────────────────────────────────────────────────── */
  if (widgetType === "compact") {
    return (
      <div className="animate-fade-in space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">Ask AI (Compact Panel)</h1>
          <p className="text-xs text-slate-500">Fast side-by-side analytical panel</p>
        </div>

        {/* Admin Widget Selector */}
        {isAdmin && (
          <AdminWidgetTypeSelector currentType={widgetType} onChange={handleWidgetTypeChange} />
        )}

        {/* Compact Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Quick suggestions sidebar */}
          <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Suggested Queries
            </h3>
            <div className="space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.q}
                  onClick={() => ask(s.q)}
                  className="w-full text-left rounded-xl border border-slate-100 bg-slate-50 p-2.5 transition-all hover:border-indigo-200 hover:bg-indigo-50/50"
                >
                  <p className="text-xs font-semibold text-slate-700">{s.label}</p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{s.q}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Compact Main Chat */}
          <div className="md:col-span-2 flex flex-col h-[500px] rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex-1 space-y-3 overflow-y-auto p-4 bg-slate-50">
              {messages.length === 0 && !loading && (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <span className="text-3xl mb-2">✨</span>
                  <p className="text-sm font-semibold text-slate-700">Compact AI Assistant</p>
                  <p className="text-xs text-slate-400 mt-1">Select a query from the left or type below.</p>
                </div>
              )}

              {messages.map((m, i) => (
                <MessageBubble key={i} msg={m} compact />
              ))}

              {loading && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-slate-100 flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about sales, stock..."
                className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs outline-none focus:border-indigo-400"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || question.trim().length < 3}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
              >
                Ask
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     RENDER: Full Page Chat Mode (Default)
  ───────────────────────────────────────────────────────────── */
  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-7rem)] sm:h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="mb-3 sm:mb-4 shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Ask AI</h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              Ask business questions in plain English - answers grounded in your real POS data
            </p>
          </div>
        </div>

        {/* Admin Widget Selector */}
        {isAdmin && (
          <AdminWidgetTypeSelector currentType={widgetType} onChange={handleWidgetTypeChange} />
        )}
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
