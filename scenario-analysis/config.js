export const CONFIG = {
  finnhub: {
    apiKey: process.env.FINNHUB_API_KEY,
    baseUrl: 'https://finnhub.io/api/v1',
    rateLimit: 60,
    cacheTtlMs: 3600000
  },
  nim: {
    apiKey: process.env.NVIDIA_NIM_API_KEY,
    endpoint: process.env.NVIDIA_NIM_ENDPOINT || 'https://integrate.api.nvidia.com/v1',
    model: process.env.NVIDIA_NIM_MODEL || 'meta/llama-3.1-70b-instruct',
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
    holdingsCsv: process.env.HOLDINGS_CSV || 'singhacks-jb-wealth-intelligence/data/holdings.csv',
    instrumentsCsv: process.env.INSTRUMENTS_CSV || 'singhacks-jb-wealth-intelligence/data/instruments.csv',
    tickerMapJson: 'scenario-analysis/ticker-map.json',
    cacheDir: 'scenario-analysis/cache'
  }
};