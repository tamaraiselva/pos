import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Toaster } from "react-hot-toast";

import { fetchMe } from "./store/authSlice";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import POSBilling from "./pages/pos/POSBilling";
import ProductList from "./pages/products/ProductList";
import SalesHistory from "./pages/sales/SalesHistory";
import InvoiceView from "./pages/sales/InvoiceView";
import Returns from "./pages/returns/Returns";
import Inventory from "./pages/inventory/Inventory";
import AIInsights from "./pages/ai/AIInsights";
import AskAI from "./pages/ai/AskAI";
import UserManagement from "./pages/users/UserManagement";
import Settings from "./pages/settings/Settings";

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
    </>
  );
}
