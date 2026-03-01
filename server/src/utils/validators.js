const { ApiError } = require('../middleware/errorHandler');

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (Indian format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
const isValidPhone = (phone) => {
  if (!phone) return false;
  // Allow +91, 91, or just 10 digit number
  const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
};

/**
 * Validate GST number format
 * @param {string} gst - GST number to validate
 * @returns {boolean} - True if valid
 */
const isValidGST = (gst) => {
  if (!gst) return true; // GST is optional
  // GST format: 2 digit state code + 10 char PAN + 1 entity code + 1 default Z + 1 check digit
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gst.toUpperCase());
};

/**
 * Validate required fields in object
 * @param {Object} data - Object to validate
 * @param {string[]} fields - Required field names
 * @throws {ApiError} - If validation fails
 */
const validateRequired = (data, fields) => {
  const missing = fields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });
  
  if (missing.length > 0) {
    throw ApiError.badRequest(`Missing required fields: ${missing.join(', ')}`);
  }
};

/**
 * Validate invoice items array
 * @param {Array} items - Invoice items to validate
 * @throws {ApiError} - If validation fails
 */
const validateInvoiceItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw ApiError.badRequest('Invoice must have at least one item');
  }
  
  items.forEach((item, index) => {
    if (!item.description || item.description.trim() === '') {
      throw ApiError.badRequest(`Item ${index + 1}: Description is required`);
    }
    
    if (item.quantity === undefined || item.quantity <= 0) {
      throw ApiError.badRequest(`Item ${index + 1}: Quantity must be greater than 0`);
    }
    
    if (item.unit_price === undefined || item.unit_price < 0) {
      throw ApiError.badRequest(`Item ${index + 1}: Unit price must be 0 or greater`);
    }
    
    if (item.tax_percent !== undefined && (item.tax_percent < 0 || item.tax_percent > 100)) {
      throw ApiError.badRequest(`Item ${index + 1}: Tax percent must be between 0 and 100`);
    }
  });
};

/**
 * Validate date string
 * @param {string} dateStr - Date string to validate
 * @param {string} fieldName - Field name for error message
 * @throws {ApiError} - If validation fails
 */
const validateDate = (dateStr, fieldName) => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw ApiError.badRequest(`Invalid ${fieldName} date format`);
  }
};

/**
 * Validate positive number
 * @param {number} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @throws {ApiError} - If validation fails
 */
const validatePositiveNumber = (value, fieldName) => {
  if (value !== undefined && (isNaN(value) || value < 0)) {
    throw ApiError.badRequest(`${fieldName} must be a positive number`);
  }
};

/**
 * Sanitize string input (trim and remove extra spaces)
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
const sanitizeString = (str) => {
  if (!str) return '';
  return str.trim().replace(/\s+/g, ' ');
};

/**
 * Parse and validate pagination parameters
 * @param {Object} query - Request query object
 * @returns {Object} - Parsed pagination { page, limit, offset }
 */
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
};

module.exports = {
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
