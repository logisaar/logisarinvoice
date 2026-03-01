import { useParams, useSearchParams, Link } from "react-router-dom";
import { sampleInvoices } from "@/lib/mock-data";
import { formatINR, formatDate } from "@/lib/format";
import InvoiceDocument from "@/components/InvoiceDocument";
import { Button } from "@/components/ui/button";
import { CheckCircle, Download, ArrowLeft } from "lucide-react";

export default function PaymentSuccess() {
  const { invoiceId } = useParams();
  const [searchParams] = useSearchParams();
  const txnId = searchParams.get("txnId") || "TXN00000000";

  const invoice = sampleInvoices.find((inv) => inv.id === invoiceId) || sampleInvoices[0];
  const paidInvoice = {
    ...invoice,
    status: "paid" as const,
    paidDate: new Date().toISOString().split("T")[0],
    transactionId: txnId,
    paymentMethod: "Online Payment",
  };

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-muted py-8 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Success Card */}
        <div className="rounded-xl bg-card border shadow-lg p-8 text-center animate-fade-in-up no-print">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-10 w-10 text-success animate-check-bounce" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Payment Successful!</h1>
          <p className="mt-2 text-muted-foreground">Your payment has been processed successfully.</p>

          <div className="mt-6 rounded-lg bg-muted p-4 text-sm space-y-2 text-left max-w-sm mx-auto">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice No</span>
              <span className="font-medium text-foreground">{paidInvoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-medium text-foreground">{formatINR(paidInvoice.grandTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transaction ID</span>
              <span className="font-mono text-xs text-foreground">{txnId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span className="text-foreground">{formatDate(paidInvoice.paidDate!)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Method</span>
              <span className="text-foreground">{paidInvoice.paymentMethod}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Button onClick={handlePrint}>
              <Download className="mr-2 h-4 w-4" />
              Download Invoice
            </Button>
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>

        {/* Full Invoice */}
        <div className="rounded-xl shadow-lg overflow-hidden border print-area">
          <InvoiceDocument invoice={paidInvoice} showWatermark />
        </div>
      </div>
    </div>
  );
}
