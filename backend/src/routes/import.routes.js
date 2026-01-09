/**
 * Import Routes
 * Endpoints for streaming history import with file upload support
 */
const express = require('express');
const multer = require('multer');
const router = express.Router();
const { protect } = require('../middleware/protect');
const { importLimiter, apiLimiter } = require('../middleware/rateLimiter');
const { jsonSizeLimit } = require('../utils/validation');
const importController = require('../controllers/importController');
const { auditMiddleware, AUDIT_EVENTS } = require('../services/auditService');

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 200 * 1024 * 1024 // 200MB max
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
            cb(null, true);
        } else {
            cb(new Error('Only JSON files are allowed'), false);
        }
    }
});

// All import routes require authentication
router.use(protect);

// Upload JSON data in request body
router.post('/upload',
    jsonSizeLimit(100 * 1024 * 1024), // 100MB max for body
    importLimiter, // Rate limit: 1 per 15 minutes
    auditMiddleware(AUDIT_EVENTS.IMPORT_STARTED, (req) => ({
        source: 'body',
        contentLength: req.get('Content-Length')
    })),
    importController.uploadHistory
);

// Upload JSON file (multipart/form-data)
router.post('/file',
    importLimiter,
    upload.single('file'),
    auditMiddleware(AUDIT_EVENTS.IMPORT_STARTED, (req) => ({
        source: 'file',
        filename: req.file?.originalname,
        filesize: req.file?.size
    })),
    importController.uploadFile
);

// Get import status and history
router.get('/status', apiLimiter, importController.getImportStatus);

// Get specific import by ID
router.get('/:id', apiLimiter, importController.getImportById);

// Get aggregated statistics from imported data
router.get('/stats', apiLimiter, importController.getHistoryStats);

// Delete all imported history (GDPR) - SENSITIVE OPERATION
router.delete('/history',
    apiLimiter,
    auditMiddleware(AUDIT_EVENTS.HISTORY_DELETED),
    importController.deleteHistory
);

module.exports = router;
