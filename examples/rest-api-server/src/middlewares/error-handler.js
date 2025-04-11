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
  // Log basic error information
  console.error('Error:', err.message);
  
  // Log stack trace in development mode
  if (config.isDevelopment) {
    console.error('Stack:', err.stack);
  }
  
  // Handle Theodor-specific errors
  if (err.isTheodorError) {
    console.error('Theodor API Error:', err.status, err.data);
    
    if (err.status === 400 || err.status === 422) {
      // Bad request or validation error
      return ApiResponse.badRequest(res, err.data.detailed_error || err.data.message || err.message);
    }
    
    if (err.status === 401 || err.status === 403) {
      // Authentication or authorization error
      return ApiResponse.unauthorized(res, err.data.message || err.message);
    }
    
    if (err.status === 404) {
      // Not found
      return ApiResponse.notFound(res, err.data.message || err.message);
    }
    
    if (err.status >= 500) {
      // Server error
      const message = config.isDevelopment 
        ? (err.data.detailed_error || err.data.message || err.message)
        : 'A server error occurred. Please try again later.';
      return ApiResponse.serverError(res, message);
    }
  }
  
  // Handle network errors
  if (err.isNetworkError) {
    console.error('Network Error:', err.message);
    return ApiResponse.serverError(res, 'Unable to connect to the analysis service. Please try again later.');
  }
  
  // Handle audio file errors
  if (err.code === 'INVALID_AUDIO' || err.message.includes('audio file') || err.message.includes('file format')) {
    return ApiResponse.badRequest(res, err.userMessage || err.message);
  }
  
  // Handle standard error types
  if (err.name === 'ValidationError') {
    return ApiResponse.badRequest(res, err.message);
  }
  
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.unauthorized(res, 'Invalid token');
  }
  
  if (err.name === 'TokenExpiredError') {
    return ApiResponse.unauthorized(res, 'Token expired');
  }
  
  if (err.status === 404 || err.name === 'NotFoundError') {
    return ApiResponse.notFound(res, err.message || 'Resource not found');
  }
  
  if (err.status === 400 || err.name === 'BadRequestError') {
    return ApiResponse.badRequest(res, err.message);
  }
  
  // Default to 500 server error
  const message = config.isDevelopment 
    ? err.message 
    : 'An unexpected error occurred. Please try again later.';
  
  return ApiResponse.serverError(res, message);
};

module.exports = {
  errorHandler
};