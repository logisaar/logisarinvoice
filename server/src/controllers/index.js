// Export all controllers from a single entry point
const authController = require('./authController');
const invoiceController = require('./invoiceController');
const publicInvoiceController = require('./publicInvoiceController');
const paymentController = require('./paymentController');
const settingsController = require('./settingsController');
const clientsController = require('./clientsController');

module.exports = {
  authController,
  invoiceController,
  publicInvoiceController,
  paymentController,
  settingsController,
  clientsController
};
