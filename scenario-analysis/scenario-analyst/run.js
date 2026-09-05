import fs from 'fs';
import path from 'path';
import { generateScenarios } from './agent.js';

async function run() {
  const inputFile = process.argv[2];
  
  if (!inputFile) {
    console.error('Usage: node run.js <newsResult.json>');
    console.error('Example: node run.js ../news-agent/output.json');
    process.exit(1);
  }

  const fullPath = path.resolve(inputFile);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    process.exit(1);
  }

  console.log(`[ScenarioAnalyst] Reading input from ${fullPath}...`);
  
  let newsResult;
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    newsResult = JSON.parse(content);
  } catch (err) {
    console.error('Failed to parse input JSON:', err.message);
    process.exit(1);
  }

  if (!newsResult.clientId || !newsResult.news) {
    console.error('Invalid input: missing clientId or news array');
    process.exit(1);
  }

  console.log(`[ScenarioAnalyst] Processing ${newsResult.news.length} articles for ${newsResult.clientId}...`);

  try {
    const scenarios = await generateScenarios(newsResult);
    
    // Output to stdout (for piping)
    console.log(JSON.stringify(scenarios, null, 2));
    
    // Also save to file
    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(outputDir, `${newsResult.clientId}-scenario-${timestamp}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(scenarios, null, 2));
    
    console.error(`[ScenarioAnalyst] Saved to ${outputFile}`);
    
  } catch (err) {
    console.error('[ScenarioAnalyst] Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

run();