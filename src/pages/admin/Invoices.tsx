import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import StatusBadge from "@/components/StatusBadge";
import { formatINR, formatDate } from "@/lib/format";
import { Copy, Eye, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
    client?: { name: string; company?: string; email?: string };
    clientGoogleName?: string;
    clientGoogleEmail?: string;
}

export default function Invoices() {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Deletion state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<InvoiceRow | null>(null);
    const [deleting, setDeleting] = useState(false);

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

    const filteredInvoices = invoices.filter((inv) => {
        const term = searchQuery.toLowerCase();
        const invNoMatch = inv.invoiceNumber.toLowerCase().includes(term);
        const clientNameMatch = (inv.client?.name || inv.clientGoogleName || "").toLowerCase().includes(term);
        const clientEmailMatch = (inv.client?.email || inv.clientGoogleEmail || "").toLowerCase().includes(term);
        const companyMatch = (inv.client?.company || "").toLowerCase().includes(term);

        return invNoMatch || clientNameMatch || clientEmailMatch || companyMatch;
    });

    const handleDelete = async () => {
        if (!invoiceToDelete) return;
        setDeleting(true);
        try {
            const token = localStorage.getItem("admin_token") || "";
            const res = await fetch(`${API}/api/invoices/${invoiceToDelete.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed");

            setInvoices(invoices.filter(i => i.id !== invoiceToDelete.id));
            toast.success("Invoice deleted successfully");
            setDeleteModalOpen(false);
        } catch {
            toast.error("Failed to delete invoice.");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">All Invoices</h1>
                        <p className="text-sm text-muted-foreground">View and search through your complete invoice history.</p>
                    </div>
                    <Link to="/admin/create">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Invoice
                        </Button>
                    </Link>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by invoice number, client name, email, or company..."
                        className="pl-9 max-w-md bg-card"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Table */}
                <div className="rounded-xl border bg-card shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/30 text-muted-foreground">
                                    <th className="px-5 py-3 text-left font-medium">Invoice No</th>
                                    <th className="px-5 py-3 text-left font-medium">Client</th>
                                    <th className="px-5 py-3 text-right font-medium">Amount</th>
                                    <th className="px-5 py-3 text-center font-medium">Status</th>
                                    <th className="px-5 py-3 text-left font-medium">Date</th>
                                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && invoices.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                                            Loading invoices...
                                        </td>
                                    </tr>
                                )}
                                {!loading && invoices.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                                            No invoices found. <Link to="/admin/create" className="text-primary underline">Create your first invoice →</Link>
                                        </td>
                                    </tr>
                                )}
                                {!loading && invoices.length > 0 && filteredInvoices.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                                            No invoices match your search.
                                        </td>
                                    </tr>
                                )}
                                {filteredInvoices.map((inv) => {
                                    const clientName = inv.client?.name || inv.clientGoogleName || "—";
                                    const clientCompany = inv.client?.company;
                                    const clientEmail = inv.client?.email || inv.clientGoogleEmail;

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
                                                <p className="text-xs text-muted-foreground max-w-[200px] truncate" title={clientEmail}>
                                                    {clientCompany ? clientName : clientEmail}
                                                </p>
                                            </td>
                                            <td className="px-5 py-4 text-right font-medium">{formatINR(inv.grandTotal)}</td>
                                            <td className="px-5 py-4 text-center">
                                                <StatusBadge status={inv.status as any} />
                                            </td>
                                            <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">{formatDate(inv.invoiceDate)}</td>
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
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={() => {
                                                            setInvoiceToDelete(inv);
                                                            setDeleteModalOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
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

            {/* Delete Confirmation Modal */}
            <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Invoice</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete invoice <strong>{invoiceToDelete?.invoiceNumber}</strong>?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 justify-end pt-4">
                        <Button variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={deleting}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                            {deleting ? "Deleting..." : "Delete"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
