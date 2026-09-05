import { useEffect, lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Toaster } from "react-hot-toast";

import { fetchMe } from "./store/authSlice";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";

// Lazy-loaded page routes for production code-splitting
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const POSBilling = lazy(() => import("./pages/pos/POSBilling"));
const ProductList = lazy(() => import("./pages/products/ProductList"));
const SalesHistory = lazy(() => import("./pages/sales/SalesHistory"));
const InvoiceView = lazy(() => import("./pages/sales/InvoiceView"));
const Returns = lazy(() => import("./pages/returns/Returns"));
const Inventory = lazy(() => import("./pages/inventory/Inventory"));
const AIInsights = lazy(() => import("./pages/ai/AIInsights"));
const AskAI = lazy(() => import("./pages/ai/AskAI"));
const UserManagement = lazy(() => import("./pages/users/UserManagement"));
const Settings = lazy(() => import("./pages/settings/Settings"));

function PageFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        Loading...
      </div>
    </div>
  );
}

function HomeRedirect() {
  const user = useSelector((s) => s.auth.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "admin" ? "/dashboard" : "/pos"} replace />;
}

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/pos" element={<POSBilling />} />
              <Route path="/sales" element={<SalesHistory />} />
              <Route path="/sales/:id" element={<InvoiceView />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/inventory" element={<Inventory />} />

              <Route element={<ProtectedRoute roles={["admin"]} />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/products" element={<ProductList />} />
                <Route path="/ai/insights" element={<AIInsights />} />
                <Route path="/ai/ask" element={<AskAI />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
