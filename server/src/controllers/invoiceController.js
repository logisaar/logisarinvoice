const { query } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware');
const { 
  createInvoice, 
  updateInvoice, 
  getInvoiceStats,
  sendPaymentLinkEmail 
} = require('../services');
const { validateRequired, validateInvoiceItems, validateDate, parsePagination } = require('../utils');

/**
 * Get all invoices with pagination and filters
 * GET /api/invoices
 */
const getInvoices = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { status, search } = req.query;
  const { page, limit, offset } = parsePagination(req.query);
  
  // Build query
  let whereClause = 'WHERE i.user_id = ?';
  const params = [userId];
  
  if (status) {
    whereClause += ' AND i.status = ?';
    params.push(status);
  }
  
  if (search) {
    whereClause += ' AND (i.invoice_number LIKE ? OR c.name LIKE ? OR c.email LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }
  
  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM invoices i 
     JOIN clients c ON i.client_id = c.id 
     ${whereClause}`,
    params
  );
  const total = countResult[0].total;
  
  // Get invoices
  const invoices = await query(
    `SELECT i.*, 
            c.name as client_name, 
            c.email as client_email, 
            c.phone as client_phone
     FROM invoices i
     JOIN clients c ON i.client_id = c.id
     ${whereClause}
     ORDER BY i.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  
  res.json({
    success: true,
    data: {
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * Get single invoice by ID
 * GET /api/invoices/:id
 */
const getInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  // Get invoice
  const invoices = await query(
    `SELECT i.*, 
            c.name as client_name, 
            c.email as client_email, 
            c.phone as client_phone,
            c.address as client_address,
            c.gst_number as client_gst
     FROM invoices i
     JOIN clients c ON i.client_id = c.id
     WHERE i.id = ? AND i.user_id = ?`,
    [id, userId]
  );
  
  if (invoices.length === 0) {
    throw ApiError.notFound('Invoice not found');
  }
  
  const invoice = invoices[0];
  
  // Get invoice items
  const items = await query(
    'SELECT * FROM invoice_items WHERE invoice_id = ?',
    [id]
  );
  
  // Get transactions
  const transactions = await query(
    'SELECT * FROM transactions WHERE invoice_id = ? ORDER BY created_at DESC',
    [id]
  );
  
  res.json({
    success: true,
    data: {
      ...invoice,
      items,
      transactions,
      payment_link: `${process.env.FRONTEND_URL}/invoice/${invoice.payment_link_token}`
    }
  });
});

/**
 * Create new invoice
 * POST /api/invoices
 */
const createNewInvoice = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { client, invoice_date, due_date, items, notes, terms, discount_amount, send_email } = req.body;
  
  // Validate required fields
  validateRequired({ client }, ['client']);
  validateRequired(client, ['name']);
  validateRequired({ invoice_date, due_date }, ['invoice_date', 'due_date']);
  
  // Validate dates
  validateDate(invoice_date, 'invoice');
  validateDate(due_date, 'due');
  
  // Validate items
  validateInvoiceItems(items);
  
  // Create invoice
  const invoice = await createInvoice({
    client,
    invoice_date,
    due_date,
    items,
    notes,
    terms,
    discount_amount
  }, userId);
  
  // Send email if requested and client has email
  if (send_email && client.email) {
    // Get business settings for email
    const settings = await query(
      'SELECT business_name FROM business_settings WHERE user_id = ?',
      [userId]
    );
    
    const businessName = settings.length > 0 ? settings[0].business_name : 'PayInvoice';
    
    await sendPaymentLinkEmail({
      clientEmail: client.email,
      clientName: client.name,
      invoiceNumber: invoice.invoice_number,
      grandTotal: invoice.grand_total,
      dueDate: invoice.due_date,
      paymentLink: invoice.payment_link,
      businessName
    });
    
    // Update status to sent
    await query(
      "UPDATE invoices SET status = 'sent' WHERE id = ?",
      [invoice.id]
    );
    invoice.status = 'sent';
  }
  
  res.status(201).json({
    success: true,
    message: 'Invoice created successfully',
    data: invoice
  });
});

/**
 * Update invoice
 * PUT /api/invoices/:id
 */
const updateExistingInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const invoice = await updateInvoice(id, req.body, userId);
  
  res.json({
    success: true,
    message: 'Invoice updated successfully',
    data: invoice
  });
});

/**
 * Delete invoice
 * DELETE /api/invoices/:id
 */
const deleteInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  // Check invoice exists and belongs to user
  const invoices = await query(
    'SELECT id, status FROM invoices WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  
  if (invoices.length === 0) {
    throw ApiError.notFound('Invoice not found');
  }
  
  const invoice = invoices[0];
  
  // Cannot delete paid invoices
  if (invoice.status === 'paid') {
    throw ApiError.badRequest('Cannot delete paid invoices');
  }
  
  // Delete invoice (cascade will delete items and transactions)
  await query('DELETE FROM invoices WHERE id = ?', [id]);
  
  res.json({
    success: true,
    message: 'Invoice deleted successfully'
  });
});

/**
 * Get invoice statistics for dashboard
 * GET /api/invoices/stats
 */
const getStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const stats = await getInvoiceStats(userId);
  
  res.json({
    success: true,
    data: stats
  });
});

/**
 * Send invoice email
 * POST /api/invoices/:id/send
 */
const sendInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  // Get invoice with client info
  const invoices = await query(
    `SELECT i.*, c.name as client_name, c.email as client_email
     FROM invoices i
     JOIN clients c ON i.client_id = c.id
     WHERE i.id = ? AND i.user_id = ?`,
    [id, userId]
  );
  
  if (invoices.length === 0) {
    throw ApiError.notFound('Invoice not found');
  }
  
  const invoice = invoices[0];
  
  if (!invoice.client_email) {
    throw ApiError.badRequest('Client does not have an email address');
  }
  
  // Get business settings
  const settings = await query(
    'SELECT business_name FROM business_settings WHERE user_id = ?',
    [userId]
  );
  
  const businessName = settings.length > 0 ? settings[0].business_name : 'PayInvoice';
  
  // Send email
  const result = await sendPaymentLinkEmail({
    clientEmail: invoice.client_email,
    clientName: invoice.client_name,
    invoiceNumber: invoice.invoice_number,
    grandTotal: invoice.grand_total,
    dueDate: invoice.due_date,
    paymentLink: `${process.env.FRONTEND_URL}/invoice/${invoice.payment_link_token}`,
    businessName
  });
  
  if (result.success) {
    // Update status to sent if draft
    if (invoice.status === 'draft') {
      await query("UPDATE invoices SET status = 'sent' WHERE id = ?", [id]);
    }
    
    res.json({
      success: true,
      message: 'Invoice sent successfully'
    });
  } else {
    throw ApiError.internal('Failed to send email: ' + result.error);
  }
});

module.exports = {
  getInvoices,
  getInvoice,
  createNewInvoice,
  updateExistingInvoice,
  deleteInvoice,
  getStats,
  sendInvoice
};
