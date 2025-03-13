const jwt = require('jsonwebtoken');
const { ApiResponse } = require('../utils/api-response');
const config = require('../config');

/**
 * Authentication middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticate = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.unauthorized(res, 'Authorization token required');
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    jwt.verify(token, config.jwtSecret, (err, decoded) => {
      if (err) {
        return ApiResponse.unauthorized(res, 'Invalid or expired token');
      }
      
      // Add user to request
      req.user = decoded;
      next();
    });
  } catch (error) {
    return ApiResponse.unauthorized(res, 'Authentication failed');
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require it
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const optionalAuth = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token, continue without user
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    jwt.verify(token, config.jwtSecret, (err, decoded) => {
      if (!err) {
        // Add user to request
        req.user = decoded;
      }
      // Continue even if token is invalid
      next();
    });
  } catch (error) {
    // Continue without user
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth
};