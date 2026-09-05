const { calculateAnalytics } = require('../analytics/portfolio');
const { researchEvents } = require('./historicalAgent');
const { discoverRisks } = require('./riskAgent');
const { researchWeb } = require('./webResearchAgent');
const { synthesizeReport } = require('./synthesisAgent');

async function analyze(data, clientId, question = '') {
  const analytics = calculateAnalytics(data, clientId);
  if (!analytics) return null;
  const historicalEvents = researchEvents(data.events, analytics);
  const webResearch = await researchWeb(analytics, historicalEvents, question);
  const risks = discoverRisks(analytics, historicalEvents, webResearch);
  return synthesizeReport({ analytics, risks, historicalEvents, webResearch, question });
}
module.exports = { analyze };
