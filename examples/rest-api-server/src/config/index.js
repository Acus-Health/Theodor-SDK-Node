const config = {
	nodeEnv: process.env.NODE_ENV || 'development',
	port: process.env.PORT || 3000,
	isDevelopment: process.env.NODE_ENV !== 'production',
	
	// Theodor SDK
	theodorApiKey: process.env.THEODOR_API_KEY,
	
	// Auth
	jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
	jwtExpiration: process.env.JWT_EXPIRATION || '24h',
	
	// Storage
	storagePath: process.env.STORAGE_PATH || './uploads',
	
	// Rate limiting
	rateLimit: {
	  windowMs: 15 * 60 * 1000, // 15 minutes
	  max: 100 // limit each IP to 100 requests per windowMs
	}
  };
  
  module.exports = config;