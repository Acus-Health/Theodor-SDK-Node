const TheodorClient = require('theodor-sdk');

const config = require('../config');
const EventEmitter = require('events');

class TheodorService extends EventEmitter {
  constructor() {
    super();
    this.client = null;
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
    
    this.client = new TheodorClient({
      apiKey: config.theodorApiKey,
      debug: config.isDevelopment
    });
    
    // Set up event listeners
    this.client.on('recording_classified', (data) => {
      this.emit('recording_classified', data);
    });
    
    this.client.on('recording_created', (data) => {
      this.emit('recording_created', data);
    });
    
    this.client.on('websocket_error', (error) => {
      console.error('Theodor WebSocket error:', error);
    });
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
    
    const result = await this.client.analyzeRecording({
      filePath: options.filePath,
      site: options.site,
      examId: options.examId,
      waitForPrediction: false
    });
    
    // Emit event with additional metadata
    this.emit('analysis_submitted', {
      analysisId: options.analysisId,
      recordingId: result.id,
      site: options.site
    });
    
    return result;
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
    
    const result = await this.client.analyzeBase64({
      data: options.data,
      mimeType: options.mimeType,
      size: options.size,
      site: options.site,
      examId: options.examId,
      waitForPrediction: false
    });
    
    // Emit event with additional metadata
    this.emit('analysis_submitted', {
      analysisId: options.analysisId,
      recordingId: result.id,
      site: options.site
    });
    
    return result;
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
    
    return this.client.getRecording(recordingId);
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
    
    return this.client.waitForPrediction(recordingId, timeout);
  }
  
  /**
   * Close the client
   */
  close() {
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