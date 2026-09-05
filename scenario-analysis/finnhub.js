import fs from 'fs';
import path from 'path';
import { CONFIG } from './config.js';

const CACHE_DIR = CONFIG.paths.cacheDir;
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const RATE_LIMIT_MS = 60000 / CONFIG.finnhub.rateLimit;
let lastCallTime = 0;

async function rateLimit() {
  const now = Date.now();
  const wait = RATE_LIMIT_MS - (now - lastCallTime);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCallTime = Date.now();
}

function getCachePath(key) {
  const safeKey = key.replace(/[^a-zA-Z0-9]/g, '_');
  return path.join(CACHE_DIR, `finnhub_${safeKey}.json`);
}

function readCache(key) {
  const cachePath = getCachePath(key);
  if (!fs.existsSync(cachePath)) return null;
  const data = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  if (Date.now() - data.timestamp > CONFIG.finnhub.cacheTtlMs) return null;
  return data.payload;
}

function writeCache(key, payload) {
  const cachePath = getCachePath(key);
  fs.writeFileSync(cachePath, JSON.stringify({ timestamp: Date.now(), payload }));
}

async function fetchFinnhub(endpoint, params = {}) {
  await rateLimit();
  const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const url = new URL(`${CONFIG.finnhub.baseUrl}${endpoint}`);
  url.searchParams.set('token', CONFIG.finnhub.apiKey);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Finnhub ${endpoint} failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  writeCache(cacheKey, data);
  return data;
}

export async function fetchCompanyNews(symbol, from, to) {
  return fetchFinnhub('/company-news', { symbol, from, to });
}

export async function fetchGeneralNews(category) {
  return fetchFinnhub('/news', { category });
}

export async function fetchAllNews(tickers, lookbackDays = CONFIG.news.lookbackDays) {
  const to = new Date().toISOString().split('T')[0];
  const from = new Date(Date.now() - lookbackDays * 86400000).toISOString().split('T')[0];

  const companyNewsPromises = tickers
    .slice(0, 20)
    .map(symbol => fetchCompanyNews(symbol, from, to)
      .then(articles => articles.map(a => ({ ...a, sourceType: 'company', symbol })))
      .catch(err => { console.warn(`Finnhub company-news failed for ${symbol}:`, err.message); return []; }));

  const categoryPromises = CONFIG.news.categories
    .map(category => fetchGeneralNews(category)
      .then(articles => articles.map(a => ({ ...a, sourceType: 'general', category })))
      .catch(err => { console.warn(`Finnhub general news failed for ${category}:`, err.message); return []; }));

  const [companyResults, categoryResults] = await Promise.all([
    Promise.all(companyNewsPromises),
    Promise.all(categoryPromises)
  ]);

  const allArticles = [...companyResults.flat(), ...categoryResults.flat()];

  const seen = new Set();
  const unique = allArticles.filter(a => {
    const key = a.url || a.headline || JSON.stringify(a);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.map(a => ({
    articleId: `finnhub-${a.id || a.url?.split('/').pop() || Math.random().toString(36).slice(2)}`,
    title: a.headline || a.title || 'Untitled',
    url: a.url,
    source: a.source || 'Finnhub',
    publishedAt: a.datetime ? new Date(a.datetime * 1000).toISOString() : new Date().toISOString(),
    summary: a.summary || a.description || '',
    sourceType: a.sourceType,
    symbol: a.symbol,
    category: a.category
  }));
}