import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ClientLayout from "@/components/ClientLayout";
import InvoiceDocument from "@/components/InvoiceDocument";
import { formatINR, formatDate } from "@/lib/format";
import { ArrowLeft, CreditCard, CheckCircle, Clock, Star, MessageSquare, Download, IndianRupee, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import html2pdf from "html2pdf.js";

const API = import.meta.env.VITE_API_URL || "http://localhost:3030";

export default function PortalInvoiceDetail() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [downloadingPdf, setDownloadingPdf] = useState(false);

    useEffect(() => {
        if (!token) {
            navigate("/");
            return;
        }
        fetch(`${API}/api/portal/invoices/${token}`, {
            credentials: "include"
        })
            .then((r) => {
                if (!r.ok) {
                    if (r.status === 401) {
                        localStorage.removeItem("client_user");
                        navigate("/");
                    }
                    throw new Error("Failed to load invoice");
                }
                return r.json();
            })
            .then((data) => setInvoice(data.statusCode ? null : data))
            .catch((e) => { setInvoice(null); toast.error(e.message || "Could not load invoice"); })
            .finally(() => setLoading(false));
    }, [navigate, token]);

    if (loading) return (
        <ClientLayout>
            <div className="flex items-center justify-center py-24 text-slate-500">Loading invoice...</div>
        </ClientLayout>
    );

    if (!invoice) return (
        <ClientLayout>
            <div className="text-center py-24">
                <p className="text-slate-400">Invoice not found.</p>
                <Button variant="outline" onClick={() => navigate("/portal/dashboard")} className="mt-4">← Back</Button>
            </div>
        </ClientLayout>
    );

    const pct = invoice.paymentAmount > 0 ? Math.round((invoice.paidAmount / invoice.paymentAmount) * 100) : 0;
    const isPaid = invoice.status === "paid" || invoice.remaining === 0;

    const handleDownloadPdf = async () => {
        const element = document.getElementById("invoice-print-container");
        if (!element) return;

        setDownloadingPdf(true);
        // Briefly make it visible so html2pdf can capture its natural layout
        element.classList.remove("hidden");
        // Give the browser a frame to apply the CSS layout
        await new Promise((resolve) => setTimeout(resolve, 50));

        const opt = {
            margin: 10,
            filename: `${invoice.invoiceNumber}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };

        try {
            await html2pdf().set(opt).from(element).save();
        } catch (e) {
            toast.error("Failed to generate PDF");
        } finally {
            element.classList.add("hidden");
            setDownloadingPdf(false);
        }
    };

    return (
        <ClientLayout>
            <div className="max-w-3xl space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/portal/dashboard")} className="text-slate-400 hover:text-white gap-1">
                        <ArrowLeft className="h-4 w-4" /> My Invoices
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-white">{invoice.invoiceNumber}</h1>
                        <p className="text-slate-400 text-sm">{invoice.paymentLabel} · Due {formatDate(invoice.dueDate)}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${isPaid ? "text-green-400 bg-green-400/10 border-green-400/20"
                        : "text-amber-400 bg-amber-400/10 border-amber-400/20"
                        }`}>
                        {isPaid ? "✓ Paid" : "Pending"}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Main */}
                    <div className="md:col-span-2 space-y-4">
                        {/* Payment status card */}
                        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
                            <h2 className="font-semibold text-white flex items-center gap-2">
                                <IndianRupee className="h-4 w-4 text-blue-400" /> Payment Status
                            </h2>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: "Invoice Total", value: formatINR(invoice.grandTotal), color: "text-white" },
                                    { label: invoice.paymentLabel, value: formatINR(invoice.paymentAmount), color: "text-blue-400" },
                                    { label: "Remaining", value: formatINR(invoice.remaining), color: invoice.remaining > 0 ? "text-amber-400" : "text-green-400" },
                                ].map((s) => (
                                    <div key={s.label} className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                                        <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                                        <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                                    <span>{pct}% paid</span>
                                    <span>{isPaid ? "Complete" : "In progress"}</span>
                                </div>
                                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${isPaid ? "bg-green-500" : "bg-blue-500"}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>
                            {!isPaid && invoice.paymentLinkToken && (
                                <Button
                                    className="w-full"
                                    onClick={() => {
                                        // Pass the already-authenticated portal user so PublicInvoice
                                        // can skip the sign-in step and go straight to checkout
                                        const portalUser = (() => {
                                            try { return JSON.parse(localStorage.getItem("client_user") || "{}"); }
                                            catch { return {}; }
                                        })();
                                        navigate(`/invoice/${invoice.paymentLinkToken}`, {
                                            state: { portalUser },
                                        });
                                    }}
                                >
                                    <CreditCard className="h-4 w-4 mr-2" /> Pay Now → {formatINR(invoice.remaining)}
                                </Button>
                            )}
                        </div>

                        {/* Transaction history */}
                        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-3">
                            <h2 className="font-semibold text-white flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-blue-400" /> Payment History
                            </h2>
                            {invoice.transactions?.length > 0 ? (
                                <div className="space-y-2">
                                    {invoice.transactions.map((t: any) => (
                                        <div key={t.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                            <div className="flex items-center gap-3">
                                                {t.status === "success"
                                                    ? <CheckCircle className="h-4 w-4 text-green-400" />
                                                    : <Clock className="h-4 w-4 text-amber-400" />
                                                }
                                                <div>
                                                    <p className="text-sm text-white font-medium capitalize">{t.status}</p>
                                                    <p className="text-xs text-slate-500">{formatDate(t.createdAt)}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-white">{formatINR(t.amount)}</p>
                                                {t.txnId && <p className="text-xs text-slate-600 font-mono">{t.txnId.slice(0, 12)}...</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-slate-600 text-sm">
                                    <Clock className="h-8 w-8 mx-auto mb-2 text-slate-700" />
                                    No payments recorded yet
                                </div>
                            )}
                        </div>

                        {/* Feedback */}
                        {invoice.feedback?.length > 0 && (
                            <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-3">
                                <h2 className="font-semibold text-white flex items-center gap-2">
                                    <Star className="h-4 w-4 text-amber-400" /> Your Feedback
                                </h2>
                                {invoice.feedback.map((f: any, i: number) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star key={s} className={`h-5 w-5 ${s <= f.rating ? "fill-amber-400 text-amber-400" : "text-slate-700"}`} />
                                            ))}
                                        </div>
                                        {f.message && (
                                            <div className="rounded-xl bg-white/5 px-4 py-3 text-sm text-slate-300 italic">
                                                <MessageSquare className="h-3.5 w-3.5 inline mr-1 text-slate-500" />
                                                "{f.message}"
                                            </div>
                                        )}
                                        <p className="text-xs text-slate-600">Submitted {formatDate(f.submittedAt)}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Line items */}
                        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/10">
                                <h2 className="font-semibold text-white flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-blue-400" /> Quotation Items
                                </h2>
                            </div>
                            <table className="w-full text-sm">
                                <thead className="border-b border-white/10">
                                    <tr className="text-slate-500">
                                        <th className="px-5 py-3 text-left font-medium">Item</th>
                                        <th className="px-5 py-3 text-right font-medium">Qty</th>
                                        <th className="px-5 py-3 text-right font-medium">Rate</th>
                                        <th className="px-5 py-3 text-right font-medium">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoice.items?.map((item: any, i: number) => (
                                        <tr key={i} className="border-b border-white/5 last:border-0">
                                            <td className="px-5 py-3 text-white">{item.description}</td>
                                            <td className="px-5 py-3 text-right text-slate-400">{item.quantity}</td>
                                            <td className="px-5 py-3 text-right text-slate-400">{formatINR(item.unitPrice ?? item.unit_price)}</td>
                                            <td className="px-5 py-3 text-right font-medium text-white">{formatINR(item.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t border-white/10">
                                    <tr>
                                        <td colSpan={3} className="px-5 py-3 text-right text-slate-400 font-bold">Grand Total</td>
                                        <td className="px-5 py-3 text-right font-bold text-blue-400 text-base">{formatINR(invoice.grandTotal)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
                            <h2 className="font-semibold text-white text-sm">Invoice Details</h2>
                            {[
                                { label: "Invoice #", value: invoice.invoiceNumber },
                                { label: "Date", value: formatDate(invoice.invoiceDate) },
                                { label: "Due Date", value: formatDate(invoice.dueDate) },
                                { label: "Type", value: invoice.paymentLabel },
                                { label: "Status", value: invoice.status },
                            ].map((r) => (
                                <div key={r.label} className="flex justify-between gap-2 text-sm">
                                    <span className="text-slate-500">{r.label}</span>
                                    <span className="text-slate-300 font-medium capitalize text-right">{r.value}</span>
                                </div>
                            ))}
                        </div>

                        {isPaid && (
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 bg-slate-800 border-white/10 text-white hover:bg-slate-700"
                                    onClick={() => window.print()}
                                >
                                    <Printer className="h-4 w-4 mr-2" /> Print
                                </Button>
                                <Button
                                    variant="default"
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0"
                                    onClick={handleDownloadPdf}
                                    disabled={downloadingPdf}
                                >
                                    <Download className="h-4 w-4 mr-2" /> {downloadingPdf ? "Gen PDF..." : "Download"}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Hidden invoice — only visible when printing/downloading */}
            {isPaid && (
                <div id="invoice-print-container" className="hidden print:block print-area">
                    <InvoiceDocument invoice={invoice} showWatermark />
                </div>
            )}
        </ClientLayout>
    );
}
