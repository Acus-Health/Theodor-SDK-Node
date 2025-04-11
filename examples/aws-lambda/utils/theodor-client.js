const TheodorClient = require('theodor-sdk');

/**
 * Enhances error with user-friendly information
 * @param {Error} error - Original error
 * @returns {Error} - Enhanced error
 */
function enhanceError(error) {
  if (error.isTheodorError || error.isNetworkError || error.isRequestError) {
    // Already enhanced by the client
    return error;
  }
  
  // Add user-friendly message and categorization
  const enhancedError = new Error(`Theodor Service Error: ${error.message}`);
  enhancedError.originalError = error;
  
  if (error.message.includes('Cannot read audio file') || 
      error.message.includes('file format') ||
      error.message.includes('Invalid audio')) {
    enhancedError.code = 'INVALID_AUDIO';
    enhancedError.userMessage = 'The audio file could not be processed. Please check the format and try again.';
    enhancedError.statusCode = 400;
  } else if (error.message.includes('connection') || 
             error.message.includes('network') || 
             error.message.includes('timeout')) {
    enhancedError.code = 'CONNECTION_ERROR';
    enhancedError.userMessage = 'Connection to the analysis service failed. Please try again later.';
    enhancedError.statusCode = 502;
  } else {
    enhancedError.code = 'SERVICE_ERROR';
    enhancedError.userMessage = 'An error occurred while analyzing the audio.';
    enhancedError.statusCode = 500;
  }
  
  return enhancedError;
}

/**
 * Creates and returns a configured Theodor client instance
 * @returns {TheodorClient} - Configured Theodor client
 */
function getTheodorClient() {
  if (!process.env.THEODOR_API_KEY) {
    throw new Error('THEODOR_API_KEY environment variable is not set');
  }
  
  // For Lambda, disable WebSocket by default since we don't need real-time updates
  return new TheodorClient({
    apiKey: process.env.THEODOR_API_KEY,
    useWebSocket: false,
    debug: process.env.DEBUG === 'true'
  });
}

/**
 * Generates a standardized API response format
 * @param {number} statusCode - HTTP status code
 * @param {Object} body - Response body
 * @param {Object} [headers] - Additional headers
 * @returns {Object} - Formatted API Gateway response
 */
function formatResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
      ...headers
    },
    body: JSON.stringify(body)
  };
}

/**
 * Formats an error into a standardized API response
 * @param {Error} error - Error object
 * @returns {Object} - Formatted API Gateway error response
 */
function formatErrorResponse(error) {
  // Enhance the error with user-friendly information if needed
  const enhancedErr = error.isTheodorError || error.statusCode ? error : enhanceError(error);
  
  // Determine status code
  let statusCode = enhancedErr.statusCode || 500;
  if (enhancedErr.isTheodorError && enhancedErr.status) {
    statusCode = enhancedErr.status;
  }
  
  // Format the response body
  const responseBody = {
    error: enhancedErr.userMessage || enhancedErr.message,
    code: enhancedErr.code || 'UNKNOWN_ERROR'
  };
  
  // Add detailed error information in development mode
  if (process.env.DEBUG === 'true') {
    responseBody.details = enhancedErr.isTheodorError ? 
      enhancedErr.data : 
      (enhancedErr.originalError ? enhancedErr.originalError.message : enhancedErr.stack);
  }
  
  return formatResponse(statusCode, responseBody);
}

/**
 * Validates base64 audio data
 * @param {string} data - Base64 encoded audio data
 * @param {string} mimeType - MIME type of the audio
 * @returns {Object|null} - Validation error object or null if valid
 */
function validateAudioData(data, mimeType) {
  try {
    if (!data) {
      return { code: 'MISSING_DATA', message: 'Audio data is required' };
    }
    
    if (!mimeType) {
      return { code: 'MISSING_MIME_TYPE', message: 'MIME type is required' };
    }
    
    // Validate MIME type
    const validMimeTypes = ['audio/wav', 'audio/x-wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg'];
    if (!validMimeTypes.includes(mimeType)) {
      return { 
        code: 'INVALID_MIME_TYPE', 
        message: 'Unsupported audio format. Supported formats: WAV, MP3, OGG' 
      };
    }
    
    // Check if base64 is valid
    const buffer = Buffer.from(data, 'base64');
    
    // Check size (limit to 10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (buffer.length > MAX_SIZE) {
      return { 
        code: 'FILE_TOO_LARGE', 
        message: 'File size exceeds the maximum limit of 10MB' 
      };
    }
    
    return null;
  } catch (error) {
    return { 
      code: 'INVALID_BASE64', 
      message: 'Invalid base64 data',
      details: error.message
    };
  }
}

module.exports = {
  getTheodorClient,
  enhanceError,
  formatResponse,
  formatErrorResponse,
  validateAudioData
};