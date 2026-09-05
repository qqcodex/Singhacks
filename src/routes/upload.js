const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { processDocument } = require('../agents/documentAgent');

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.resolve(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['text/plain', 'application/pdf', 'application/msword', 
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only text files, PDFs, and Word documents are allowed.'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload endpoint
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read file content (for text files)
    let content = '';
    if (req.file.mimetype === 'text/plain') {
      content = fs.readFileSync(req.file.path, 'utf8');
    }

    // Insert into database (simplified - you'd use your actual DB connection)
    const documentRecord = {
      client_id: clientId,
      document_name: req.file.originalname,
      document_type: req.file.mimetype,
      file_path: req.file.path,
      file_size_bytes: req.file.size,
      processed: false,
      upload_date: new Date()
    };
    
    // Save to DB - implement your actual DB save here
    // const docId = await saveDocument(documentRecord);
    
    // Process with AI agent
    const processingResult = await processDocument(content || req.file.path, clientId);
    
    res.json({
      success: true,
      message: 'Document uploaded and processed',
      document: {
        name: req.file.originalname,
        size: req.file.size,
        path: req.file.path
      },
      aiInsights: processingResult
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process document',
      details: error.message 
    });
  }
});

// Get document history
router.get('/documents/:clientId', async (req, res) => {
  const { clientId } = req.params;
  // Implement database query
  // const documents = await getDocumentsByClient(clientId);
  res.json({ documents: [] }); // Placeholder
});

module.exports = router;