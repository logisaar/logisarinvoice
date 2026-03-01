import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import InvoiceDocument from "@/components/InvoiceDocument";
import { businessDefaults, LineItem, Invoice } from "@/lib/mock-data";
import { generateInvoiceNumber, formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Eye, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

const TAX_OPTIONS = ["0", "5", "12", "18", "28"];

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [previewOpen, setPreviewOpen] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState(generateInvoiceNumber(businessDefaults.invoicePrefix));
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
  const [notes, setNotes] = useState(businessDefaults.defaultNotes);
  const [terms, setTerms] = useState(businessDefaults.defaultTerms);

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

  const buildInvoice = (): Invoice => ({
    id: "new",
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
    ...businessDefaults,
    lineItems,
    ...totals,
    discount,
    discountType: "fixed",
    notes,
    terms,
  });

  const generateLink = () => {
    const id = `inv-${Date.now()}`;
    const link = `${window.location.origin}/invoice/${id}`;
    navigator.clipboard.writeText(link);
    toast.success("Payment link copied to clipboard!", { description: link });
  };

  return (
    <AdminLayout>
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
          <Button onClick={() => setPreviewOpen(true)} variant="outline" className="flex-1">
            <Eye className="mr-2 h-4 w-4" />
            Preview Invoice
          </Button>
          <Button onClick={generateLink} className="flex-1">
            <LinkIcon className="mr-2 h-4 w-4" />
            Generate Payment Link
          </Button>
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
    </AdminLayout>
  );
}
