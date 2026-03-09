import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { formatINR, formatDate } from "@/lib/format";
import InvoiceDocument from "@/components/InvoiceDocument";
import { Button } from "@/components/ui/button";
import { CheckCircle, Download, ArrowLeft, Loader2, AlertCircle, Printer } from "lucide-react";
import html2pdf from "html2pdf.js";

const API = import.meta.env.VITE_API_URL ?? "";

export default function PaymentSuccess() {
  const { invoiceId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const txnId = searchParams.get("txnId") || "TXN00000000";
  const amountParam = searchParams.get("amount");

  // If client_user exists the visitor came from the portal — return them there
  const isPortalUser = !!localStorage.getItem("client_user");
  const homeTarget = isPortalUser ? "/portal/dashboard" : "/";

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!invoiceId) return;
    setLoading(true);
    fetch(`${API}/api/invoices/public/${invoiceId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data) => setInvoice(data))
      .catch(() => setInvoice(null))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="text-center space-y-3">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-4">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h1 className="text-xl font-bold text-foreground">Invoice Not Found</h1>
          <p className="text-muted-foreground mt-2">
            The quotation link you're looking for doesn't exist or has expired.
          </p>
          <Link to="/" className="mt-4 inline-block">
            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const paidInvoice = {
    ...invoice,
    status: "paid" as const,
    paidDate: invoice.paidDate ? new Date(invoice.paidDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    transactionId: invoice.transactionId || txnId,
    paymentMethod: invoice.paymentMethod || "Online Payment",
    // Override grandTotal if amount is passed from gateway callback
    grandTotal: amountParam ? parseFloat(amountParam) : invoice.grandTotal,
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById("invoice-print-container");
    if (!element) return;

    setDownloadingPdf(true);

    const opt = {
      margin: 10,
      filename: `${paidInvoice.invoiceNumber}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (e) {
      console.error("Failed to generate PDF", e);
    } finally {
      setDownloadingPdf(false);
    }
  };

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
            <Button onClick={() => window.print()} variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button onClick={handleDownloadPdf} disabled={downloadingPdf}>
              <Download className="mr-2 h-4 w-4" />
              {downloadingPdf ? "Generating PDF..." : "Download"}
            </Button>
            <Button variant="outline" onClick={() => navigate(homeTarget)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {isPortalUser ? "Back to My Dashboard" : "Back to Home"}
            </Button>
          </div>
        </div>

        {/* Full Invoice */}
        <div id="invoice-print-container" className="rounded-xl shadow-lg overflow-hidden border print-area">
          <InvoiceDocument invoice={paidInvoice} showWatermark />
        </div>
      </div>
    </div>
  );
}
