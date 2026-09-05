function round(value) { return Math.round(value * 10) / 10; }
function discoverRisks(analytics, historicalEvents = [], webResearch = { insights: [] }) {
  const risks = [];
  const { concentration, liquidity, credit, mandateBreaches, client, notes } = analytics;
  if (concentration.largestPosition?.weightPct >= 10) risks.push({ id: 'concentration', severity: concentration.largestPosition.weightPct >= 20 ? 'HIGH' : 'MEDIUM', category: 'CONCENTRATION', title: `Single-position concentration in ${concentration.largestPosition.name}`, description: `${round(concentration.largestPosition.weightPct)}% of aggregate portfolio value is in this one position.`, evidence: [{ metric: 'Aggregate client exposure', value: `${round(concentration.largestPosition.weightPct)}%` }] });
  if (concentration.topFiveWeightPct >= 50) risks.push({ id: 'aggregate-concentration', severity: 'HIGH', category: 'HIDDEN_RISK', title: 'Client-level concentration is higher than portfolio-level reports imply', description: `The five largest exposures make up ${round(concentration.topFiveWeightPct)}% after combining all client portfolios. This may not be visible in separate portfolio views.`, evidence: [{ metric: 'Top five exposure', value: `${round(concentration.topFiveWeightPct)}%` }] });
  const nonBase = concentration.byCurrency.filter((x) => x.name !== client.base_currency).reduce((sum, x) => sum + x.weightPct, 0);
  if (nonBase >= 40) risks.push({ id: 'currency', severity: nonBase >= 65 ? 'HIGH' : 'MEDIUM', category: 'CURRENCY', title: `${round(nonBase)}% non-${client.base_currency} currency exposure`, description: `Material currency exposure should be assessed against the client's liabilities and future spending currency.`, evidence: [{ metric: 'Non-base currency exposure', value: `${round(nonBase)}%` }] });
  if (liquidity.coverageRatio !== null && liquidity.coverageRatio < 1.5) risks.push({ id: 'liquidity', severity: liquidity.coverageRatio < 1 ? 'HIGH' : 'MEDIUM', category: 'LIQUIDITY', title: 'Liquid assets may not comfortably cover known demands', description: `Liquid assets cover ${round(liquidity.coverageRatio)}× known cash needs and uncalled commitments; timing and currency must be validated.`, evidence: [{ metric: 'Liquidity coverage', value: `${round(liquidity.coverageRatio)}×` }] });
  credit.forEach((facility) => { if (facility.ltvPct >= facility.marginCallLtvPct * 0.85) risks.push({ id: `credit-${facility.facilityId}`, severity: facility.ltvPct >= facility.marginCallLtvPct ? 'HIGH' : 'MEDIUM', category: 'CREDIT', title: 'Collateral headroom is constrained', description: `Current LTV is ${round(facility.ltvPct)}% versus a ${round(facility.marginCallLtvPct)}% margin-call trigger.`, evidence: [{ metric: 'LTV / trigger', value: `${round(facility.ltvPct)}% / ${round(facility.marginCallLtvPct)}%` }] }); });
  mandateBreaches.forEach((breach, index) => risks.push({ id: `mandate-${index}`, severity: 'HIGH', category: 'MANDATE', title: `Mandate exception: ${breach.assetClass || breach.instrument}`, description: `${breach.portfolio} has a ${breach.type.replace('_', ' ')} exception that needs RM review, documentation, or remediation.`, evidence: [{ metric: 'Portfolio', value: breach.portfolio }] }));
  if (notes.some((note) => /same bet|diversify away|not tied|concentrat/i.test(note.note))) risks.push({ id: 'economic-wealth', severity: 'HIGH', category: 'HIDDEN_RISK', title: 'Portfolio exposure may reinforce the client’s operating-wealth risk', description: 'RM notes indicate a potential overlap between portfolio exposures and the client’s source of wealth. Validate the look-through exposure before discussing diversification.', evidence: [{ metric: 'Source', value: 'RM notes and source-of-wealth context' }] });
  if (webResearch.status === 'live' && webResearch.insights?.length && historicalEvents.length) risks.push({
    id: 'market-event-context',
    severity: historicalEvents.some((event) => event.severity?.toLowerCase() === 'high') ? 'HIGH' : 'MEDIUM',
    category: 'MARKET_EVENT',
    title: 'Current market context may amplify existing portfolio risks',
    description: `${webResearch.insights[0].summary} Compare this against the selected historical event-log analogues before client action.`,
    evidence: [{ metric: 'Current source', value: webResearch.insights[0].source || webResearch.status }],
  });
  return risks.sort((a, b) => ({ HIGH: 3, MEDIUM: 2, LOW: 1 }[b.severity] - ({ HIGH: 3, MEDIUM: 2, LOW: 1 }[a.severity]))).slice(0, 8);
}
module.exports = { discoverRisks };
