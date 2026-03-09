import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { formatDate } from "@/lib/format";
import { Users, Mail, Loader2, User, ShieldAlert, ShieldCheck, Ban } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL ?? "";

interface GoogleUser {
    email: string;
    name: string;
    joinedAt: string;
    lastActive: string;
    invoicesCount: number;
    isBanned?: boolean;
}

export default function UsersPage() {
    const [users, setUsers] = useState<GoogleUser[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("admin_token") || "";
            const res = await fetch(`${API}/api/clients/users/google`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Unauthorized");
            const data = await res.json();
            setUsers(Array.isArray(data) ? data : []);
        } catch {
            toast.error("Could not load users from server.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const toggleBan = async (e: React.MouseEvent, user: GoogleUser) => {
        e.stopPropagation();
        try {
            const token = localStorage.getItem("admin_token") || "";
            const endpoint = user.isBanned ? 'unban' : 'ban';
            const res = await fetch(`${API}/api/clients/users/google/${encodeURIComponent(user.email)}/${endpoint}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error();
            toast.success(`User access ${user.isBanned ? 'restored' : 'suspended'} successfully`);
            fetchUsers(); // Refresh the list
        } catch {
            toast.error("Failed to update user status");
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                            <Users className="h-6 w-6 text-primary" />
                            Users
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            View Google accounts that have signed in to pay or accept your invoices.
                        </p>
                    </div>
                    <Button variant="outline" onClick={fetchUsers} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Refresh
                    </Button>
                </div>

                <div className="rounded-xl border bg-card shadow-sm">
                    <div className="p-5 border-b flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-card-foreground">Verified Accounts ({users.length})</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/30 text-muted-foreground">
                                    <th className="px-5 py-3 text-left font-medium w-1/4">User Identity</th>
                                    <th className="px-5 py-3 text-left font-medium">Email Address</th>
                                    <th className="px-5 py-3 text-center font-medium">Invoices</th>
                                    <th className="px-5 py-3 text-left font-medium">Last Active</th>
                                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!loading && users.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                                            <Users className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
                                            <p>No Google users found.</p>
                                            <p className="text-xs mt-1">Users will appear here when they sign into your links using Google.</p>
                                        </td>
                                    </tr>
                                )}
                                {users.map((user) => (
                                    <tr
                                        key={user.email}
                                        className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/admin/users/${encodeURIComponent(user.email)}`)}
                                    >
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-foreground">{user.name}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                                            Google Verified
                                                        </span>
                                                        {user.isBanned && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                                                                <Ban className="h-3 w-3" /> Suspended
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Mail className="h-4 w-4 shrink-0" />
                                                <span className="font-mono text-xs">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <div className="inline-flex items-center justify-center min-w-[2rem] h-8 rounded-full bg-primary/10 text-primary font-bold px-3">
                                                {user.invoicesCount}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">
                                            {formatDate(user.lastActive)}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => toggleBan(e, user)}
                                                className={user.isBanned ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-red-600 hover:text-red-700 hover:bg-red-50"}
                                            >
                                                {user.isBanned ? (
                                                    <><ShieldCheck className="mr-2 h-4 w-4" /> Restore Access</>
                                                ) : (
                                                    <><ShieldAlert className="mr-2 h-4 w-4" /> Suspend</>
                                                )}
                                            </Button>
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
