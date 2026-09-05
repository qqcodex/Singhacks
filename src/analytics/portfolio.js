const CURRENT_DATE = '2026-08-26';
const BASELINE_DATE = '2025-12-31';
const liquidTiers = new Set(['Daily', 'Weekly']);
const number = (value) => Number(value || 0);
const pct = (value, total) => total ? (value / total) * 100 : 0;
const groupedSum = (rows, field, valueField = 'market_value_usd') => rows.reduce((map, row) => {
  const key = row[field] || 'Unclassified';
  map[key] = (map[key] || 0) + number(row[valueField]);
  return map;
}, {});

function ranking(map, total) {
  return Object.entries(map).map(([name, value]) => ({ name, value, weightPct: pct(value, total) }))
    .sort((a, b) => b.value - a.value);
}

function getClientContext(data, clientId) {
  const client = data.clients.find((item) => item.client_id === clientId);
  if (!client) return null;
  const portfolios = data.portfolios.filter((item) => item.client_id === clientId);
  const ids = new Set(portfolios.map((item) => item.portfolio_id));
  const current = data.holdings.filter((item) => item.client_id === clientId && item.snapshot_date === CURRENT_DATE);
  const baseline = data.holdings.filter((item) => item.client_id === clientId && item.snapshot_date === BASELINE_DATE);
  return { client, portfolios, ids, current, baseline };
}

function calculateAnalytics(data, clientId) {
  const context = getClientContext(data, clientId);
  if (!context) return null;
  const { client, portfolios, ids, current, baseline } = context;
  const total = current.reduce((sum, item) => sum + number(item.market_value_usd), 0);
  const baselineTotal = baseline.reduce((sum, item) => sum + number(item.market_value_usd), 0);
  const byInstrument = ranking(groupedSum(current, 'instrument_name'), total);
  const byAssetClass = ranking(groupedSum(current, 'asset_class'), total);
  const byCurrency = ranking(groupedSum(current, 'instrument_ccy'), total);
  const bySector = ranking(groupedSum(current, 'sector'), total);
  const liquidValue = current.filter((item) => liquidTiers.has(item.liquidity_tier)).reduce((sum, item) => sum + number(item.market_value_usd), 0);
  const illiquidValue = current.filter((item) => ['Quarterly Gate', 'Illiquid'].includes(item.liquidity_tier)).reduce((sum, item) => sum + number(item.market_value_usd), 0);
  const commitments = data.commitments.filter((item) => item.client_id === clientId);
  const uncalled = commitments.reduce((sum, item) => sum + number(item.uncalled), 0);
  const cashNeeds = data.cashNeeds.filter((item) => item.client_id === clientId);
  const knownCashNeeds = cashNeeds.filter((item) => item.certainty !== 'Aspirational').reduce((sum, item) => sum + number(item.amount), 0);
  const facilities = data.creditFacilities.filter((item) => item.client_id === clientId);
  const credit = facilities.map((facility) => ({
    facilityId: facility.facility_id, portfolioId: facility.collateral_portfolio_id,
    drawn: number(facility[`drawn_${CURRENT_DATE}`]), ltvPct: number(facility[`ltv_pct_${CURRENT_DATE}`]),
    marginCallLtvPct: number(facility.margin_call_ltv_pct), headroom: number(facility[`headroom_${CURRENT_DATE}`]),
  }));
  const mandateBreaches = portfolios.filter((p) => p.service_model !== 'Custody').flatMap((portfolio) => {
    const holdings = current.filter((h) => h.portfolio_id === portfolio.portfolio_id);
    const totalValue = holdings.reduce((sum, h) => sum + number(h.market_value_usd), 0);
    const mandate = data.mandates.filter((m) => m.mandate_code === portfolio.mandate_code);
    const allocation = groupedSum(holdings, 'asset_class');
    const allocationBreaches = mandate.flatMap((rule) => {
      const weight = pct(allocation[rule.asset_class] || 0, totalValue);
      return weight > number(rule.max_pct) + 0.01 || weight < number(rule.min_pct) - 0.01
        ? [{ portfolio: portfolio.portfolio_name, type: 'allocation', assetClass: rule.asset_class, actualPct: weight, minPct: number(rule.min_pct), maxPct: number(rule.max_pct) }] : [];
    });
    const singleLimit = number(mandate[0]?.max_single_position_pct);
    const positionBreaches = holdings.filter((h) => h.weight_pct > singleLimit && h.weight_pct && singleLimit)
      .map((h) => ({ portfolio: portfolio.portfolio_name, type: 'single_position', instrument: h.instrument_name, actualPct: number(h.weight_pct), maxPct: singleLimit }));
    const sustainabilityBreaches = holdings.filter((h) => data.instruments.find((i) => i.instrument_id === h.instrument_id)?.sustainability_excluded === 'Y' && portfolio.mandate_code === 'SUSBAL')
      .map((h) => ({ portfolio: portfolio.portfolio_name, type: 'sustainability_exclusion', instrument: h.instrument_name }));
    return [...allocationBreaches, ...positionBreaches, ...sustainabilityBreaches];
  });
  return {
    client, portfolios, total, baselineTotal, portfolioChange: total - baselineTotal, portfolioChangePct: pct(total - baselineTotal, baselineTotal),
    concentration: { largestPosition: byInstrument[0], topFiveWeightPct: byInstrument.slice(0, 5).reduce((sum, item) => sum + item.weightPct, 0), byInstrument, byAssetClass, byCurrency, bySector },
    liquidity: { liquidValue, liquidWeightPct: pct(liquidValue, total), illiquidValue, illiquidWeightPct: pct(illiquidValue, total), uncalledCommitments: uncalled, knownCashNeeds, coverageRatio: (uncalled + knownCashNeeds) ? liquidValue / (uncalled + knownCashNeeds) : null, cashNeeds },
    credit, mandateBreaches,
    notes: data.notes.filter((item) => item.client_id === clientId),
  };
}

export { calculateAnalytics };
