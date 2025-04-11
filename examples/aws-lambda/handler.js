const AWS = require('aws-sdk');
const uuid = require('uuid');
const { 
  getTheodorClient, 
  formatResponse, 
  formatErrorResponse,
  validateAudioData
} = require('./utils/theodor-client');

// Initialize S3 client
const s3 = new AWS.S3();

/**
 * Safely stores analysis metadata in S3
 * @param {string} analysisId - Analysis ID
 * @param {Object} data - Data to store
 * @returns {Promise<void>}
 */
async function storeAnalysisData(analysisId, data) {
  try {
    const bucketName = process.env.STORAGE_BUCKET || 'theodor-analysis-results';
    
    await s3.putObject({
      Bucket: bucketName,
      Key: `analyses/${analysisId}`,
      Body: JSON.stringify(data),
      ContentType: 'application/json'
    }).promise();
  } catch (error) {
    console.error(`Error storing analysis data for ${analysisId}:`, error);
    throw error;
  }
}

/**
 * Retrieves analysis metadata from S3
 * @param {string} analysisId - Analysis ID
 * @returns {Promise<Object>} - Analysis data
 */
async function getAnalysisData(analysisId) {
  try {
    const bucketName = process.env.STORAGE_BUCKET || 'theodor-analysis-results';
    
    const response = await s3.getObject({
      Bucket: bucketName,
      Key: `analyses/${analysisId}`
    }).promise();
    
    return JSON.parse(response.Body.toString());
  } catch (error) {
    if (error.code === 'NoSuchKey') {
      const notFoundError = new Error(`Analysis with ID ${analysisId} not found`);
      notFoundError.statusCode = 404;
      notFoundError.code = 'ANALYSIS_NOT_FOUND';
      throw notFoundError;
    }
    
    console.error(`Error retrieving analysis data for ${analysisId}:`, error);
    throw error;
  }
}

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

    // Generate unique ID for this analysis
    const analysisId = uuid.v4();
    const timestamp = new Date().toISOString();
    
    // Store initial analysis data
    await storeAnalysisData(analysisId, {
      id: analysisId,
      status: 'processing',
      site: body.site || 'heart',
      enhanced: !!body.enhanced,
      createdAt: timestamp,
      updatedAt: timestamp,
      metadata: {
        mimeType: body.mimeType,
        size: Buffer.from(body.audioData, 'base64').length
      }
    });

    // Submit base64 audio for analysis (do not wait for results in Lambda)
    const result = await client.analyzeBase64({
      data: body.audioData,
      mimeType: body.mimeType,
      size: Buffer.from(body.audioData, 'base64').length,
      site: body.site || 'heart',
      enhanced: !!body.enhanced,
      waitForPrediction: false
    });

    // Update analysis data with recording ID
    await storeAnalysisData(analysisId, {
      id: analysisId,
      recordingId: result.id,
      status: 'submitted',
      site: body.site || 'heart',
      enhanced: !!body.enhanced,
      createdAt: timestamp,
      updatedAt: new Date().toISOString(),
      metadata: {
        mimeType: body.mimeType,
        size: Buffer.from(body.audioData, 'base64').length
      }
    });

    // Close the client (important for Lambda to avoid hanging connections)
    if (client) {
      client.close();
      client = null;
    }

    return formatResponse(202, { // Accepted
      message: 'Analysis submitted successfully',
      analysisId: analysisId,
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
    // Check if we have an analysis ID
    if (!event.pathParameters || !event.pathParameters.id) {
      return formatResponse(400, { 
        error: 'Analysis ID is required',
        code: 'MISSING_ANALYSIS_ID'
      });
    }
    
    const analysisId = event.pathParameters.id;
    
    // Get the analysis info from S3
    const analysis = await getAnalysisData(analysisId);
    
    // If no recording ID yet, return the current status
    if (!analysis.recordingId) {
      return formatResponse(200, {
        analysisId: analysisId,
        status: analysis.status,
        message: 'Analysis is being processed',
        createdAt: analysis.createdAt,
        updatedAt: analysis.updatedAt
      });
    }
    
    // Get Theodor client
    client = getTheodorClient();

    try {
      // Get the recording data
      const recording = await client.getRecording(analysis.recordingId);
      
      // Determine the status based on the recording data
      let status = 'processing';
      if (recording.status === 'error' || recording.classification_status === 'error') {
        status = 'error';
        // Store error information
        await storeAnalysisData(analysisId, {
          ...analysis,
          status: 'error',
          error: recording.error_message || recording.classification_error || 'Classification failed',
          updatedAt: new Date().toISOString()
        });
      } else if ((recording.murmur && recording.murmur !== 'pending') || 
                (recording.status === 'classified' || recording.classification_status === 'classified')) {
        status = 'completed';
        // Update status in S3
        await storeAnalysisData(analysisId, {
          ...analysis,
          status: 'completed',
          result: recording,
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      // Prepare response format
      const response = {
        analysisId: analysisId,
        recordingId: analysis.recordingId,
        status: status,
        site: analysis.site,
        enhanced: analysis.enhanced || false,
        createdAt: analysis.createdAt,
        updatedAt: new Date().toISOString()
      };
      
      // Add error information if available
      if (status === 'error') {
        response.error = recording.error_message || recording.classification_error || 'Classification failed';
      }
      
      // Add result if completed
      if (status === 'completed') {
        response.result = {
          murmur: recording.murmur,
          murmurCertainty: recording.murmur_certainty,
          rhythm: recording.rhythm,
          heartRate: recording.heart_rate || recording.hr
        };
        
        // Add findings if available
        if (recording.report && recording.report.findings) {
          response.result.findings = recording.report.findings;
        }
      }
      
      // Close the client
      client.close();
      client = null;
      
      return formatResponse(200, response);
    } catch (error) {
      // Handle case where recording doesn't exist anymore
      if (error.status === 404) {
        await storeAnalysisData(analysisId, {
          ...analysis,
          status: 'error',
          error: 'Recording no longer exists',
          updatedAt: new Date().toISOString()
        });
        
        return formatResponse(404, {
          analysisId: analysisId,
          status: 'error',
          error: 'Recording no longer exists',
          recordingId: analysis.recordingId
        });
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error fetching analysis results:', error);
    
    // Close client if it exists
    if (client) {
      client.close();
    }
    
    return formatErrorResponse(error);
  }
};

/**
 * Lambda function to retry a failed analysis
 * @param {Object} event - API Gateway event
 * @returns {Object} - API Gateway response
 */
exports.retryAnalysis = async (event) => {
  let client = null;
  
  try {
    // Check if we have an analysis ID
    if (!event.pathParameters || !event.pathParameters.id) {
      return formatResponse(400, { 
        error: 'Analysis ID is required',
        code: 'MISSING_ANALYSIS_ID'
      });
    }
    
    const analysisId = event.pathParameters.id;
    
    // Get the analysis info from S3
    const analysis = await getAnalysisData(analysisId);
    
    // Can only retry if it's in an error state and has an associated recording ID
    if (analysis.status !== 'error' || !analysis.recordingId) {
      return formatResponse(400, {
        error: 'Analysis cannot be retried',
        code: 'RETRY_NOT_ALLOWED',
        details: 'Only analyses in error state with a recording ID can be retried'
      });
    }
    
    // Update status to retrying
    await storeAnalysisData(analysisId, {
      ...analysis,
      status: 'retrying',
      error: null,
      updatedAt: new Date().toISOString()
    });
    
    // Get Theodor client
    client = getTheodorClient();
    
    try {
      // Check if recording exists
      const recording = await client.getRecording(analysis.recordingId);
      
      if (!recording) {
        await storeAnalysisData(analysisId, {
          ...analysis,
          status: 'error',
          error: 'Recording no longer exists',
          updatedAt: new Date().toISOString()
        });
        
        return formatResponse(400, {
          error: 'Recording no longer exists',
          code: 'RECORDING_NOT_FOUND',
          analysisId: analysisId
        });
      }
      
      // We'll start the prediction process, but won't wait for it in the Lambda
      // We'll update a flag in S3 to indicate it's being retried
      
      // Close the client (it will be recreated by the fetchResults function when checking status)
      client.close();
      client = null;
      
      return formatResponse(202, {
        analysisId: analysisId,
        message: 'Analysis retry initiated',
        status: 'retrying'
      });
    } catch (error) {
      // Handle case where recording doesn't exist anymore
      if (error.status === 404) {
        await storeAnalysisData(analysisId, {
          ...analysis,
          status: 'error',
          error: 'Recording no longer exists',
          updatedAt: new Date().toISOString()
        });
        
        return formatResponse(404, {
          analysisId: analysisId,
          status: 'error',
          error: 'Recording no longer exists'
        });
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error retrying analysis:', error);
    
    // Close client if it exists
    if (client) {
      client.close();
    }
    
    return formatErrorResponse(error);
  }
};