import { loadClientPortfolio } from './portfolio.js';
import { fetchAllNews } from './finnhub.js';
import { classifyArticles } from './classifier.js';
import { CONFIG } from './config.js';

function filterByRelevance(news, minRelevance = CONFIG.news.minRelevance) {
  return news.filter(n => n.relevanceScore >= minRelevance);
}

function sortByRelevance(news) {
  return [...news].sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function buildSummary(news) {
  const byCategory = { GEOPOLITICAL: 0, ECONOMIC: 0, COMPANY_SPECIFIC: 0 };
  let highRelevance = 0;
  let actionable = 0;

  news.forEach(n => {
    byCategory[n.category]++;
    if (n.relevanceScore >= 0.7) highRelevance++;
    if (n.actionable) actionable++;
  });

  const topRisks = [];
  const geoNews = news.filter(n => n.category === 'GEOPOLITICAL' && n.relevanceScore >= 0.6);
  const ecoNews = news.filter(n => n.category === 'ECONOMIC' && n.relevanceScore >= 0.6);
  const compNews = news.filter(n => n.category === 'COMPANY_SPECIFIC' && n.relevanceScore >= 0.6);

  if (geoNews.length) topRisks.push(`${geoNews.length} geopolitical items with high relevance`);
  if (ecoNews.length) topRisks.push(`${ecoNews.length} economic items with high relevance`);
  if (compNews.length) topRisks.push(`${compNews.length} company-specific items with high relevance`);

  return {
    totalArticles: news.length,
    byCategory,
    highRelevanceCount: highRelevance,
    actionableCount: actionable,
    topRisks: topRisks.slice(0, 5)
  };
}

export async function analyzeClientNews(clientId, options = {}) {
  const {
    lookbackDays = CONFIG.news.lookbackDays,
    maxArticles = 100,
    minRelevance = CONFIG.news.minRelevance
  } = options;

  const portfolio = await loadClientPortfolio(clientId);
  const articles = await fetchAllNews(portfolio.tickers, lookbackDays);
  const limitedArticles = articles.slice(0, maxArticles);
  const classified = await classifyArticles(limitedArticles, portfolio);
  const filtered = filterByRelevance(classified, minRelevance);
  const sorted = sortByRelevance(filtered);
  const summary = buildSummary(sorted);

  return {
    clientId,
    generatedAt: new Date().toISOString(),
    portfolioContext: {
      totalValueUsd: portfolio.totalValueUsd,
      snapshotDate: portfolio.snapshotDate,
      topSectors: portfolio.sectors.slice(0, 5).map(s => s.name),
      topRegions: portfolio.regions.slice(0, 5).map(r => r.name),
      assetClasses: portfolio.assetClasses.map(a => a.name),
      singleStockCount: portfolio.singleStocks.length,
      topHoldings: portfolio.topHoldings.slice(0, 8).map(h => ({
        instrumentId: h.instrumentId,
        name: h.name,
        weightPct: h.weightPct
      }))
    },
    news: sorted,
    summary,
    governance: {
      status: 'RM_REVIEW_REQUIRED',
      disclaimer: 'News classification is AI-assisted via NVIDIA NIM; validate sources and relevance before client action. Not investment advice.'
    }
  };
}