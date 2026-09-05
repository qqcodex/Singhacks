import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

export const CONFIG = {
  finnhub: {
    apiKey: process.env.Finnhub_API_KEY || process.env.FINNHUB_API_KEY,
    baseUrl: 'https://finnhub.io/api/v1',
    rateLimit: 60,
    cacheTtlMs: 3600000
  },
  nim: {
    apiKey: process.env.NVIDIA_API_KEY || process.env.NVIDIA_NIM_API_KEY,
    endpoint: process.env.NVIDIA_NIM_ENDPOINT || 'https://integrate.api.nvidia.com/v1',
    model: process.env.NVIDIA_MODEL || process.env.NVIDIA_NIM_MODEL || 'meta/llama-3.1-70b-instruct',
    maxTokens: 4096,
    temperature: 0.1
  },
  news: {
    lookbackDays: parseInt(process.env.NEWS_LOOKBACK_DAYS) || 7,
    maxArticlesPerSymbol: parseInt(process.env.MAX_ARTICLES_PER_SYMBOL) || 10,
    maxGeneralArticles: parseInt(process.env.MAX_GENERAL_ARTICLES) || 20,
    minRelevance: parseFloat(process.env.MIN_RELEVANCE) || 0.3,
    categories: ['general', 'forex', 'crypto', 'merger']
  },
  paths: {
    holdingsCsv: path.join(projectRoot, 'singhacks-jb-wealth-intelligence', 'data', 'holdings.csv'),
    instrumentsCsv: path.join(projectRoot, 'singhacks-jb-wealth-intelligence', 'data', 'instruments.csv'),
    tickerMapJson: path.join(__dirname, 'ticker-map.json'),
    cacheDir: path.join(__dirname, 'cache')
  }
};