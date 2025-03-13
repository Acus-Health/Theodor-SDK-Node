const express = require('express');
const multer = require('multer');
const path = require('path');
const { analysisController } = require('../controllers/analysis-controller');
const { validate, schemas } = require('../middlewares/validation-middleware');
const { optionalAuth } = require('../middlewares/auth-middleware');
const config = require('../config');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.storagePath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'audio-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/ogg',
      'audio/x-m4a'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only WAV, MP3, OGG, and M4A files are allowed.'));
    }
  }
});

// Routes
router.post('/submit',
  optionalAuth,
  upload.single('audio'),
  validate(schemas.submitAudio),
  analysisController.submitAudio
);

router.post('/submit-base64',
  optionalAuth,
  validate(schemas.submitBase64Audio),
  analysisController.submitBase64Audio
);

router.get('/:id',
  optionalAuth,
  validate(schemas.idParam, 'params'),
  analysisController.getAnalysisStatus
);

router.get('/:id/predictions',
  optionalAuth,
  validate(schemas.idParam, 'params'),
  analysisController.getPredictions
);

router.get('/',
  optionalAuth,
  analysisController.getAllAnalyses
);

module.exports = router;