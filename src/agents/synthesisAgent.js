function answerQuestion(question, risks, historicalEvents, webResearch) {
  if (!question.trim()) return null;
  const query = question.toLowerCase();
  const targetedTopic = /liquid|cash|commitment|call|currency|fx|usd|sgd|eur|hkd|jpy|credit|loan|ltv|collateral|margin|mandate|breach|compliance|sustainable|market|news|event/.test(query);
  const matchingRisks = risks.filter((risk) => {
    const text = `${risk.category} ${risk.title} ${risk.description}`.toLowerCase();
    return (query.match(/liquid|cash|commitment|call/) && text.includes('liquid'))
      || (query.match(/currency|fx|usd|sgd|eur|hkd|jpy/) && text.includes('currency'))
      || (query.match(/credit|loan|ltv|collateral|margin/) && text.includes('credit'))
      || (query.match(/mandate|breach|compliance|sustainable/) && text.includes('mandate'))
      || (query.match(/market|news|event/) && (text.includes('market') || text.includes('event')))
      || (!targetedTopic && query.match(/risk|concentrat|exposure|technology|energy/) && (text.includes('concentration') || text.includes('hidden')));
  });
  const selectedRisks = (matchingRisks.length ? matchingRisks : targetedTopic ? [] : risks).slice(0, 2);
  const topRisk = selectedRisks[0];
  return {
    response: topRisk
      ? `${topRisk.title} is the most relevant current signal. ${topRisk.description} The appropriate next step is an RM-led review of suitability, cash-flow timing, fresh market context, and any applicable mandate documentation.`
      : 'No deterministic risk signal directly matches the question. Review the evidence with the RM before reaching a client conclusion.',
    evidence: selectedRisks.map((risk) => ({ label: risk.title, detail: risk.evidence?.[0] ? `${risk.evidence[0].metric}: ${risk.evidence[0].value}` : risk.category })),
    relatedEvents: historicalEvents.slice(0, 2).map((event) => ({ date: event.date, event: event.event })),
    webContext: webResearch.insights.slice(0, 2).map((insight) => ({ title: insight.title, source: insight.source, url: insight.url })),
    governance: 'This answer is decision support only. The RM must validate suitability, source data, and current market sources before acting.',
  };
}

function synthesizeReport({ analytics, risks, historicalEvents, webResearch, question }) {
  const high = risks.filter((risk) => risk.severity === 'HIGH');
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
    answer: answerQuestion(question, risks, historicalEvents, webResearch),
  };
}

module.exports = { synthesizeReport, answerQuestion };
