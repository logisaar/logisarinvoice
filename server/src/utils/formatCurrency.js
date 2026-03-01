/**
 * Format number as Indian currency (INR)
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) {
    return '₹0.00';
  }
  
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) {
    return '₹0.00';
  }
  
  // Format with Indian locale and INR currency
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numAmount);
};

/**
 * Format number as Indian number system (with lakhs and crores)
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted number string
 */
const formatIndianNumber = (amount) => {
  if (amount === null || amount === undefined) {
    return '0.00';
  }
  
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) {
    return '0.00';
  }
  
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numAmount);
};

/**
 * Convert rupees to paise
 * @param {number} rupees - Amount in rupees
 * @returns {number} - Amount in paise
 */
const rupeesToPaise = (rupees) => {
  return Math.round(parseFloat(rupees) * 100);
};

/**
 * Convert paise to rupees
 * @param {number} paise - Amount in paise
 * @returns {number} - Amount in rupees
 */
const paiseToRupees = (paise) => {
  return parseFloat((parseInt(paise) / 100).toFixed(2));
};

/**
 * Format amount for Paytm (string with 2 decimal places)
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted amount string
 */
const formatForPaytm = (amount) => {
  return parseFloat(amount).toFixed(2);
};

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {string} format - Format type ('short', 'long', 'iso')
 * @returns {string} - Formatted date string
 */
const formatDate = (date, format = 'short') => {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return '';
  }
  
  switch (format) {
    case 'long':
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    case 'iso':
      return d.toISOString().split('T')[0];
    case 'datetime':
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    case 'short':
    default:
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
  }
};

module.exports = {
  formatCurrency,
  formatIndianNumber,
  rupeesToPaise,
  paiseToRupees,
  formatForPaytm,
  formatDate
};
