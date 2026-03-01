// Export all utilities from a single entry point
const { generateInvoiceNumber, generatePaymentToken, generateOrderId } = require('./generateInvoiceNumber');
const { formatCurrency, formatIndianNumber, rupeesToPaise, paiseToRupees, formatForPaytm, formatDate } = require('./formatCurrency');
const {
  isValidEmail,
  isValidPhone,
  isValidGST,
  validateRequired,
  validateInvoiceItems,
  validateDate,
  validatePositiveNumber,
  sanitizeString,
  parsePagination
} = require('./validators');

module.exports = {
  // Invoice number generation
  generateInvoiceNumber,
  generatePaymentToken,
  generateOrderId,
  
  // Currency formatting
  formatCurrency,
  formatIndianNumber,
  rupeesToPaise,
  paiseToRupees,
  formatForPaytm,
  formatDate,
  
  // Validators
  isValidEmail,
  isValidPhone,
  isValidGST,
  validateRequired,
  validateInvoiceItems,
  validateDate,
  validatePositiveNumber,
  sanitizeString,
  parsePagination
};
