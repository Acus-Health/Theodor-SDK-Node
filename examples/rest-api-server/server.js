require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { errorHandler } = require('./src/middlewares/error-handler');
const routes = require('./src/routes');
const config = require('./src/config');

// Initialize Express app
const app = express();

// Apply security headers
app.use(helmet());

// Configure CORS
app.use(cors());

// Request logging
app.use(morgan(config.isDevelopment ? 'dev' : 'combined'));

// Parse JSON body
app.use(express.json({ limit: '50mb' }));

// Parse URL-encoded body
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', routes);

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use(errorHandler);

// Start the server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

module.exports = app;