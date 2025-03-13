const uuid = require('uuid');
const path = require('path');
const fs = require('fs');
const { theodorService } = require('../services/theodor-service');
const { ApiResponse } = require('../utils/api-response');
const { StorageManager } = require('../utils/storage-manager');

const storage = new StorageManager();

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

      const { site = 'heart', examId } = req.body;
      const filePath = req.file.path;
      const analysisId = uuid.v4();
      
      // Store analysis metadata
      const metadata = {
        id: analysisId,
        originalFilename: req.file.originalname,
        createdAt: new Date().toISOString(),
        site,
        examId,
        status: 'processing',
        userId: req.user?.id || 'anonymous'
      };
      
      await storage.saveMetadata(analysisId, metadata);

      // Submit the file for analysis (don't wait for results)
      theodorService.analyzeRecording({
        filePath,
        site,
        examId,
        analysisId
      })
      .then(async (result) => {
        // Update metadata with recording ID
        metadata.recordingId = result.id;
        metadata.status = 'submitted';
        await storage.saveMetadata(analysisId, metadata);
        
        // Delete the temporary file
        fs.unlinkSync(filePath);
      })
      .catch(async (error) => {
        console.error('Analysis error:', error);
        metadata.status = 'error';
        metadata.error = error.message;
        await storage.saveMetadata(analysisId, metadata);
        
        // Delete the temporary file
        fs.unlinkSync(filePath);
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
   * Submit base64 encoded audio for analysis
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async submitBase64Audio(req, res, next) {
    try {
      const { data, mimeType, site = 'heart', examId } = req.body;
      
      if (!data || !mimeType) {
        return ApiResponse.badRequest(res, 'Audio data and MIME type are required');
      }

      const analysisId = uuid.v4();
      const buffer = Buffer.from(data, 'base64');
      
      // Store analysis metadata
      const metadata = {
        id: analysisId,
        createdAt: new Date().toISOString(),
        site,
        examId,
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
        analysisId
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
        metadata.error = error.message;
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
      
      // If we have a recording ID and status is not error, check with Theodor
      if (metadata.recordingId && metadata.status !== 'error') {
        try {
          const recording = await theodorService.getRecording(metadata.recordingId);
          
          // Update status based on recording
          if (recording.murmur && recording.murmur !== 'pending') {
            metadata.status = 'completed';
            metadata.completedAt = new Date().toISOString();
            metadata.result = recording;
            await storage.saveMetadata(id, metadata);
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
        completedAt: metadata.completedAt
      };
      
      // Include result if available
      if (metadata.status === 'completed' && metadata.result) {
        response.result = metadata.result;
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
        completedAt: metadata.completedAt
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
      
      if (metadata.status !== 'completed' || !metadata.result) {
        return ApiResponse.badRequest(res, 'Analysis not yet completed');
      }
      
      // Extract the relevant prediction information
      const predictions = {
        murmur: metadata.result.murmur,
        murmur_certainty: metadata.result.murmur_certainty,
        rhythm: metadata.result.rhythm,
        heart_rate: metadata.result.hr,
        findings: metadata.result.report?.findings || []
      };
      
      return ApiResponse.success(res, predictions);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = {
  analysisController
};