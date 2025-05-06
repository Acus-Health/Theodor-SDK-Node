// Load environment variables from .env file
require('dotenv').config();

const { 
  getTheodorClient, 
  formatResponse, 
  formatErrorResponse,
  validateAudioData
} = require('./utils/theodor-client');

/**
 * Validates the site parameter
 * @param {string} site - Recording site
 * @returns {string|null} - Error message or null if valid
 */
function validateSite(site) {
  const validSites = ['heart', 'lung', 'abdomen'];
  if (!site) {
    return null; // Will use default 'heart'
  }
  
  if (!validSites.includes(site)) {
    return `Invalid site. Must be one of: ${validSites.join(', ')}`;
  }
  
  return null;
}

/**
 * Lambda function to analyse an auscultation recording
 * @param {Object} event - API Gateway event
 * @returns {Object} - API Gateway response
 */
exports.analyse = async (event) => {
  let client = null;
  
  try {
    // Check if we have a request body
    if (!event.body) {
      return formatResponse(400, { 
        error: 'No request body provided',
        code: 'MISSING_REQUEST_BODY'
      });
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      return formatResponse(400, { 
        error: 'Invalid JSON in request body',
        code: 'INVALID_JSON'
      });
    }
    
    // Validate required fields
    if (!body.audioData || !body.mimeType) {
      return formatResponse(400, { 
        error: 'Audio data and MIME type are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Validate audio data
    const audioValidation = validateAudioData(body.audioData, body.mimeType);
    if (audioValidation) {
      return formatResponse(400, { 
        error: audioValidation.message,
        code: audioValidation.code,
        details: audioValidation.details
      });
    }
    
    // Validate site
    const siteError = validateSite(body.site);
    if (siteError) {
      return formatResponse(400, { 
        error: siteError,
        code: 'INVALID_SITE'
      });
    }

    // Get Theodor client
    client = getTheodorClient();

    // Submit base64 audio for analysis (do not wait for results in Lambda)
    const result = await client.analyzeBase64({
      data: body.audioData,
      mimeType: body.mimeType,
      size: Buffer.from(body.audioData, 'base64').length,
      site: body.site || 'heart',
      enhanced: !!body.enhanced,
      waitForPrediction: false
    });

    // Close the client (important for Lambda to avoid hanging connections)
    if (client) {
      client.close();
      client = null;
    }

    return formatResponse(202, { // Accepted
      message: 'Analysis submitted successfully',
      recordingId: result.id,
      status: 'submitted',
      estimatedProcessingTime: '30-60 seconds'
    });
  } catch (error) {
    console.error('Error analyzing audio recording:', error);
    
    // Close client if it exists
    if (client) {
      client.close();
    }
    
    return formatErrorResponse(error);
  }
};

/**
 * Lambda function to fetch analysis results
 * @param {Object} event - API Gateway event
 * @returns {Object} - API Gateway response
 */
exports.fetchResults = async (event) => {
  let client = null;
  
  try {
    // Check if we have a recording ID
    if (!event.pathParameters || !event.pathParameters.id) {
      return formatResponse(400, { 
        error: 'Recording ID is required',
        code: 'MISSING_RECORDING_ID'
      });
    }
    
    const recordingId = event.pathParameters.id;
    
    // Get Theodor client
    client = getTheodorClient();

    try {
      // Get the recording data
      const recording = await client.getRecording(recordingId);
      
      // Close the client
      if (client) {
        client.close();
        client = null;
      }
      
      return formatResponse(200, recording);
    } catch (error) {
      // Close client if it exists
      if (client) {
        client.close();
      }
      
      if (error.status === 404) {
        return formatResponse(404, {
          error: `Recording with ID ${recordingId} not found`,
          code: 'RECORDING_NOT_FOUND'
        });
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error fetching recording:', error);
    
    // Close client if it exists
    if (client) {
      client.close();
    }
    
    return formatErrorResponse(error);
  }
};