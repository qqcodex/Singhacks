// server.js - Fixed version
require('dotenv').config();
const express = require('express');
const path = require('node:path');
const { loadData } = require('./data/csv');
const { analyze } = require('./agents/orchestrator');
const app = express();
const data = loadData(path.resolve(__dirname, '../singhacks-jb-wealth-intelligence/data'));

app.use(express.json());
app.use(express.static(path.resolve(__dirname, '../public')));

app.get('/dashboard', (_req, res) => res.sendFile(path.resolve(__dirname, '../public/index.html')));
app.get('/health', (_req, res) => res.json({ status: 'ok', dataSource: 'SingHacks synthetic CSV dataset' }));

app.get('/api/clients', (_req, res) => res.json(data.clients.map((c) => ({
  id: c.client_id,
  name: c.client_name,
  age: c.age,
  countryOfResidence: c.country_of_residence,
  baseCurrency: c.base_currency,
  wealthBand: c.wealth_band,
  totalAumUsd: Number(c.total_aum_usd),
  lifeStage: c.life_stage,
  riskProfile: c.risk_profile,
  riskToleranceScore: Number(c.risk_tolerance_score),
  investmentHorizonYears: Number(c.investment_horizon_years),
  liquidityNeeds: c.liquidity_needs,
  objectives: c.objectives,
  kycReviewDue: c.kyc_review_due,
  pepStatus: c.pep_status,
  rmName: c.rm_name,
  rmDesk: c.rm_desk,
}))));

app.post('/api/analysis', async (req, res) => {
  const { clientId, question = '' } = req.body || {};
  if (!clientId) return res.status(400).json({ error: 'clientId is required.' });
  
  const result = await analyze(data, clientId, question);
  return result ? res.json(result) : res.status(404).json({ error: `Client ${clientId} was not found.` });
});

// Upload routes - Add this
const multer = require('multer');
const fs = require('fs');
const { processDocument } = require('./agents/documentAgent');

// Configure multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.resolve(__dirname, '../uploads');
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
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.post('/api/upload', upload.single('document'), async (req, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read file content for text files
    let content = '';
    if (req.file.mimetype === 'text/plain') {
      content = fs.readFileSync(req.file.path, 'utf8');
    }

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

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

const port = Number(process.env.PORT || 3000);
if (require.main === module) app.listen(port, () => console.log(`Wealth intelligence API listening on http://localhost:${port}`));

module.exports = app;