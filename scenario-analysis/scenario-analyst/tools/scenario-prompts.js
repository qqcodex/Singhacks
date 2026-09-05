import { CONFIG } from '../config.js';

export function buildScenarioPrompt(newsResult, portfolioContext, clientProfile, events) {
  const newsSummary = newsResult.news
    .filter(n => n.relevanceScore >= 0.5)
    .slice(0, 20)
    .map(n => 
      `- [${n.category}] ${n.title} (relevance: ${n.relevanceScore.toFixed(2)})\n  Holdings: ${n.relatedHoldings.join(', ') || 'None'}\n  Summary: ${n.summary}\n  Actionable: ${n.actionable}`
    ).join('\n\n');

  const eventsText = formatEventsForPrompt(events);

  const systemPrompt = `You are a senior private-bank scenario analyst. Generate structured scenario analysis for a Relationship Manager preparing for a client meeting.

CLIENT PROFILE:
- Name: ${clientProfile.clientName}
- Age: ${clientProfile.age}
- Risk Profile: ${clientProfile.riskProfile}
- Life Stage: ${clientProfile.lifeStage}
- Source of Wealth: ${clientProfile.sourceOfWealth}
- Objectives: ${clientProfile.objectives}
- Base Currency: ${clientProfile.baseCurrency}
- Investment Horizon: ${clientProfile.investmentHorizonYears} years
- Liquidity Needs: ${clientProfile.liquidityNeeds}

PORTFOLIO CONTEXT (as of ${portfolioContext.snapshotDate}):
- Total Value: $${portfolioContext.totalValueUsd.toLocaleString()}
- Top Sectors: ${portfolioContext.sectorNames}
- Top Regions: ${portfolioContext.regionNames}
- Asset Classes: ${portfolioContext.assetClassNames}
- Top Holdings: ${portfolioContext.topHoldingNames}
- Single Stocks: ${portfolioContext.singleStockNames || 'None'}

RELEVANT NEWS (classified by your news agent):
${newsSummary}

HISTORICAL CONTEXT (authoritative event log):
${eventsText}

TASK: Generate a comprehensive scenario analysis with the following JSON structure. Output ONLY valid JSON - no markdown, no extra text, no thinking.

{
  "positiveScenario": {
    "narrative": "2-3 paragraph bull case story connecting news drivers to portfolio outcomes",
    "keyDrivers": ["driver1", "driver2", "driver3"],
    "probability": 0.0-1.0,
    "portfolioImpact": {
      "expectedReturnPct": 0.0,
      "keyHoldingsAffected": ["instrument_id"],
      "rationale": "why these holdings benefit"
    }
  },
  "negativeScenario": {
    "narrative": "2-3 paragraph bear case story connecting news drivers to portfolio risks",
    "keyDrivers": ["driver1", "driver2", "driver3"],
    "probability": 0.0-1.0,
    "portfolioImpact": {
      "expectedReturnPct": 0.0,
      "keyHoldingsAffected": ["instrument_id"],
      "rationale": "why these holdings suffer"
    }
  },
  "defensePositive": {
    "arguments": ["argument supporting upside"],
    "supportingData": ["data point from news or portfolio"],
    "hedgesInPlace": ["existing portfolio hedges"]
  },
  "defenseNegative": {
    "arguments": ["argument supporting downside risk"],
    "supportingData": ["data point from news or portfolio"],
    "mitigations": ["actionable risk mitigations"]
  },
  "rmTalkingPoints": [
    "Balanced point 1 for client conversation",
    "Balanced point 2"
  ],
  "governance": {
    "status": "RM_REVIEW_REQUIRED",
    "generatedAt": "${new Date().toISOString()}",
    "disclaimer": "Scenario analysis is AI-assisted; validate assumptions before client action. Not investment advice."
  }
}

RULES:
- Probabilities must sum to ~1.0 (positive + negative ≈ 1.0)
- keyDrivers: max 5, specific to news items
- portfolioImpact.expectedReturnPct: realistic range (-20 to +20)
- keyHoldingsAffected: use instrument_id from portfolio context
- hedgesInPlace: reference actual portfolio positions (gold, short duration, macro fund, etc.)
- rmTalkingPoints: max 6, balanced, actionable for RM`;

  const userPrompt = `Generate the scenario analysis JSON now.`;

  return { systemPrompt, userPrompt };
}

function formatEventsForPrompt(events) {
  if (!events.length) return 'No relevant historical events in lookback period.';
  
  return events.map(e => 
    `- ${e.eventDate} [${e.severity}] ${e.eventType} (${e.region}): ${e.description}\n  Transmission: ${e.primaryTransmission}`
  ).join('\n');
}