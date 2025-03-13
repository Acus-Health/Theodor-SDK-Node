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
    const filePath = path.join(this.storagePath, `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(metadata, null, 2));
  }
  
  /**
   * Get metadata for an analysis
   * @param {string} id - Analysis ID
   * @returns {Promise<Object>} - Metadata object
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
      throw error;
    }
  }
  
  /**
   * Get all metadata for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array<Object>>} - Array of metadata objects
   */
  async getAllMetadataForUser(userId) {
    try {
      const files = await fs.readdir(this.storagePath);
      const metadataFiles = files.filter(file => file.endsWith('.json'));
      
      const metadataPromises = metadataFiles.map(async (file) => {
        const filePath = path.join(this.storagePath, file);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
      });
      
      const allMetadata = await Promise.all(metadataPromises);
      
      // Filter by user ID
      return allMetadata.filter(metadata => metadata.userId === userId);
    } catch (error) {
      console.error('Error getting all metadata:', error);
      return [];
    }
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
      throw error;
    }
  }
}

module.exports = {
  StorageManager
};