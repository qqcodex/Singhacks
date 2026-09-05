import { CONFIG } from './config.js';

function buildSystemPrompt(portfolioContext) {
  return `You are a private-bank portfolio news analyst. Classify each article for relevance to the client's portfolio and categorize into exactly one of: GEOPOLITICAL, ECONOMIC, COMPANY_SPECIFIC.

PORTFOLIO CONTEXT:
- Single stocks: ${portfolioContext.singleStockNames}
- Sectors: ${portfolioContext.sectorNames}
- Regions: ${portfolioContext.regionNames}
- Asset classes: ${portfolioContext.assetClassNames}
- Top holdings: ${portfolioContext.topHoldingNames}

For each article, output JSON with these fields:
{
  "relevanceScore": 0.0-1.0,
  "category": "GEOPOLITICAL|ECONOMIC|COMPANY_SPECIFIC",
  "relatedHoldings": ["instrument_id"],
  "summary": "1-2 sentence portfolio-relevant summary",
  "actionable": boolean,
  "confidence": 0.0-1.0
}

Rules:
- GEOPOLITICAL: conflicts, sanctions, blockades, regime risk, trade wars, military action
- ECONOMIC: central bank policy, inflation, GDP, yields, FX moves, commodity macro, employment
- COMPANY_SPECIFIC: earnings, M&A, guidance, product launch, management change, dividend, buyback
- Score >0.7 only if directly mentions holding, sector, or major market driver
- relatedHoldings must use instrument_id from portfolio context (e.g., SYN-ST-0101, SYN-EQ-0003)
- Return ONLY a valid JSON array. No extra text.`;
}

function buildUserPrompt(articles) {
  return `Classify these ${articles.length} articles:\n\n` + articles.map((a, i) => 
    `${i + 1}. Title: ${a.title}\nSource: ${a.source}\nPublished: ${a.publishedAt}\nSummary: ${a.summary || 'N/A'}\nURL: ${a.url}`
  ).join('\n\n') + '\n\nReturn JSON array only.';
}

async function callNim(systemPrompt, userPrompt) {
  const res = await fetch(`${CONFIG.nim.endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.nim.apiKey}`
    },
    body: JSON.stringify({
      model: CONFIG.nim.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: CONFIG.nim.maxTokens,
      temperature: CONFIG.nim.temperature,
      response_format: { type: 'json_object' }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`NIM API failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('NIM returned empty content');
  return JSON.parse(content);
}

function validateClassification(result, articles) {
  if (!Array.isArray(result)) throw new Error('NIM did not return array');
  if (result.length !== articles.length) {
    console.warn(`NIM returned ${result.length} results for ${articles.length} articles`);
  }
  return result.map((r, i) => ({
    articleId: articles[i].articleId,
    title: articles[i].title,
    url: articles[i].url,
    source: articles[i].source,
    publishedAt: articles[i].publishedAt,
    relevanceScore: Math.max(0, Math.min(1, Number(r.relevanceScore) || 0)),
    category: ['GEOPOLITICAL', 'ECONOMIC', 'COMPANY_SPECIFIC'].includes(r.category) ? r.category : 'ECONOMIC',
    relatedHoldings: Array.isArray(r.relatedHoldings) ? r.relatedHoldings : [],
    summary: String(r.summary || '').slice(0, 500),
    actionable: Boolean(r.actionable),
    confidence: Math.max(0, Math.min(1, Number(r.confidence) || 0))
  }));
}

export async function classifyArticles(articles, portfolioContext) {
  if (!articles.length) return [];
  if (!CONFIG.nim.apiKey) {
    console.warn('NVIDIA_NIM_API_KEY not set, returning mock classifications');
    return articles.map(a => ({
      articleId: a.articleId,
      title: a.title,
      url: a.url,
      source: a.source,
      publishedAt: a.publishedAt,
      relevanceScore: 0.5,
      category: 'ECONOMIC',
      relatedHoldings: [],
      summary: 'Mock classification - set NVIDIA_NIM_API_KEY for real results',
      actionable: false,
      confidence: 0.1
    }));
  }

  const systemPrompt = buildSystemPrompt(portfolioContext);
  const userPrompt = buildUserPrompt(articles);

  try {
    const raw = await callNim(systemPrompt, userPrompt);
    return validateClassification(raw, articles);
  } catch (err) {
    console.error('NIM classification failed:', err.message);
    return articles.map(a => ({
      articleId: a.articleId,
      title: a.title,
      url: a.url,
      source: a.source,
      publishedAt: a.publishedAt,
      relevanceScore: 0,
      category: 'ECONOMIC',
      relatedHoldings: [],
      summary: `Classification failed: ${err.message}`,
      actionable: false,
      confidence: 0
    }));
  }
}