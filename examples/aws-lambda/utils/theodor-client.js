const TheodorClient = require('theodor-sdk');

/**
 * Creates and returns a configured Theodor client instance
 * @returns {TheodorClient} - Configured Theodor client
 */
function getTheodorClient() {
  // For Lambda, disable WebSocket by default since we don't need real-time updates
  return new TheodorClient({
    apiKey: process.env.THEODOR_API_KEY,
    useWebSocket: false,
    debug: process.env.DEBUG === 'true'
  });
}

module.exports = {
  getTheodorClient
};