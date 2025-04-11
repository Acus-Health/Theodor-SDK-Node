const uuid = require('uuid');
const path = require('path');
const fs = require('fs');
const { theodorService } = require('../services/theodor-service');
const { ApiResponse } = require('../utils/api-response');
const { StorageManager } = require('../utils/storage-manager');

const storage = new StorageManager();

// Set up event listeners for theodorService events
theodorService.on('recording_classified', async (data) => {
  try {
    // Find the metadata associated with this recording
    const allMetadata = await storage.getAllMetadataByRecordingId(data.id);
    
    if (allMetadata.length > 0) {
      for (const metadata of allMetadata) {
        // Update status and result
        metadata.status = 'completed';
        metadata.completedAt = new Date().toISOString();
        metadata.result = data;
        await storage.saveMetadata(metadata.id, metadata);
        console.log(`Updated metadata for analysis ${metadata.id} with classification results`);
      }
    }
  } catch (error) {
    console.error('Error handling recording_classified event:', error);
  }
});

theodorService.on('recording_classification_failure', async (data) => {
  try {
    // Find the metadata associated with this recording
    const allMetadata = await storage.getAllMetadataByRecordingId(data.id);
    
    if (allMetadata.length > 0) {
      for (const metadata of allMetadata) {
        // Update status and error
        metadata.status = 'error';
        metadata.error = data.message || 'Classification failed';
        metadata.errorDetail = data;
        await storage.saveMetadata(metadata.id, metadata);
        console.log(`Updated metadata for analysis ${metadata.id} with classification failure`);
      }
    }
  } catch (error) {
    console.error('Error handling recording_classification_failure event:', error);
  }
});

theodorService.on('analysis_error', async (data) => {
  try {
    if (!data.analysisId) return;
    
    const metadata = await storage.getMetadata(data.analysisId);
    if (metadata) {
      metadata.status = 'error';
      metadata.error = data.error.userMessage || data.error.message;
      metadata.errorDetail = {
        code: data.error.code,
        message: data.error.message,
        timestamp: new Date().toISOString()
      };
      await storage.saveMetadata(data.analysisId, metadata);
      console.log(`Updated metadata for analysis ${data.analysisId} with error: ${metadata.error}`);
    }
  } catch (error) {
    console.error('Error handling analysis_error event:', error);
  }
});

/**
 * Safely delete a file without throwing exceptions
 * @param {string} filePath - Path to the file to delete
 */
const safeDeleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
  }
};

/**
 * Validate audio file
 * @param {Object} file - Uploaded file object
 * @returns {string|null} - Error message or null if valid
 */
const validateAudioFile = (file) => {
  // Check file size (limit to 10MB)
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    return `File size exceeds the maximum limit of 10MB`;
  }
  
  // Check file type
  const validMimeTypes = ['audio/wav', 'audio/x-wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg'];
  if (!validMimeTypes.includes(file.mimetype)) {
    return `Unsupported audio format. Supported formats: WAV, MP3, OGG`;
  }
  
  return null;
};

const analysisController = {
  /**
   * Submit audio file for analysis
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async submitAudio(req, res, next) {
    try {
      if (!req.file) {
        return ApiResponse.badRequest(res, 'No audio file provided');
      }

      // Validate the audio file
      const validationError = validateAudioFile(req.file);
      if (validationError) {
        safeDeleteFile(req.file.path);
        return ApiResponse.badRequest(res, validationError);
      }

      const { site = 'heart', examId, enhanced = false } = req.body;
      const filePath = req.file.path;
      const analysisId = uuid.v4();
      
      // Validate the site parameter
      if (!['heart', 'lung', 'abdomen'].includes(site)) {
        safeDeleteFile(filePath);
        return ApiResponse.badRequest(res, 'Invalid site. Must be one of: heart, lung, abdomen');
      }
      
      // Store analysis metadata
      const metadata = {
        id: analysisId,
        originalFilename: req.file.originalname,
        createdAt: new Date().toISOString(),
        site,
        examId,
        enhanced: !!enhanced,
        status: 'processing',
        userId: req.user?.id || 'anonymous',
        fileMeta: {
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      };
      
      await storage.saveMetadata(analysisId, metadata);

      // Submit the file for analysis (don't wait for results)
      theodorService.analyzeRecording({
        filePath,
        site,
        examId,
        analysisId,
        enhanced: !!enhanced
      })
      .then(async (result) => {
        // Update metadata with recording ID
        metadata.recordingId = result.id;
        metadata.status = 'submitted';
        await storage.saveMetadata(analysisId, metadata);
        
        // Delete the temporary file
        safeDeleteFile(filePath);
      })
      .catch(async (error) => {
        console.error('Analysis error:', error);
        metadata.status = 'error';
        metadata.error = error.userMessage || error.message;
        metadata.errorDetail = {
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString()
        };
        await storage.saveMetadata(analysisId, metadata);
        
        // Delete the temporary file
        safeDeleteFile(filePath);
      });

      return ApiResponse.created(res, {
        message: 'Audio submitted for analysis',
        analysisId,
        estimatedProcessingTime: '30-60 seconds'
      });
    } catch (error) {
      // Clean up the file if one was uploaded
      if (req.file) {
        safeDeleteFile(req.file.path);
      }
      next(error);
    }
  },
  
  /**
   * Submit base64 encoded audio for analysis
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async submitBase64Audio(req, res, next) {
    try {
      const { data, mimeType, site = 'heart', examId, enhanced = false } = req.body;
      
      if (!data || !mimeType) {
        return ApiResponse.badRequest(res, 'Audio data and MIME type are required');
      }

      // Validate the site parameter
      if (!['heart', 'lung', 'abdomen'].includes(site)) {
        return ApiResponse.badRequest(res, 'Invalid site. Must be one of: heart, lung, abdomen');
      }
      
      // Validate MIME type
      const validMimeTypes = ['audio/wav', 'audio/x-wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg'];
      if (!validMimeTypes.includes(mimeType)) {
        return ApiResponse.badRequest(res, 'Unsupported audio format. Supported formats: WAV, MP3, OGG');
      }

      // Decode and validate the base64 data
      let buffer;
      try {
        buffer = Buffer.from(data, 'base64');
        
        // Check size (limit to 10MB)
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        if (buffer.length > MAX_SIZE) {
          return ApiResponse.badRequest(res, `File size exceeds the maximum limit of 10MB`);
        }
      } catch (error) {
        return ApiResponse.badRequest(res, 'Invalid base64 data');
      }

      const analysisId = uuid.v4();
      
      // Store analysis metadata
      const metadata = {
        id: analysisId,
        createdAt: new Date().toISOString(),
        site,
        examId,
        enhanced: !!enhanced,
        status: 'processing',
        mimeType,
        size: buffer.length,
        userId: req.user?.id || 'anonymous'
      };
      
      await storage.saveMetadata(analysisId, metadata);

      // Submit base64 data for analysis (don't wait for results)
      theodorService.analyzeBase64({
        data,
        mimeType,
        size: buffer.length,
        site,
        examId,
        analysisId,
        enhanced: !!enhanced
      })
      .then(async (result) => {
        // Update metadata with recording ID
        metadata.recordingId = result.id;
        metadata.status = 'submitted';
        await storage.saveMetadata(analysisId, metadata);
      })
      .catch(async (error) => {
        console.error('Analysis error:', error);
        metadata.status = 'error';
        metadata.error = error.userMessage || error.message;
        metadata.errorDetail = {
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString()
        };
        await storage.saveMetadata(analysisId, metadata);
      });

      return ApiResponse.created(res, {
        message: 'Audio submitted for analysis',
        analysisId,
        estimatedProcessingTime: '30-60 seconds'
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Get analysis status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getAnalysisStatus(req, res, next) {
    try {
      const { id } = req.params;
      
      // Get analysis metadata
      const metadata = await storage.getMetadata(id);
      
      if (!metadata) {
        return ApiResponse.notFound(res, 'Analysis not found');
      }
      
      // If we have a recording ID and status is not error or completed, check with Theodor
      if (metadata.recordingId && metadata.status !== 'error' && metadata.status !== 'completed') {
        try {
          const recording = await theodorService.getRecording(metadata.recordingId);
          
          if (recording) {
            // Update status based on recording
            if ((recording.murmur && recording.murmur !== 'pending') || 
                (recording.status === 'classified' || recording.classification_status === 'classified')) {
              metadata.status = 'completed';
              metadata.completedAt = new Date().toISOString();
              metadata.result = recording;
              await storage.saveMetadata(id, metadata);
            } else if (recording.status === 'error' || recording.classification_status === 'error') {
              metadata.status = 'error';
              metadata.error = recording.error_message || recording.classification_error || 'Classification failed';
              await storage.saveMetadata(id, metadata);
            }
          }
        } catch (error) {
          console.error('Error getting recording:', error);
          // Don't update status, just continue with what we have
        }
      }
      
      // Prepare the response
      const response = {
        analysisId: id,
        status: metadata.status,
        createdAt: metadata.createdAt,
        site: metadata.site,
        enhanced: metadata.enhanced || false,
        completedAt: metadata.completedAt
      };
      
      // Include error information if available
      if (metadata.status === 'error' && metadata.error) {
        response.error = metadata.error;
      }
      
      // Include result if available
      if (metadata.status === 'completed' && metadata.result) {
        response.result = {
          murmur: metadata.result.murmur,
          murmur_certainty: metadata.result.murmur_certainty,
          rhythm: metadata.result.rhythm,
          heart_rate: metadata.result.heart_rate || metadata.result.hr
        };
        
        // Add findings if available
        if (metadata.result.report && metadata.result.report.findings) {
          response.result.findings = metadata.result.report.findings;
        }
      }
      
      return ApiResponse.success(res, response);
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Get all analyses for the current user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getAllAnalyses(req, res, next) {
    try {
      const userId = req.user?.id || 'anonymous';
      const analyses = await storage.getAllMetadataForUser(userId);
      
      const response = analyses.map(metadata => ({
        analysisId: metadata.id,
        status: metadata.status,
        site: metadata.site,
        createdAt: metadata.createdAt,
        completedAt: metadata.completedAt,
        error: metadata.status === 'error' ? metadata.error : undefined
      }));
      
      return ApiResponse.success(res, response);
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Get predictions for a specific analysis
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getPredictions(req, res, next) {
    try {
      const { id } = req.params;
      
      // Get analysis metadata
      const metadata = await storage.getMetadata(id);
      
      if (!metadata) {
        return ApiResponse.notFound(res, 'Analysis not found');
      }
      
      if (metadata.status === 'error') {
        return ApiResponse.badRequest(res, metadata.error || 'Analysis failed');
      }
      
      if (metadata.status !== 'completed' || !metadata.result) {
        return ApiResponse.badRequest(res, 'Analysis not yet completed');
      }
      
      // Extract the relevant prediction information
      const predictions = {
        murmur: metadata.result.murmur,
        murmur_certainty: metadata.result.murmur_certainty,
        rhythm: metadata.result.rhythm,
        heart_rate: metadata.result.heart_rate || metadata.result.hr,
        findings: metadata.result.report?.findings || []
      };
      
      return ApiResponse.success(res, predictions);
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Retry a failed analysis
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async retryAnalysis(req, res, next) {
    try {
      const { id } = req.params;
      
      // Get analysis metadata
      const metadata = await storage.getMetadata(id);
      
      if (!metadata) {
        return ApiResponse.notFound(res, 'Analysis not found');
      }
      
      // Can only retry if it's in an error state and has an associated recording ID
      if (metadata.status !== 'error' || !metadata.recordingId) {
        return ApiResponse.badRequest(res, 'Analysis cannot be retried');
      }
      
      // Update status to retrying
      metadata.status = 'retrying';
      metadata.error = null;
      metadata.errorDetail = null;
      await storage.saveMetadata(id, metadata);
      
      // Try to get the recording and check its status
      try {
        const recording = await theodorService.getRecording(metadata.recordingId);
        
        if (!recording) {
          metadata.status = 'error';
          metadata.error = 'Recording no longer exists';
          await storage.saveMetadata(id, metadata);
          return ApiResponse.badRequest(res, 'Recording no longer exists');
        }
        
        // Try to wait for prediction
        theodorService.waitForPrediction(metadata.recordingId, 60000)
          .then(async (result) => {
            metadata.status = 'completed';
            metadata.completedAt = new Date().toISOString();
            metadata.result = result;
            await storage.saveMetadata(id, metadata);
          })
          .catch(async (error) => {
            metadata.status = 'error';
            metadata.error = error.userMessage || error.message;
            metadata.errorDetail = {
              code: error.code,
              message: error.message,
              timestamp: new Date().toISOString()
            };
            await storage.saveMetadata(id, metadata);
          });
        
        return ApiResponse.success(res, {
          analysisId: id,
          message: 'Analysis retry initiated',
          status: 'retrying'
        });
      } catch (error) {
        metadata.status = 'error';
        metadata.error = error.userMessage || error.message;
        await storage.saveMetadata(id, metadata);
        return ApiResponse.badRequest(res, error.userMessage || error.message);
      }
    } catch (error) {
      next(error);
    }
  }
};

module.exports = {
  analysisController
};