import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import StatusBadge from "@/components/StatusBadge";
import { formatINR, formatDate } from "@/lib/format";
import {
  IndianRupee, Clock, FileText, TrendingUp, Plus, Eye, Copy, RefreshCw, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API = import.meta.env.VITE_API_URL ?? "";

interface InvoiceRow {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  grandTotal: number;
  paymentAmount: number;
  paymentLinkToken: string;
  client?: { name: string; company?: string };
  clientGoogleName?: string;
  transactions?: { status: string; amount: number }[];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token") || "";
      const res = await fetch(`${API}/api/invoices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Unauthorized");
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Could not load invoices from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/invoice/${token}`);
    toast.success("Payment link copied!");
  };

  // Compute live stats
  const totalCollected = invoices.reduce((s, inv) => {
    const paid = (inv.transactions || [])
      .filter((t) => t.status === "success")
      .reduce((a, t) => a + Number(t.amount), 0);
    return s + paid;
  }, 0);
  const pendingPayments = invoices
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + Number(i.paymentAmount), 0);
  const paidCount = invoices.filter((i) => i.status === "paid").length;
  const successRate = invoices.length ? Math.round((paidCount / invoices.length) * 100) : 0;

  const statCards = [
    { label: "Total Collected", value: formatINR(totalCollected), icon: IndianRupee, color: "text-success" },
    { label: "Pending Payments", value: formatINR(pendingPayments), icon: Clock, color: "text-warning" },
    { label: "Total Invoices", value: String(invoices.length), icon: FileText, color: "text-primary" },
    { label: "Success Rate", value: `${successRate}%`, icon: TrendingUp, color: "text-success" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back. Here's your invoice overview.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchInvoices} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Link to="/admin/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <div key={stat.label} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="mt-2 text-2xl font-bold text-card-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="p-5 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold text-card-foreground">Recent Invoices</h2>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-5 py-3 text-left font-medium">Invoice No</th>
                  <th className="px-5 py-3 text-left font-medium">Client</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  <th className="px-5 py-3 text-center font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && invoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                      No invoices yet. <Link to="/admin/create" className="text-primary underline">Create your first invoice →</Link>
                    </td>
                  </tr>
                )}
                {invoices.map((inv) => {
                  const clientName = inv.client?.name || inv.clientGoogleName || "—";
                  const clientCompany = inv.client?.company;
                  return (
                    <tr
                      key={inv.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/invoice/${inv.id}`)}
                    >
                      <td className="px-5 py-4 font-medium text-foreground">
                        <Link
                          to={`/admin/invoice/${inv.id}`}
                          className="hover:text-primary transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground">{clientCompany || clientName}</p>
                        {clientCompany && <p className="text-xs text-muted-foreground">{clientName}</p>}
                      </td>
                      <td className="px-5 py-4 text-right font-medium">{formatINR(inv.grandTotal)}</td>
                      <td className="px-5 py-4 text-center">
                        <StatusBadge status={inv.status as any} />
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{formatDate(inv.invoiceDate)}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Link to={`/admin/invoice/${inv.id}`}>
                            <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                          </Link>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => copyLink(inv.paymentLinkToken)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
