import { Link } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import StatusBadge from "@/components/StatusBadge";
import { sampleInvoices, dashboardStats } from "@/lib/mock-data";
import { formatINR, formatDate } from "@/lib/format";
import {
  IndianRupee,
  Clock,
  FileText,
  TrendingUp,
  Plus,
  Eye,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const statCards = [
  { label: "Total Collected", value: formatINR(dashboardStats.totalCollected), icon: IndianRupee, color: "text-success" },
  { label: "Pending Payments", value: formatINR(dashboardStats.pendingPayments), icon: Clock, color: "text-warning" },
  { label: "Total Invoices", value: String(dashboardStats.totalInvoices), icon: FileText, color: "text-primary" },
  { label: "Success Rate", value: `${dashboardStats.successRate}%`, icon: TrendingUp, color: "text-success" },
];

export default function Dashboard() {
  const copyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/invoice/${id}`);
    toast.success("Payment link copied to clipboard!");
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back. Here's your invoice overview.</p>
          </div>
          <Link to="/admin/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </Link>
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
          <div className="p-5 border-b">
            <h2 className="text-lg font-semibold text-card-foreground">Recent Invoices</h2>
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
                {sampleInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-5 py-4 font-medium text-foreground">{inv.invoiceNumber}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-foreground">{inv.clientCompany}</p>
                      <p className="text-xs text-muted-foreground">{inv.clientName}</p>
                    </td>
                    <td className="px-5 py-4 text-right font-medium">{formatINR(inv.grandTotal)}</td>
                    <td className="px-5 py-4 text-center"><StatusBadge status={inv.status} /></td>
                    <td className="px-5 py-4 text-muted-foreground">{formatDate(inv.invoiceDate)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/invoice/${inv.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => copyLink(inv.id)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
