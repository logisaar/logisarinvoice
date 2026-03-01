import { useParams, useNavigate } from "react-router-dom";
import { sampleInvoices } from "@/lib/mock-data";
import { formatINR, formatDate } from "@/lib/format";
import InvoiceDocument from "@/components/InvoiceDocument";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Download } from "lucide-react";

export default function PublicInvoice() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const invoice = sampleInvoices.find((inv) => inv.id === invoiceId);

  if (!invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-4">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h1 className="text-xl font-bold text-foreground">Invoice Not Found</h1>
          <p className="text-muted-foreground mt-2">The invoice you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const handlePay = () => {
    navigate(`/invoice/${invoiceId}/success?txnId=TXN${Date.now()}`);
  };

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-muted py-8 px-4 no-print-parent">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Payment Banner */}
        {invoice.status === "paid" ? (
          <div className="rounded-xl bg-success/10 border border-success/20 p-5 no-print">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-success" />
              <div>
                <p className="font-semibold text-success">Payment Received</p>
                <p className="text-sm text-success/80">
                  Transaction ID: {invoice.transactionId} • Paid on {formatDate(invoice.paidDate!)} via {invoice.paymentMethod}
                </p>
              </div>
            </div>
          </div>
        ) : invoice.status === "pending" ? (
          <div className="rounded-xl bg-warning/10 border border-warning/20 p-5 no-print">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-warning">Payment Due: {formatINR(invoice.grandTotal)}</p>
                <p className="text-sm text-warning/80">Due by {formatDate(invoice.dueDate)}</p>
              </div>
              <Button onClick={handlePay} className="bg-warning text-warning-foreground hover:bg-warning/90 shrink-0">
                Pay Now
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-5 no-print">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-destructive">Payment Failed</p>
                <p className="text-sm text-destructive/80">Please try again or contact support.</p>
              </div>
              <Button onClick={handlePay} variant="destructive" className="shrink-0">
                Retry Payment
              </Button>
            </div>
          </div>
        )}

        {/* Invoice Document */}
        <div className="rounded-xl shadow-lg overflow-hidden border print-area">
          <InvoiceDocument invoice={invoice} showWatermark={invoice.status === "paid"} />
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-3 no-print">
          <Button variant="outline" onClick={handlePrint}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
