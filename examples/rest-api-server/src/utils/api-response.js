/**
 * Standard API response formatter
 */
class ApiResponse {
	/**
	 * Send a success response (200 OK)
	 * @param {Object} res - Express response object
	 * @param {*} data - Response data
	 * @param {string} message - Success message
	 * @returns {Object} Express response
	 */
	static success(res, data, message = 'Success') {
	  return res.status(200).json({
		status: 'success',
		message,
		data
	  });
	}
	
	/**
	 * Send a created response (201 Created)
	 * @param {Object} res - Express response object
	 * @param {*} data - Response data
	 * @param {string} message - Success message
	 * @returns {Object} Express response
	 */
	static created(res, data, message = 'Resource created') {
	  return res.status(201).json({
		status: 'success',
		message,
		data
	  });
	}
	
	/**
	 * Send a bad request error response (400 Bad Request)
	 * @param {Object} res - Express response object
	 * @param {string} message - Error message
	 * @returns {Object} Express response
	 */
	static badRequest(res, message = 'Bad request') {
	  return res.status(400).json({
		status: 'error',
		message
	  });
	}
	
	/**
	 * Send an unauthorized error response (401 Unauthorized)
	 * @param {Object} res - Express response object
	 * @param {string} message - Error message
	 * @returns {Object} Express response
	 */
	static unauthorized(res, message = 'Unauthorized') {
	  return res.status(401).json({
		status: 'error',
		message
	  });
	}
	
	/**
	 * Send a forbidden error response (403 Forbidden)
	 * @param {Object} res - Express response object
	 * @param {string} message - Error message
	 * @returns {Object} Express response
	 */
	static forbidden(res, message = 'Forbidden') {
	  return res.status(403).json({
		status: 'error',
		message
	  });
	}
	
	/**
	 * Send a not found error response (404 Not Found)
	 * @param {Object} res - Express response object
	 * @param {string} message - Error message
	 * @returns {Object} Express response
	 */
	static notFound(res, message = 'Resource not found') {
	  return res.status(404).json({
		status: 'error',
		message
	  });
	}
	
	/**
	 * Send a server error response (500 Internal Server Error)
	 * @param {Object} res - Express response object
	 * @param {string} message - Error message
	 * @returns {Object} Express response
	 */
	static serverError(res, message = 'Internal server error') {
	  return res.status(500).json({
		status: 'error',
		message
	  });
	}
  }
  
  module.exports = {
	ApiResponse
  };