import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../store/authSlice";
import GlobalAIChatbot from "./GlobalAIChatbot";

/* ── SVG icon components (no external dep) ──────────────────── */
const Icon = {
  Dashboard: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M2 10a8 8 0 1 1 16 0A8 8 0 0 1 2 10Zm8-5.5a.75.75 0 0 1 .75.75v4.69l2.78 2.78a.75.75 0 1 1-1.06 1.06l-3-3A.75.75 0 0 1 9.25 10V5.25A.75.75 0 0 1 10 4.5Z" />
    </svg>
  ),
  POS: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M1 1.75A.75.75 0 0 1 1.75 1h1.628a1.75 1.75 0 0 1 1.734 1.51L5.18 3a65.25 65.25 0 0 1 13.36 1.412.75.75 0 0 1 .58.875 48.645 48.645 0 0 1-1.618 6.2.75.75 0 0 1-.712.513H6a2.503 2.503 0 0 0-2.292 1.5H17.25a.75.75 0 0 1 0 1.5H2.76a.75.75 0 0 1-.748-.807 4.002 4.002 0 0 1 2.716-3.486L3.626 2.716a.25.25 0 0 0-.248-.216H1.75A.75.75 0 0 1 1 1.75ZM6 17.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM15.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    </svg>
  ),
  Products: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M7.25 1.75a.75.75 0 0 0-1.5 0v.884a1.25 1.25 0 0 0-.876 1.741l.25.5A1.25 1.25 0 0 0 6.25 5.5h7.5a1.25 1.25 0 0 0 1.126-.625l.25-.5A1.25 1.25 0 0 0 14.25 2.634V1.75a.75.75 0 0 0-1.5 0v.75h-5.5V1.75ZM2.5 7.5A2.5 2.5 0 0 1 5 5h10a2.5 2.5 0 0 1 2.5 2.5v8a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 15.5v-8Z" />
    </svg>
  ),
  Sales: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0-6a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z" clipRule="evenodd" />
    </svg>
  ),
  Returns: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.128a5.25 5.25 0 0 1 0 10.5H9.75a.75.75 0 0 1 0-1.5h3.998a3.75 3.75 0 0 0 0-7.5H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.061.025Z" clipRule="evenodd" />
    </svg>
  ),
  Inventory: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M11.983 1.907a.75.75 0 0 0-1.292-.657l-8.5 9.5A.75.75 0 0 0 2.75 12h6.572l-1.305 6.093a.75.75 0 0 0 1.292.657l8.5-9.5A.75.75 0 0 0 17.25 8h-6.572l1.305-6.093Z" />
    </svg>
  ),
  AI: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M10 1a6 6 0 0 0-3.815 10.631C7.237 12.5 8 13.443 8 14.456v.544a.75.75 0 0 0 .75.75h2.5a.75.75 0 0 0 .75-.75v-.544c0-1.013.762-1.957 1.815-2.825A6 6 0 0 0 10 1ZM8.75 16.75v.5a.25.25 0 0 0 .25.25h2a.25.25 0 0 0 .25-.25v-.5h-2.5Z" />
    </svg>
  ),
  Chat: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M3.505 2.365A41.369 41.369 0 0 1 9 2c1.863 0 3.697.124 5.495.365 1.247.167 2.18 1.108 2.435 2.268a4.45 4.45 0 0 0-.577-.069 43.141 43.141 0 0 0-4.706 0C9.229 4.696 7.5 6.727 7.5 8.998v2.24c0 1.413.67 2.735 1.76 3.562l-2.98 2.98A.75.75 0 0 1 5 17.25v-3.443c-.501-.048-1-.106-1.495-.172C2.033 13.438 1 12.162 1 10.72V5.28c0-1.441 1.033-2.717 2.505-2.914Z" />
      <path d="M14 6c-.762 0-1.52.02-2.271.062C10.157 6.148 9 7.472 9 8.998v2.24c0 1.519 1.147 2.839 2.71 2.935.214.013.428.024.642.034.2.009.385.09.518.224l2.38 2.38A.75.75 0 0 0 16.5 16.25v-2.443c.5-.048.999-.106 1.495-.172C19.033 13.438 20 12.162 20 10.72V8.998c0-1.526-1.157-2.85-2.729-2.936A41.645 41.645 0 0 0 14 6Z" />
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.808A7.72 7.72 0 0 1 14.5 16Z" />
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.113a7.047 7.047 0 0 1 0-2.228L1.764 7.264a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.993 6.993 0 0 1 7.45 2.955l.39-1.151ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
    </svg>
  ),
  Logout: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
      <path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-1.068a.75.75 0 1 0-1.004-1.115l-2.5 2.5a.75.75 0 0 0 0 1.115l2.5 2.5a.75.75 0 1 0 1.004-1.115L8.704 10.75H18.25A.75.75 0 0 0 19 10Z" clipRule="evenodd" />
    </svg>
  ),
};

const ADMIN_LINKS = [
  { to: "/dashboard", label: "Dashboard", Icon: Icon.Dashboard },
  { to: "/pos", label: "POS Billing", Icon: Icon.POS },
  { to: "/products", label: "Products", Icon: Icon.Products },
  { to: "/sales", label: "Sales History", Icon: Icon.Sales },
  { to: "/returns", label: "Returns", Icon: Icon.Returns },
  { to: "/inventory", label: "Inventory", Icon: Icon.Inventory },
  { to: "/ai/insights", label: "AI Insights", Icon: Icon.AI },
  { to: "/users", label: "Users", Icon: Icon.Users },
  { to: "/settings", label: "Settings", Icon: Icon.Settings },
];

const CASHIER_LINKS = [
  { to: "/pos", label: "POS Billing", Icon: Icon.POS },
  { to: "/sales", label: "Sales History", Icon: Icon.Sales },
  { to: "/returns", label: "Returns", Icon: Icon.Returns },
  { to: "/inventory", label: "Inventory", Icon: Icon.Inventory },
];

function getInitials(name = "") {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Layout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const links = user?.role === "admin" ? ADMIN_LINKS : CASHIER_LINKS;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await dispatch(logout());
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex h-screen flex-col md:flex-row overflow-hidden bg-slate-50">
      {/* ── Mobile Top Bar ────────────────────────────────────────── */}
      <header className="flex md:hidden items-center justify-between bg-slate-900 px-4 py-3 border-b border-slate-800 text-white shrink-0 z-30">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{
              width: 30,
              height: 30,
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            }}
          >
            P
          </div>
          <span className="font-bold text-sm">POS System</span>
        </div>
        <button
          onClick={() => setMobileOpen((m) => !m)}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
            {mobileOpen ? (
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            ) : (
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
            )}
          </svg>
        </button>
      </header>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden animate-fade-in"
        />
      )}

      {/* ── Sidebar (Desktop & Mobile Drawer) ──────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 md:static flex flex-col shrink-0 transition-all duration-300 ${
          mobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0"
        }`}
        style={{
          width: mobileOpen ? "256px" : collapsed ? "64px" : "228px",
          background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Logo & Toggle */}
        <div
          className={`flex items-center ${collapsed && !mobileOpen ? "flex-col justify-center gap-2 py-4 px-2" : "justify-between px-4 py-5"}`}
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              onClick={() => {
                setCollapsed(false);
                setMobileOpen(false);
              }}
              className="flex shrink-0 cursor-pointer items-center justify-center rounded-xl text-sm font-extrabold text-white transition-transform hover:scale-105"
              title="POS System"
              style={{
                width: 36,
                height: 36,
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                boxShadow: "0 0 16px rgba(99,102,241,0.5)",
              }}
            >
              P
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="animate-fade-in min-w-0">
                <p className="text-sm font-bold text-white leading-tight truncate">POS System</p>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest truncate">
                  Cloud Retail
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              if (mobileOpen) setMobileOpen(false);
              else setCollapsed((c) => !c);
            }}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 shrink-0"
            title={collapsed ? "Open menu" : "Collapse menu"}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              {collapsed && !mobileOpen ? (
                <path fillRule="evenodd" d="M8.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 8 8.22 4.28a.75.75 0 0 1 0-1.06Zm-4.5 0a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06L4.78 11.78a.75.75 0 0 1-1.06-1.06L7.44 8 3.72 4.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M7.78 12.78a.75.75 0 0 1-1.06 0L2.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 1.06L4.06 8l3.72 3.72a.75.75 0 0 1 0 1.06Zm4.5 0a.75.75 0 0 1-1.06 0L7.97 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 1.06L9.56 8l2.72 2.72a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
              )}
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {links.map(({ to, label, Icon: NavIcon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              title={collapsed && !mobileOpen ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "text-slate-400 hover:bg-white/8 hover:text-slate-100"
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? { boxShadow: "0 0 12px rgba(99,102,241,0.45)" }
                  : {}
              }
            >
              <span className="shrink-0">
                <NavIcon />
              </span>
              {(!collapsed || mobileOpen) && (
                <span className="truncate animate-fade-in">{label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div
          className="px-3 py-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div
              className="flex shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{
                width: 32,
                height: 32,
                background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
              }}
            >
              {getInitials(user?.name)}
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="flex-1 min-w-0 animate-fade-in">
                <p className="truncate text-sm font-semibold text-slate-200">
                  {user?.name}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">
                  {user?.role}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setMobileOpen(false);
              handleLogout();
            }}
            title="Log out"
            className={`mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-white/8 hover:text-rose-400 ${
              collapsed && !mobileOpen ? "justify-center" : ""
            }`}
          >
            <Icon.Logout />
            {(!collapsed || mobileOpen) && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
          <Outlet />
        </div>
      </main>

      {/* Global AI Chatbot Floating Widget for Admin */}
      <GlobalAIChatbot />
    </div>
  );
}
