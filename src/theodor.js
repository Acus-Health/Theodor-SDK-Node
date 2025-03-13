/**
 * Theodor.ai Node.js SDK
 * Server-side client for interacting with Theodor.ai's body sound analysis API
 * @version 0.0.1
*/
const axios           = require('axios');
const FormData        = require('form-data');
const fs              = require('fs');
const os              = require('os');
const WebSocket       = require('ws');
const EventEmitter    = require('events');

// Constants
const DEFAULT_BASE_URL                   = 'https://theodor.ai';
const API_URL_SUFFIX                     = '/api/v4';  // Fixed: added leading slash
const DEFAULT_API_VERSION                = 'v4';
const WEBSOCKET_AUTHENTICATION_CHALLENGE = "authentication_challenge";
const MAX_WEBSOCKET_FAILS                = 7;
const MIN_WEBSOCKET_RETRY_TIME           = 3000; // 3 sec
const MAX_WEBSOCKET_RETRY_TIME           = 300000; // 5 mins
const PREDICTION_POLL_INTERVAL           = 2000; // 2 seconds
const MAX_PREDICTION_POLLS               = 60; // 2 minutes max wait time
const PING_INTERVAL                      = 30000; // 30 seconds for heartbeat

const WebSocketEvents = {
  RECORDING_CLASSIFIED:             'audio_recording_classified',
  RECORDING_DELETED:                'audio_recording_deleted',
  RECORDING_UPDATED:                'audio_recording_updated',
  RECORDING_UPLOADED:               'audio_recording_uploaded',
  RECORDING_CREATED:                'audio_recording_created',
  RECORDING_CLASSIFICATION_FAILURE: 'audio_recording_classification_failure',
  SPECTROGRAM_GENERATED:            'audio_recording_spec_created',
  RECORDING_ENHANCED:               'audio_recording_enhanced',
  RECORDING_ENHANCEMENT_FAILED:     'audio_recording_enhancement_failed',
  RECORDING_ENHANCEMENT_STARTED:    'audio_recording_enhancement_started',
  RECORDING_ENHANCEMENT_COMPLETE:   'audio_recording_denoised',
  PROCESSING_QUEUE_STATE_CHANGED:   'processing_queue_state_changed',
};

/**
 * Theodor API client for Node.js
 */
class TheodorClient extends EventEmitter {
  /**
   * Creates a new Theodor API client
   * @param {Object} options - Client options
   * @param {string} [options.apiKey] - API key for authentication
   * @param {string} [options.baseUrl=DEFAULT_BASE_URL] - Base URL for the API
   * @param {string} [options.apiVersion=DEFAULT_API_VERSION] - API version
   * @param {boolean} [options.debug=false] - Enable debug logging
   * @param {boolean} [options.useWebSocket=true] - Use WebSocket for real-time updates
   */
  constructor(options = {}) {
    super();
    // Prioritize THEODOR_API_KEY from environment
    this.apiKey             = options.apiKey || process.env.THEODOR_API_KEY || '';
    this.baseUrl            = options.baseUrl || DEFAULT_BASE_URL;
    this.apiVersion         = options.apiVersion || DEFAULT_API_VERSION;
    this.apiUrl             = `${this.baseUrl}/api/${this.apiVersion}`;
    this.debug              = options.debug || false;
    this.useWebSocket       = options.useWebSocket !== false;
    this.pendingPredictions = new Map();
    
    // Initialize axios instance with default config
    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent':       `TheodorNodeSDK/1.0.0 Node/${process.version} ${os.platform()}/${os.release()}`
      }
    });
    
    if (this.apiKey) {
      this.setToken(this.apiKey);
      
      if (this.useWebSocket) {
        this._initWebSocket();
      }
    }
  }
  
  /**
   * Logs debug messages if debug mode is enabled
   * @param {string} message - Debug message
   * @param {*} data - Optional data to log
   * @private
   */
  _log(message, data) {
    if (this.debug) {
      if (data) {
        console.log(`Theodor SDK: ${message}`, data);
      } else {
        console.log(`Theodor SDK: ${message}`);
      }
    }
  }

  /**
   * Initializes the WebSocket connection
   * @private
   */
  _initWebSocket() {
    if (!this.apiKey) {
      this._log('Cannot initialize WebSocket without authentication token');
      return;
    }
    
    this.ws = new WebSocketClient();
    this.ws.setUrlFromServerAdress(this.baseUrl);
    this.ws.setAuthToken(this.apiKey);
    
    this.ws.setEventCallback((msg) => {
      this._log('WebSocket event received', msg);
      
      switch (msg.event) {
        case WebSocketEvents.RECORDING_CLASSIFIED:
          this._log('Recording classified', msg.data);
          const audioId = msg.data.audio_id || msg.data.id;
          if (this.pendingPredictions.has(audioId)) {
            const { resolve } = this.pendingPredictions.get(audioId);
            this.pendingPredictions.delete(audioId);
            resolve(msg.data);
          }
          this.emit('recording_classified', msg.data);
          break;
          
        case WebSocketEvents.RECORDING_CREATED:
          this._log('Recording created', msg.data);
          this.emit('recording_created', msg.data);
          break;
          
        case WebSocketEvents.RECORDING_CLASSIFICATION_FAILURE:
          this._log('Recording classification failed', msg.data);
          const failedId = msg.data.audio_id || msg.data.id;
          if (this.pendingPredictions.has(failedId)) {
            const { reject } = this.pendingPredictions.get(failedId);
            this.pendingPredictions.delete(failedId);
            reject(new Error(`Classification failed for recording ${failedId}: ${msg.data.message || 'Unknown error'}`));
          }
          this.emit('recording_classification_failure', msg.data);
          break;
          
        case WebSocketEvents.SPECTROGRAM_GENERATED:
          this._log('Spectrogram generated', msg.data);
          this.emit('spectrogram_generated', msg.data);
          break;
          
        case WebSocketEvents.RECORDING_ENHANCED:
        case WebSocketEvents.RECORDING_ENHANCEMENT_COMPLETE:
          this._log('Recording enhanced', msg.data);
          this.emit('recording_enhanced', msg.data);
          break;
          
        case WebSocketEvents.PROCESSING_QUEUE_STATE_CHANGED:
          this._log('Processing queue state changed', msg.data);
          this.emit('processing_queue_state_changed', msg.data);
          break;
          
        default:
          this._log(`Unhandled WebSocket event: ${msg.event}`, msg.data);
          this.emit(msg.event, msg.data);
      }
    });
    
    this.ws.setFirstConnectCallback(() => {
      this._log('WebSocket connected');
      this.emit('websocket_connected');
    });
    
    this.ws.setReconnectCallback(() => {
      this._log('WebSocket reconnected');
      this.emit('websocket_reconnected');
    });
    
    this.ws.setErrorCallback((error) => {
      this._log('WebSocket error', error);
      this.emit('websocket_error', error);
    });
    
    this.ws.setCloseCallback((count) => {
      this._log(`WebSocket closed (attempt ${count})`);
      this.emit('websocket_closed', count);
    });
    
    this.ws.initialize();
  }
  
  /**
   * Handles API errors
   * @param {Error} error - Error object
   * @private
   * @throws {Error} - Rethrows the error with additional context
   */
  _handleError(error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const errorData    = error.response.data;
      const errorMessage = errorData.message || errorData.detailed_error || error.message;
      
      this._log('API Error', {
        status: error.response.status,
        data:   errorData
      });
      
      const enhancedError     = new Error(`Theodor API Error (${error.response.status}): ${errorMessage}`);
      enhancedError.status    = error.response.status;
      enhancedError.data      = errorData;
      throw enhancedError;
    } else if (error.request) {
      // The request was made but no response was received
      this._log('Network Error', error.request);
      throw new Error(`Theodor API Network Error: ${error.message}`);
    } else {
      // Something happened in setting up the request that triggered an Error
      this._log('Request Error', error.message);
      throw new Error(`Theodor API Request Error: ${error.message}`);
    }
  }
  
  /**
   * Sets the authentication token
   * @param {string} token - Authentication token
   */
  setToken(token) {
    this.apiKey = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    if (this.useWebSocket && this.ws) {
      this.ws.setAuthToken(token);
    } else if (this.useWebSocket) {
      this._initWebSocket();
    }
  }
  
  /**
   * Authenticates with username and password
   * @param {string} loginId - Username or email
   * @param {string} password - Password
   * @returns {Promise<Object>} - Authentication response
   */
  async login(loginId, password) {
    try {
      const response = await this.client.post('/users/login', {
        login_id: loginId,
        password: password
      });
      
      const authData = response.data;
      this.setToken(authData.token);
      
      return authData;
    } catch (error) {
      this._handleError(error);
    }
  }


  /**
   * Submits an audio file for analysis
   * @param {Object} options - Analysis options
   * @param {string} options.filePath - Path to the audio file
   * @param {string} options.site - Recording site ('heart', 'lung', or 'abdomen')
   * @param {string} [options.examId] - Exam ID to associate with the recording
   * @param {boolean} [options.waitForPrediction=false] - Whether to wait for prediction results
   * @param {number} [options.timeout=120000] - Timeout in milliseconds for waiting for prediction
   * @param {boolean} [options.enhanced=false] - Whether to request enhanced audio processing
   * @returns {Promise<Object>} - Recording object or prediction results
   */
  async analyzeRecording(options) {
    if (!options.filePath) {
      throw new Error('File path is required');
    }
    
    if (!options.site) {
      throw new Error('Recording site is required');
    }
    
    if (!['heart', 'lung', 'abdomen'].includes(options.site)) {
      throw new Error('Invalid recording site. Must be one of: heart, lung, abdomen');
    }
    
    try {
      // Create form data
      const form = new FormData();
      form.append('upload_file', fs.createReadStream(options.filePath));
      form.append('site', options.site);
      
      if (options.examId) {
        form.append('exam_id', options.examId);
      }

      
      // Submit the recording
      const response = await this.client.post('/recordings/analyse', form, {
        headers: {
          ...form.getHeaders()
        }
      });
      
      const recording = response.data;
      
      // If not waiting for prediction, return the recording object
      if (!options.waitForPrediction) {
        return recording;
      }
      
      // Wait for prediction results
      return this.waitForPrediction(recording.id, options.timeout);
    } catch (error) {
      this._handleError(error);
    }
  }
  
  /**
   * Submits base64-encoded audio data for analysis
   * @param {Object} options - Analysis options
   * @param {string} options.data - Base64-encoded audio data
   * @param {string} options.mimeType - MIME type of the audio data
   * @param {number} options.size - Size of the audio data in bytes
   * @param {string} options.site - Recording site ('heart', 'lung', or 'abdomen')
   * @param {string} [options.examId] - Exam ID to associate with the recording
   * @param {boolean} [options.enhanced=false] - Whether to request enhanced audio processing
   * @param {boolean} [options.waitForPrediction=false] - Whether to wait for prediction results
   * @param {number} [options.timeout=120000] - Timeout in milliseconds for waiting for prediction
   * @returns {Promise<Object>} - Recording object or prediction results
   */
  async analyzeBase64(options) {
    if (!options.data) {
      throw new Error('Base64 data is required');
    }
    
    if (!options.mimeType) {
      throw new Error('MIME type is required');
    }
    
    if (!options.size) {
      throw new Error('Size is required');
    }
    
    if (!options.site) {
      throw new Error('Recording site is required');
    }
    
    if (!['heart', 'lung', 'abdomen'].includes(options.site)) {
      throw new Error('Invalid recording site. Must be one of: heart, lung, abdomen');
    }
    
    try {
      const payload = {
        data:       options.data,
        mime_type:  options.mimeType,
        size:       options.size,
        site:       options.site,
        a_dvc:      false
      };
      
      if (options.examId) {
        payload.exam_id = options.examId;
      }
      
      if (options.enhanced) {
        payload.enhanced = true;
      }
      
      const response = await this.client.post('/recordings/analyseBase64', payload);
      
      const recording = response.data;
      
      // If not waiting for prediction, return the recording object
      if (!options.waitForPrediction) {
        return recording;
      }
      
      // Wait for prediction results
      return this.waitForPrediction(recording.id, options.timeout);
    } catch (error) {
      this._handleError(error);
    }
  }
  
  /**
   * Waits for prediction results for a recording
   * @param {string} recordingId - Recording ID
   * @param {number} [timeout=120000] - Timeout in milliseconds
   * @returns {Promise<Object>} - Prediction results
   */
  waitForPrediction(recordingId, timeout = 120000) {
    return new Promise((resolve, reject) => {
      // If using WebSocket, register for updates
      if (this.useWebSocket && this.ws) {
        const timeoutId = setTimeout(() => {
          if (this.pendingPredictions.has(recordingId)) {
            this.pendingPredictions.delete(recordingId);
            reject(new Error(`Prediction timeout for recording ${recordingId}`));
          }
        }, timeout);
        
        this.pendingPredictions.set(recordingId, { resolve, reject, timeoutId });
        
        // Also start polling as a fallback
        this._pollForPrediction(recordingId, 0, Math.floor(timeout / PREDICTION_POLL_INTERVAL))
          .then(result => {
            if (this.pendingPredictions.has(recordingId)) {
              const { timeoutId } = this.pendingPredictions.get(recordingId);
              clearTimeout(timeoutId);
              this.pendingPredictions.delete(recordingId);
              resolve(result);
            }
          })
          .catch(error => {
            if (this.pendingPredictions.has(recordingId)) {
              const { timeoutId } = this.pendingPredictions.get(recordingId);
              clearTimeout(timeoutId);
              this.pendingPredictions.delete(recordingId);
              reject(error);
            }
          });
      } else {
        // If not using WebSocket, just poll
        this._pollForPrediction(recordingId, 0, Math.floor(timeout / PREDICTION_POLL_INTERVAL))
          .then(resolve)
          .catch(reject);
      }
    });
  }
  
  /**
   * Polls for prediction results
   * @param {string} recordingId - Recording ID
   * @param {number} attempt - Current attempt number
   * @param {number} maxAttempts - Maximum number of attempts
   * @returns {Promise<Object>} - Prediction results
   * @private
   */
  async _pollForPrediction(recordingId, attempt, maxAttempts) {
    if (attempt >= maxAttempts) {
      throw new Error(`Prediction timeout for recording ${recordingId} after ${attempt} attempts`);
    }
    
    try {
      const recording = await this.getRecording(recordingId);
      
      // Check if prediction is complete
      if (recording.murmur && recording.rhythm) {
        if (recording.murmur !== "pending" && recording.rhythm !== "pending") {
          return recording;
        }
      }

      if (recording.murmur === "normal" || recording.murmur === "murmur") {
        return recording;
      }
      
      // Wait and try again
      await new Promise(resolve => setTimeout(resolve, PREDICTION_POLL_INTERVAL));
      return this._pollForPrediction(recordingId, attempt + 1, maxAttempts);
    } catch (error) {
      if (error.status === 404) {
        // Recording not found yet, wait and try again
        await new Promise(resolve => setTimeout(resolve, PREDICTION_POLL_INTERVAL));
        return this._pollForPrediction(recordingId, attempt + 1, maxAttempts);
      }
      
      throw error;
    }
  }
  
  /**
   * Gets a recording by ID
   * @param {string} recordingId - Recording ID
   * @returns {Promise<Object>} - Recording object
   */
  async getRecording(recordingId) {
    try {
      const response = await this.client.get(`/recordings/${recordingId}`);
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }
  
  /**
   * Gets a list of exams
   * @param {Object} [options] - Query options
   * @param {number} [options.page=0] - Page number
   * @param {number} [options.pageSize=100] - Page size
   * @param {string} [options.orderBy='created_at'] - Order by field
   * @param {number} [options.orderDirection=0] - Order direction (0: desc, 1: asc)
   * @returns {Promise<Object>} - Exams response
   */
  async getExams(options = {}) {
    try {
      const params = {
        page:            options.page || 0,
        page_size:       options.pageSize || 100,
        order_by:        options.orderBy || 'created_at',
        order_direction: options.orderDirection || 0
      };
      
      const response = await this.client.get('/exams', { params });
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }
  
  /**
   * Gets an exam by ID
   * @param {string} examId - Exam ID
   * @returns {Promise<Object>} - Exam object
   */
  async getExam(examId) {
    try {
      const response = await this.client.get(`/exams/${examId}`);
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }
  
  /**
   * Creates a new exam
   * @param {Object} examData - Exam data
   * @returns {Promise<Object>} - Created exam
   */
  async createExam(examData) {
    try {
      const response = await this.client.post('/exams', examData);
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }
  
  /**
   * Closes the client and any open connections
   */
  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // Clear any pending predictions
    for (const [recordingId, { timeoutId, reject }] of this.pendingPredictions.entries()) {
      clearTimeout(timeoutId);
      reject(new Error('Client closed'));
      this.pendingPredictions.delete(recordingId);
    }
  }
}

/**
 * WebSocket client for real-time communication
 */
class WebSocketClient {
  constructor() {
    this.Url              = null;
    this.ApiUrl           = null;
    this.ConnectUrl       = null;
    this.AuthToken        = null;
    this.responseSequence = 1;
    this.serverSequence   = 0;
    this.protocol         = 'ws://';
    this.connectFailCount = 0;
    this.connectionId     = '';
    this.manuallyClosed   = false;
    this.Conn             = null;
    this.connectionUrl    = null;
    this.pingInterval     = null; // Added for ping mechanism
    
    // Callbacks
    this.eventCallback          = null;
    this.responseCallbacks      = {};
    this.firstConnectCallback   = null;
    this.reconnectCallback      = null;
    this.missedEventCallback    = null;
    this.errorCallback          = null;
    this.closeCallback          = null;
  }
  
  setUrlFromServerAdress(url) {
    let wsProtocol;
    
    // Convert http/https to ws/wss
    if (url.startsWith("http://")) {
      wsProtocol = "ws://";
      url = url.replace("http://", "");
    } else if (url.startsWith("https://")) {
      wsProtocol = "wss://";
      url = url.replace("https://", "");
    } else {
      console.error("WebSocketClient. setUrlFromServerAdress. Unknown protocol", url);
      return;
    }
    
    // Remove trailing slash if present
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    
    // Build the base URL
    const baseUrl = `${wsProtocol}${url}`;
    
    // Build API URL with correct path formatting
    let apiSuffix = API_URL_SUFFIX;
    if (!apiSuffix.startsWith('/')) {
      apiSuffix = '/' + apiSuffix;
    }
    if (apiSuffix.endsWith('/')) {
      apiSuffix = apiSuffix.slice(0, -1);
    }
    
    this.Url = baseUrl;
    this.ApiUrl = baseUrl + apiSuffix;
    this.ConnectUrl = baseUrl + apiSuffix + "/websocket";
    this.connectionUrl = this.ConnectUrl;
    
    console.log("WebSocketClient. setUrl", this.Url, this.ApiUrl, this.ConnectUrl);
  }


  setUrl(url) {
    // Ensure the URL doesn't end with a slash
    let baseUrl = url;
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    const urlObj = new URL(baseUrl);
    urlObj.port = '';
    
    // Get the cleaned base URL without trailing slash
    baseUrl = urlObj.toString();
    
    // Make sure API_URL_SUFFIX starts with a slash but doesn't end with one
    let apiSuffix = API_URL_SUFFIX;
    if (!apiSuffix.startsWith('/')) {
      apiSuffix = '/' + apiSuffix;
    }
    if (apiSuffix.endsWith('/')) {
      apiSuffix = apiSuffix.slice(0, -1);
    }
    
    this.Url = baseUrl;
    this.ApiUrl = baseUrl + apiSuffix;
    this.ConnectUrl = baseUrl + apiSuffix + "/websocket";
    this.connectionUrl = this.ConnectUrl;
    
    console.log("WebSocketClient. setUrl", this.Url, this.ApiUrl, this.ConnectUrl);
  }
  
  setAuthToken(token) {
    this.AuthToken = token;
  }
  
  initialize(connectionUrl = this.connectionUrl, AuthToken = this.AuthToken) {
    if (this.Conn) {
      return;
    }
    
    if (connectionUrl == null) {
      console.log('websocket must have connection url');
      return;
    }
    
    if (this.connectFailCount === 0) {
      console.log('websocket connecting to ' + connectionUrl);
    }
    
    this.manuallyClosed = false;
    
    // Use a properly formatted URL for the WebSocket connection
    const wsUrl = new URL(connectionUrl);
    // Add query parameters
    wsUrl.searchParams.append('connection_id', this.connectionId);
    wsUrl.searchParams.append('sequence_number', this.serverSequence);
    
    // Create WebSocket with properly formatted URL
    this.Conn = new WebSocket(wsUrl.toString(), {
      headers: AuthToken ? { 'Authorization': `Bearer ${AuthToken}` } : {}
    });

    this.connectionUrl = connectionUrl;
    
    this.Conn.onopen = () => {
      console.log('WebSocket connection established');
      
      if (this.connectFailCount > 0) {
        console.log('websocket re-established connection');
      }
      
      // Send authentication challenge
      if (AuthToken) {
        console.log("Sending authentication_challenge message to WebSocket");
        this.sendMessage(WEBSOCKET_AUTHENTICATION_CHALLENGE, { "token": AuthToken });
      }
      
      // Start ping mechanism
      this.startPingInterval();
      
      if (this.connectFailCount > 0) {
        if (this.reconnectCallback) {
          this.reconnectCallback();
        }
      } else if (this.firstConnectCallback) {
        this.firstConnectCallback();
      }
      
      this.connectFailCount = 0;
    };
    
    this.Conn.onclose = (evt) => {
      console.log("WebSocketClosed!", evt);
      
      // Clear ping interval
      this.stopPingInterval();
      
      this.Conn = null;
      
      if (this.connectFailCount === 0) {
        console.log('websocket closed');
      }
      
      this.connectFailCount = this.connectFailCount + 1;
      
      if (this.closeCallback) {
        this.closeCallback(this.connectFailCount);
      }
      
      let retryTime = MIN_WEBSOCKET_RETRY_TIME;
      
      if (this.connectFailCount > MAX_WEBSOCKET_FAILS) {
        retryTime = MIN_WEBSOCKET_RETRY_TIME * this.connectFailCount * this.connectFailCount;
        if (retryTime > MAX_WEBSOCKET_RETRY_TIME) {
          retryTime = MAX_WEBSOCKET_RETRY_TIME;
        }
        
        console.log('Please check connection, Server unreachable. If issue persists, ask administrator to check WebSocket port.');
      }
      
      if (!this.manuallyClosed) {
        setTimeout(
          () => {
            this.initialize(connectionUrl, AuthToken);
          },
          retryTime
        );
      }
    };
    
    this.Conn.onerror = (evt) => {
      if (this.connectFailCount <= 1) {
        console.log('websocket error');
        console.log(evt);
      }
      
      if (this.errorCallback) {
        this.errorCallback(evt);
      }
    };
    
    this.Conn.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        console.log("WebSocket received message:", msg);

        this.handleMessage(msg);
        
        if (msg.seq_reply) {
          if (msg.error) {
            console.error("WebSocket error response:", msg);
          }
          
          if (this.responseCallbacks[msg.seq_reply]) {
            this.responseCallbacks[msg.seq_reply](msg);
            delete this.responseCallbacks[msg.seq_reply];
          }
        } else if (this.eventCallback) {
          this.serverSequence = msg.seq + 1;
          this.eventCallback(msg);
        }
      } catch (error) {
        console.error("Error parsing websocket message:", error);
      }
    };
  }
  
  // Start ping interval to keep connection alive
  startPingInterval() {
    this.stopPingInterval();
    
    this.pingInterval = setInterval(() => {
      if (this.Conn && this.Conn.readyState === WebSocket.OPEN) {
        console.log("Sending WebSocket ping");
        this.sendMessage("ping", { timestamp: Date.now() });
      }
    }, PING_INTERVAL);
  }
  
  // Stop ping interval
  stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  
  sendMessage(action, data, responseCallback) {
    const msg = {
      action: action,
      data:   data,
      seq:    this.responseSequence++,
      id:     this.responseSequence,
    };
    
    if (responseCallback) {
      this.responseCallbacks[msg.seq] = responseCallback;
    }
    
    if (this.Conn && this.Conn.readyState === WebSocket.OPEN) {
      try {
        this.Conn.send(JSON.stringify(msg));
        console.log(`Sent ${action} message to WebSocket`);
      } catch (error) {
        console.error("Error sending WebSocket message:", error);
        
        // Reconnect if there was an error sending
        this.Conn = null;
        this.initialize();
      }
    } else if (!this.Conn || this.Conn.readyState === WebSocket.CLOSED) {
      console.log("WebSocket not connected, skipping message", msg);
      this.Conn = null;
      this.initialize();
    }
  }
  
  handleMessage(msg) {
    console.log("WS. handleMessage", msg);
  }
  
  close() {
    this.manuallyClosed = true;
    this.connectFailCount = 0;
    this.responseSequence = 1;
    
    // Clear ping interval
    this.stopPingInterval();
    
    if (this.Conn && this.Conn.readyState === WebSocket.OPEN) {
      this.Conn.onclose = () => {};
      this.Conn.close();
      this.Conn = null;
      console.log('websocket closed');
    }
  }
  
  setEventCallback(callback) {
    this.eventCallback = callback;
  }
  
  setFirstConnectCallback(callback) {
    this.firstConnectCallback = callback;
  }
  
  setReconnectCallback(callback) {
    this.reconnectCallback = callback;
  }
  
  setMissedEventCallback(callback) {
    this.missedEventCallback = callback;
  }
  
  setErrorCallback(callback) {
    this.errorCallback = callback;
  }
  
  setCloseCallback(callback) {
    this.closeCallback = callback;
  }
}

// Export the client
module.exports = TheodorClient;