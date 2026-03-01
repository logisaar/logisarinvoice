const nodemailer = require('nodemailer');
const { formatCurrency, formatDate } = require('../utils');

// Create reusable transporter
let transporter = null;

/**
 * Initialize email transporter
 */
const initTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
};

/**
 * Send email helper function
 * @param {Object} options - Email options
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transport = initTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '')
    };
    
    const info = await transport.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send payment link email to client
 * @param {Object} params - Email parameters
 */
const sendPaymentLinkEmail = async ({ 
  clientEmail, 
  clientName, 
  invoiceNumber, 
  grandTotal, 
  dueDate, 
  paymentLink, 
  businessName 
}) => {
  const subject = `Invoice ${invoiceNumber} from ${businessName}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .amount { font-size: 24px; font-weight: bold; color: #4F46E5; }
        .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${businessName}</h1>
        </div>
        <div class="content">
          <p>Dear ${clientName},</p>
          <p>You have received an invoice from ${businessName}.</p>
          
          <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
          <p><strong>Amount Due:</strong> <span class="amount">${formatCurrency(grandTotal)}</span></p>
          <p><strong>Due Date:</strong> ${formatDate(dueDate, 'long')}</p>
          
          <p style="text-align: center;">
            <a href="${paymentLink}" class="button">View Invoice & Pay Now</a>
          </p>
          
          <p>If you have any questions about this invoice, please contact us.</p>
          
          <p>Thank you for your business!</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply directly.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to: clientEmail,
    subject,
    html
  });
};

/**
 * Send payment confirmation email to client
 * @param {Object} params - Email parameters
 */
const sendPaymentConfirmationToClient = async ({
  clientEmail,
  clientName,
  invoiceNumber,
  amount,
  transactionId,
  paymentDate,
  invoiceLink,
  businessName
}) => {
  const subject = `Payment Confirmed - Invoice ${invoiceNumber}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10B981; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .success-badge { background-color: #10B981; color: white; padding: 5px 15px; border-radius: 20px; display: inline-block; }
        .details { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment Successful!</h1>
          <span class="success-badge">✓ Confirmed</span>
        </div>
        <div class="content">
          <p>Dear ${clientName},</p>
          <p>Your payment has been successfully processed. Thank you!</p>
          
          <div class="details">
            <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
            <p><strong>Amount Paid:</strong> ${formatCurrency(amount)}</p>
            <p><strong>Transaction ID:</strong> ${transactionId}</p>
            <p><strong>Payment Date:</strong> ${formatDate(paymentDate, 'datetime')}</p>
          </div>
          
          <p style="text-align: center;">
            <a href="${invoiceLink}" class="button">View Invoice</a>
          </p>
          
          <p>This email serves as your payment receipt. Please keep it for your records.</p>
          
          <p>Thank you for your business!</p>
          <p>Best regards,<br>${businessName}</p>
        </div>
        <div class="footer">
          <p>This is an automated confirmation email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to: clientEmail,
    subject,
    html
  });
};

/**
 * Send payment notification email to admin
 * @param {Object} params - Email parameters
 */
const sendPaymentNotificationToAdmin = async ({
  adminEmail,
  clientName,
  invoiceNumber,
  amount,
  transactionId,
  paymentDate
}) => {
  const subject = `Payment Received - ${formatCurrency(amount)} from ${clientName}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10B981; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .amount { font-size: 28px; font-weight: bold; color: #10B981; }
        .details { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment Received!</h1>
        </div>
        <div class="content">
          <p style="text-align: center;">
            <span class="amount">${formatCurrency(amount)}</span>
          </p>
          
          <div class="details">
            <p><strong>Client:</strong> ${clientName}</p>
            <p><strong>Invoice:</strong> ${invoiceNumber}</p>
            <p><strong>Transaction ID:</strong> ${transactionId}</p>
            <p><strong>Payment Date:</strong> ${formatDate(paymentDate, 'datetime')}</p>
          </div>
          
          <p>A payment has been successfully processed for the above invoice.</p>
        </div>
        <div class="footer">
          <p>PayInvoice - Payment Notification</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to: adminEmail,
    subject,
    html
  });
};

/**
 * Verify email configuration
 */
const verifyEmailConfig = async () => {
  try {
    const transport = initTransporter();
    await transport.verify();
    console.log('Email configuration verified successfully');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error.message);
    return false;
  }
};

module.exports = {
  sendEmail,
  sendPaymentLinkEmail,
  sendPaymentConfirmationToClient,
  sendPaymentNotificationToAdmin,
  verifyEmailConfig
};
