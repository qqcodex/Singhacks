const { calculateAnalytics } = require('../analytics/portfolio');
const { researchEvents } = require('./historicalAgent');
const { discoverRisks } = require('./riskAgent');
const { researchWeb } = require('./webResearchAgent');
const { synthesizeReport, answerQuestion } = require('./synthesisAgent');

async function analyze(data, clientId, question = '') {
  const analytics = calculateAnalytics(data, clientId);
  if (!analytics) return null;
  
  const historicalEvents = researchEvents(data.events, analytics);
  const webResearch = await researchWeb(analytics, historicalEvents, question);
  const risks = discoverRisks(analytics, historicalEvents, webResearch);
  
  // Call answerQuestion with full context if question is provided
  let answer = null;
  if (question.trim()) {
    answer = await answerQuestion(question, risks, historicalEvents, webResearch, analytics.client, analytics);
  }
  
  return synthesizeReport({ analytics, risks, historicalEvents, webResearch, question, answer });
}
module.exports = { synthesizeReport, answerQuestion };