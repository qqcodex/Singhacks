import { loadPortfolioContext } from './tools/portfolio.js';
import { loadClientProfile } from './tools/client-profile.js';
import { loadEvents } from './tools/event-log.js';
import { CONFIG } from './config.js';

function validateScenarioOutput(output, portfolioContext) {
  const required = ['positiveScenario', 'negativeScenario', 'defensePositive', 'defenseNegative', 'rmTalkingPoints', 'governance'];
  
  for (const key of required) {
    if (!output[key]) {
      throw new Error(`Missing required field: ${key}`);
    }
  }

  const validCategories = ['positiveScenario', 'negativeScenario'];
  for (const cat of validCategories) {
    const s = output[cat];
    if (!s.narrative || !Array.isArray(s.keyDrivers) || typeof s.probability !== 'number' || !s.portfolioImpact) {
      throw new Error(`Invalid ${cat} structure`);
    }
    if (s.probability < 0 || s.probability > 1) {
      throw new Error(`${cat} probability must be 0-1`);
    }
  }

  const instrumentIds = new Set(portfolioContext.holdings.map(h => h.instrumentId));
  for (const cat of validCategories) {
    for (const id of output[cat].portfolioImpact.keyHoldingsAffected || []) {
      if (!instrumentIds.has(id)) {
        console.warn(`Warning: ${cat} references unknown instrument_id: ${id}`);
      }
    }
  }

  return output;
}

function addDefaults(output) {
  return {
    ...output,
    governance: {
      status: 'RM_REVIEW_REQUIRED',
      generatedAt: new Date().toISOString(),
      disclaimer: 'Scenario analysis is AI-assisted; validate assumptions before client action. Not investment advice.',
      ...output.governance
    }
  };
}

function buildSmartScenarios(newsResult, portfolioContext, clientProfile) {
  const geoNews = newsResult.news.filter(n => n.category === 'GEOPOLITICAL' && n.relevanceScore >= 0.5);
  const ecoNews = newsResult.news.filter(n => n.category === 'ECONOMIC' && n.relevanceScore >= 0.5);
  const compNews = newsResult.news.filter(n => n.category === 'COMPANY_SPECIFIC' && n.relevanceScore >= 0.5);
  
  const highRelevanceGeo = geoNews.filter(n => n.relevanceScore >= 0.7).length;
  const highRelevanceEco = ecoNews.filter(n => n.relevanceScore >= 0.7).length;
  const highRelevanceComp = compNews.filter(n => n.relevanceScore >= 0.7).length;

  const hasEnergyConcentration = portfolioContext.singleStocks.some(s => s.instrumentId === 'SYN-ST-0101');
  const hasGoldHedge = portfolioContext.holdings.some(h => h.instrumentId === 'SYN-CM-0402');
  const hasShortDuration = portfolioContext.holdings.some(h => h.instrumentId === 'SYN-FI-0208');
  const hasMacroFund = portfolioContext.holdings.some(h => h.instrumentId === 'SYN-AL-0303');
  const hasLongTreasury = portfolioContext.holdings.some(h => h.instrumentId === 'SYN-FI-0201');
  const hasTechHoldings = portfolioContext.holdings.some(h => h.instrumentId === 'SYN-EQ-0003');

  const clientName = clientProfile.clientName;
  const riskProfile = clientProfile.riskProfile;
  const objectives = clientProfile.objectives;

  // Probability based on news sentiment
  const geoWeight = highRelevanceGeo * 0.15;
  const ecoWeight = highRelevanceEco * 0.1;
  const basePositive = 0.35;
  let positiveProb = Math.min(0.65, Math.max(0.25, basePositive + (ecoWeight - geoWeight)));
  let negativeProb = Math.round((1 - positiveProb) * 10) / 10;
  
  // Clamp probabilities
  positiveProb = Math.max(0.15, Math.min(0.85, positiveProb));
  negativeProb = Math.max(0.15, Math.min(0.85, 1 - positiveProb));
  // Re-normalize
  const total = positiveProb + negativeProb;
  positiveProb = Math.round((positiveProb / total) * 100) / 100;
  negativeProb = Math.round((negativeProb / total) * 100) / 100;

  // Positive scenario
  const positiveDrivers = [];
  const negativeDrivers = [];
  
  if (geoNews.length) {
    negativeDrivers.push('Middle East tensions escalate, disrupting energy supply through Hormuz');
    positiveDrivers.push('Diplomatic de-escalation normalizes Hormuz traffic and energy flows');
  }
  if (ecoNews.length) {
    const rateNews = ecoNews.filter(n => n.title.toLowerCase().includes('rate') || n.title.toLowerCase().includes('fed') || n.title.toLowerCase().includes('yield'));
    if (rateNews.length) {
      positiveDrivers.push('Fed pivots to rate cuts as inflation moderates');
      negativeDrivers.push('Fed holds rates higher for longer on sticky inflation');
    } else {
      positiveDrivers.push('Soft landing achieved with growth resilience');
      negativeDrivers.push('Recession risk rises as consumer weakens');
    }
  }
  if (compNews.length) {
    positiveDrivers.push('Portfolio companies exceed earnings expectations');
    negativeDrivers.push('Earnings misses and guidance cuts across holdings');
  }
  if (!positiveDrivers.length) positiveDrivers.push('Market sentiment improves on constructive data');
  if (!negativeDrivers.length) negativeDrivers.push('Risk-off sentiment dominates on uncertainty');

  // Expected returns
  const posReturn = Math.round((5 + positiveDrivers.length * 2) * 10) / 10;
  const negReturn = Math.round((-5 - negativeDrivers.length * 1.5) * 10) / 10;

  // Key holdings affected
  const topHoldings = portfolioContext.topHoldings.slice(0, 4).map(h => h.instrumentId);

  return {
    positiveScenario: {
      narrative: `A constructive scenario unfolds where ${geoNews.length ? 'Middle East tensions de-escalate, restoring normal energy flows and reducing geopolitical risk premiums. ' : ''}${ecoNews.length ? 'Central banks successfully engineer a soft landing with inflation moderating, allowing rate cuts that support risk assets. ' : ''}${compNews.length ? 'Portfolio companies deliver resilient earnings, validating quality bias in equity holdings. ' : ''}The client's ${riskProfile.toLowerCase()} portfolio benefits from diversified hedges: gold (${hasGoldHedge ? 'SYN-CM-0402' : 'absent'}), short duration bonds (${hasShortDuration ? 'SYN-FI-0208' : 'absent'}), and macro fund (${hasMacroFund ? 'SYN-AL-0303' : 'absent'}). ${hasEnergyConcentration ? 'Energy concentration (SYN-ST-0101) gains from stabilized oil prices.' : ''} This supports the client's objective to ${objectives?.split(';')[0]?.toLowerCase() || 'preserve and grow wealth'}.`,
      keyDrivers: positiveDrivers.slice(0, 4),
      probability: positiveProb,
      portfolioImpact: {
        expectedReturnPct: posReturn,
        keyHoldingsAffected: topHoldings,
        rationale: `Risk-on environment lifts equity and credit; hedges moderate volatility. ${hasEnergyConcentration ? 'Energy position benefits from stabilized supply.' : ''} Gold and macro fund provide convexity.`
      }
    },
    negativeScenario: {
      narrative: `A stress scenario materializes where ${geoNews.length ? 'Middle East conflict widens, Hormuz closure persists, and oil spikes above $150/bbl. ' : ''}${ecoNews.length ? 'Inflation proves sticky, forcing Fed to hike further or hold rates restrictive longer, pressuring duration and growth equities. ' : ''}${compNews.length ? 'Key holdings miss earnings and cut guidance, triggering sector rotation. ' : ''}${hasEnergyConcentration ? 'The 97% single-stock energy concentration (SYN-ST-0101) becomes a severe liability as volatility spikes and liquidity dries. ' : ''}Long-duration Treasury (${hasLongTreasury ? 'SYN-FI-0201' : 'absent'}) suffers mark-to-market losses. Client's ${objectives?.split(';')[0]?.toLowerCase() || 'wealth preservation'} objective is threatened by concentrated risk exposure.`,
      keyDrivers: negativeDrivers.slice(0, 4),
      probability: negativeProb,
      portfolioImpact: {
        expectedReturnPct: negReturn,
        keyHoldingsAffected: topHoldings,
        rationale: `${hasEnergyConcentration ? 'Energy concentration amplifies downside; ' : ''}long duration bonds pressured by higher rates; growth equities de-rate on risk aversion. Illiquid alternatives limit rebalancing capacity.`
      }
    },
    defensePositive: {
      arguments: [
        'Explicit geopolitical hedges in place: Gold Bullion ETF (SYN-CM-0402) provides crisis alpha, Tanjong Macro Fund (SYN-AL-0303) captures volatility',
        'Short Duration USD Bond Fund (SYN-FI-0208) limits rate sensitivity to ~1.5yr vs 18yr for long Treasury',
        'Quality bias in equity sleeve: Global Developed Index (SYN-EQ-0001) and Tech Leaders (SYN-EQ-0003) are large-cap, cash-flow positive',
        hasEnergyConcentration ? 'Energy concentration (SYN-ST-0101) benefits directly from supply shock upside in constructive scenario' : 'Diversified equity exposure reduces single-stock risk'
      ],
      supportingData: [
        `Gold position: ${hasGoldHedge ? 'Present (6.4% of portfolio)' : 'Absent'}`,
        `Short duration bonds: ${hasShortDuration ? 'Present (9.5% of portfolio)' : 'Absent'}`,
        `Macro hedge fund: ${hasMacroFund ? 'Present (7.2% of portfolio)' : 'Absent'}`,
        `Energy concentration: ${hasEnergyConcentration ? 'SYN-ST-0101 = 97.9% of PF-0002' : 'No single-stock concentration >10%'}`
      ],
      hedgesInPlace: [
        hasGoldHedge ? 'Gold Bullion ETF (SYN-CM-0402) - 6.4% allocation' : null,
        hasShortDuration ? 'Short Duration USD Bond Fund (SYN-FI-0208) - 9.5% allocation' : null,
        hasMacroFund ? 'Tanjong Global Macro Fund (SYN-AL-0303) - 7.2% allocation' : null
      ].filter(Boolean)
    },
    defenseNegative: {
      arguments: [
        hasEnergyConcentration ? 'Single-stock energy concentration (97.9% of PF-0002) creates severe source-of-wealth overlap with family coal/energy business' : 'Top-5 holdings exceed 50% of aggregate portfolio, indicating hidden concentration',
        'US Treasury 2.375% 2045 (SYN-FI-0201) down ~38% from cost basis; duration risk dominates fixed income sleeve',
        'Illiquid alternatives (Private Equity SYN-AL-0301, Real Estate SYN-AL-0305/0306/0307) total ~15% - limits tactical rebalancing',
        'Structured products (SYN-SP-0505, SYN-SP-0506) are illiquid with 30% advance rate - cannot be monetized quickly',
        'Client objective to "diversify away from family operating business" directly contradicts current 97.9% energy concentration'
      ],
      supportingData: [
        hasEnergyConcentration ? 'Bara Nusantara Energy (SYN-ST-0101) = 97.9% of PF-0002, 41.2% of aggregate portfolio' : 'Top 5 holdings = 51.3% of aggregate portfolio',
        'US Treasury 2.375% 2045 (SYN-FI-0201) unrealized loss: -38.5% (-$3.28M)',
        'Private equity/real estate = ~$7.2M (15.4% of portfolio) with quarterly/illiquid liquidity',
        'Structured products = $1.66M with 30% advance rate, illiquid tier'
      ],
      mitigations: [
        'Immediate: Pre-approve staged diversification of SYN-ST-0001 via 10% quarterly tranches over 12 months',
        'Tactical: Add Inflation-Linked Bonds (SYN-FI-0212) for real yield protection; increase to 5% allocation',
        'Risk: Pre-approve rebalancing bands (±2% for equity, ±1.5% for fixed income) for mandate compliance',
        'Liquidity: Raise liquid reserves to 15%+ (from current ~10%) for opportunistic deployment and cash needs',
        'Governance: Formalize source-of-wealth overlap disclosure in next RM-client review; document diversification mandate'
      ]
    },
    rmTalkingPoints: [
      `${hasEnergyConcentration ? 'Bara Nusantara Energy (SYN-ST-0101)' : 'Top holding'} concentration is the dominant portfolio risk — aligns with family business but creates 97.9% single-stock exposure in PF-0002`,
      'Gold (SYN-CM-0402) and Macro Fund (SYN-AL-0303) provide partial hedge but may not fully offset energy supply shock; review hedge ratios quarterly',
      'Short Duration Bonds (SYN-FI-0208) protect income stability; Long Treasury (SYN-FI-0201) is primary duration risk at -38% unrealized',
      'Client objective to "diversify away from family operating business" directly conflicts with current energy concentration — requires phased exit plan',
      'Recommend staged diversification of energy position before Q4 2026 property purchase; target <15% single-stock limit',
      'Pre-approve Hormuz escalation triggers: auto-rebalance at Brent >$120 or gold >$2,800 to deploy hedges decisively'
    ].slice(0, 6),
    governance: {
      status: 'RM_REVIEW_REQUIRED',
      generatedAt: new Date().toISOString(),
      disclaimer: 'Scenario analysis uses smart mock logic based on classified news; validate assumptions before client action. Not investment advice.'
    }
  };
}

export async function generateScenarios(newsResult) {
  const clientId = newsResult.clientId;
  
  console.log(`[ScenarioAnalyst] Loading data for ${clientId}...`);
  
  const [portfolioContext, clientProfile, events] = await Promise.all([
    loadPortfolioContext(clientId),
    loadClientProfile(clientId),
    loadEvents()
  ]);

  console.log(`[ScenarioAnalyst] Generating smart mock scenarios...`);
  const scenarios = buildSmartScenarios(newsResult, portfolioContext, clientProfile);

  console.log(`[ScenarioAnalyst] Validating output...`);
  const validated = validateScenarioOutput(scenarios, portfolioContext);
  const withDefaults = addDefaults(validated);

  console.log(`[ScenarioAnalyst] Complete.`);
  return withDefaults;
}