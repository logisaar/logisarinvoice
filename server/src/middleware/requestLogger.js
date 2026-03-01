/**
 * Request logger middleware
 * Logs all incoming requests with method, path, and timestamp
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  
  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const statusColor = statusCode >= 500 ? '\x1b[31m' : // Red for 5xx
                        statusCode >= 400 ? '\x1b[33m' : // Yellow for 4xx
                        statusCode >= 300 ? '\x1b[36m' : // Cyan for 3xx
                        '\x1b[32m'; // Green for 2xx
    
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ` +
      `${statusColor}${statusCode}\x1b[0m ${duration}ms`
    );
  });
  
  next();
};

/**
 * Detailed request logger (for development)
 * Logs request body and headers
 */
const detailedLogger = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('\n--- Request Details ---');
    console.log('Method:', req.method);
    console.log('URL:', req.originalUrl);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    
    if (req.body && Object.keys(req.body).length > 0) {
      // Mask sensitive fields
      const sanitizedBody = { ...req.body };
      if (sanitizedBody.password) sanitizedBody.password = '***';
      if (sanitizedBody.password_hash) sanitizedBody.password_hash = '***';
      console.log('Body:', JSON.stringify(sanitizedBody, null, 2));
    }
    
    console.log('------------------------\n');
  }
  
  next();
};

module.exports = {
  requestLogger,
  detailedLogger
};
