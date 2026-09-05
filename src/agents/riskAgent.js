function round(value) {
  return Math.round(value * 10) / 10;
}

function discoverRisks(analytics, historicalEvents = [], webResearch = { insights: [] }) {
  const risks = [];
  const { concentration, liquidity, credit, mandateBreaches, client, notes } = analytics;
  const baseCurrency = client?.base_currency || 'USD';

  // 1. Single-Position Concentration
  if (concentration?.largestPosition?.weightPct >= 10) {
    const weight = round(concentration.largestPosition.weightPct);
    const isHigh = weight >= 20;
    const name = concentration.largestPosition.name;

    risks.push({
      id: 'concentration',
      severity: isHigh ? 'HIGH' : 'MEDIUM',
      category: 'CONCENTRATION',
      title: `Single-position concentration in ${name}`,
      description: `${weight}% of aggregate portfolio value is concentrated in this single position.`,
      soWhat: `A single adverse earnings event or regulatory shock in ${name} directly threatens portfolio capital preservation and volatility targets.`,
      evidence: [{ metric: 'Aggregate client exposure', value: `${weight}%` }],
      actions: [
        {
          priority: isHigh ? 'P1' : 'P2',
          title: `Structure staged trim or options overlay for ${name}`,
          operation: 'Model covered call/collar strategy or a structured 3-stage partial exit plan.',
          dueInDays: isHigh ? 3 : 7,
        },
      ],
      talkingPoint: `We have observed that ${name} now represents ${weight}% of your overall wealth. To lock in gains and protect downside, we should review a structured hedging or staged rebalancing strategy.`,
    });
  }

  // 2. Client-Level Aggregate Concentration (Top 5)
  if (concentration?.topFiveWeightPct >= 50) {
    const topFiveWeight = round(concentration.topFiveWeightPct);
    risks.push({
      id: 'aggregate-concentration',
      severity: 'HIGH',
      category: 'HIDDEN_RISK',
      title: 'High top-5 asset concentration across combined accounts',
      description: `The five largest exposures represent ${topFiveWeight}% of total wealth across all mandates.`,
      soWhat: `Individual account reports mask the consolidated exposure. The client holds substantial co-movement risk across their overall wealth base.`,
      evidence: [{ metric: 'Top 5 combined exposure', value: `${topFiveWeight}%` }],
      actions: [
        {
          priority: 'P1',
          title: 'Prepare Consolidated Exposure Schedule',
          operation: 'Run an asset look-through report and cross-portfolio correlation matrix before the next client call.',
          dueInDays: 5,
        },
      ],
      talkingPoint: `While your individual sub-portfolios look diversified, across your combined holdings the top 5 assets make up ${topFiveWeight}%. We recommend exploring uncorrelated alternative strategies to balance this out.`,
    });
  }

  // 3. Non-Base Currency Exposure
  const nonBase = (concentration?.byCurrency || [])
    .filter((x) => x.name !== baseCurrency)
    .reduce((sum, x) => sum + x.weightPct, 0);

  if (nonBase >= 40) {
    const nonBaseWeight = round(nonBase);
    const isHigh = nonBaseWeight >= 65;

    risks.push({
      id: 'currency',
      severity: isHigh ? 'HIGH' : 'MEDIUM',
      category: 'CURRENCY',
      title: `${nonBaseWeight}% non-${baseCurrency} currency exposure`,
      description: `Over ${nonBaseWeight}% of assets are denominated in foreign currencies.`,
      soWhat: `Unhedged FX volatility can erode investment gains, especially if future capital commitments or tax liabilities are due in ${baseCurrency}.`,
      evidence: [{ metric: 'Non-base currency exposure', value: `${nonBaseWeight}%` }],
      actions: [
        {
          priority: isHigh ? 'P1' : 'P2',
          title: 'Assess FX Forward or Dual Currency Deposit (DCD) Hedge',
          operation: 'Map currency distribution against known 12-month domestic spending needs and recommend currency hedges.',
          dueInDays: isHigh ? 5 : 10,
        },
      ],
      talkingPoint: `With ${nonBaseWeight}% of your portfolio outside ${baseCurrency}, recent currency swings could negatively impact your domestic purchasing power. Let’s align your FX exposure with your upcoming liabilities.`,
    });
  }

  // 4. Liquidity Demands vs Reserves
  if (liquidity?.coverageRatio !== null && liquidity?.coverageRatio < 1.5) {
    const ratio = round(liquidity.coverageRatio);
    const isCritical = ratio < 1.0;

    risks.push({
      id: 'liquidity',
      severity: isCritical ? 'HIGH' : 'MEDIUM',
      category: 'LIQUIDITY',
      title: 'Liquidity buffer does not comfortably meet short-term demands',
      description: `Liquid assets cover only ${ratio}× of scheduled commitments and cash demands.`,
      soWhat: isCritical
        ? `Deficit risk: Client may be forced to liquidate distressed assets or lock in capital losses to fund planned cash calls.`
        : `Tight cash buffer: Any unexpected capital call will breach baseline reserves.`,
      evidence: [{ metric: 'Liquidity coverage ratio', value: `${ratio}×` }],
      actions: [
        {
          priority: 'P1',
          title: 'Establish Liquidity Facility or Money Market Allocation',
          operation: 'Sweep yields into liquid funds or approve a short-term lombard credit line to prevent forced asset sales.',
          dueInDays: isCritical ? 2 : 5,
        },
      ],
      talkingPoint: `Your liquid cash coverage is currently at ${ratio}× relative to your upcoming commitments. Let’s establish a standby credit line or reallocate a portion into short-term liquidity funds so you are not forced to liquidate equities.`,
    });
  }

  // 5. Credit Headroom & Margin Constraints
  (credit || []).forEach((facility) => {
    if (facility.ltvPct >= facility.marginCallLtvPct * 0.85) {
      const isBreached = facility.ltvPct >= facility.marginCallLtvPct;
      const currentLtv = round(facility.ltvPct);
      const triggerLtv = round(facility.marginCallLtvPct);

      risks.push({
        id: `credit-${facility.facilityId}`,
        severity: isBreached ? 'HIGH' : 'MEDIUM',
        category: 'CREDIT',
        title: `Collateral headroom warning (Facility ${facility.facilityId})`,
        description: `Current LTV is ${currentLtv}% versus a ${triggerLtv}% margin-call threshold.`,
        soWhat: isBreached
          ? 'Margin call imminent or active. Forced collateral liquidation will take place unless capital is injected.'
          : 'Buffer is within 15% of margin call. A minor market decline will trigger a formal capital call.',
        evidence: [{ metric: 'LTV / Trigger', value: `${currentLtv}% / ${triggerLtv}%` }],
        actions: [
          {
            priority: 'P1',
            title: isBreached ? 'Issue Immediate Collateral Request' : 'Pre-empt Margin Call with Client',
            operation: 'Verify eligible unpledged assets across accounts to pledge as top-up collateral.',
            dueInDays: isBreached ? 1 : 3,
          },
        ],
        talkingPoint: `Market movements have brought your credit facility LTV to ${currentLtv}%, near the ${triggerLtv}% trigger. To protect the loan from automated margin actions, we should discuss pledging additional collateral or paying down a tranche.`,
      });
    }
  });

  // 6. Mandate Exceptions & Breaches
  (mandateBreaches || []).forEach((breach, index) => {
    const formattedType = breach.type ? breach.type.replace(/_/g, ' ') : 'Mandate';

    risks.push({
      id: `mandate-${index}`,
      severity: 'HIGH',
      category: 'MANDATE',
      title: `Mandate Exception: ${breach.assetClass || breach.instrument}`,
      description: `${breach.portfolio} has an active ${formattedType} exception requiring documentation.`,
      soWhat: `Exceeds risk guidelines and fiduciary compliance parameters. May trigger formal audit flags or compliance escalation.`,
      evidence: [{ metric: 'Portfolio', value: breach.portfolio }],
      actions: [
        {
          priority: 'P1',
          title: 'Remediate or Obtain Client Waiver',
          operation: 'Submit a rebalancing order or file an updated investment mandate signed by the client.',
          dueInDays: 3,
        },
      ],
      talkingPoint: `A recent allocation in ${breach.portfolio} has crossed your documented risk limits. Let's decide whether to rebalance back into compliance or update your mandate agreement.`,
    });
  });

  // 7. Operating Wealth Overlap
  if (notes && notes.some((note) => /same bet|diversify away|not tied|concentrat/i.test(note.note))) {
    risks.push({
      id: 'economic-wealth',
      severity: 'HIGH',
      category: 'HIDDEN_RISK',
      title: 'Portfolio reinforces operating business exposure',
      description: 'Investment positions duplicate the industry sector of the client’s core operating company.',
      soWhat: `If the client's operating sector experiences a cyclical downturn, their primary income source and personal balance sheet will suffer simultaneously.`,
      evidence: [{ metric: 'Source', value: 'RM notes & business profile context' }],
      actions: [
        {
          priority: 'P2',
          title: 'Propose Counter-Cyclical Asset Allocation',
          operation: 'Screen portfolio holdings for correlations with the client’s business industry and replace them with defensive sectors.',
          dueInDays: 7,
        },
      ],
      talkingPoint: `Your investment portfolio holds significant exposure to the same industry as your primary business. To ensure true financial insulation, we should shift these funds into sectors completely independent of your operating company.`,
    });
  }

  // 8. Market Context Amplification
  if (webResearch?.status === 'live' && webResearch.insights?.length && historicalEvents?.length) {
    const hasHighSeverity = historicalEvents.some((event) => event.severity?.toLowerCase() === 'high');
    const summary = webResearch.insights[0].summary;

    risks.push({
      id: 'market-event-context',
      severity: hasHighSeverity ? 'HIGH' : 'MEDIUM',
      category: 'MARKET_EVENT',
      title: 'Current macro catalysts may trigger existing portfolio sensitivities',
      description: `${summary} Parallels exist with tracked historical events.`,
      soWhat: `External market conditions (e.g., rate adjustments, sector shocks) threaten to amplify existing credit or concentration sensitivities.`,
      evidence: [{ metric: 'Source', value: webResearch.insights[0].source || webResearch.status }],
      actions: [
        {
          priority: 'P2',
          title: 'Stress-Test Portfolio Under Historical Analogue',
          operation: 'Run stress-test scenarios matching the relevant historical shock and share the defensive adjustment report with the client.',
          dueInDays: 7,
        },
      ],
      talkingPoint: `In light of recent macro developments around ${summary.slice(0, 45)}..., we conducted a portfolio stress test and identified a few proactive shifts to protect your capital.`,
    });
  }

  // Sort by severity (HIGH -> MEDIUM -> LOW) and return top 8
  const severityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  return risks
    .sort((a, b) => (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0))
    .slice(0, 8);
}

export { discoverRisks };