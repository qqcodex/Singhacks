
// server.js - ES Module version

import 'dotenv/config';

import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import { fileURLToPath } from 'node:url';
import { loadData } from './data/csv.js';
import { analyze } from './agents/orchestrator.js';
import { processDocument } from './agents/documentAgent.js';

// --------------------------------------------------
// ES Module equivalent of __dirname
// --------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --------------------------------------------------
// App setup
// --------------------------------------------------

const app = express();

const data = loadData(
  path.resolve(
    __dirname,
    '../singhacks-jb-wealth-intelligence/data'
  )
);

app.use(express.json());

app.use(
  express.static(
    path.resolve(__dirname, '../public')
  )
);

// --------------------------------------------------
// Dashboard
// --------------------------------------------------

app.get('/dashboard', (_req, res) =>
  res.sendFile(
    path.resolve(__dirname, '../public/index.html')
  )
);

// --------------------------------------------------
// Health check
// --------------------------------------------------

app.get('/health', (_req, res) =>
  res.json({
    status: 'ok',
    dataSource: 'SingHacks synthetic CSV dataset'
  })
);

// --------------------------------------------------
// Clients API
// --------------------------------------------------

app.get('/api/clients', (_req, res) =>
  res.json(
    data.clients.map((c) => ({
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
      rmDesk: c.rm_desk
    }))
  )
);

// --------------------------------------------------
// AI Analysis
// --------------------------------------------------

app.post('/api/analysis', async (req, res) => {
  try {
    const { clientId, question = '' } = req.body || {};

    if (!clientId) {
      return res
        .status(400)
        .json({ error: 'clientId is required.' });
    }

    const result = await analyze(
      data,
      clientId,
      question
    );

    return result
      ? res.json(result)
      : res
          .status(404)
          .json({
            error: `Client ${clientId} was not found.`
          });
  } catch (error) {
    console.error('Analysis error:', error);

    return res.status(500).json({
      error: 'Failed to analyse client',
      details: error.message
    });
  }
});

// --------------------------------------------------
// Document Upload
// --------------------------------------------------

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    const uploadDir = path.resolve(
      __dirname,
      '../uploads'
    );

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, {
        recursive: true
      });
    }

    cb(null, uploadDir);
  },

  filename: function (_req, file, cb) {
    const uniqueSuffix =
      Date.now() +
      '-' +
      Math.round(Math.random() * 1e9);

    cb(
      null,
      file.fieldname +
        '-' +
        uniqueSuffix +
        path.extname(file.originalname)
    );
  }
});

const fileFilter = (_req, file, cb) => {
  const allowedTypes = [
    'text/plain',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Only text files, PDFs, and Word documents are allowed.'
      )
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

// --------------------------------------------------
// Upload API
// --------------------------------------------------

app.post(
  '/api/upload',
  upload.single('document'),
  async (req, res) => {
    try {
      const { clientId } = req.body;

      if (!clientId) {
        return res
          .status(400)
          .json({
            error: 'clientId is required'
          });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({
            error: 'No file uploaded'
          });
      }

      // Read text files directly
      let content = '';

      if (
        req.file.mimetype ===
        'text/plain'
      ) {
        content = fs.readFileSync(
          req.file.path,
          'utf8'
        );
      }

      // Process with AI document agent
      const processingResult =
        await processDocument(
          content || req.file.path,
          clientId
        );

      return res.json({
        success: true,
        message:
          'Document uploaded and processed',

        document: {
          name: req.file.originalname,
          size: req.file.size,
          path: req.file.path
        },

        aiInsights: processingResult
      });
    } catch (error) {
      console.error(
        'Upload error:',
        error
      );

      return res.status(500).json({
        error:
          'Failed to process document',
        details: error.message
      });
    }
  }
);

// --------------------------------------------------
// 404
// --------------------------------------------------

app.use((_req, res) =>
  res
    .status(404)
    .json({
      error: 'Not found'
    })
);

// --------------------------------------------------
// Start server
// --------------------------------------------------

const port = Number(
  process.env.PORT || 3000
);

app.listen(port, () => {
  console.log(
    `Wealth intelligence API listening on http://localhost:${port}`
  );
});

export default app;

