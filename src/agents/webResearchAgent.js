const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

function buildResearchQuery(analytics, historicalEvents, question = '') {
  const sectors = analytics.concentration.bySector.slice(0, 3).map((item) => item.name);
  const assetClasses = analytics.concentration.byAssetClass.slice(0, 3).map((item) => item.name);
  const transmissions = historicalEvents.slice(0, 2).map((event) => event.transmission);
  return [...sectors, ...assetClasses, ...transmissions, question]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeArticle(article) {
  return {
    title: article.title || article.seendate || 'Untitled market article',
    url: article.url,
    source: article.sourcecountry || article.domain || 'GDELT',
    publishedAt: article.seendate || null,
    snippet: article.socialimage ? 'GDELT-linked article; review source URL for full context.' : 'GDELT-linked article.',
  };
}

async function searchGdelt(query) {
  const params = new URLSearchParams({
    query,
    mode: 'artlist',
    maxrecords: '5',
    format: 'json',
    sort: 'hybridrel',
    timespan: process.env.WEB_RESEARCH_TIMESPAN || '30d',
  });
  const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${params}`);
  if (!response.ok) throw new Error(`GDELT returned ${response.status}`);
  const payload = await response.json();
  return (payload.articles || []).map(normalizeArticle).filter((article) => article.url);
}

function buildFallbackInsight(analytics, historicalEvents) {
  const sector = analytics.concentration.bySector[0]?.name || 'portfolio';
  const event = historicalEvents[0];
  return {
    status: 'offline',
    query: '',
    articles: [],
    insights: [{
      title: `Monitor current ${sector} market developments`,
      summary: event
        ? `No live web research was run. Use the event-log signal "${event.event}" as the current context anchor and validate fresh market news before client action.`
        : 'No live web research was run. Validate fresh market news before client action.',
      source: 'Local fallback',
      url: null,
    }],
    governance: 'Live web research is disabled unless WEB_RESEARCH_ENABLED=true. Set GEMINI_API_KEY to enable Gemini summarisation.',
  };
}

async function summarizeWithGemini(query, articles) {
  if (!process.env.GEMINI_API_KEY || !articles.length) return null;
  const prompt = `You are a private-bank market-risk analyst.
Summarize these articles for an RM workflow and give actionable steps.
Return JSON only with an "insights" array of up to 3 objects. Each object must have title, summary, source, url.
Focus on portfolio risk implications, not investment advice.

Query: ${query}
Articles:
${articles.map((article, index) => `${index + 1}. ${article.title}\nSource: ${article.source}\nURL: ${article.url}\nPublished: ${article.publishedAt || 'unknown'}\nSnippet: ${article.snippet}`).join('\n\n')}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
  });
  if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
  const text = (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  return JSON.parse(text);
}

async function researchWeb(analytics, historicalEvents, question = '') {
  if (process.env.WEB_RESEARCH_ENABLED !== 'true') return buildFallbackInsight(analytics, historicalEvents);
  const query = buildResearchQuery(analytics, historicalEvents, question);
  try {
    const articles = await searchGdelt(query);
    const geminiSummary = await summarizeWithGemini(query, articles);
    return {
      status: 'live',
      query,
      articles,
      insights: geminiSummary?.insights?.length
        ? geminiSummary.insights
        : articles.slice(0, 3).map((article) => ({
          title: article.title,
          summary: `Review this current source for exposure-sensitive market context related to ${query}.`,
          source: article.source,
          url: article.url,
        })),
      governance: process.env.GEMINI_API_KEY
        ? 'Live GDELT search with Gemini summarisation. RM review is still required.'
        : 'Live GDELT search without Gemini summarisation. RM review is still required.',
    };
  } catch (error) {
    const fallback = buildFallbackInsight(analytics, historicalEvents);
    return { ...fallback, status: 'degraded', error: error.message };
  }
}

// module.exports = { researchWeb, buildResearchQuery };
export { researchWeb, buildResearchQuery };

