const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware');
const {
  initiatePayment,
  handleCallback,
  getPaymentStatus,
  verifyPayment
} = require('../controllers/paymentController');

// Public routes (payment initiation and callback)
router.post('/initiate', initiatePayment);
router.post('/callback', handleCallback);

// Protected routes
router.get('/status/:orderId', getPaymentStatus);
router.post('/verify/:orderId', authMiddleware, verifyPayment);

module.exports = router;
