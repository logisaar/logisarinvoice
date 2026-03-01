// Paytm Configuration
const paytmConfig = {
  // Merchant credentials
  MID: process.env.PAYTM_MID || '',
  MERCHANT_KEY: process.env.PAYTM_MERCHANT_KEY || '',
  
  // Website and channel configuration
  WEBSITE: process.env.PAYTM_WEBSITE || 'WEBSTAGING',
  INDUSTRY_TYPE_ID: process.env.PAYTM_INDUSTRY_TYPE || 'Retail',
  CHANNEL_ID: process.env.PAYTM_CHANNEL_ID || 'WEB',
  
  // Environment (sandbox or production)
  ENV: process.env.PAYTM_ENV || 'sandbox',
  
  // Get base URL based on environment
  getBaseUrl() {
    return this.ENV === 'production'
      ? 'https://securegw.paytm.in'
      : 'https://securegw-stage.paytm.in';
  },
  
  // Get transaction initiation URL
  getInitiateUrl() {
    return `${this.getBaseUrl()}/theia/api/v1/initiateTransaction`;
  },
  
  // Get payment page URL
  getPaymentUrl(orderId) {
    return `${this.getBaseUrl()}/theia/api/v1/showPaymentPage?mid=${this.MID}&orderId=${orderId}`;
  },
  
  // Get transaction status URL
  getStatusUrl() {
    return `${this.getBaseUrl()}/v3/order/status`;
  },
  
  // Callback URL (backend endpoint)
  getCallbackUrl() {
    return `${process.env.BACKEND_URL}/api/payment/callback`;
  }
};

module.exports = paytmConfig;
