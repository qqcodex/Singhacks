import { analyzeClientNews } from './agent.js';

const clientId = process.argv[2] || 'CL-0001';

console.log(`\n=== Analyzing news for ${clientId} ===\n`);

try {
  const result = await analyzeClientNews(clientId, { lookbackDays: 7, maxArticles: 50 });
  
  console.log(`Client: ${result.clientId}`);
  console.log(`Generated: ${result.generatedAt}`);
  console.log(`Portfolio Value: $${result.portfolioContext.totalValueUsd.toLocaleString()}`);
  console.log(`Top Sectors: ${result.portfolioContext.topSectors.join(', ')}`);
  console.log(`Single Stocks: ${result.portfolioContext.singleStockCount}`);
  console.log(`\n--- News Summary ---`);
  console.log(`Total Articles: ${result.summary.totalArticles}`);
  console.log(`By Category: GEOPOLITICAL=${result.summary.byCategory.GEOPOLITICAL}, ECONOMIC=${result.summary.byCategory.ECONOMIC}, COMPANY_SPECIFIC=${result.summary.byCategory.COMPANY_SPECIFIC}`);
  console.log(`High Relevance (>=0.7): ${result.summary.highRelevanceCount}`);
  console.log(`Actionable: ${result.summary.actionableCount}`);
  console.log(`Top Risks: ${result.summary.topRisks.join('; ') || 'None'}`);
  
  console.log(`\n--- Top 5 Articles ---`);
  result.news.slice(0, 5).forEach((n, i) => {
    console.log(`\n${i + 1}. [${n.category}] ${n.title}`);
    console.log(`   Relevance: ${n.relevanceScore.toFixed(2)} | Actionable: ${n.actionable} | Confidence: ${n.confidence.toFixed(2)}`);
    console.log(`   Related: ${n.relatedHoldings.join(', ') || 'None'}`);
    console.log(`   Summary: ${n.summary}`);
    console.log(`   Source: ${n.source} | ${n.publishedAt}`);
  });

  if (result.news.length > 5) {
    console.log(`\n... and ${result.news.length - 5} more articles`);
  }
  
  console.log(`\n=== Done ===`);
} catch (err) {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
}