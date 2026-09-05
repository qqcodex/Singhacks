// const sql = require('mssql');
// const path = require('path');

// // Load environment variables (if you have a .env file)
// require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// const config = {
//   user: process.env.DB_USER || 'sa',
//   password: process.env.DB_PASSWORD || 'YourPassword',
//   server: process.env.DB_SERVER || 'localhost',
//   database: process.env.DB_DATABASE || 'RM_AI_Assistant',
//   options: {
//     encrypt: true,
//     trustServerCertificate: true,
//     enableArithAbort: true,
//   },
//   pool: {
//     max: 10,
//     min: 0,
//     idleTimeoutMillis: 30000,
//   },
// };

// async function testConnection() {
//   console.log('🔄 Connecting to SQL Server...');
//   console.log(`Server: ${config.server}`);
//   console.log(`Database: ${config.database}`);
//   console.log(`User: ${config.user}`);

//   let pool;
//   try {
//     pool = await sql.connect(config);
//     console.log('✅ Connected successfully!');

//     // Check if AI tables exist
//     const result = await pool.request().query(`
//       SELECT TABLE_NAME 
//       FROM INFORMATION_SCHEMA.TABLES 
//       WHERE TABLE_NAME IN ('ai_analysis_snapshots', 'ai_actionable_steps', 'uploaded_documents')
//     `);

//     const tables = result.recordset.map(r => r.TABLE_NAME);
//     console.log(`📊 Found AI tables: ${tables.length > 0 ? tables.join(', ') : 'none'}`);

//     if (tables.length === 0) {
//       console.warn('⚠️  No AI tables found. You need to run the SQL schema script first.');
//     } else {
//       // Count rows in ai_analysis_snapshots
//       const count = await pool.request().query('SELECT COUNT(*) AS cnt FROM ai_analysis_snapshots');
//       console.log(`📈 ai_analysis_snapshots has ${count.recordset[0].cnt} records.`);
//     }

//     console.log('✅ Test completed successfully.');
//   } catch (error) {
//     console.error('❌ Database connection failed:', error.message);
//     console.log('\n💡 Troubleshooting tips:');
//     console.log('1. Make sure SQL Server is running.');
//     console.log('2. Check your .env file for DB_* settings.');
//     console.log('3. Verify the database "RM_AI_Assistant" exists.');
//     console.log('4. Check your firewall and network settings.');
//     console.log('5. If using Windows Authentication, set user to empty and add "integratedSecurity: true".');
//     console.log('\nExample .env:');
//     console.log('DB_USER=sa');
//     console.log('DB_PASSWORD=YourStrongPassword');
//     console.log('DB_SERVER=localhost');
//     console.log('DB_DATABASE=RM_AI_Assistant');
//   } finally {
//     if (pool) await pool.close();
//   }
// }

// testConnection();
// test/test-full-system.js
const { loadData } = require('../src/data/csv');
const { calculateAnalytics } = require('../src/analytics/portfolio');
const { researchEvents } = require('../src/agents/historicalAgent');
const { discoverRisks } = require('../src/agents/riskAgent');
const { researchWeb } = require('../src/agents/webResearchAgent');
const { synthesizeReport, answerQuestion } = require('../src/agents/synthesisAgent');
const path = require('path');

async function runFullTest() {
  console.log('🚀 Running Full System Test\n');

  // 1. Load data
  const dataPath = path.resolve(__dirname, '../singhacks-jb-wealth-intelligence/data');
  const data = loadData(dataPath);
  const clientId = 'CL-0001';

  console.log('📊 Calculating portfolio analytics...');
  const analytics = calculateAnalytics(data, clientId);
  if (!analytics) { console.error('Client not found'); return; }

  console.log(`   AUM: $${(analytics.total / 1e6).toFixed(2)}M`);

  console.log('📜 Researching historical events...');
  const historicalEvents = researchEvents(data.events, analytics);

  console.log('🌐 Running web research...');
  process.env.WEB_RESEARCH_ENABLED = 'true'; // enable if you have GEMINI_API_KEY
  const webResearch = await researchWeb(analytics, historicalEvents);

  console.log('⚠️ Discovering risks...');
  const risks = discoverRisks(analytics, historicalEvents, webResearch);

  const question = 'What are my key portfolio risks and what should I do?';
  console.log(`❓ Answering: "${question}"`);
  const answer = await answerQuestion(question, risks, historicalEvents, webResearch, analytics.client, analytics);

  console.log('📄 Generating synthesis report (will save to DB)...');
  const report = synthesizeReport({
    analytics,
    risks,
    historicalEvents,
    webResearch,
    question,
    answer,
  });

  console.log('✅ Report generated!');
  console.log(`   Risk Level: ${report.summary.riskLevel}`);
  console.log(`   Actionable Steps: ${report.actionableSteps?.length || 0}`);

  // The report is automatically saved to the database by synthesizeReport
  // if SAVE_TO_DATABASE is not 'false' in .env

  console.log('\n🎯 Sample Actionable Steps:');
  report.actionableSteps?.slice(0, 3).forEach((step, i) => {
    console.log(`\n${i+1}. [${step.priority}] ${step.title}`);
    console.log(`   Action: ${step.action.substring(0, 120)}...`);
    console.log(`   Timeline: ${step.timeline}`);
  });

  console.log('\n✅ Full test completed. Check your database for the new snapshot.');
}

runFullTest().catch(console.error);