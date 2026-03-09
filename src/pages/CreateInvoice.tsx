import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import InvoiceDocument from "@/components/InvoiceDocument";
import { LineItem, Invoice } from "@/lib/mock-data";
import { generateInvoiceNumber, formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Eye, Link as LinkIcon, Copy, Check, Mail, ExternalLink, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const API = import.meta.env.VITE_API_URL ?? "";

const TAX_OPTIONS = ["0", "5", "12", "18", "28"];

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [linkModal, setLinkModal] = useState<{ url: string; invoice: Invoice } | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState<{ id: number; invoiceNumber: string; paymentLinkToken: string } | null>(null);

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [bSettings, setBSettings] = useState<any>(null);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });

  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientGST, setClientGST] = useState("");

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "1", description: "", quantity: 1, unitPrice: 0, taxPercent: 18, amount: 0 },
  ]);

  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  // Payment Collection
  const [paymentType, setPaymentType] = useState<"full" | "partial" | "onboarding">("full");
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [paymentLabel, setPaymentLabel] = useState("Full Payment");

  // Load Settings on mount
  useEffect(() => {
    fetch(`${API}/api/settings`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error && data.invoicePrefix !== undefined) {
          setBSettings(data);
          setInvoiceNumber(generateInvoiceNumber(data.invoicePrefix || "INV"));
          setNotes(data.defaultNotes || "");
          setTerms(data.defaultTerms || "");
        } else {
          setInvoiceNumber(generateInvoiceNumber("INV"));
        }
      })
      .catch((e) => console.error("Error loading settings:", e))
      .finally(() => setLoadingSettings(false));
  }, []);

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

  const buildInvoice = (id = "new"): Invoice => ({
    id,
    invoiceNumber,
    invoiceDate,
    dueDate,
    status: "pending",
    clientName,
    clientCompany,
    clientEmail,
    clientPhone,
    clientAddress,
    clientGST,
    user: { businessSettings: bSettings } as any,
    businessName: bSettings?.businessName || "",
    businessAddress: bSettings?.businessAddress || "",
    businessGST: bSettings?.gstNumber || "",
    businessEmail: bSettings?.email || "",
    businessPhone: bSettings?.phone || "",
    lineItems,
    ...totals,
    discount,
    discountType: "fixed",
    paymentType,
    paymentAmount: effectivePaymentAmount || totals.grandTotal,
    paymentLabel,
    notes,
    terms,
  });

  const saveInvoice = async () => {
    if (!clientName && !clientCompany) { toast.error("Please enter a client name"); return; }
    if (lineItems.some(i => !i.description)) { toast.error("All line items need a description"); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token") || "";
      const payload = {
        invoiceNumber, invoiceDate, dueDate,
        clientId: 0, // inline client — API handles it
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
      const res = await fetch(`${API}/api/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSavedInvoice({ id: data.id, invoiceNumber: data.invoiceNumber, paymentLinkToken: data.paymentLinkToken });
      toast.success(`Invoice ${data.invoiceNumber} saved!`);
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const openShareModal = () => {
    if (!savedInvoice) return;
    const url = `${window.location.origin}/invoice/${savedInvoice.paymentLinkToken}`;
    setCopied(false);
    setLinkModal({ url, invoice: buildInvoice(String(savedInvoice.id)) });
  };

  const effectivePaymentAmount =
    paymentType === "full" ? totals.grandTotal
      : paymentAmount !== "" ? Number(paymentAmount)
        : 0;

  return (
    <AdminLayout>
      {loadingSettings ? (
        <div className="flex justify-center p-12"><CheckCircle2 className="animate-spin h-8 w-8 text-primary opacity-50" /></div>
      ) : (
        <>
          <div className="max-w-4xl space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Create Invoice</h1>
              <p className="text-sm text-muted-foreground">Fill in the details to generate a payment invoice.</p>
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

            {/* Saved banner */}
            {savedInvoice && (
              <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-400">Invoice saved — {savedInvoice.invoiceNumber}</p>
                  <p className="text-xs text-green-600">You can now share the payment link with your client.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="text-xs border-green-500/30 text-green-400 hover:bg-green-500/10">
                  View All
                </Button>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => setPreviewOpen(true)} variant="outline" className="flex-1">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
              {!savedInvoice ? (
                <Button onClick={saveInvoice} className="flex-1 bg-primary hover:bg-primary/90" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Invoice"}
                </Button>
              ) : (
                <Button onClick={openShareModal} className="flex-1 bg-primary hover:bg-primary/90">
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Share Payment Link
                </Button>
              )}
            </div>
          </div>

          {/* Preview Modal */}
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Invoice Preview</DialogTitle>
              </DialogHeader>
              <InvoiceDocument invoice={buildInvoice()} />
            </DialogContent>
          </Dialog>

          {/* ── Link Generated Modal ── */}
          <Dialog open={!!linkModal} onOpenChange={() => setLinkModal(null)}>
            <DialogContent className="w-[95vw] max-w-lg rounded-xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-primary" />
                  Payment Link Ready
                </DialogTitle>
                <DialogDescription>
                  Share this link with <strong>{linkModal?.invoice.clientName}</strong> to collect{" "}
                  <strong>{linkModal ? formatINR(linkModal.invoice.paymentAmount ?? linkModal.invoice.grandTotal) : ""}</strong> ({linkModal?.invoice.paymentLabel})
                </DialogDescription>
              </DialogHeader>

              {/* Link display */}
              <div className="flex items-center gap-2 rounded-lg border bg-muted px-3 py-2.5">
                <span className="flex-1 truncate text-sm font-mono text-foreground select-all">
                  {linkModal?.url}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 h-8 w-8 p-0"
                  onClick={() => {
                    navigator.clipboard.writeText(linkModal?.url ?? "");
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                    toast.success("Link copied!");
                  }}
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Copy */}
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(linkModal?.url ?? "");
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                    toast.success("Link copied to clipboard!");
                  }}
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy Link"}
                </Button>

                {/* Open in browser */}
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => window.open(linkModal?.url, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Link
                </Button>

                {/* Email to client */}
                <Button
                  className="gap-2"
                  onClick={() => {
                    const inv = linkModal?.invoice;
                    const subject = encodeURIComponent(
                      `${inv?.businessName ?? ""} – ${inv?.paymentLabel ?? "Payment"}  ${inv?.invoiceNumber ?? ""}`
                    );
                    const body = encodeURIComponent(
                      `Dear ${inv?.clientName ?? "Client"},

Please find your quotation from ${inv?.businessName ?? "us"} (${inv?.invoiceNumber ?? ""}).

Amount due: ${inv ? formatINR(inv.paymentAmount ?? inv.grandTotal) : ""} (${inv?.paymentLabel ?? ""})
Due date: ${inv?.dueDate ?? ""}

Click the link below to review the quotation, sign in, and complete the payment:
${linkModal?.url ?? ""}

Thank you,
${inv?.businessName ?? ""}`);
                    const mailTo = inv?.clientEmail
                      ? `mailto:${inv.clientEmail}?subject=${subject}&body=${body}`
                      : `mailto:?subject=${subject}&body=${body}`;
                    window.open(mailTo, "_blank");
                  }}
                >
                  <Mail className="h-4 w-4" />
                  Email Client
                </Button>
              </div>

              {/* Tip */}
              <p className="text-xs text-muted-foreground text-center pt-1">
                The client will review the quotation, sign in with Google, and pay directly via this link.
              </p>
            </DialogContent>
          </Dialog>
        </>
      )}
    </AdminLayout>
  );
}
