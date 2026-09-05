// synthesisAgent.js - Updated version

// Add this function to generate actionable steps
function generateActionableSteps(risks, analytics) {
  const steps = [];
  
  risks.slice(0, 5).forEach(risk => {
    let action = '';
    let priority = 'MEDIUM';
    
    switch(risk.category) {
      case 'CONCENTRATION':
        action = `Diversify the ${risk.title.split(' in ')[1] || 'concentrated position'} by reallocating ${Math.min(30, Math.round(risk.evidence?.[0]?.value?.replace('%', '') || 15))}% of the exposure into broader market ETFs or sector-neutral strategies.`;
        priority = 'HIGH';
        break;
      case 'LIQUIDITY':
        action = `Increase liquid reserves from ${analytics.liquidity.liquidWeightPct?.toFixed(1) || 'current'}% to at least 20% of portfolio. Consider redeeming from ${analytics.liquidity.illiquidWeightPct > 30 ? 'illiquid private credit/real estate' : 'less liquid positions'} to meet short-term obligations.`;
        priority = 'HIGH';
        break;
      case 'CURRENCY':
        action = `Hedge ${Math.round(risk.evidence?.[0]?.value?.replace('%', '') || 0)}% of the non-base currency exposure using forward contracts or currency-hedged instruments. Prioritize currencies with the highest volatility.`;
        priority = 'MEDIUM';
        break;
      case 'CREDIT':
        action = `Reduce LTV from ${risk.evidence?.[0]?.value?.split('/')[0]?.trim() || 'current'}% to below 65% by either paying down ${Math.round(analytics.credit[0]?.drawn * 0.15) || 100000} of the facility or adding collateral. Review within 30 days.`;
        priority = 'HIGH';
        break;
      case 'MANDATE':
        action = `Rebalance ${risk.title.replace('Mandate exception: ', '')} position to comply with ${analytics.client.risk_profile} mandate. Expected adjustment: ${Math.round(risk.evidence?.[0]?.actualPct - risk.maxPct || 5)}% reduction required.`;
        priority = 'HIGH';
        break;
      case 'HIDDEN_RISK':
        action = `Conduct a source-of-wealth review to identify overlaps between portfolio exposures and client's operating business. Schedule a meeting with the client to discuss diversification options.`;
        priority = 'HIGH';
        break;
      case 'MARKET_EVENT':
        action = `Review the ${risk.title.split(' ').slice(0,3).join(' ')} impact on portfolio. Consider implementing a 3-6 month tactical hedge or reducing exposure to the most affected sectors (${analytics.concentration.bySector.slice(0,2).map(s => s.name).join(', ')}).`;
        priority = 'MEDIUM';
        break;
      default:
        action = `Review and address: ${risk.title}. Consult with appropriate specialists (tax, legal, or compliance) as needed.`;
        priority = 'MEDIUM';
    }
    
    steps.push({
      riskId: risk.id,
      title: risk.title,
      action: action.substring(0, 1000), // Ensure max 1000 chars for DB
      priority: priority,
      severity: risk.severity,
      timeline: priority === 'HIGH' ? 'Immediate (within 30 days)' : 'Near-term (within 90 days)',
      responsibleParty: risk.category === 'CREDIT' ? 'Credit Team' : 
                       risk.category === 'MANDATE' ? 'Compliance' : 'Relationship Manager',
    });
  });
  
  return steps;
}
async function answerQuestion(question, risks, historicalEvents, webResearch, client, analytics) {
  if (!question || !question.trim()) return null;
  if (!process.env.GEMINI_API_KEY) return null;
  // ... (your full implementation from earlier)
  // For now, return a mock if you just want to test the flow:
  return {
    response: "This is a mock answer. Please set GEMINI_API_KEY for real answers.",
    evidence: [],
    relatedEvents: [],
    webContext: [],
    governance: "Mock response for testing."
  };
}
// Update the synthesizeReport function
function synthesizeReport({ analytics, risks, historicalEvents, webResearch, question, answer }) {
  const high = risks.filter((risk) => risk.severity === 'HIGH');
  const actionableSteps = generateActionableSteps(risks, analytics);
  
  return {
    generatedAt: new Date().toISOString(),
    question,
    governance: {
      status: 'RM_REVIEW_REQUIRED',
      disclaimer: 'Decision support for the hackathon only; not investment advice. Validate data, suitability, tax, mandate status, and current market sources before acting.',
    },
    workflow: {
      stages: ['orchestrator', 'portfolio-analysis', 'event-log', 'client-context', 'historical-agent', 'web-research', 'risk-agent', 'hidden-risks', 'synthesis-agent', 'json'],
      webResearchStatus: webResearch.status,
    },
    client: {
      id: analytics.client.client_id,
      name: analytics.client.client_name,
      riskProfile: analytics.client.risk_profile,
      baseCurrency: analytics.client.base_currency,
      objectives: analytics.client.objectives,
    },
    summary: {
      riskLevel: high.length >= 2 ? 'HIGH' : high.length ? 'MEDIUM_HIGH' : 'MODERATE',
      headline: high[0]?.title || 'No high-priority deterministic alert was found.',
      confidence: webResearch.status === 'live' ? 0.84 : 0.8,
      portfolioChangePct: analytics.portfolioChangePct,
    },
    riskMetrics: {
      totalAumUsd: analytics.total,
      largestPositionPct: analytics.concentration.largestPosition?.weightPct || 0,
      topFiveWeightPct: analytics.concentration.topFiveWeightPct,
      liquidAssetPct: analytics.liquidity.liquidWeightPct,
      illiquidAssetPct: analytics.liquidity.illiquidWeightPct,
      liquidityCoverageRatio: analytics.liquidity.coverageRatio,
      ltv: analytics.credit.map((facility) => facility.ltvPct),
    },
    risks,
    hiddenRisks: risks.filter((risk) => risk.category === 'HIDDEN_RISK' || risk.category === 'MARKET_EVENT'),
    historicalEvents,
    webResearch,
    recommendations: risks.slice(0, 3).map((risk, index) => ({
      priority: risk.severity,
      action: index === 0
        ? 'Prepare an RM-led review with the client and validate the underlying exposures plus current market context.'
        : 'Review this exposure against the mandate, objectives, cash-flow plan, and relevant market developments.',
      reason: risk.description,
      riskAddressed: risk.id,
    })),
    // NEW: Actionable steps for implementation
    actionableSteps: actionableSteps,
    evidence: {
      allocation: analytics.concentration.byAssetClass,
      currencies: analytics.concentration.byCurrency,
      sectors: analytics.concentration.bySector,
      notes: analytics.notes.map((note) => ({ date: note.note_date, channel: note.channel, note: note.note })),
    },
    sources: [
      ...historicalEvents.map((event) => event.source),
      ...webResearch.insights.map((insight) => ({ title: insight.title, publisher: insight.source, url: insight.url })),
    ],
    answer,
  };
}
module.exports = { synthesizeReport, answerQuestion };