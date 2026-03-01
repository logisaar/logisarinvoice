const { query, transaction } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware');
const { generateOrderId, formatForPaytm } = require('../utils');
const {
  buildPaymentParams,
  verifyChecksum,
  getTransactionStatus,
  parseCallbackResponse,
  sendPaymentConfirmationToClient,
  sendPaymentNotificationToAdmin
} = require('../services');
const paytmConfig = require('../config/paytm');

/**
 * Initiate payment for an invoice
 * POST /api/payment/initiate
 */
const initiatePayment = asyncHandler(async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    throw ApiError.badRequest('Payment token is required');
  }
  
  // Get invoice by payment token
  const invoices = await query(
    `SELECT i.*, c.name as client_name, c.email as client_email, c.phone as client_phone
     FROM invoices i
     JOIN clients c ON i.client_id = c.id
     WHERE i.payment_link_token = ?`,
    [token]
  );
  
  if (invoices.length === 0) {
    throw ApiError.notFound('Invoice not found');
  }
  
  const invoice = invoices[0];
  
  // Check if invoice is payable
  if (invoice.status === 'paid') {
    throw ApiError.badRequest('Invoice is already paid');
  }
  
  if (invoice.status === 'expired') {
    throw ApiError.badRequest('Invoice has expired');
  }
  
  // Check if due date has passed
  const dueDate = new Date(invoice.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (dueDate < today) {
    // Update status to expired
    await query("UPDATE invoices SET status = 'expired' WHERE id = ?", [invoice.id]);
    throw ApiError.badRequest('Invoice has expired');
  }
  
  // Generate order ID
  const orderId = generateOrderId(invoice.id);
  
  // Create transaction record
  await query(
    `INSERT INTO transactions (invoice_id, order_id, amount, status)
     VALUES (?, ?, ?, 'initiated')`,
    [invoice.id, orderId, invoice.grand_total]
  );
  
  try {
    // Build Paytm payment params
    const paymentParams = await buildPaymentParams({
      orderId,
      amount: formatForPaytm(invoice.grand_total),
      customerId: `CUST_${invoice.client_id}`,
      email: invoice.client_email || '',
      mobile: invoice.client_phone || ''
    });
    
    res.json({
      success: true,
      data: {
        ...paymentParams,
        invoiceNumber: invoice.invoice_number,
        amount: invoice.grand_total
      }
    });
  } catch (error) {
    // Update transaction status to failed
    await query(
      "UPDATE transactions SET status = 'failed', updated_at = NOW() WHERE order_id = ?",
      [orderId]
    );
    throw ApiError.internal('Failed to initiate payment: ' + error.message);
  }
});

/**
 * Handle Paytm callback after payment
 * POST /api/payment/callback
 */
const handleCallback = asyncHandler(async (req, res) => {
  const callbackData = req.body;
  
  console.log('Paytm callback received:', JSON.stringify(callbackData));
  
  // Parse callback response
  const parsedResponse = parseCallbackResponse(callbackData);
  const { orderId, txnId, status, checksumHash } = parsedResponse;
  
  if (!orderId) {
    return res.redirect(`${process.env.FRONTEND_URL}/payment-failed?error=invalid_response`);
  }
  
  // Get transaction
  const transactions = await query(
    `SELECT t.*, i.id as invoice_id, i.payment_link_token, i.invoice_number, i.grand_total,
            c.name as client_name, c.email as client_email,
            u.email as admin_email,
            bs.business_name
     FROM transactions t
     JOIN invoices i ON t.invoice_id = i.id
     JOIN clients c ON i.client_id = c.id
     JOIN users u ON i.user_id = u.id
     LEFT JOIN business_settings bs ON i.user_id = bs.user_id
     WHERE t.order_id = ?`,
    [orderId]
  );
  
  if (transactions.length === 0) {
    return res.redirect(`${process.env.FRONTEND_URL}/payment-failed?error=transaction_not_found`);
  }
  
  const txn = transactions[0];
  
  // Verify checksum
  const { CHECKSUMHASH, ...paramsWithoutChecksum } = callbackData;
  const isValidChecksum = await verifyChecksum(paramsWithoutChecksum, checksumHash);
  
  if (!isValidChecksum) {
    console.error('Invalid checksum for order:', orderId);
    await query(
      `UPDATE transactions SET status = 'failed', paytm_response = ?, updated_at = NOW() WHERE order_id = ?`,
      [JSON.stringify(callbackData), orderId]
    );
    return res.redirect(`${process.env.FRONTEND_URL}/invoice/${txn.payment_link_token}?status=failed&error=checksum_failed`);
  }
  
  // Double-verify with Paytm Transaction Status API
  try {
    const statusResponse = await getTransactionStatus(orderId);
    
    if (statusResponse.resultStatus === 'TXN_SUCCESS') {
      // Update transaction and invoice
      await transaction(async (connection) => {
        // Update transaction
        await connection.execute(
          `UPDATE transactions SET 
            txn_id = ?, 
            status = 'success', 
            paytm_response = ?, 
            updated_at = NOW() 
           WHERE order_id = ?`,
          [txnId, JSON.stringify(callbackData), orderId]
        );
        
        // Update invoice
        await connection.execute(
          `UPDATE invoices SET 
            status = 'paid', 
            paid_at = NOW(), 
            updated_at = NOW() 
           WHERE id = ?`,
          [txn.invoice_id]
        );
      });
      
      // Send confirmation emails (non-blocking)
      const paymentDate = new Date();
      const invoiceLink = `${process.env.FRONTEND_URL}/invoice/${txn.payment_link_token}`;
      
      // Email to client
      sendPaymentConfirmationToClient({
        clientEmail: txn.client_email,
        clientName: txn.client_name,
        invoiceNumber: txn.invoice_number,
        amount: txn.grand_total,
        transactionId: txnId,
        paymentDate,
        invoiceLink,
        businessName: txn.business_name || 'PayInvoice'
      }).catch(err => console.error('Failed to send client email:', err));
      
      // Email to admin
      sendPaymentNotificationToAdmin({
        adminEmail: txn.admin_email,
        clientName: txn.client_name,
        invoiceNumber: txn.invoice_number,
        amount: txn.grand_total,
        transactionId: txnId,
        paymentDate
      }).catch(err => console.error('Failed to send admin email:', err));
      
      // Redirect to success page
      return res.redirect(`${process.env.FRONTEND_URL}/invoice/${txn.payment_link_token}/success?txnId=${txnId}`);
    } else {
      // Payment failed
      await query(
        `UPDATE transactions SET 
          txn_id = ?, 
          status = 'failed', 
          paytm_response = ?, 
          updated_at = NOW() 
         WHERE order_id = ?`,
        [txnId, JSON.stringify(callbackData), orderId]
      );
      
      // Update invoice status if it was the only pending transaction
      await query(
        "UPDATE invoices SET status = 'failed', updated_at = NOW() WHERE id = ?",
        [txn.invoice_id]
      );
      
      return res.redirect(`${process.env.FRONTEND_URL}/invoice/${txn.payment_link_token}?status=failed`);
    }
  } catch (error) {
    console.error('Error verifying transaction status:', error);
    
    // Update as pending for manual review
    await query(
      `UPDATE transactions SET 
        txn_id = ?, 
        status = 'pending', 
        paytm_response = ?, 
        updated_at = NOW() 
       WHERE order_id = ?`,
      [txnId, JSON.stringify(callbackData), orderId]
    );
    
    return res.redirect(`${process.env.FRONTEND_URL}/invoice/${txn.payment_link_token}?status=pending`);
  }
});

/**
 * Get payment status by order ID
 * GET /api/payment/status/:orderId
 */
const getPaymentStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  
  const transactions = await query(
    `SELECT t.*, i.invoice_number, i.payment_link_token
     FROM transactions t
     JOIN invoices i ON t.invoice_id = i.id
     WHERE t.order_id = ?`,
    [orderId]
  );
  
  if (transactions.length === 0) {
    throw ApiError.notFound('Transaction not found');
  }
  
  const txn = transactions[0];
  
  res.json({
    success: true,
    data: {
      orderId: txn.order_id,
      txnId: txn.txn_id,
      amount: txn.amount,
      status: txn.status,
      invoiceNumber: txn.invoice_number,
      createdAt: txn.created_at,
      updatedAt: txn.updated_at
    }
  });
});

/**
 * Verify payment status with Paytm (for manual verification)
 * POST /api/payment/verify/:orderId
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  
  // Get transaction
  const transactions = await query(
    'SELECT * FROM transactions WHERE order_id = ?',
    [orderId]
  );
  
  if (transactions.length === 0) {
    throw ApiError.notFound('Transaction not found');
  }
  
  try {
    const statusResponse = await getTransactionStatus(orderId);
    
    res.json({
      success: true,
      data: {
        orderId,
        paytmStatus: statusResponse
      }
    });
  } catch (error) {
    throw ApiError.internal('Failed to verify payment: ' + error.message);
  }
});

module.exports = {
  initiatePayment,
  handleCallback,
  getPaymentStatus,
  verifyPayment
};
