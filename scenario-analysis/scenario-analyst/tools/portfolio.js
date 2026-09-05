import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { CONFIG } from '../config.js';

const CURRENT_SNAPSHOT = '2026-08-26';

function loadCsv(filePath) {
  const fullPath = path.resolve(filePath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true });
}

function loadTickerMap() {
  const content = fs.readFileSync(CONFIG.paths.tickerMapJson, 'utf-8');
  return JSON.parse(content);
}

function getLatestSnapshotHoldings(clientId, holdings) {
  return holdings
    .filter(h => h.client_id === clientId && h.snapshot_date === CURRENT_SNAPSHOT)
    .map(h => ({
      instrumentId: h.instrument_id,
      instrumentName: h.instrument_name,
      assetClass: h.asset_class,
      subAssetClass: h.sub_asset_class,
      sector: h.sector,
      region: h.region,
      currency: h.instrument_ccy,
      quantity: parseFloat(h.quantity),
      priceLocal: parseFloat(h.price_local),
      marketValueUsd: parseFloat(h.market_value_usd),
      weightPct: parseFloat(h.weight_pct),
      liquidityTier: h.liquidity_tier
    }));
}

function enrichWithInstruments(holdings, instruments) {
  const instMap = new Map(instruments.map(i => [i.instrument_id, i]));
  return holdings.map(h => {
    const inst = instMap.get(h.instrumentId);
    return {
      ...h,
      underlyingReference: inst?.underlying_reference || '',
      sustainabilityExcluded: inst?.sustainability_excluded === 'Y',
      concentrationLimitApplies: inst?.concentration_limit_applies === 'Y'
    };
  });
}

function extractSectors(holdings) {
  const sectorMap = new Map();
  holdings.forEach(h => {
    const key = h.sector || 'Unknown';
    sectorMap.set(key, (sectorMap.get(key) || 0) + h.marketValueUsd);
  });
  const total = holdings.reduce((sum, h) => sum + h.marketValueUsd, 0);
  return Array.from(sectorMap.entries())
    .map(([name, value]) => ({ name, value, weightPct: (value / total) * 100 }))
    .sort((a, b) => b.value - a.value);
}

function extractRegions(holdings) {
  const regionMap = new Map();
  holdings.forEach(h => {
    const key = h.region || 'Unknown';
    regionMap.set(key, (regionMap.get(key) || 0) + h.marketValueUsd);
  });
  const total = holdings.reduce((sum, h) => sum + h.marketValueUsd, 0);
  return Array.from(regionMap.entries())
    .map(([name, value]) => ({ name, value, weightPct: (value / total) * 100 }))
    .sort((a, b) => b.value - a.value);
}

function extractAssetClasses(holdings) {
  const classMap = new Map();
  holdings.forEach(h => {
    const key = h.assetClass || 'Unknown';
    classMap.set(key, (classMap.get(key) || 0) + h.marketValueUsd);
  });
  const total = holdings.reduce((sum, h) => sum + h.marketValueUsd, 0);
  return Array.from(classMap.entries())
    .map(([name, value]) => ({ name, value, weightPct: (value / total) * 100 }))
    .sort((a, b) => b.value - a.value);
}

function getTopHoldings(holdings, n = 10) {
  return holdings
    .sort((a, b) => b.marketValueUsd - a.marketValueUsd)
    .slice(0, n)
    .map(h => ({ instrumentId: h.instrumentId, name: h.instrumentName, weightPct: h.weightPct, assetClass: h.assetClass }));
}

export async function loadPortfolioContext(clientId) {
  const holdings = loadCsv(CONFIG.paths.holdingsCsv);
  const instruments = loadCsv(CONFIG.paths.instrumentsCsv);
  const tickerMap = loadTickerMap();

  const clientHoldings = getLatestSnapshotHoldings(clientId, holdings);
  const enriched = enrichWithInstruments(clientHoldings, instruments);
  const sectors = extractSectors(enriched);
  const regions = extractRegions(enriched);
  const assetClasses = extractAssetClasses(enriched);
  const topHoldings = getTopHoldings(enriched);
  const totalValueUsd = enriched.reduce((sum, h) => sum + h.marketValueUsd, 0);

  const singleStocks = enriched.filter(h => h.subAssetClass === 'Single Stock');
  const singleStockNames = singleStocks.map(s => s.instrumentName).join(', ');
  const sectorNames = sectors.slice(0, 8).map(s => s.name).join(', ');
  const regionNames = regions.slice(0, 8).map(r => r.name).join(', ');
  const assetClassNames = assetClasses.map(a => a.name).join(', ');
  const topHoldingNames = topHoldings.slice(0, 8).map(h => h.name).join(', ');

  return {
    clientId,
    snapshotDate: CURRENT_SNAPSHOT,
    totalValueUsd,
    holdings: enriched,
    sectors: sectors.slice(0, 10),
    regions: regions.slice(0, 10),
    assetClasses,
    topHoldings,
    singleStockNames,
    sectorNames,
    regionNames,
    assetClassNames,
    topHoldingNames,
    singleStocks: singleStocks.map(s => ({ instrumentId: s.instrumentId, name: s.instrumentName, weightPct: s.weightPct }))
  };
}