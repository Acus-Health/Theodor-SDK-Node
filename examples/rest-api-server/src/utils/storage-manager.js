const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

/**
 * Storage manager for analysis metadata
 */
class StorageManager {
  constructor() {
    this.storagePath = path.join(config.storagePath, 'metadata');
    this.init();
  }
  
  /**
   * Initialize storage directories
   */
  async init() {
    try {
      // Create uploads directory if it doesn't exist
      await fs.mkdir(config.storagePath, { recursive: true });
      
      // Create metadata directory if it doesn't exist
      await fs.mkdir(this.storagePath, { recursive: true });
      
      console.log(`Storage initialized at ${this.storagePath}`);
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }
  
  /**
   * Save metadata for an analysis
   * @param {string} id - Analysis ID
   * @param {Object} metadata - Metadata object
   * @returns {Promise<void>}
   */
  async saveMetadata(id, metadata) {
    try {
      const filePath = path.join(this.storagePath, `${id}.json`);
      await fs.writeFile(filePath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error(`Error saving metadata for analysis ${id}:`, error);
      throw new Error(`Failed to save metadata: ${error.message}`);
    }
  }
  
  /**
   * Get metadata for an analysis
   * @param {string} id - Analysis ID
   * @returns {Promise<Object|null>} - Metadata object or null if not found
   */
  async getMetadata(id) {
    try {
      const filePath = path.join(this.storagePath, `${id}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      console.error(`Error reading metadata for analysis ${id}:`, error);
      throw new Error(`Failed to read metadata: ${error.message}`);
    }
  }
  
  /**
   * Get all metadata files
   * @returns {Promise<Array<Object>>} - Array of metadata objects
   * @private
   */
  async _getAllMetadata() {
    try {
      const files = await fs.readdir(this.storagePath);
      const metadataFiles = files.filter(file => file.endsWith('.json'));
      
      const metadataPromises = metadataFiles.map(async (file) => {
        try {
          const filePath = path.join(this.storagePath, file);
          const data = await fs.readFile(filePath, 'utf8');
          return JSON.parse(data);
        } catch (error) {
          console.error(`Error reading metadata file ${file}:`, error);
          return null;
        }
      });
      
      const allMetadata = await Promise.all(metadataPromises);
      return allMetadata.filter(metadata => metadata !== null);
    } catch (error) {
      console.error('Error getting all metadata:', error);
      return [];
    }
  }
  
  /**
   * Get all metadata for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array<Object>>} - Array of metadata objects
   */
  async getAllMetadataForUser(userId) {
    const allMetadata = await this._getAllMetadata();
    
    // Filter by user ID
    return allMetadata.filter(metadata => metadata.userId === userId);
  }
  
  /**
   * Get all metadata by recording ID
   * @param {string} recordingId - Recording ID
   * @returns {Promise<Array<Object>>} - Array of metadata objects
   */
  async getAllMetadataByRecordingId(recordingId) {
    if (!recordingId) {
      return [];
    }
    
    const allMetadata = await this._getAllMetadata();
    
    // Filter by recording ID
    return allMetadata.filter(metadata => metadata.recordingId === recordingId);
  }
  
  /**
   * Delete metadata for an analysis
   * @param {string} id - Analysis ID
   * @returns {Promise<boolean>} - True if deleted, false if not found
   */
  async deleteMetadata(id) {
    try {
      const filePath = path.join(this.storagePath, `${id}.json`);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      console.error(`Error deleting metadata for analysis ${id}:`, error);
      throw new Error(`Failed to delete metadata: ${error.message}`);
    }
  }
  
  /**
   * Purge old metadata files
   * @param {number} olderThanDays - Delete files older than this many days
   * @returns {Promise<number>} - Number of files deleted
   */
  async purgeOldMetadata(olderThanDays = 30) {
    try {
      const allMetadata = await this._getAllMetadata();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      let deletedCount = 0;
      
      for (const metadata of allMetadata) {
        const createdAt = new Date(metadata.createdAt);
        
        if (createdAt < cutoffDate) {
          await this.deleteMetadata(metadata.id);
          deletedCount++;
        }
      }
      
      return deletedCount;
    } catch (error) {
      console.error(`Error purging old metadata:`, error);
      return 0;
    }
  }
}

module.exports = {
  StorageManager
};