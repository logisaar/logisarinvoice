import { Invoice } from "@/lib/mock-data";
import { formatINR, formatDate } from "@/lib/format";

interface Props {
  invoice: Invoice;
  showWatermark?: boolean;
}

export default function InvoiceDocument({ invoice, showWatermark = false }: Props) {
  return (
    <div className="invoice-document relative bg-invoice-bg p-8 md:p-12 text-invoice-text">
      {showWatermark && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <span className="text-success/15 text-8xl font-extrabold uppercase rotate-[-30deg] select-none">
            PAID
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start mb-10 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
              N
            </div>
            <span className="text-xl font-bold text-invoice-header">{invoice.businessName}</span>
          </div>
          <p className="text-sm whitespace-pre-line text-invoice-muted">{invoice.businessAddress}</p>
          <p className="text-sm text-invoice-muted mt-1">GST: {invoice.businessGST}</p>
        </div>
        <div className="text-right">
          <h1 className="text-3xl font-extrabold text-invoice-header tracking-tight">INVOICE</h1>
          <div className="mt-3 space-y-1 text-sm">
            <p><span className="text-invoice-muted">Invoice No:</span> <span className="font-semibold text-invoice-header">{invoice.invoiceNumber}</span></p>
            <p><span className="text-invoice-muted">Date:</span> {formatDate(invoice.invoiceDate)}</p>
            <p><span className="text-invoice-muted">Due Date:</span> {formatDate(invoice.dueDate)}</p>
          </div>
        </div>
      </div>

      {/* Billed From / To */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-invoice-muted mb-2">Billed From</h3>
          <p className="font-semibold text-invoice-header">{invoice.businessName}</p>
          <p className="text-sm whitespace-pre-line">{invoice.businessAddress}</p>
          <p className="text-sm mt-1">{invoice.businessEmail}</p>
          <p className="text-sm">{invoice.businessPhone}</p>
          <p className="text-sm">GST: {invoice.businessGST}</p>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-invoice-muted mb-2">Billed To</h3>
          <p className="font-semibold text-invoice-header">{invoice.clientCompany}</p>
          <p className="text-sm">{invoice.clientName}</p>
          <p className="text-sm whitespace-pre-line">{invoice.clientAddress}</p>
          <p className="text-sm mt-1">{invoice.clientEmail}</p>
          <p className="text-sm">{invoice.clientPhone}</p>
          {invoice.clientGST && <p className="text-sm">GST: {invoice.clientGST}</p>}
        </div>
      </div>

      {/* Line Items */}
      <div className="mb-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-invoice-header">
              <th className="py-3 px-2 text-left text-xs font-bold uppercase tracking-wider text-invoice-header w-8">#</th>
              <th className="py-3 px-2 text-left text-xs font-bold uppercase tracking-wider text-invoice-header">Description</th>
              <th className="py-3 px-2 text-right text-xs font-bold uppercase tracking-wider text-invoice-header w-16">Qty</th>
              <th className="py-3 px-2 text-right text-xs font-bold uppercase tracking-wider text-invoice-header w-28">Unit Price</th>
              <th className="py-3 px-2 text-right text-xs font-bold uppercase tracking-wider text-invoice-header w-16">Tax %</th>
              <th className="py-3 px-2 text-right text-xs font-bold uppercase tracking-wider text-invoice-header w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item, i) => (
              <tr key={item.id} className={i % 2 === 0 ? "bg-invoice-stripe" : ""}>
                <td className="py-3 px-2 text-invoice-muted">{i + 1}</td>
                <td className="py-3 px-2 font-medium text-invoice-header">{item.description}</td>
                <td className="py-3 px-2 text-right">{item.quantity}</td>
                <td className="py-3 px-2 text-right">{formatINR(item.unitPrice)}</td>
                <td className="py-3 px-2 text-right">{item.taxPercent}%</td>
                <td className="py-3 px-2 text-right font-medium text-invoice-header">{formatINR(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-10">
        <div className="w-full sm:w-80 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-invoice-muted">Subtotal</span>
            <span className="font-medium">{formatINR(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-invoice-muted">CGST</span>
            <span>{formatINR(invoice.cgst)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-invoice-muted">SGST</span>
            <span>{formatINR(invoice.sgst)}</span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between text-success">
              <span>Discount</span>
              <span>-{formatINR(invoice.discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t-2 border-invoice-header pt-3 mt-3">
            <span className="text-lg font-bold text-invoice-header">Grand Total</span>
            <span className="text-lg font-bold text-invoice-header">{formatINR(invoice.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-invoice-border pt-6 space-y-3 text-xs text-invoice-muted">
        {invoice.notes && (
          <div>
            <p className="font-semibold text-invoice-header mb-1">Notes</p>
            <p>{invoice.notes}</p>
          </div>
        )}
        {invoice.terms && (
          <div>
            <p className="font-semibold text-invoice-header mb-1">Terms & Conditions</p>
            <p className="whitespace-pre-line">{invoice.terms}</p>
          </div>
        )}
        <p className="text-center pt-4 text-invoice-muted">
          Powered by <span className="font-semibold text-primary">PayInvoice</span>
        </p>
      </div>
    </div>
  );
}
