const axios = require('axios');
const FormData = require('form-data');

/**
 * Simplified TheodorClient for AWS Lambda
 */
class TheodorClient {
  /**
   * Creates a new TheodorClient
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.baseURL = options.baseURL || 'https://theodor.ai';
    this.apiVersion = options.apiVersion || 'v4';
    this.apiKey = options.apiKey;
    this.debug = options.debug || false;
  }

  /**
   * Logs a message if debug is enabled
   * @param {string} message - The message to log
   * @param {any} data - Optional data to log
   */
  log(message, data) {
    if (this.debug) {
      if (data) {
        console.log(`Theodor SDK: ${message}`, data);
      } else {
        console.log(`Theodor SDK: ${message}`);
      }
    }
  }

  /**
   * Analyzes a base64-encoded audio file
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} - Analysis result
   */
  async analyzeBase64(options) {
    if (!this.apiKey) {
      throw new Error('API key is required');
    }

    const { data, mimeType, size, site = 'heart', enhanced = false, waitForPrediction = false } = options;

    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };

    const body = {
      data,
      mime_type: mimeType,
      size,
      site,
      a_dvc: false
    };

    if (enhanced) {
      body.enhanced = true;
    }

    try {
      this.log('Analyzing base64 audio', { mimeType, site, enhanced });
      
      const response = await axios.post(
        `${this.baseURL}/api/${this.apiVersion}/recordings/analyseBase64`,
        body,
        { headers }
      );

      this.log('Analysis submitted successfully', { id: response.data.id });

      if (waitForPrediction) {
        return this.waitForPrediction(response.data.id);
      }

      return response.data;
    } catch (error) {
      this.log('Error analyzing audio', error);
      throw this.formatError(error);
    }
  }

  /**
   * Gets recording details
   * @param {string} recordingId - Recording ID to fetch
   * @returns {Promise<Object>} - Recording details
   */
  async getRecording(recordingId) {
    if (!this.apiKey) {
      throw new Error('API key is required');
    }

    const headers = {
      'Authorization': `Bearer ${this.apiKey}`
    };

    try {
      this.log('Getting recording', { id: recordingId });
      
      const response = await axios.get(
        `${this.baseURL}/api/${this.apiVersion}/recordings/${recordingId}`,
        { headers }
      );

      this.log('Got recording details', { id: recordingId });
      
      return response.data;
    } catch (error) {
      this.log('Error getting recording', error);
      throw this.formatError(error);
    }
  }

  /**
   * Waits for prediction to complete
   * @param {string} recordingId - Recording ID to wait for
   * @param {number} timeout - Timeout in seconds
   * @returns {Promise<Object>} - Recording details
   */
  async waitForPrediction(recordingId, timeout = 120) {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds
    
    this.log('Waiting for prediction', { id: recordingId, timeout });

    while (Date.now() - startTime < timeout * 1000) {
      try {
        const recording = await this.getRecording(recordingId);
        
        // Check if prediction is complete
        if (recording.status === 'classified' || 
            recording.classification_status === 'classified' ||
            (recording.murmur && recording.murmur !== 'pending')) {
          return recording;
        }
        
        // Check for errors
        if (recording.status === 'error' || recording.classification_status === 'error') {
          const errorMessage = recording.error_message || recording.classification_error || 'Unknown error';
          throw new Error(`Classification failed: ${errorMessage}`);
        }
        
        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        // If the recording isn't found yet, keep waiting
        if (error.response && error.response.status === 404) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        }
        
        throw this.formatError(error);
      }
    }
    
    throw new Error('Prediction timeout');
  }

  /**
   * Formats an error response
   * @param {Error} error - Error to format
   * @returns {Error} - Formatted error
   */
  formatError(error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data || {};
      const message = data.message || data.detailed_error || data.error || error.message;
      
      const formattedError = new Error(message);
      formattedError.status = status;
      formattedError.data = data;
      formattedError.isTheodorError = true;
      
      return formattedError;
    }
    
    return error;
  }

  /**
   * Closes the client
   */
  close() {
    // No WebSocket in this version, so nothing to close
    this.log('Client closed');
  }
}

module.exports = TheodorClient; 