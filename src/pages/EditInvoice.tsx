import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { LineItem } from "@/lib/mock-data";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const API = import.meta.env.VITE_API_URL ?? "";
const TAX_OPTIONS = ["0", "5", "12", "18", "28"];

export default function EditInvoice() {
    const { invoiceId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [invoiceDate, setInvoiceDate] = useState("");
    const [dueDate, setDueDate] = useState("");

    const [clientId, setClientId] = useState<number>(0);
    const [clientName, setClientName] = useState("");
    const [clientCompany, setClientCompany] = useState("");
    const [clientEmail, setClientEmail] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [clientAddress, setClientAddress] = useState("");
    const [clientGST, setClientGST] = useState("");

    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    const [discount, setDiscount] = useState(0);
    const [notes, setNotes] = useState("");
    const [terms, setTerms] = useState("");

    const [paymentType, setPaymentType] = useState<"full" | "partial" | "onboarding">("full");
    const [paymentAmount, setPaymentAmount] = useState<number | "">("");
    const [paymentLabel, setPaymentLabel] = useState("Full Payment");

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                const token = localStorage.getItem("admin_token") || "";
                const res = await fetch(`${API}/api/invoices/${invoiceId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error("Not found or unauthorized");
                const data = await res.json();

                if (data.status === "paid") {
                    toast.error("Cannot edit a paid invoice");
                    navigate(`/admin/invoice/${invoiceId}`);
                    return;
                }

                setInvoiceNumber(data.invoiceNumber || "");
                setInvoiceDate(data.invoiceDate ? new Date(data.invoiceDate).toISOString().split("T")[0] : "");
                setDueDate(data.dueDate ? new Date(data.dueDate).toISOString().split("T")[0] : "");

                setClientId(data.clientId || 0);
                setClientName(data.client?.name || data.clientGoogleName || "");
                setClientCompany(data.client?.company || "");
                setClientEmail(data.client?.email || "");
                setClientPhone(data.client?.phone || "");
                setClientAddress(data.client?.address || "");
                setClientGST(data.client?.gstNumber || "");

                if (data.items && data.items.length > 0) {
                    setLineItems(data.items.map((it: any) => ({
                        id: String(it.id),
                        description: it.description || "",
                        quantity: Number(it.quantity) || 1,
                        unitPrice: Number(it.unitPrice) || 0,
                        taxPercent: Number(it.taxPercent) || 18,
                        amount: Number(it.amount) || 0,
                    })));
                } else {
                    setLineItems([{ id: "1", description: "", quantity: 1, unitPrice: 0, taxPercent: 18, amount: 0 }]);
                }

                setDiscount(Number(data.discountAmount) || 0);
                setNotes(data.notes || "");
                setTerms(data.terms || "");

                setPaymentType(data.paymentType || "full");
                setPaymentAmount(data.paymentAmount ? Number(data.paymentAmount) : "");
                setPaymentLabel(data.paymentLabel || "Full Payment");

            } catch (err: any) {
                toast.error(`Error loading invoice: ${err.message}`);
                navigate("/admin");
            } finally {
                setLoading(false);
            }
        };
        fetchInvoice();
    }, [invoiceId, navigate]);

    const addLineItem = () => {
        setLineItems((prev) => [
            ...prev,
            { id: String(Date.now()), description: "", quantity: 1, unitPrice: 0, taxPercent: 18, amount: 0 },
        ]);
    };

    const removeLineItem = (id: string) => {
        if (lineItems.length <= 1) return;
        setLineItems((prev) => prev.filter((item) => item.id !== id));
    };

    const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
        setLineItems((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                const updated = { ...item, [field]: value };
                updated.amount = updated.quantity * updated.unitPrice;
                return updated;
            })
        );
    };

    const totals = useMemo(() => {
        const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
        const totalTax = lineItems.reduce(
            (sum, item) => sum + (item.amount * item.taxPercent) / 100,
            0
        );
        const cgst = totalTax / 2;
        const sgst = totalTax / 2;
        const grandTotal = subtotal + totalTax - discount;
        return { subtotal, totalTax, cgst, sgst, grandTotal };
    }, [lineItems, discount]);

    const effectivePaymentAmount =
        paymentType === "full" ? totals.grandTotal
            : paymentAmount !== "" ? Number(paymentAmount)
                : 0;

    const saveInvoice = async () => {
        if (!clientName && !clientCompany) { toast.error("Please enter a client name"); return; }
        if (lineItems.some(i => !i.description)) { toast.error("All line items need a description"); return; }
        setSaving(true);
        try {
            const token = localStorage.getItem("admin_token") || "";
            const payload = {
                invoiceNumber, invoiceDate, dueDate,
                clientId,
                clientName, clientCompany, clientEmail, clientPhone, clientAddress, clientGST,
                items: lineItems.map(i => ({
                    description: i.description, quantity: i.quantity,
                    unitPrice: i.unitPrice, taxPercent: i.taxPercent,
                })),
                discountAmount: discount,
                paymentType,
                paymentAmount: effectivePaymentAmount || totals.grandTotal,
                paymentLabel,
                notes, terms,
            };

            const res = await fetch(`${API}/api/invoices/${invoiceId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            toast.success(`Invoice ${data.invoiceNumber || invoiceNumber} updated successfully!`);
            navigate(`/admin/invoice/${invoiceId}`);
        } catch (err: any) {
            toast.error(`Failed to update: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="max-w-4xl space-y-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/invoice/${invoiceId}`)}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Edit Invoice</h1>
                        <p className="text-sm text-muted-foreground">Modify details for {invoiceNumber}.</p>
                    </div>
                </div>

                {/* Invoice Meta */}
                <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                    <h2 className="text-base font-semibold text-foreground">Invoice Details</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Invoice Number</Label>
                            <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Invoice Date</Label>
                            <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Due Date</Label>
                            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* Client Details */}
                <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                    <h2 className="text-base font-semibold text-foreground">Client Details</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Client / Company Name</Label>
                            <Input value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} placeholder="Reliance Industries Ltd." />
                        </div>
                        <div className="space-y-2">
                            <Label>Contact Person</Label>
                            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Mukesh Ambani" />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="accounts@reliance.com" />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+91 22 3555 5000" />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                            <Label>Address</Label>
                            <Textarea value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Full address" rows={2} />
                        </div>
                        <div className="space-y-2">
                            <Label>GST Number (optional)</Label>
                            <Input value={clientGST} onChange={(e) => setClientGST(e.target.value)} placeholder="27AABCR1234Q1ZP" />
                        </div>
                    </div>
                </div>

                {/* Line Items */}
                <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold text-foreground">Line Items</h2>
                        <Button variant="outline" size="sm" onClick={addLineItem}>
                            <Plus className="mr-1 h-4 w-4" />
                            Add Item
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {lineItems.map((item, i) => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                                <div className="col-span-12 sm:col-span-4 space-y-1">
                                    {i === 0 && <Label className="text-xs text-muted-foreground">Description</Label>}
                                    <Input
                                        value={item.description}
                                        onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                                        placeholder="Service description"
                                    />
                                </div>
                                <div className="col-span-3 sm:col-span-1 space-y-1">
                                    {i === 0 && <Label className="text-xs text-muted-foreground">Qty</Label>}
                                    <Input
                                        type="number"
                                        min={1}
                                        value={item.quantity}
                                        onChange={(e) => updateLineItem(item.id, "quantity", Number(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-4 sm:col-span-2 space-y-1">
                                    {i === 0 && <Label className="text-xs text-muted-foreground">Unit Price</Label>}
                                    <Input
                                        type="number"
                                        min={0}
                                        value={item.unitPrice}
                                        onChange={(e) => updateLineItem(item.id, "unitPrice", Number(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-3 sm:col-span-2 space-y-1">
                                    {i === 0 && <Label className="text-xs text-muted-foreground">Tax %</Label>}
                                    <Select
                                        value={String(item.taxPercent)}
                                        onValueChange={(v) => updateLineItem(item.id, "taxPercent", Number(v))}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {TAX_OPTIONS.map((t) => (
                                                <SelectItem key={t} value={t}>{t}%</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-4 sm:col-span-2 space-y-1">
                                    {i === 0 && <Label className="text-xs text-muted-foreground">Amount</Label>}
                                    <Input value={formatINR(item.amount)} readOnly className="bg-muted" />
                                </div>
                                <div className="col-span-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeLineItem(item.id)}
                                        disabled={lineItems.length <= 1}
                                        className="text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end pt-4 border-t">
                        <div className="w-full sm:w-72 space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{formatINR(totals.subtotal)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span>{formatINR(totals.cgst)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span>{formatINR(totals.sgst)}</span></div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Discount</span>
                                <Input
                                    type="number"
                                    min={0}
                                    value={discount}
                                    onChange={(e) => setDiscount(Number(e.target.value))}
                                    className="w-28 h-8 text-right"
                                />
                            </div>
                            <div className="flex justify-between border-t pt-2 mt-2">
                                <span className="text-base font-bold text-foreground">Grand Total</span>
                                <span className="text-base font-bold text-foreground">{formatINR(totals.grandTotal)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment Collection */}
                <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                    <div>
                        <h2 className="text-base font-semibold text-foreground">Payment Collection</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            The amount charged at checkout — can differ from the quotation total.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Payment Type</Label>
                            <Select
                                value={paymentType}
                                onValueChange={(v: "full" | "partial" | "onboarding") => {
                                    setPaymentType(v);
                                    if (v === "full") setPaymentLabel("Full Payment");
                                    if (v === "onboarding") setPaymentLabel("Onboarding Fee");
                                    if (v === "partial") setPaymentLabel("Advance Payment");
                                }}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="full">Full Payment</SelectItem>
                                    <SelectItem value="partial">Part Payment</SelectItem>
                                    <SelectItem value="onboarding">Onboarding Fee</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Amount to Charge (₹)</Label>
                            <Input
                                type="number"
                                min={1}
                                step={0.01}
                                value={paymentType === "full" ? totals.grandTotal : paymentAmount}
                                readOnly={paymentType === "full"}
                                onChange={(e) => setPaymentAmount(e.target.value === "" ? "" : Number(e.target.value))}
                                className={paymentType === "full" ? "bg-muted" : ""}
                                placeholder="e.g. 5000"
                            />
                            {paymentType !== "full" && (
                                <p className="text-xs text-muted-foreground">
                                    Quotation grand total: {formatINR(totals.grandTotal)}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Payment Label</Label>
                            <Input
                                value={paymentLabel}
                                onChange={(e) => setPaymentLabel(e.target.value)}
                                placeholder="e.g. 50% Advance"
                            />
                            <p className="text-xs text-muted-foreground">Shown to the client on checkout</p>
                        </div>
                    </div>
                    {effectivePaymentAmount > 0 && (
                        <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">
                                Client will be charged: <span className="text-primary font-bold">{formatINR(effectivePaymentAmount)}</span>
                            </p>
                            <span className="text-xs text-muted-foreground">{paymentLabel}</span>
                        </div>
                    )}
                </div>

                {/* Notes */}
                <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                        </div>
                        <div className="space-y-2">
                            <Label>Terms & Conditions</Label>
                            <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={saveInvoice} className="flex-1 bg-primary hover:bg-primary/90" disabled={saving}>
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? "Saving Changes..." : "Save Changes"}
                    </Button>
                </div>
            </div>
        </AdminLayout>
    );
}
