// Export all services from a single entry point
const emailService = require('./emailService');
const invoiceService = require('./invoiceService');
const paytmService = require('./paytmService');

module.exports = {
  // Email service
  ...emailService,
  
  // Invoice service
  ...invoiceService,
  
  // Paytm service
  ...paytmService
};
