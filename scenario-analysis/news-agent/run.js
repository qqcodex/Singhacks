import fs from 'fs';
import path from 'path';
import { analyzeClientNews } from './agent.js';

async function run() {
  const clientId = process.argv[2] || 'CL-0001';
  
  console.error(`[NewsAgent] Analyzing news for ${clientId}...`);
  
  try {
    const result = await analyzeClientNews(clientId, { lookbackDays: 7, maxArticles: 50 });
    
    // Write JSON to stdout (for piping)
    console.log(JSON.stringify(result, null, 2));
    
    // Also save to file
    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(outputDir, `${clientId}-news-${timestamp}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    
    console.error(`[NewsAgent] Complete. ${result.news.length} articles classified.`);
    console.error(`[NewsAgent] Saved to ${outputFile}`);
    
  } catch (err) {
    console.error('[NewsAgent] Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

run();