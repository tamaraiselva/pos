const ACCENT_STYLES = {
  indigo: {
    icon: "linear-gradient(135deg, #6366f1, #4f46e5)",
    iconShadow: "0 4px 12px rgba(99,102,241,0.35)",
    badge: "#eef2ff",
    badgeText: "#4338ca",
  },
  emerald: {
    icon: "linear-gradient(135deg, #10b981, #059669)",
    iconShadow: "0 4px 12px rgba(16,185,129,0.35)",
    badge: "#ecfdf5",
    badgeText: "#065f46",
  },
  violet: {
    icon: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
    iconShadow: "0 4px 12px rgba(139,92,246,0.35)",
    badge: "#f5f3ff",
    badgeText: "#5b21b6",
  },
  rose: {
    icon: "linear-gradient(135deg, #f43f5e, #e11d48)",
    iconShadow: "0 4px 12px rgba(244,63,94,0.35)",
    badge: "#fff1f2",
    badgeText: "#9f1239",
  },
  amber: {
    icon: "linear-gradient(135deg, #f59e0b, #d97706)",
    iconShadow: "0 4px 12px rgba(245,158,11,0.35)",
    badge: "#fffbeb",
    badgeText: "#92400e",
  },
  slate: {
    icon: "linear-gradient(135deg, #64748b, #475569)",
    iconShadow: "0 4px 12px rgba(100,116,139,0.35)",
    badge: "#f8fafc",
    badgeText: "#334155",
  },
};

export default function StatCard({ label, value, sub, accent = "indigo", icon }) {
  const style = ACCENT_STYLES[accent] || ACCENT_STYLES.indigo;

  return (
    <div
      className="animate-fade-in rounded-2xl bg-white p-5 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
        border: "1px solid rgba(0,0,0,0.06)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow =
          "0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow =
          "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)";
      }}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {value}
          </p>
          {sub && (
            <p
              className="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              style={{
                background: style.badge,
                color: style.badgeText,
              }}
            >
              {sub}
            </p>
          )}
        </div>
        {icon && (
          <div
            className="flex shrink-0 items-center justify-center rounded-xl text-white"
            style={{
              width: 40,
              height: 40,
              background: style.icon,
              boxShadow: style.iconShadow,
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
