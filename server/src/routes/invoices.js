const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware');
const {
  getInvoices,
  getInvoice,
  createNewInvoice,
  updateExistingInvoice,
  deleteInvoice,
  getStats,
  sendInvoice
} = require('../controllers/invoiceController');

// All routes are protected
router.use(authMiddleware);

// Invoice statistics (must be before :id route)
router.get('/stats', getStats);

// CRUD operations
router.get('/', getInvoices);
router.post('/', createNewInvoice);
router.get('/:id', getInvoice);
router.put('/:id', updateExistingInvoice);
router.delete('/:id', deleteInvoice);

// Send invoice email
router.post('/:id/send', sendInvoice);

module.exports = router;
