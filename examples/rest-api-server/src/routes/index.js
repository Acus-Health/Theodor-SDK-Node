const express = require('express');
const analysisRoutes = require('./analysis-routes');
const rateLimit = require('express-rate-limit');
const config = require('../config');

const router = express.Router();

// Apply rate limiting to all API routes
const limiter = rateLimit(config.rateLimit);
router.use(limiter);

// API health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register routes
router.use('/analysis', analysisRoutes);

// Handle 404 for API routes
router.use((req, res) => {
  res.status(404).json({ 
    status: 'error', 
    message: 'API endpoint not found' 
  });
});

module.exports = router;