// Export all middleware from a single entry point
const { authMiddleware, optionalAuth, authorize } = require('./auth');
const { errorHandler, notFoundHandler, asyncHandler, ApiError } = require('./errorHandler');
const { requestLogger, detailedLogger } = require('./requestLogger');

module.exports = {
  // Authentication
  authMiddleware,
  optionalAuth,
  authorize,
  
  // Error handling
  errorHandler,
  notFoundHandler,
  asyncHandler,
  ApiError,
  
  // Logging
  requestLogger,
  detailedLogger
};
