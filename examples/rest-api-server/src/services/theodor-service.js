const TheodorClient = require('theodor-sdk');

const config = require('../config');
const EventEmitter = require('events');

class TheodorService extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    this.reconnectTimeout = null;
    this.initializeClient();
  }
  
  /**
   * Initialize the Theodor client
   */
  initializeClient() {
    if (!config.theodorApiKey) {
      console.warn('THEODOR_API_KEY not set. Theodor service will not be available.');
      return;
    }
    
    try {
      this.client = new TheodorClient({
        apiKey: config.theodorApiKey,
        debug: config.isDevelopment
      });
      
      // Set up event listeners
      this.client.on('recording_classified', (data) => {
        console.log('Recording classified event received:', data.id);
        this.emit('recording_classified', data);
      });
      
      this.client.on('recording_created', (data) => {
        console.log('Recording created event received:', data.id);
        this.emit('recording_created', data);
      });
      
      this.client.on('recording_classification_failure', (data) => {
        console.error('Recording classification failure event received:', data.id);
        this.emit('recording_classification_failure', data);
      });
      
      this.client.on('websocket_error', (error) => {
        console.error('Theodor WebSocket error:', error);
        this.emit('websocket_error', error);
      });

      this.client.on('websocket_connected', () => {
        console.log('Theodor WebSocket connected');
        this.connectionAttempts = 0;
        this.emit('websocket_connected');
      });

      this.client.on('websocket_reconnected', () => {
        console.log('Theodor WebSocket reconnected');
        this.connectionAttempts = 0;
        this.emit('websocket_reconnected');
      });

      this.client.on('websocket_closed', (count) => {
        console.warn(`Theodor WebSocket closed (attempt ${count})`);
        this.emit('websocket_closed', count);
        
        // If the client's internal reconnection fails, we'll try to reinitialize
        if (count > 10) {
          this.handleServiceReconnection();
        }
      });

      console.log('Theodor service initialized successfully');
    } catch (error) {
      console.error('Error initializing Theodor client:', error);
      this.handleServiceReconnection();
    }
  }

  /**
   * Handle service reconnection
   * @private
   */
  handleServiceReconnection() {
    this.connectionAttempts++;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    if (this.connectionAttempts <= this.maxConnectionAttempts) {
      const delay = Math.min(30000, 1000 * Math.pow(2, this.connectionAttempts));
      console.log(`Attempting to reconnect Theodor service in ${delay}ms (attempt ${this.connectionAttempts})`);
      
      this.reconnectTimeout = setTimeout(() => {
        if (this.client) {
          this.client.close();
          this.client = null;
        }
        this.initializeClient();
      }, delay);
    } else {
      console.error(`Failed to reconnect to Theodor service after ${this.connectionAttempts} attempts`);
      this.emit('service_connection_failed');
    }
  }
  
  /**
   * Submit an audio file for analysis
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} - Analysis result
   */
  async analyzeRecording(options) {
    if (!this.client) {
      throw new Error('Theodor client not initialized');
    }
    
    try {
      const result = await this.client.analyzeRecording({
        filePath: options.filePath,
        site: options.site,
        examId: options.examId,
        waitForPrediction: false,
        enhanced: options.enhanced || false
      });
      
      // Emit event with additional metadata
      this.emit('analysis_submitted', {
        analysisId: options.analysisId,
        recordingId: result.id,
        site: options.site
      });
      
      return result;
    } catch (error) {
      this.handleAnalysisError(error, options);
      throw this.enhanceError(error);
    }
  }
  
  /**
   * Submit base64-encoded audio for analysis
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} - Analysis result
   */
  async analyzeBase64(options) {
    if (!this.client) {
      throw new Error('Theodor client not initialized');
    }
    
    try {
      const result = await this.client.analyzeBase64({
        data: options.data,
        mimeType: options.mimeType,
        size: options.size,
        site: options.site,
        examId: options.examId,
        waitForPrediction: false,
        enhanced: options.enhanced || false
      });
      
      // Emit event with additional metadata
      this.emit('analysis_submitted', {
        analysisId: options.analysisId,
        recordingId: result.id,
        site: options.site
      });
      
      return result;
    } catch (error) {
      this.handleAnalysisError(error, options);
      throw this.enhanceError(error);
    }
  }
  
  /**
   * Handle analysis error
   * @param {Error} error - Error object
   * @param {Object} options - Analysis options
   * @private
   */
  handleAnalysisError(error, options) {
    this.emit('analysis_error', {
      analysisId: options.analysisId,
      error: this.enhanceError(error)
    });
    
    // Check if we need to reinitialize the client
    if (error.isNetworkError) {
      console.warn('Network error occurred during analysis, checking connection...');
      
      // Try to ping the service - if it fails, we'll reinitialize
      this.pingService().catch(() => {
        this.handleServiceReconnection();
      });
    }
  }
  
  /**
   * Ping the service to check connection
   * @returns {Promise<boolean>} - True if connection is healthy
   * @private
   */
  async pingService() {
    if (!this.client) {
      return false;
    }
    
    try {
      // Use a simple API call to check if the service is responsive
      await this.client.getExams({ pageSize: 1 });
      return true;
    } catch (error) {
      console.error('Ping service failed:', error.message);
      return false;
    }
  }
  
  /**
   * Enhance error with additional context
   * @param {Error} error - Original error
   * @returns {Error} - Enhanced error
   * @private
   */
  enhanceError(error) {
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
    } else if (error.message.includes('connection') || 
               error.message.includes('network') || 
               error.message.includes('timeout')) {
      enhancedError.code = 'CONNECTION_ERROR';
      enhancedError.userMessage = 'Connection to the analysis service failed. Please try again later.';
    } else {
      enhancedError.code = 'SERVICE_ERROR';
      enhancedError.userMessage = 'An error occurred while analyzing the audio.';
    }
    
    return enhancedError;
  }
  
  /**
   * Get a recording by ID
   * @param {string} recordingId - Recording ID
   * @returns {Promise<Object>} - Recording object
   */
  async getRecording(recordingId) {
    if (!this.client) {
      throw new Error('Theodor client not initialized');
    }
    
    try {
      return await this.client.getRecording(recordingId);
    } catch (error) {
      // For 404 errors, return null instead of throwing
      if (error.status === 404) {
        return null;
      }
      throw this.enhanceError(error);
    }
  }
  
  /**
   * Wait for prediction results
   * @param {string} recordingId - Recording ID
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Object>} - Prediction results
   */
  async waitForPrediction(recordingId, timeout = 120000) {
    if (!this.client) {
      throw new Error('Theodor client not initialized');
    }
    
    try {
      return await this.client.waitForPrediction(recordingId, timeout);
    } catch (error) {
      throw this.enhanceError(error);
    }
  }
  
  /**
   * Close the client
   */
  close() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.client) {
      this.client.close();
      this.client = null;
    }
  }
}

// Create singleton instance
const theodorService = new TheodorService();

module.exports = {
  theodorService
};