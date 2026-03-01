const { query } = require('../config/db');

/**
 * Generate next invoice number based on user's settings and last invoice
 * Format: PREFIX-YYYY-XXXX (e.g., INV-2024-0042)
 * 
 * @param {number} userId - User ID to generate invoice number for
 * @returns {Promise<string>} - Generated invoice number
 */
const generateInvoiceNumber = async (userId) => {
  // Get user's invoice prefix from settings
  const settings = await query(
    'SELECT invoice_prefix FROM business_settings WHERE user_id = ?',
    [userId]
  );
  
  const prefix = settings.length > 0 && settings[0].invoice_prefix 
    ? settings[0].invoice_prefix 
    : 'INV';
  
  // Get current year
  const currentYear = new Date().getFullYear();
  
  // Find last invoice number for current year with this prefix
  const lastInvoice = await query(
    `SELECT invoice_number FROM invoices 
     WHERE user_id = ? 
     AND invoice_number LIKE ?
     ORDER BY id DESC 
     LIMIT 1`,
    [userId, `${prefix}-${currentYear}-%`]
  );
  
  let nextNumber = 1;
  
  if (lastInvoice.length > 0) {
    // Extract the sequence number from the last invoice
    const lastInvoiceNumber = lastInvoice[0].invoice_number;
    const parts = lastInvoiceNumber.split('-');
    
    if (parts.length === 3) {
      const lastSequence = parseInt(parts[2], 10);
      if (!isNaN(lastSequence)) {
        nextNumber = lastSequence + 1;
      }
    }
  }
  
  // Format: PREFIX-YYYY-XXXX (padded to 4 digits)
  const invoiceNumber = `${prefix}-${currentYear}-${String(nextNumber).padStart(4, '0')}`;
  
  return invoiceNumber;
};

/**
 * Generate unique payment link token
 * Uses crypto.randomUUID() for secure random token
 * 
 * @returns {string} - UUID token
 */
const generatePaymentToken = () => {
  const { randomUUID } = require('crypto');
  return randomUUID();
};

/**
 * Generate unique order ID for Paytm transactions
 * Format: ORD-TIMESTAMP-RANDOM
 * 
 * @param {number} invoiceId - Invoice ID
 * @returns {string} - Order ID
 */
const generateOrderId = (invoiceId) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${timestamp}-${invoiceId}-${random}`;
};

module.exports = {
  generateInvoiceNumber,
  generatePaymentToken,
  generateOrderId
};
