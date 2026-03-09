import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ClientLayout from "@/components/ClientLayout";
import { formatINR, formatDate } from "@/lib/format";
import { FileText, Clock, CheckCircle, AlertCircle, IndianRupee, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API = import.meta.env.VITE_API_URL || "http://localhost:3030";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof FileText }> = {
    paid: { label: "Paid", color: "text-green-400 bg-green-400/10 border-green-400/20", icon: CheckCircle },
    pending: { label: "Pending", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: Clock },
    sent: { label: "Sent", color: "text-blue-400 bg-blue-400/10 border-blue-400/20", icon: FileText },
    draft: { label: "Draft", color: "text-slate-400 bg-slate-400/10 border-slate-400/20", icon: FileText },
    expired: { label: "Expired", color: "text-red-400 bg-red-400/10 border-red-400/20", icon: AlertCircle },
    cancelled: { label: "Cancelled", color: "text-red-400 bg-red-400/10 border-red-400/20", icon: AlertCircle },
};

interface ClientInvoice {
    id: number;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    status: string;
    grandTotal: number;
    paymentAmount: number;
    paymentLabel: string;
    paymentLinkToken: string;
    paidAmount: number;
    remaining: number;
    lastRating: number | null;
    client?: { name: string; email: string };
}

export default function PortalDashboard() {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const user = JSON.parse(localStorage.getItem("client_user") || "{}");

    const fetchInvoices = async (isRetry = false) => {
        try {
            const r = await fetch(`${API}/api/portal/invoices`, { credentials: "include" });

            if (r.status === 401 && !isRetry) {
                // Try to refresh the token once before giving up
                const refreshRes = await fetch(`${API}/api/portal/auth/refresh`, {
                    method: "POST",
                    credentials: "include",
                }).catch(() => null);

                if (refreshRes?.ok) {
                    // Refresh succeeded — retry fetching invoices with new token
                    return fetchInvoices(true);
                } else {
                    // Refresh failed — session is truly expired, go to login
                    localStorage.removeItem("client_user");
                    window.location.href = "/";
                    return;
                }
            }

            if (!r.ok) throw new Error("Failed to load invoices");
            const data = await r.json();
            setInvoices(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setInvoices([]);
            toast.error(e.message || "Could not load invoices");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInvoices(); }, []);

    const totalPaid = invoices.reduce((s, i) => s + i.paidAmount, 0);
    const totalDue = invoices.reduce((s, i) => s + i.remaining, 0);
    const totalValue = invoices.reduce((s, i) => s + Number(i.grandTotal), 0);

    return (
        <ClientLayout>
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-white">Welcome back, {user.name?.split(" ")[0] || "Client"}!</h1>
                    <p className="text-slate-400 text-sm mt-1">Here's your invoice and payment summary.</p>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { label: "Total Value", value: formatINR(totalValue), color: "text-blue-400" },
                        { label: "Amount Paid", value: formatINR(totalPaid), color: "text-green-400" },
                        { label: "Outstanding", value: formatINR(totalDue), color: totalDue > 0 ? "text-amber-400" : "text-green-400" },
                    ].map((s) => (
                        <div key={s.label} className="rounded-2xl bg-white/5 border border-white/10 p-5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-slate-400 text-sm">{s.label}</span>
                                <IndianRupee className={`h-4 w-4 ${s.color}`} />
                            </div>
                            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Invoice list */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-white">Your Invoices</h2>
                        <Button variant="ghost" size="sm" className="text-slate-400 gap-1.5" onClick={() => window.location.reload()}>
                            <RefreshCw className="h-3.5 w-3.5" /> Refresh
                        </Button>
                    </div>

                    {loading ? (
                        <div className="text-center py-16 text-slate-500">Loading your invoices...</div>
                    ) : invoices.length === 0 ? (
                        <div className="text-center py-16 rounded-2xl bg-white/5 border border-white/10">
                            <FileText className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">No invoices yet.</p>
                            <p className="text-slate-600 text-sm mt-1">Invoices shared by your service provider will appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {invoices.map((inv) => {
                                const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending;
                                const StatusIcon = cfg.icon;
                                const pct = inv.paymentAmount > 0 ? Math.round((inv.paidAmount / inv.paymentAmount) * 100) : 0;

                                return (
                                    <button
                                        key={inv.id}
                                        onClick={() => navigate(`/portal/invoice/${inv.paymentLinkToken}`)}
                                        className="w-full rounded-2xl bg-white/5 border border-white/10 p-5 text-left hover:bg-white/10 hover:border-blue-500/30 transition-all group"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0 space-y-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-semibold text-white">{inv.invoiceNumber}</span>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                                                        <StatusIcon className="h-3 w-3" /> {cfg.label}
                                                    </span>
                                                    {inv.lastRating && (
                                                        <span className="text-xs text-amber-400">{"★".repeat(inv.lastRating)}</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-400">{inv.paymentLabel} · Due {formatDate(inv.dueDate)}</p>
                                                {/* Progress bar */}
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-xs text-slate-500">
                                                        <span>Paid: {formatINR(inv.paidAmount)}</span>
                                                        <span>Remaining: {formatINR(inv.remaining)}</span>
                                                    </div>
                                                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-blue-500"}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-bold text-white text-lg">{formatINR(inv.paymentAmount)}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{formatINR(inv.grandTotal)} total</p>
                                                <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-blue-400 ml-auto mt-2 transition-colors" />
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </ClientLayout>
    );
}
