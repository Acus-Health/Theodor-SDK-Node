const { ApiResponse } = require('../utils/api-response');
const config = require('../config');

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  
  if (config.isDevelopment) {
    console.error('Stack:', err.stack);
  }
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return ApiResponse.badRequest(res, err.message);
  }
  
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.unauthorized(res, 'Invalid token');
  }
  
  if (err.name === 'TokenExpiredError') {
    return ApiResponse.unauthorized(res, 'Token expired');
  }
  
  if (err.status === 404) {
    return ApiResponse.notFound(res, err.message || 'Resource not found');
  }
  
  // Default to 500 server error
  return ApiResponse.serverError(res, config.isDevelopment ? err.message : 'An unexpected error occurred');
};

module.exports = {
  errorHandler
};