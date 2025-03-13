const AWS = require('aws-sdk');
const uuid = require('uuid');
const { getTheodorClient } = require('./utils/theodor-client');

// Initialize S3 client
const s3 = new AWS.S3();

/**
 * Lambda function to analyse an auscultation recording
 * @param {Object} event - API Gateway event
 * @returns {Object} - API Gateway response
 */
exports.analyse = async (event) => {
  try {
    // Check if we have a base64 audio file in the request
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No request body provided' })
      };
    }

    const body = JSON.parse(event.body);
    
    if (!body.audioData || !body.mimeType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Audio data and MIME type are required' })
      };
    }

    // Get Theodor client
    const client = getTheodorClient();

    // Generate unique ID for this analysis
    const analysisId = uuid.v4();

    // Submit base64 audio for analysis (do not wait for results in Lambda)
    const result = await client.analyzeBase64({
      data: body.audioData,
      mimeType: body.mimeType,
      size: Buffer.from(body.audioData, 'base64').length,
      site: body.site || 'heart',
      waitForPrediction: false
    });

    // Store the recording ID in S3 for later retrieval
    await s3.putObject({
      Bucket: process.env.STORAGE_BUCKET || 'theodor-analysis-results',
      Key: `analyses/${analysisId}`,
      Body: JSON.stringify({
        recordingId: result.id,
        status: 'processing',
        createdAt: new Date().toISOString()
      })
    }).promise();

    // Close the client (important for Lambda to avoid hanging connections)
    client.close();

    return {
      statusCode: 202, // Accepted
      body: JSON.stringify({
        message: 'Analysis submitted successfully',
        analysisId: analysisId,
        recordingId: result.id
      })
    };
  } catch (error) {
    console.error('Error analyzing heart sound:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to analyze heart sound',
        details: error.message
      })
    };
  }
};

/**
 * Lambda function to fetch analysis results
 * @param {Object} event - API Gateway event
 * @returns {Object} - API Gateway response
 */
exports.fetchResults = async (event) => {
  try {
    const analysisId = event.pathParameters.id;
    
    if (!analysisId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Analysis ID is required' })
      };
    }

    // Get the analysis info from S3
    const analysisData = await s3.getObject({
      Bucket: process.env.STORAGE_BUCKET || 'theodor-analysis-results',
      Key: `analyses/${analysisId}`
    }).promise();

    const analysis = JSON.parse(analysisData.Body.toString());
    
    // Get Theodor client
    const client = getTheodorClient();

    // Get the recording data
    const recording = await client.getRecording(analysis.recordingId);
    
    // Close the client
    client.close();

    // Update the status in S3 if the recording is now analyzed
    if (recording.murmur && recording.murmur !== 'pending') {
      await s3.putObject({
        Bucket: process.env.STORAGE_BUCKET || 'theodor-analysis-results',
        Key: `analyses/${analysisId}`,
        Body: JSON.stringify({
          ...analysis,
          status: 'completed',
          completedAt: new Date().toISOString()
        })
      }).promise();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        analysisId: 	analysisId,
        recordingId:    analysis.recordingId,
        status: 		recording.murmur && recording.murmur !== 'pending' ? 'completed' : 'processing',
        result:			recording
      })
    };
  } catch (error) {
    console.error('Error fetching analysis results:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch analysis results',
        details: error.message
      })
    };
  }
};