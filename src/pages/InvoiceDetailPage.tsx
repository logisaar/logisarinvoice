import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import StatusBadge from "@/components/StatusBadge";
import { formatINR, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
    ArrowLeft, Copy, Check, Mail, ExternalLink, Link as LinkIcon,
    CreditCard, Star, MessageSquare, IndianRupee, Clock, AlertCircle,
    RefreshCw, User, Phone, AtSign, MapPin, Loader2, ShieldCheck, Edit, Trash2
} from "lucide-react";
import { toast } from "sonner";

const API = import.meta.env.VITE_API_URL ?? "";

export default function InvoiceDetailPage() {
    const { invoiceId } = useParams();
    const navigate = useNavigate();

    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [linkModal, setLinkModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const [editAmount, setEditAmount] = useState("");
    const [editLabel, setEditLabel] = useState("");
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchInvoice = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("admin_token") || "";
            const res = await fetch(`${API}/api/invoices/${invoiceId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Not found");
            const data = await res.json();
            setInvoice(data);
            setEditAmount(String(data.paymentAmount ?? data.grandTotal ?? ""));
            setEditLabel(data.paymentLabel ?? "Full Payment");
        } catch {
            setInvoice(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInvoice(); }, [invoiceId]);

    if (loading) return (
        <AdminLayout>
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        </AdminLayout>
    );

    if (!invoice) return (
        <AdminLayout>
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground" />
                <h2 className="text-xl font-bold">Invoice not found</h2>
                <Button variant="outline" onClick={() => navigate("/admin")}>← Back to Dashboard</Button>
            </div>
        </AdminLayout>
    );

    // Normalise field names
    const items: any[] = invoice.items ?? invoice.lineItems ?? [];
    const paid = invoice.status === "paid";
    const paymentAmount = Number(invoice.paymentAmount ?? invoice.grandTotal ?? 0);
    const totalTax = Number(invoice.totalTax ?? 0);

    // Compute real paid amount from transactions
    const paidAmount = (invoice.transactions ?? [])
        .filter((t: any) => t.status === "success")
        .reduce((s: number, t: any) => s + Number(t.amount), 0);
    const remaining = Math.max(0, paymentAmount - paidAmount);

    // Real payment link uses paymentLinkToken (UUID)
    const paymentLink = `${window.location.origin}/invoice/${invoice.paymentLinkToken}`;

    // Client info from nested object or top-level fields
    const clientName = invoice.client?.name ?? invoice.clientGoogleName ?? "—";
    const clientCompany = invoice.client?.company ?? "";
    const clientEmail = invoice.client?.email ?? "";
    const clientPhone = invoice.client?.phone ?? "";
    const clientAddress = invoice.client?.address ?? "";
    const clientGST = invoice.client?.gstNumber ?? "";

    const feedback = invoice.feedback?.[0] ?? null;

    const copyLink = () => {
        navigator.clipboard.writeText(paymentLink).catch(() => { });
        setCopied(true); setTimeout(() => setCopied(false), 2000);
        toast.success("Link copied!");
    };

    const saveAmountUpdate = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem("admin_token") || "";
            const res = await fetch(`${API}/api/invoices/${invoiceId}/payment`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ paymentAmount: parseFloat(editAmount), paymentLabel: editLabel }),
            });
            if (!res.ok) throw new Error("Failed");
            const updated = await res.json();
            setInvoice({ ...invoice, ...updated });
            setEditModalOpen(false);
            toast.success("Payment details updated. Share the same link again.");
        } catch {
            toast.error("Failed to update payment details.");
        } finally {
            setSaving(false);
        }
    };

    const emailClient = () => {
        const subject = encodeURIComponent(`Invoice ${invoice.invoiceNumber} – ${invoice.paymentLabel ?? "Payment"}`);
        const body = encodeURIComponent(
            `Dear ${clientName},\n\nPlease find your quotation (${invoice.invoiceNumber}).\n\nAmount due: ${formatINR(paymentAmount)} (${invoice.paymentLabel ?? "Full Payment"})\nDue date: ${formatDate(invoice.dueDate)}\n\nReview & pay via:\n${paymentLink}\n\nThank you`
        );
        const to = clientEmail ? `mailto:${clientEmail}?` : "mailto:?";
        window.open(`${to}subject=${subject}&body=${body}`, "_blank");
    };

    const deleteInvoice = async () => {
        setDeleting(true);
        try {
            const token = localStorage.getItem("admin_token") || "";
            const res = await fetch(`${API}/api/invoices/${invoiceId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed");
            toast.success("Invoice deleted successfully");
            navigate("/admin");
        } catch {
            toast.error("Failed to delete invoice.");
            setDeleting(false);
        }
    };

    return (
        <AdminLayout>
            <div className="max-w-4xl space-y-6">
                {/* Header */}
                <div className="flex flex-wrap items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
                    </Button>
                    <div className="flex-1 min-w-[200px]">
                        <h1 className="text-xl font-bold text-foreground truncate">{clientCompany || clientName}</h1>
                        <p className="text-sm text-muted-foreground">{invoice.invoiceNumber} · Created {formatDate(invoice.invoiceDate)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <StatusBadge status={invoice.status as any} />
                        <span className="w-2"></span> {/* Spacer */}
                        <Button variant="ghost" size="icon" onClick={fetchInvoice} title="Refresh">
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        {!paid && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/admin/invoice/${invoiceId}/edit`)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <Edit className="h-4 w-4 mr-1" /> Edit
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteModalOpen(true)}
                            className="text-destructive hover:bg-destructive/10"
                        >
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: payment summary + link + feedback + items */}
                    <div className="lg:col-span-2 space-y-4">

                        {/* Payment Summary */}
                        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                            <h2 className="font-semibold text-foreground flex items-center gap-2">
                                <IndianRupee className="h-4 w-4 text-primary" /> Payment Summary
                            </h2>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: "Quotation Total", value: formatINR(invoice.grandTotal), color: "text-foreground" },
                                    { label: invoice.paymentLabel ?? "To Collect", value: formatINR(paymentAmount), color: "text-primary" },
                                    { label: "Remaining", value: formatINR(remaining), color: remaining > 0 ? "text-orange-600" : "text-green-600" },
                                ].map((s) => (
                                    <div key={s.label} className="rounded-lg bg-muted/40 p-3 text-center">
                                        <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                                        <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Progress */}
                            <div>
                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                    <span>Payment progress</span>
                                    <span>{paymentAmount > 0 ? Math.round((paidAmount / paymentAmount) * 100) : 0}% collected</span>
                                </div>
                                <div className="h-2 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${paidAmount >= paymentAmount && paymentAmount > 0 ? "bg-green-500" : "bg-orange-400"}`}
                                        style={{ width: paymentAmount > 0 ? `${Math.min(100, Math.round((paidAmount / paymentAmount) * 100))}%` : "0%" }}
                                    />
                                </div>
                            </div>

                            {/* Transaction history */}
                            {(invoice.transactions ?? []).length > 0 && (
                                <div className="space-y-2 pt-2 border-t">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment History</p>
                                    {invoice.transactions.map((t: any) => (
                                        <div key={t.id} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                {t.status === "success"
                                                    ? <CreditCard className="h-4 w-4 text-green-500" />
                                                    : <Clock className="h-4 w-4 text-amber-500" />}
                                                <span className="capitalize text-foreground">{t.status}</span>
                                                <span className="text-xs text-muted-foreground">{formatDate(t.createdAt)}</span>
                                            </div>
                                            <span className="font-medium">{formatINR(t.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!paid && (
                                <div className="flex gap-2 pt-1">
                                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditModalOpen(true)}>
                                        <RefreshCw className="h-3.5 w-3.5" /> Update Amount
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Payment Link Card */}
                        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
                            <h2 className="font-semibold text-foreground flex items-center gap-2">
                                <LinkIcon className="h-4 w-4 text-primary" /> Payment Link
                            </h2>
                            <div className="flex items-center gap-2 rounded-lg border bg-muted px-3 py-2.5">
                                <span className="flex-1 truncate text-sm font-mono text-foreground select-all">{paymentLink}</span>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0" onClick={copyLink}>
                                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={copyLink}>
                                    {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                    {copied ? "Copied!" : "Copy"}
                                </Button>
                                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => window.open(paymentLink, "_blank")}>
                                    <ExternalLink className="h-3.5 w-3.5" /> Open
                                </Button>
                                <Button size="sm" className="gap-1 text-xs" onClick={emailClient}>
                                    <Mail className="h-3.5 w-3.5" /> Email
                                </Button>
                            </div>
                        </div>

                        {/* Client Feedback */}
                        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
                            <h2 className="font-semibold text-foreground flex items-center gap-2">
                                <Star className="h-4 w-4 text-amber-400" /> Client Feedback
                            </h2>
                            {feedback ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <Star key={s} className={`h-5 w-5 ${s <= feedback.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                                        ))}
                                        <span className="ml-2 text-sm font-medium">{feedback.rating}/5</span>
                                    </div>
                                    {feedback.message && (
                                        <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm italic">
                                            <MessageSquare className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />
                                            "{feedback.message}"
                                        </div>
                                    )}
                                    <p className="text-xs text-muted-foreground">Submitted {formatDate(feedback.submittedAt)}</p>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    Feedback will appear after the client completes payment.
                                </div>
                            )}
                        </div>

                        {/* Quotation Items */}
                        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                            <div className="p-4 border-b">
                                <h2 className="font-semibold text-foreground">Quotation Items</h2>
                            </div>
                            <table className="w-full text-sm">
                                <thead className="bg-muted/30 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty</th>
                                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Rate</th>
                                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Tax</th>
                                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item: any, i: number) => (
                                        <tr key={i} className="border-b last:border-0">
                                            <td className="px-4 py-3">{item.description}</td>
                                            <td className="px-4 py-3 text-right">{Number(item.quantity)}</td>
                                            <td className="px-4 py-3 text-right">{formatINR(item.unitPrice ?? item.unit_price ?? 0)}</td>
                                            <td className="px-4 py-3 text-right text-muted-foreground">{Number(item.taxPercent ?? item.tax_percent ?? 0)}%</td>
                                            <td className="px-4 py-3 text-right font-medium">{formatINR(item.amount ?? 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t bg-muted/20">
                                    <tr>
                                        <td colSpan={4} className="px-4 py-2 text-right text-sm text-muted-foreground">Subtotal</td>
                                        <td className="px-4 py-2 text-right font-medium">{formatINR(invoice.subtotal)}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan={4} className="px-4 py-2 text-right text-sm text-muted-foreground">GST</td>
                                        <td className="px-4 py-2 text-right font-medium">{formatINR(totalTax)}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan={4} className="px-4 py-2 text-right font-bold">Grand Total</td>
                                        <td className="px-4 py-2 text-right font-bold text-primary">{formatINR(invoice.grandTotal)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Right: client info + invoice details */}
                    <div className="space-y-4">
                        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                            <h2 className="font-semibold text-foreground flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" /> Client Info
                            </h2>
                            <div className="space-y-3 text-sm">
                                {[
                                    { icon: User, label: clientCompany || clientName },
                                    { icon: AtSign, label: clientEmail },
                                    { icon: Phone, label: clientPhone },
                                    { icon: MapPin, label: clientAddress },
                                ].filter((r) => r.label).map((row, i) => (
                                    <div key={i} className="flex items-start gap-2 text-muted-foreground">
                                        <row.icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/60" />
                                        <span className="break-all">{row.label}</span>
                                    </div>
                                ))}
                                {clientGST && (
                                    <div className="text-xs bg-muted rounded px-2 py-1 font-mono">GST: {clientGST}</div>
                                )}
                                {invoice.clientGoogleEmail && (
                                    <div className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-1">
                                        Google: {invoice.clientGoogleEmail}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Client Login History */}
                        {(invoice.clientSessions?.length > 0) && (
                            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
                                <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                                    <ShieldCheck className="h-4 w-4 text-primary" /> Login History &amp; Ownership
                                </h2>
                                <div className="space-y-3">
                                    {invoice.clientSessions.map((session: any) => {
                                        const isActivePayer = session.googleEmail === invoice.clientGoogleEmail && invoice.status === 'paid';
                                        return (
                                            <div key={session.id} className={`flex items-start gap-3 p-3 rounded-lg border ${isActivePayer ? 'bg-green-50 border-green-200' : 'bg-muted/30 border-transparent'}`}>
                                                {session.googlePicture ? (
                                                    <img src={session.googlePicture} alt="" className="w-8 h-8 rounded-full bg-muted object-cover" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                                        {session.googleName?.[0] || '?'}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-foreground truncate">
                                                        {session.googleName || session.googleEmail}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">{session.googleEmail}</p>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                                        Signed in {formatDate(session.signedInAt)}
                                                    </p>
                                                    {isActivePayer && (
                                                        <span className="inline-block mt-1 text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                                                            Owner
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
                            <h2 className="font-semibold text-foreground">Invoice Details</h2>
                            <div className="space-y-2 text-sm">
                                {[
                                    { label: "Invoice No", value: invoice.invoiceNumber },
                                    { label: "Payment Type", value: invoice.paymentType ?? "full" },
                                    { label: "Payment Label", value: invoice.paymentLabel ?? "Full Payment" },
                                    { label: "Invoice Date", value: formatDate(invoice.invoiceDate) },
                                    { label: "Due Date", value: formatDate(invoice.dueDate) },
                                ].map((r) => (
                                    <div key={r.label} className="flex justify-between gap-2">
                                        <span className="text-muted-foreground">{r.label}</span>
                                        <span className="font-medium text-right capitalize">{r.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {invoice.notes && (
                            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
                                <h2 className="font-semibold text-foreground text-sm">Notes</h2>
                                <p className="text-xs text-muted-foreground whitespace-pre-line">{invoice.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Amount Modal */}
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Update Payment Collection</DialogTitle>
                        <DialogDescription>
                            Modify the amount or label. The existing link stays the same — just share it again.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Amount to Charge (₹)</Label>
                            <Input type="number" min={1} value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
                            <p className="text-xs text-muted-foreground">Quotation total: {formatINR(invoice.grandTotal)}</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Payment Label</Label>
                            <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder="e.g. 2nd Instalment" />
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
                        <Button onClick={saveAmountUpdate} disabled={saving}>
                            {saving ? "Saving..." : "Save & Update Link"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Invoice</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete invoice <strong>{invoice.invoiceNumber}</strong>?
                            This action cannot be undone, and the payment link will stop working immediately.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 justify-end pt-4">
                        <Button variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={deleting}>Cancel</Button>
                        <Button variant="destructive" onClick={deleteInvoice} disabled={deleting}>
                            {deleting ? "Deleting..." : "Delete Invoice"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
