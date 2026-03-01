const { query, transaction } = require('../config/db');
const { generateInvoiceNumber, generatePaymentToken } = require('../utils');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Calculate invoice item amounts
 * @param {Object} item - Invoice item
 * @returns {Object} - Item with calculated amounts
 */
const calculateItemAmounts = (item) => {
  const quantity = parseFloat(item.quantity) || 0;
  const unitPrice = parseFloat(item.unit_price) || 0;
  const taxPercent = parseFloat(item.tax_percent) || 18;
  
  const subtotal = quantity * unitPrice;
  const taxAmount = (subtotal * taxPercent) / 100;
  const amount = subtotal + taxAmount;
  
  return {
    ...item,
    quantity,
    unit_price: unitPrice,
    tax_percent: taxPercent,
    tax_amount: parseFloat(taxAmount.toFixed(2)),
    amount: parseFloat(amount.toFixed(2))
  };
};

/**
 * Calculate invoice totals from items
 * @param {Array} items - Invoice items
 * @param {number} discountAmount - Discount amount
 * @returns {Object} - Calculated totals
 */
const calculateInvoiceTotals = (items, discountAmount = 0) => {
  const calculatedItems = items.map(calculateItemAmounts);
  
  const subtotal = calculatedItems.reduce((sum, item) => {
    return sum + (item.quantity * item.unit_price);
  }, 0);
  
  const totalTax = calculatedItems.reduce((sum, item) => {
    return sum + item.tax_amount;
  }, 0);
  
  const discount = parseFloat(discountAmount) || 0;
  const grandTotal = subtotal + totalTax - discount;
  
  return {
    items: calculatedItems,
    subtotal: parseFloat(subtotal.toFixed(2)),
    total_tax: parseFloat(totalTax.toFixed(2)),
    discount_amount: parseFloat(discount.toFixed(2)),
    grand_total: parseFloat(Math.max(0, grandTotal).toFixed(2))
  };
};

/**
 * Create or update client and return client ID
 * @param {Object} clientData - Client data
 * @param {number} userId - User ID
 * @returns {Promise<number>} - Client ID
 */
const upsertClient = async (clientData, userId) => {
  const { name, email, phone, address, gst_number } = clientData;
  
  // Check if client exists by email for this user
  if (email) {
    const existing = await query(
      'SELECT id FROM clients WHERE user_id = ? AND email = ?',
      [userId, email]
    );
    
    if (existing.length > 0) {
      // Update existing client
      await query(
        `UPDATE clients SET name = ?, phone = ?, address = ?, gst_number = ?, updated_at = NOW()
         WHERE id = ?`,
        [name, phone || null, address || null, gst_number || null, existing[0].id]
      );
      return existing[0].id;
    }
  }
  
  // Create new client
  const result = await query(
    `INSERT INTO clients (user_id, name, email, phone, address, gst_number)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, name, email || null, phone || null, address || null, gst_number || null]
  );
  
  return result.insertId;
};

/**
 * Create invoice with items
 * @param {Object} invoiceData - Invoice data
 * @param {number} userId - User ID
 * @returns {Promise<Object>} - Created invoice
 */
const createInvoice = async (invoiceData, userId) => {
  const {
    client,
    invoice_date,
    due_date,
    items,
    notes,
    terms,
    discount_amount = 0
  } = invoiceData;
  
  return transaction(async (connection) => {
    // Create or get client
    const clientId = await upsertClient(client, userId);
    
    // Generate invoice number and payment token
    const invoiceNumber = await generateInvoiceNumber(userId);
    const paymentToken = generatePaymentToken();
    
    // Calculate totals
    const totals = calculateInvoiceTotals(items, discount_amount);
    
    // Insert invoice
    const [invoiceResult] = await connection.execute(
      `INSERT INTO invoices 
       (invoice_number, user_id, client_id, invoice_date, due_date, 
        subtotal, total_tax, discount_amount, grand_total, 
        notes, terms, status, payment_link_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [
        invoiceNumber, userId, clientId, invoice_date, due_date,
        totals.subtotal, totals.total_tax, totals.discount_amount, totals.grand_total,
        notes || null, terms || null, paymentToken
      ]
    );
    
    const invoiceId = invoiceResult.insertId;
    
    // Insert invoice items
    for (const item of totals.items) {
      await connection.execute(
        `INSERT INTO invoice_items 
         (invoice_id, description, quantity, unit_price, tax_percent, tax_amount, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceId, item.description, item.quantity, item.unit_price,
          item.tax_percent, item.tax_amount, item.amount
        ]
      );
    }
    
    // Fetch the complete invoice with client info
    const [invoice] = await connection.execute(
      `SELECT i.*, c.name as client_name, c.email as client_email, 
              c.phone as client_phone, c.address as client_address, c.gst_number as client_gst
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       WHERE i.id = ?`,
      [invoiceId]
    );
    
    // Fetch invoice items
    const [invoiceItems] = await connection.execute(
      'SELECT * FROM invoice_items WHERE invoice_id = ?',
      [invoiceId]
    );
    
    return {
      ...invoice[0],
      items: invoiceItems,
      payment_link: `${process.env.FRONTEND_URL}/invoice/${paymentToken}`
    };
  });
};

/**
 * Update invoice
 * @param {number} invoiceId - Invoice ID
 * @param {Object} updateData - Update data
 * @param {number} userId - User ID
 * @returns {Promise<Object>} - Updated invoice
 */
const updateInvoice = async (invoiceId, updateData, userId) => {
  // Check invoice exists and belongs to user
  const existing = await query(
    'SELECT * FROM invoices WHERE id = ? AND user_id = ?',
    [invoiceId, userId]
  );
  
  if (existing.length === 0) {
    throw ApiError.notFound('Invoice not found');
  }
  
  const invoice = existing[0];
  
  // Can only update draft or sent invoices
  if (!['draft', 'sent'].includes(invoice.status)) {
    throw ApiError.badRequest('Cannot update invoice with status: ' + invoice.status);
  }
  
  const {
    client,
    invoice_date,
    due_date,
    items,
    notes,
    terms,
    discount_amount,
    status
  } = updateData;
  
  return transaction(async (connection) => {
    let clientId = invoice.client_id;
    
    // Update client if provided
    if (client) {
      clientId = await upsertClient(client, userId);
    }
    
    // Calculate new totals if items provided
    let totals = null;
    if (items && items.length > 0) {
      totals = calculateInvoiceTotals(items, discount_amount || invoice.discount_amount);
      
      // Delete existing items
      await connection.execute('DELETE FROM invoice_items WHERE invoice_id = ?', [invoiceId]);
      
      // Insert new items
      for (const item of totals.items) {
        await connection.execute(
          `INSERT INTO invoice_items 
           (invoice_id, description, quantity, unit_price, tax_percent, tax_amount, amount)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            invoiceId, item.description, item.quantity, item.unit_price,
            item.tax_percent, item.tax_amount, item.amount
          ]
        );
      }
    }
    
    // Update invoice
    await connection.execute(
      `UPDATE invoices SET
        client_id = ?,
        invoice_date = COALESCE(?, invoice_date),
        due_date = COALESCE(?, due_date),
        subtotal = COALESCE(?, subtotal),
        total_tax = COALESCE(?, total_tax),
        discount_amount = COALESCE(?, discount_amount),
        grand_total = COALESCE(?, grand_total),
        notes = COALESCE(?, notes),
        terms = COALESCE(?, terms),
        status = COALESCE(?, status),
        updated_at = NOW()
       WHERE id = ?`,
      [
        clientId,
        invoice_date || null,
        due_date || null,
        totals?.subtotal || null,
        totals?.total_tax || null,
        totals?.discount_amount ?? discount_amount ?? null,
        totals?.grand_total || null,
        notes !== undefined ? notes : null,
        terms !== undefined ? terms : null,
        status || null,
        invoiceId
      ]
    );
    
    // Fetch updated invoice
    const [updated] = await connection.execute(
      `SELECT i.*, c.name as client_name, c.email as client_email, 
              c.phone as client_phone, c.address as client_address, c.gst_number as client_gst
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       WHERE i.id = ?`,
      [invoiceId]
    );
    
    const [invoiceItems] = await connection.execute(
      'SELECT * FROM invoice_items WHERE invoice_id = ?',
      [invoiceId]
    );
    
    return {
      ...updated[0],
      items: invoiceItems,
      payment_link: `${process.env.FRONTEND_URL}/invoice/${updated[0].payment_link_token}`
    };
  });
};

/**
 * Get invoice statistics for dashboard
 * @param {number} userId - User ID
 * @returns {Promise<Object>} - Statistics
 */
const getInvoiceStats = async (userId) => {
  const stats = await query(
    `SELECT 
      COUNT(*) as total_invoices,
      SUM(CASE WHEN status = 'paid' THEN grand_total ELSE 0 END) as total_collected,
      SUM(CASE WHEN status IN ('draft', 'sent') THEN grand_total ELSE 0 END) as pending_amount,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
      SUM(CASE WHEN status IN ('draft', 'sent') THEN 1 ELSE 0 END) as pending_count
     FROM invoices
     WHERE user_id = ?`,
    [userId]
  );
  
  return {
    totalInvoices: parseInt(stats[0].total_invoices) || 0,
    totalCollected: parseFloat(stats[0].total_collected) || 0,
    pendingAmount: parseFloat(stats[0].pending_amount) || 0,
    paidCount: parseInt(stats[0].paid_count) || 0,
    pendingCount: parseInt(stats[0].pending_count) || 0
  };
};

module.exports = {
  calculateItemAmounts,
  calculateInvoiceTotals,
  upsertClient,
  createInvoice,
  updateInvoice,
  getInvoiceStats
};
