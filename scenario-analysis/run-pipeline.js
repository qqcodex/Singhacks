import fs from 'fs';
import path from 'path';
import { analyzeClientNews } from './news-agent/agent.js';
import { generateScenarios } from './scenario-analyst/agent.js';

async function runPipeline(clientId, options = {}) {
  console.log(`\n=== PIPELINE START: ${clientId} ===`);
  console.log(`[Pipeline] Step 1: News Intelligence Agent`);
  
  const newsResult = await analyzeClientNews(clientId, { 
    lookbackDays: options.lookbackDays || 7, 
    maxArticles: options.maxArticles || 50 
  });
  
  console.log(`[Pipeline] News complete: ${newsResult.news.length} articles, ${newsResult.summary.byCategory.GEOPOLITICAL} geopolitical, ${newsResult.summary.byCategory.ECONOMIC} economic, ${newsResult.summary.byCategory.COMPANY_SPECIFIC} company-specific`);
  console.log(`[Pipeline] High relevance: ${newsResult.summary.highRelevanceCount}, Actionable: ${newsResult.summary.actionableCount}`);
  
  console.log(`\n[Pipeline] Step 2: Scenario Analyst Agent`);
  
  const scenarios = await generateScenarios(newsResult);
  
  const output = { 
    newsIntelligence: newsResult, 
    scenarioAnalysis: scenarios 
  };
  
  // Save combined output
  const outputDir = path.join(process.cwd(), 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(outputDir, `${clientId}-pipeline-${timestamp}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  
  console.log(`\n[Pipeline] Complete! Saved to ${outputFile}`);
  console.log(`=== PIPELINE END ===`);
  
  return output;
}

// CLI usage
const clientId = process.argv[2] || 'CL-0001';
const lookbackDays = parseInt(process.argv[3]) || 7;
const maxArticles = parseInt(process.argv[4]) || 50;

runPipeline(clientId, { lookbackDays, maxArticles }).catch(err => {
  console.error('[Pipeline] Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});