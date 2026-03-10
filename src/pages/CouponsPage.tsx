import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Tag, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/format";

const API = import.meta.env.VITE_API_URL ?? "";

interface Coupon {
    id: number;
    code: string;
    discountType: "percent" | "fixed";
    discountValue: number;
    minAmount: number;
    maxUses: number | null;
    usesCount: number;
    validUntil: string | null;
    isActive: boolean;
}

const EMPTY_COUPON = {
    code: "",
    discountType: "percent" as "percent" | "fixed",
    discountValue: 10,
    minAmount: 0,
    maxUses: "",
    validUntil: "",
    isActive: true,
};

export default function CouponsPage() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState(EMPTY_COUPON);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("admin_token") || "";
            const res = await fetch(`${API}/api/coupons`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to load");
            const data = await res.json();
            setCoupons(Array.isArray(data) ? data : []);
        } catch {
            toast.error("Failed to fetch coupons.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    const openCreate = () => {
        setEditId(null);
        setForm(EMPTY_COUPON);
        setModalOpen(true);
    };

    const openEdit = (c: Coupon) => {
        setEditId(c.id);
        setForm({
            code: c.code,
            discountType: c.discountType,
            discountValue: c.discountValue,
            minAmount: c.minAmount,
            maxUses: c.maxUses != null ? String(c.maxUses) : "",
            validUntil: c.validUntil ? new Date(c.validUntil).toISOString().split("T")[0] : "",
            isActive: c.isActive,
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.code.trim()) { toast.error("Coupon code is required"); return; }
        if (form.discountValue <= 0) { toast.error("Discount value must be > 0"); return; }
        if (form.discountType === "percent" && form.discountValue > 100) { toast.error("Percent discount cannot exceed 100%"); return; }

        try {
            const token = localStorage.getItem("admin_token") || "";
            const payload = {
                code: form.code.toUpperCase(),
                discountType: form.discountType,
                discountValue: Number(form.discountValue),
                minAmount: Number(form.minAmount),
                maxUses: form.maxUses ? parseInt(form.maxUses) : null,
                validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : null,
                isActive: form.isActive, // Check if the prisma type matches boolean
            };

            if (editId !== null) {
                const res = await fetch(`${API}/api/coupons/${editId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error("Failed to update coupon.");
                toast.success("Coupon updated");
            } else {
                const res = await fetch(`${API}/api/coupons`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error("Failed to create coupon. Code might already exist.");
                toast.success("Coupon created");
            }
            fetchCoupons();
            setModalOpen(false);
        } catch (e: any) {
            toast.error(e.message || "Operation failed.");
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const token = localStorage.getItem("admin_token") || "";
            const res = await fetch(`${API}/api/coupons/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to delete coupon.");
            toast.success("Coupon deleted");
            setDeleteId(null);
            fetchCoupons();
        } catch {
            toast.error("Failed to delete coupon.");
        }
    };

    const toggleActive = async (id: number, currentActiveState: boolean) => {
        try {
            const token = localStorage.getItem("admin_token") || "";
            const res = await fetch(`${API}/api/coupons/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ isActive: !currentActiveState }),
            });
            if (!res.ok) throw new Error("Failed");
            fetchCoupons();
        } catch {
            toast.error("Failed to update status.");
        }
    };

    const copyCoupon = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success(`Coupon code "${code}" copied!`);
    };

    const getCouponStatus = (c: Coupon): "active" | "expired" | "used-up" | "inactive" => {
        if (!c.isActive) return "inactive";
        if (c.validUntil && new Date(c.validUntil) < new Date()) return "expired";
        if (c.maxUses !== null && c.usesCount >= c.maxUses) return "used-up";
        return "active";
    };

    const statusBadge: Record<string, JSX.Element> = {
        active: <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>,
        expired: <Badge className="bg-orange-100 text-orange-700 border-orange-200">Expired</Badge>,
        "used-up": <Badge className="bg-red-100 text-red-700 border-red-200">Used Up</Badge>,
        inactive: <Badge className="bg-gray-100 text-gray-600 border-gray-200">Inactive</Badge>,
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Tag className="h-6 w-6 text-primary" /> Coupon Codes
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Create and manage discount coupons for client checkouts.
                        </p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Create Coupon
                    </Button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: "Total Coupons", value: coupons.length },
                        { label: "Active", value: coupons.filter((c) => getCouponStatus(c) === "active").length },
                        { label: "Total Uses", value: coupons.reduce((s, c) => s + c.usesCount, 0) },
                        { label: "Inactive / Expired", value: coupons.filter((c) => getCouponStatus(c) !== "active").length },
                    ].map((stat) => (
                        <div key={stat.label} className="rounded-xl border bg-card p-4 shadow-sm">
                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                            <p className="mt-1 text-2xl font-bold text-card-foreground">{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Table */}
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <div className="p-5 border-b">
                        <h2 className="text-base font-semibold text-card-foreground">All Coupons</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-muted-foreground bg-muted/30">
                                    <th className="px-5 py-3 text-left font-medium">Code</th>
                                    <th className="px-5 py-3 text-left font-medium">Discount</th>
                                    <th className="px-5 py-3 text-left font-medium">Min. Amount</th>
                                    <th className="px-5 py-3 text-center font-medium">Uses</th>
                                    <th className="px-5 py-3 text-left font-medium">Expires</th>
                                    <th className="px-5 py-3 text-center font-medium">Status</th>
                                    <th className="px-5 py-3 text-center font-medium">Active</th>
                                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && coupons.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                                            Loading coupons...
                                        </td>
                                    </tr>
                                )}
                                {!loading && coupons.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">
                                            No coupons yet. Create your first one!
                                        </td>
                                    </tr>
                                )}
                                {coupons.map((c) => (
                                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-semibold text-primary bg-primary/10 rounded px-2 py-0.5 text-xs">
                                                    {c.code}
                                                </span>
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyCoupon(c.code)}>
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 font-medium">
                                            {c.discountType === "percent"
                                                ? `${c.discountValue}% off`
                                                : `${formatINR(c.discountValue)} off`}
                                        </td>
                                        <td className="px-5 py-4 text-muted-foreground">
                                            {c.minAmount > 0 ? formatINR(c.minAmount) : "—"}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {c.usesCount}
                                            {c.maxUses != null ? ` / ${c.maxUses}` : ""}
                                        </td>
                                        <td className="px-5 py-4 text-muted-foreground">
                                            {c.validUntil
                                                ? new Date(c.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                                                : "Never"}
                                        </td>
                                        <td className="px-5 py-4 text-center">{statusBadge[getCouponStatus(c)]}</td>
                                        <td className="px-5 py-4 text-center">
                                            <Switch checked={c.isActive} onCheckedChange={() => toggleActive(c.id, c.isActive)} />
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteId(c.id)}>
                                                    <Trash2 className="h-4 w-4" />
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

            {/* Create / Edit Modal */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editId != null ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Coupon Code *</Label>
                            <Input
                                value={form.code}
                                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                                placeholder="e.g. WELCOME20"
                                className="font-mono uppercase"
                                disabled={editId != null}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Discount Type *</Label>
                                <Select
                                    value={form.discountType}
                                    onValueChange={(v: "percent" | "fixed") => setForm((f) => ({ ...f, discountType: v }))}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percent">Percent (%)</SelectItem>
                                        <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Discount Value *</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={form.discountType === "percent" ? 100 : undefined}
                                    value={form.discountValue}
                                    onChange={(e) => setForm((f) => ({ ...f, discountValue: Number(e.target.value) }))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Min. Order Amount (₹)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={form.minAmount}
                                    onChange={(e) => setForm((f) => ({ ...f, minAmount: Number(e.target.value) }))}
                                    placeholder="0 = no minimum"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Max Uses</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={form.maxUses}
                                    onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                                    placeholder="Leave blank = unlimited"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Valid Until</Label>
                            <Input
                                type="date"
                                value={form.validUntil}
                                onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                            />
                            <p className="text-xs text-muted-foreground">Leave blank for no expiry</p>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                                <p className="text-sm font-medium">Active</p>
                                <p className="text-xs text-muted-foreground">Clients can apply this coupon</p>
                            </div>
                            <Switch
                                checked={form.isActive}
                                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>{editId != null ? "Save Changes" : "Create Coupon"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation */}
            <Dialog open={deleteId != null} onOpenChange={() => setDeleteId(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Coupon?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
