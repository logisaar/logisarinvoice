import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import StatusBadge from "@/components/StatusBadge";
import { formatINR, formatDate } from "@/lib/format";
import { ArrowLeft, Mail, FileText, Loader2, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API = import.meta.env.VITE_API_URL ?? "";

interface UserDetail {
    email: string;
    name: string;
    totalPaid: number;
    invoices: any[];
}

export default function UserDetailPage() {
    const { email } = useParams<{ email: string }>();
    const navigate = useNavigate();
    const [user, setUser] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUserDetails = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("admin_token") || "";
            const res = await fetch(`${API}/api/clients/users/google/${encodeURIComponent(email || '')}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Could not find user details");
            const data = await res.json();
            setUser(data);
        } catch {
            toast.error("Failed to load user details.");
            navigate("/admin/users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (email) fetchUserDetails();
    }, [email]);

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </AdminLayout>
        );
    }

    if (!user) return null;

    return (
        <AdminLayout>
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => navigate("/admin/users")}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <Mail className="h-4 w-4" />
                                <span>{user.email}</span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 ring-1 ring-inset ring-green-600/20 ml-2">
                                    Google Verified
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-primary/10 text-primary px-4 py-2 rounded-lg font-semibold">
                        <IndianRupee className="h-5 w-5" />
                        Total Paid: {formatINR(user.totalPaid)}
                    </div>
                </div>

                <div className="rounded-xl border bg-card shadow-sm">
                    <div className="p-5 border-b flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            Invoices Handled By This User ({user.invoices.length})
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/30 text-muted-foreground">
                                    <th className="px-5 py-3 text-left font-medium">Invoice No</th>
                                    <th className="px-5 py-3 text-right font-medium">Grand Total</th>
                                    <th className="px-5 py-3 text-center font-medium">Status</th>
                                    <th className="px-5 py-3 text-left font-medium">Created On</th>
                                    <th className="px-5 py-3 text-left font-medium">Paid On</th>
                                </tr>
                            </thead>
                            <tbody>
                                {user.invoices.map((inv) => (
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
                                        <td className="px-5 py-4 text-right font-medium">{formatINR(inv.grandTotal)}</td>
                                        <td className="px-5 py-4 text-center">
                                            <StatusBadge status={inv.status as any} />
                                        </td>
                                        <td className="px-5 py-4 text-muted-foreground">{formatDate(inv.createdAt)}</td>
                                        <td className="px-5 py-4 text-muted-foreground">
                                            {inv.paidAt ? formatDate(inv.paidAt) : '—'}
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
