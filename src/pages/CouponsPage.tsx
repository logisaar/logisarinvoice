import { useState } from "react";
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
import { Plus, Pencil, Trash2, Tag, Copy } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/format";

interface Coupon {
    id: number;
    code: string;
    discount_type: "percent" | "fixed";
    discount_value: number;
    min_amount: number;
    max_uses: number | null;
    uses_count: number;
    valid_until: string | null;
    is_active: boolean;
}

const EMPTY_COUPON = {
    code: "",
    discount_type: "percent" as "percent" | "fixed",
    discount_value: 10,
    min_amount: 0,
    max_uses: "",
    valid_until: "",
    is_active: true,
};

// Sample coupons for demo (replace with API calls)
const SAMPLE_COUPONS: Coupon[] = [
    { id: 1, code: "WELCOME20", discount_type: "percent", discount_value: 20, min_amount: 500, max_uses: 100, uses_count: 12, valid_until: "2026-12-31", is_active: true },
    { id: 2, code: "FLAT500", discount_type: "fixed", discount_value: 500, min_amount: 2000, max_uses: null, uses_count: 5, valid_until: null, is_active: true },
    { id: 3, code: "SPECIAL10", discount_type: "percent", discount_value: 10, min_amount: 0, max_uses: 50, uses_count: 50, valid_until: "2025-01-01", is_active: false },
];

export default function CouponsPage() {
    const [coupons, setCoupons] = useState<Coupon[]>(SAMPLE_COUPONS);
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState(EMPTY_COUPON);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const openCreate = () => {
        setEditId(null);
        setForm(EMPTY_COUPON);
        setModalOpen(true);
    };

    const openEdit = (c: Coupon) => {
        setEditId(c.id);
        setForm({
            code: c.code,
            discount_type: c.discount_type,
            discount_value: c.discount_value,
            min_amount: c.min_amount,
            max_uses: c.max_uses != null ? String(c.max_uses) : "",
            valid_until: c.valid_until || "",
            is_active: c.is_active,
        });
        setModalOpen(true);
    };

    const handleSave = () => {
        if (!form.code.trim()) { toast.error("Coupon code is required"); return; }
        if (form.discount_value <= 0) { toast.error("Discount value must be > 0"); return; }
        if (form.discount_type === "percent" && form.discount_value > 100) { toast.error("Percent discount cannot exceed 100%"); return; }

        if (editId !== null) {
            setCoupons((prev) =>
                prev.map((c) =>
                    c.id === editId
                        ? { ...c, ...form, code: form.code.toUpperCase(), max_uses: form.max_uses ? parseInt(form.max_uses) : null, valid_until: form.valid_until || null }
                        : c
                )
            );
            toast.success("Coupon updated");
        } else {
            const newCoupon: Coupon = {
                id: Date.now(),
                code: form.code.toUpperCase(),
                discount_type: form.discount_type,
                discount_value: form.discount_value,
                min_amount: form.min_amount,
                max_uses: form.max_uses ? parseInt(form.max_uses) : null,
                uses_count: 0,
                valid_until: form.valid_until || null,
                is_active: form.is_active,
            };
            setCoupons((prev) => [newCoupon, ...prev]);
            toast.success("Coupon created");
        }
        setModalOpen(false);
    };

    const handleDelete = (id: number) => {
        setCoupons((prev) => prev.filter((c) => c.id !== id));
        setDeleteId(null);
        toast.success("Coupon deleted");
    };

    const toggleActive = (id: number) => {
        setCoupons((prev) => prev.map((c) => c.id === id ? { ...c, is_active: !c.is_active } : c));
    };

    const copyCoupon = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success(`Coupon code "${code}" copied!`);
    };

    const getCouponStatus = (c: Coupon): "active" | "expired" | "used-up" | "inactive" => {
        if (!c.is_active) return "inactive";
        if (c.valid_until && new Date(c.valid_until) < new Date()) return "expired";
        if (c.max_uses !== null && c.uses_count >= c.max_uses) return "used-up";
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
                        { label: "Total Uses", value: coupons.reduce((s, c) => s + c.uses_count, 0) },
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
                                {coupons.length === 0 && (
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
                                            {c.discount_type === "percent"
                                                ? `${c.discount_value}% off`
                                                : `${formatINR(c.discount_value)} off`}
                                        </td>
                                        <td className="px-5 py-4 text-muted-foreground">
                                            {c.min_amount > 0 ? formatINR(c.min_amount) : "—"}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {c.uses_count}
                                            {c.max_uses != null ? ` / ${c.max_uses}` : ""}
                                        </td>
                                        <td className="px-5 py-4 text-muted-foreground">
                                            {c.valid_until
                                                ? new Date(c.valid_until).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                                                : "Never"}
                                        </td>
                                        <td className="px-5 py-4 text-center">{statusBadge[getCouponStatus(c)]}</td>
                                        <td className="px-5 py-4 text-center">
                                            <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c.id)} />
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
                                    value={form.discount_type}
                                    onValueChange={(v: "percent" | "fixed") => setForm((f) => ({ ...f, discount_type: v }))}
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
                                    max={form.discount_type === "percent" ? 100 : undefined}
                                    value={form.discount_value}
                                    onChange={(e) => setForm((f) => ({ ...f, discount_value: Number(e.target.value) }))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Min. Order Amount (₹)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={form.min_amount}
                                    onChange={(e) => setForm((f) => ({ ...f, min_amount: Number(e.target.value) }))}
                                    placeholder="0 = no minimum"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Max Uses</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={form.max_uses}
                                    onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
                                    placeholder="Leave blank = unlimited"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Valid Until</Label>
                            <Input
                                type="date"
                                value={form.valid_until}
                                onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                            />
                            <p className="text-xs text-muted-foreground">Leave blank for no expiry</p>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                                <p className="text-sm font-medium">Active</p>
                                <p className="text-xs text-muted-foreground">Clients can apply this coupon</p>
                            </div>
                            <Switch
                                checked={form.is_active}
                                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
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
