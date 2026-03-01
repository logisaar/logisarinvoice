const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const invoiceRoutes = require('./invoices');
const publicInvoiceRoutes = require('./publicInvoice');
const paymentRoutes = require('./payment');
const settingsRoutes = require('./settings');
const clientsRoutes = require('./clients');

// Mount routes
router.use('/auth', authRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/invoice', publicInvoiceRoutes);  // Public invoice routes
router.use('/payment', paymentRoutes);
router.use('/settings', settingsRoutes);
router.use('/clients', clientsRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
