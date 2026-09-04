const { calculateAnalytics } = require('../analytics/portfolio');
const { researchEvents } = require('./historicalAgent');
const { discoverRisks } = require('./riskAgent');
function analyze(data, clientId, question = '') {
  const analytics = calculateAnalytics(data, clientId);
  if (!analytics) return null;
  const risks = discoverRisks(analytics);
  const historicalEvents = researchEvents(data.events, analytics);
  const high = risks.filter((risk) => risk.severity === 'HIGH');
  return {
    generatedAt: new Date().toISOString(), question, governance: { status: 'RM_REVIEW_REQUIRED', disclaimer: 'Decision support for the hackathon only; not investment advice. Validate data, suitability, tax, and mandate status before acting.' },
    client: { id: analytics.client.client_id, name: analytics.client.client_name, riskProfile: analytics.client.risk_profile, baseCurrency: analytics.client.base_currency, objectives: analytics.client.objectives },
    summary: { riskLevel: high.length >= 2 ? 'HIGH' : high.length ? 'MEDIUM_HIGH' : 'MODERATE', headline: high[0]?.title || 'No high-priority deterministic alert was found.', confidence: 0.8, portfolioChangePct: analytics.portfolioChangePct },
    riskMetrics: { totalAumUsd: analytics.total, largestPositionPct: analytics.concentration.largestPosition?.weightPct || 0, topFiveWeightPct: analytics.concentration.topFiveWeightPct, liquidAssetPct: analytics.liquidity.liquidWeightPct, illiquidAssetPct: analytics.liquidity.illiquidWeightPct, liquidityCoverageRatio: analytics.liquidity.coverageRatio, ltv: analytics.credit.map((f) => f.ltvPct) },
    risks, historicalEvents,
    recommendations: risks.slice(0, 3).map((risk, index) => ({ priority: risk.severity, action: index === 0 ? 'Prepare an RM-led review with the client and validate the underlying exposures.' : 'Review this exposure against the mandate, objectives, and cash-flow plan.', reason: risk.description, riskAddressed: risk.id })),
    evidence: { allocation: analytics.concentration.byAssetClass, currencies: analytics.concentration.byCurrency, sectors: analytics.concentration.bySector, notes: analytics.notes.map((n) => ({ date: n.note_date, channel: n.channel, note: n.note })) },
    sources: historicalEvents.map((event) => event.source),
  };
}
module.exports = { analyze };
