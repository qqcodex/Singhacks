import { calculateAnalytics } from '../analytics/portfolio.js';

import { researchEvents } from './historicalAgent.js';

import { discoverRisks } from './riskAgent.js';

import { researchWeb } from './webResearchAgent.js';

import {
  synthesizeReport,
  answerQuestion
} from './synthesisAgent.js';


export async function analyze(
  data,
  clientId,
  question = ''
) {
  // --------------------------------------------------
  // 1. Calculate portfolio analytics
  // --------------------------------------------------

  const analytics = calculateAnalytics(
    data,
    clientId
  );

  if (!analytics) {
    return null;
  }


  // --------------------------------------------------
  // 2. Research historical events
  // --------------------------------------------------

  const historicalEvents =
    researchEvents(
      data.events,
      analytics
    );


  // --------------------------------------------------
  // 3. Research current web information
  // --------------------------------------------------

  const webResearch =
    await researchWeb(
      analytics,
      historicalEvents,
      question
    );


  // --------------------------------------------------
  // 4. Detect portfolio risks
  // --------------------------------------------------

  const risks =
    discoverRisks(
      analytics,
      historicalEvents,
      webResearch
    );


  // --------------------------------------------------
  // 5. Answer RM question if provided
  // --------------------------------------------------

  let answer = null;

  if (question.trim()) {
    answer =
      await answerQuestion(
        question,
        risks,
        historicalEvents,
        webResearch,
        analytics.client,
        analytics
      );
  }


  // --------------------------------------------------
  // 6. Synthesize final RM report
  // --------------------------------------------------

  return synthesizeReport({
    analytics,
    risks,
    historicalEvents,
    webResearch,
    question,
    answer
  });
}

