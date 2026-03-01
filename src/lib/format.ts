export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function generateInvoiceNumber(prefix: string = "INV"): string {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `${prefix}-${year}-${num}`;
}
