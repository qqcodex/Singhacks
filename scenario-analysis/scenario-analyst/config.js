import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

export const CONFIG = {
  nim: {
    apiKey: process.env.NVIDIA_API_KEY || process.env.NVIDIA_NIM_API_KEY,
    endpoint: process.env.NVIDIA_NIM_ENDPOINT || 'https://integrate.api.nvidia.com/v1',
    model: process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-ultra',
    maxTokens: 8192,
    temperature: 0.1
  },
  scenario: {
    lookbackEventsDays: parseInt(process.env.SCENARIO_LOOKBACK_DAYS) || 180,
    minNewsForScenario: parseInt(process.env.MIN_NEWS_FOR_SCENARIO) || 3
  },
  paths: {
    holdingsCsv: path.join(projectRoot, 'singhacks-jb-wealth-intelligence', 'data', 'holdings.csv'),
    instrumentsCsv: path.join(projectRoot, 'singhacks-jb-wealth-intelligence', 'data', 'instruments.csv'),
    clientsCsv: path.join(projectRoot, 'singhacks-jb-wealth-intelligence', 'data', 'clients.csv'),
    eventLogCsv: path.join(projectRoot, 'singhacks-jb-wealth-intelligence', 'data', 'event_log.csv'),
    tickerMapJson: path.join(__dirname, 'ticker-map.json'),
    cacheDir: path.join(__dirname, 'cache')
  }
};