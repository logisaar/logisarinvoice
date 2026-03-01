const PaytmChecksum = require('paytmchecksum');
const https = require('https');
const paytmConfig = require('../config/paytm');

/**
 * Generate Paytm checksum hash
 * @param {Object} params - Paytm parameters
 * @returns {Promise<string>} - Checksum hash
 */
const generateChecksum = async (params) => {
  try {
    const checksum = await PaytmChecksum.generateSignature(
      JSON.stringify(params),
      paytmConfig.MERCHANT_KEY
    );
    return checksum;
  } catch (error) {
    console.error('Checksum generation error:', error);
    throw new Error('Failed to generate payment checksum');
  }
};

/**
 * Verify Paytm checksum from callback
 * @param {Object} params - Paytm callback parameters
 * @param {string} checksum - Checksum to verify
 * @returns {Promise<boolean>} - True if valid
 */
const verifyChecksum = async (params, checksum) => {
  try {
    const isValid = await PaytmChecksum.verifySignature(
      JSON.stringify(params),
      paytmConfig.MERCHANT_KEY,
      checksum
    );
    return isValid;
  } catch (error) {
    console.error('Checksum verification error:', error);
    return false;
  }
};

/**
 * Initiate Paytm transaction and get transaction token
 * @param {Object} params - Transaction parameters
 * @returns {Promise<Object>} - Paytm response with txnToken
 */
const initiateTransaction = async ({
  orderId,
  amount,
  customerId,
  email,
  mobile
}) => {
  const paytmParams = {
    body: {
      requestType: 'Payment',
      mid: paytmConfig.MID,
      websiteName: paytmConfig.WEBSITE,
      orderId: orderId,
      callbackUrl: paytmConfig.getCallbackUrl(),
      txnAmount: {
        value: amount,
        currency: 'INR'
      },
      userInfo: {
        custId: customerId,
        email: email || '',
        mobile: mobile || ''
      }
    }
  };

  // Generate checksum for body
  const checksum = await generateChecksum(paytmParams.body);
  paytmParams.head = {
    signature: checksum
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(paytmParams);
    
    const options = {
      hostname: paytmConfig.ENV === 'production' 
        ? 'securegw.paytm.in' 
        : 'securegw-stage.paytm.in',
      port: 443,
      path: `/theia/api/v1/initiateTransaction?mid=${paytmConfig.MID}&orderId=${orderId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.body && response.body.resultInfo.resultStatus === 'S') {
            resolve({
              success: true,
              txnToken: response.body.txnToken,
              orderId: orderId,
              mid: paytmConfig.MID,
              amount: amount
            });
          } else {
            resolve({
              success: false,
              error: response.body?.resultInfo?.resultMsg || 'Transaction initiation failed'
            });
          }
        } catch (error) {
          reject(new Error('Failed to parse Paytm response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
};

/**
 * Get transaction status from Paytm
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} - Transaction status
 */
const getTransactionStatus = async (orderId) => {
  const paytmParams = {
    body: {
      mid: paytmConfig.MID,
      orderId: orderId
    }
  };

  const checksum = await generateChecksum(paytmParams.body);
  paytmParams.head = {
    signature: checksum
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(paytmParams);
    
    const options = {
      hostname: paytmConfig.ENV === 'production' 
        ? 'securegw.paytm.in' 
        : 'securegw-stage.paytm.in',
      port: 443,
      path: '/v3/order/status',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            success: true,
            data: response.body,
            resultStatus: response.body?.resultInfo?.resultStatus,
            resultMsg: response.body?.resultInfo?.resultMsg,
            txnId: response.body?.txnId,
            txnAmount: response.body?.txnAmount
          });
        } catch (error) {
          reject(new Error('Failed to parse Paytm status response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
};

/**
 * Build Paytm payment page URL
 * @param {Object} params - Payment parameters
 * @returns {Object} - Paytm form data
 */
const buildPaymentParams = async ({
  orderId,
  amount,
  customerId,
  email,
  mobile
}) => {
  // First initiate transaction to get txnToken
  const initResponse = await initiateTransaction({
    orderId,
    amount,
    customerId,
    email,
    mobile
  });

  if (!initResponse.success) {
    throw new Error(initResponse.error || 'Failed to initiate transaction');
  }

  return {
    mid: paytmConfig.MID,
    orderId: orderId,
    txnToken: initResponse.txnToken,
    txnAmount: amount,
    callbackUrl: paytmConfig.getCallbackUrl(),
    paymentUrl: paytmConfig.getPaymentUrl(orderId)
  };
};

/**
 * Parse Paytm callback response
 * @param {Object} callbackData - Paytm callback data
 * @returns {Object} - Parsed response
 */
const parseCallbackResponse = (callbackData) => {
  return {
    orderId: callbackData.ORDERID,
    txnId: callbackData.TXNID,
    bankTxnId: callbackData.BANKTXNID,
    txnAmount: callbackData.TXNAMOUNT,
    currency: callbackData.CURRENCY,
    status: callbackData.STATUS,
    responseCode: callbackData.RESPCODE,
    responseMsg: callbackData.RESPMSG,
    txnDate: callbackData.TXNDATE,
    gatewayName: callbackData.GATEWAYNAME,
    bankName: callbackData.BANKNAME,
    paymentMode: callbackData.PAYMENTMODE,
    checksumHash: callbackData.CHECKSUMHASH
  };
};

module.exports = {
  generateChecksum,
  verifyChecksum,
  initiateTransaction,
  getTransactionStatus,
  buildPaymentParams,
  parseCallbackResponse
};
