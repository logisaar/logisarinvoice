const express = require('express');
const router = express.Router();
const { getPublicInvoice, checkInvoiceStatus } = require('../controllers/publicInvoiceController');

// Public routes (no authentication required)
router.get('/public/:token', getPublicInvoice);
router.get('/public/:token/status', checkInvoiceStatus);

module.exports = router;
