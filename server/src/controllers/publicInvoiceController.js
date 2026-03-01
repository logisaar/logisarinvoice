const { query } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware');

/**
 * Get public invoice by payment token
 * GET /api/invoice/public/:token
 * No authentication required - for client viewing
 */
const getPublicInvoice = asyncHandler(async (req, res) => {
  const { token } = req.params;
  
  if (!token) {
    throw ApiError.badRequest('Invalid invoice link');
  }
  
  // Get invoice with client and business info
  const invoices = await query(
    `SELECT 
      i.id,
      i.invoice_number,
      i.invoice_date,
      i.due_date,
      i.subtotal,
      i.total_tax,
      i.discount_amount,
      i.grand_total,
      i.notes,
      i.terms,
      i.status,
      i.payment_link_token,
      i.created_at,
      i.paid_at,
      c.name as client_name,
      c.email as client_email,
      c.phone as client_phone,
      c.address as client_address,
      c.gst_number as client_gst,
      bs.business_name,
      bs.business_address,
      bs.gst_number as business_gst,
      bs.logo_url,
      bs.email as business_email,
      bs.phone as business_phone
     FROM invoices i
     JOIN clients c ON i.client_id = c.id
     LEFT JOIN business_settings bs ON i.user_id = bs.user_id
     WHERE i.payment_link_token = ?`,
    [token]
  );
  
  if (invoices.length === 0) {
    throw ApiError.notFound('Invoice not found');
  }
  
  const invoice = invoices[0];
  
  // Get invoice items
  const items = await query(
    'SELECT id, description, quantity, unit_price, tax_percent, tax_amount, amount FROM invoice_items WHERE invoice_id = ?',
    [invoice.id]
  );
  
  // Get latest successful transaction if paid
  let transaction = null;
  if (invoice.status === 'paid') {
    const transactions = await query(
      `SELECT txn_id, amount, created_at as payment_date 
       FROM transactions 
       WHERE invoice_id = ? AND status = 'success' 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [invoice.id]
    );
    if (transactions.length > 0) {
      transaction = transactions[0];
    }
  }
  
  // Structure response (no sensitive admin data exposed)
  res.json({
    success: true,
    data: {
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        subtotal: invoice.subtotal,
        total_tax: invoice.total_tax,
        discount_amount: invoice.discount_amount,
        grand_total: invoice.grand_total,
        notes: invoice.notes,
        terms: invoice.terms,
        status: invoice.status,
        created_at: invoice.created_at,
        paid_at: invoice.paid_at
      },
      client: {
        name: invoice.client_name,
        email: invoice.client_email,
        phone: invoice.client_phone,
        address: invoice.client_address,
        gst_number: invoice.client_gst
      },
      business: {
        name: invoice.business_name,
        address: invoice.business_address,
        gst_number: invoice.business_gst,
        logo_url: invoice.logo_url,
        email: invoice.business_email,
        phone: invoice.business_phone
      },
      items,
      transaction,
      payment_link_token: invoice.payment_link_token
    }
  });
});

/**
 * Check if invoice is payable
 * GET /api/invoice/public/:token/status
 */
const checkInvoiceStatus = asyncHandler(async (req, res) => {
  const { token } = req.params;
  
  const invoices = await query(
    'SELECT id, status, due_date, grand_total FROM invoices WHERE payment_link_token = ?',
    [token]
  );
  
  if (invoices.length === 0) {
    throw ApiError.notFound('Invoice not found');
  }
  
  const invoice = invoices[0];
  const isExpired = new Date(invoice.due_date) < new Date();
  const isPaid = invoice.status === 'paid';
  const canPay = !isPaid && !isExpired && ['draft', 'sent'].includes(invoice.status);
  
  res.json({
    success: true,
    data: {
      status: invoice.status,
      isPaid,
      isExpired,
      canPay,
      amount: invoice.grand_total
    }
  });
});

module.exports = {
  getPublicInvoice,
  checkInvoiceStatus
};
