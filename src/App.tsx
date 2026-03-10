import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import CreateInvoice from "./pages/CreateInvoice";
import EditInvoice from "./pages/EditInvoice";
import PublicInvoice from "./pages/PublicInvoice";
import PaymentSuccess from "./pages/PaymentSuccess";
import SettingsPage from "./pages/SettingsPage";
import CouponsPage from "./pages/CouponsPage";
import InvoiceDetailPage from "./pages/InvoiceDetailPage";
import InvoicesPage from "./pages/admin/Invoices";
import UsersPage from "./pages/UsersPage";
import UserDetailPage from "./pages/UserDetailPage";
import PortalDashboard from "./pages/portal/PortalDashboard";
import PortalInvoiceDetail from "./pages/portal/PortalInvoiceDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Client portal guard — redirects to / if not logged in
// NOTE: The auth token lives as an httpOnly cookie (set by the backend).
// We use client_user in localStorage as the frontend-side "logged in" flag.
// The real security guard is the cookie sent with every API request.
const ClientRoute = ({ children }: { children: React.ReactNode }) => {
  const user = localStorage.getItem("client_user");
  return user ? <>{children}</> : <Navigate to="/" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* ── Landing (client sign-in default / /#admin for staff) ── */}
            <Route path="/" element={<Index />} />

            {/* ── Admin panel ── */}
            <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin/invoices" element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />
            <Route path="/admin/create" element={<ProtectedRoute><CreateInvoice /></ProtectedRoute>} />
            <Route path="/admin/invoice/:invoiceId/edit" element={<ProtectedRoute><EditInvoice /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
            <Route path="/admin/users/:email" element={<ProtectedRoute><UserDetailPage /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/admin/coupons" element={<ProtectedRoute><CouponsPage /></ProtectedRoute>} />
            <Route path="/admin/invoice/:invoiceId" element={<ProtectedRoute><InvoiceDetailPage /></ProtectedRoute>} />

            {/* ── Client portal ── */}
            <Route path="/portal" element={<Navigate to="/" replace />} />
            <Route path="/portal/dashboard" element={<ClientRoute><PortalDashboard /></ClientRoute>} />
            <Route path="/portal/invoice/:token" element={<ClientRoute><PortalInvoiceDetail /></ClientRoute>} />

            {/* ── Public quotation / payment ── */}
            <Route path="/invoice/:invoiceId" element={<PublicInvoice />} />
            <Route path="/invoice/:invoiceId/success" element={<PaymentSuccess />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
