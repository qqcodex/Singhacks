import { CONFIG } from './config.js';

function classifyArticleByContent(article, portfolioContext) {
  const title = (article.title || '').toLowerCase();
  const summaryText = (article.summary || '').toLowerCase();
  const text = title + ' ' + summaryText;

  const singleStocks = portfolioContext.singleStocks.map(s => s.instrumentId);
  const hasEnergyConcentration = singleStocks.some(id => id === 'SYN-ST-0101');
  const hasTechHoldings = portfolioContext.holdings.some(h => 
    h.instrumentName.toLowerCase().includes('technology') || h.instrumentName.toLowerCase().includes('tech')
  );
  const hasGoldHedge = portfolioContext.holdings.some(h => 
    h.instrumentName.toLowerCase().includes('gold')
  );

  // Geopolitical keywords
  const geoKeywords = ['iran', 'hormuz', 'middle east', 'israel', 'hezbollah', 'sanctions', 'blockade', 'strike', 'conflict', 'war', 'geopolitical', 'trump iran', 'us iran', 'missile', 'attack', 'nuclear', 'revolutionary guard'];
  const geoScore = geoKeywords.reduce((score, kw) => score + (text.includes(kw) ? 1 : 0), 0);

  // Economic keywords
  const ecoKeywords = ['fed', 'federal reserve', 'interest rate', 'inflation', 'yield', 'treasury', 'bond', 'jobs', 'employment', 'cpi', 'pce', 'gdp', 'recession', 'rate cut', 'rate hike', 'monetary policy', 'central bank', 'dollar', 'currency', 'oil price', 'diesel', 'energy watch', 'sanctions bite'];
  const ecoScore = ecoKeywords.reduce((score, kw) => score + (text.includes(kw) ? 1 : 0), 0);

  // Company-specific keywords
  const compKeywords = ['earnings', 'revenue', 'profit', 'guidance', 'merger', 'acquisition', 'm&a', 'ceo', 'appoint', 'dividend', 'buyback', 'ipo', 'stock split', 'analyst', 'upgrade', 'downgrade', 'price target', 'nvidia', 'adobe', 'volkswagen', 'tata', 'openai', 'hugging face', 'phil schiller', 'cybercabs', 'tesla', 'robinhood'];
  const compScore = compKeywords.reduce((score, kw) => score + (text.includes(kw) ? 1 : 0), 0);

  // Determine category
  let category = 'ECONOMIC';
  let maxScore = ecoScore;
  
  if (geoScore > maxScore) {
    category = 'GEOPOLITICAL';
    maxScore = geoScore;
  }
  if (compScore > maxScore) {
    category = 'COMPANY_SPECIFIC';
    maxScore = compScore;
  }

  // Base relevance on keyword matches
  let relevanceScore = Math.min(0.9, 0.3 + maxScore * 0.15);
  
  // Boost for direct portfolio relevance
  const relatedHoldings = [];
  if (category === 'GEOPOLITICAL' && hasEnergyConcentration) {
    relatedHoldings.push('SYN-ST-0101');
    relevanceScore = Math.min(0.95, relevanceScore + 0.2);
  }
  if (category === 'ECONOMIC' && text.includes('rate') && portfolioContext.holdings.some(h => h.instrumentName.includes('Treasury') || h.instrumentName.includes('Bond'))) {
    relatedHoldings.push('SYN-FI-0201');
    relevanceScore = Math.min(0.9, relevanceScore + 0.15);
  }
  if (category === 'ECONOMIC' && (text.includes('gold') || text.includes('safe haven')) && hasGoldHedge) {
    relatedHoldings.push('SYN-CM-0402');
    relevanceScore = Math.min(0.9, relevanceScore + 0.1);
  }
  if (category === 'COMPANY_SPECIFIC' && hasTechHoldings && (text.includes('nvidia') || text.includes('ai') || text.includes('tech'))) {
    relatedHoldings.push('SYN-EQ-0003');
    relevanceScore = Math.min(0.9, relevanceScore + 0.15);
  }

  // Generate contextual summary
  let articleSummary = '';
  if (category === 'GEOPOLITICAL') {
    articleSummary = `Geopolitical escalation in the Middle East threatens energy supply routes. Directly impacts concentrated energy position (SYN-ST-0101) and benefits gold hedge (SYN-CM-0402).`;
  } else if (category === 'ECONOMIC') {
    if (text.includes('rate') || text.includes('fed') || text.includes('yield')) {
      articleSummary = `Central bank policy shift affects rate-sensitive assets. Long-duration Treasury (SYN-FI-0201) and credit funds exposed to duration risk. Short duration fund (SYN-FI-0208) provides buffer.`;
    } else if (text.includes('oil') || text.includes('energy') || text.includes('diesel')) {
      articleSummary = `Energy market disruption from supply constraints. Benefits energy concentration (SYN-ST-0101) but increases portfolio volatility. Gold (SYN-CM-0402) and macro fund (SYN-AL-0303) serve as hedges.`;
    } else {
      articleSummary = `Macroeconomic development with broad portfolio implications across fixed income, equity, and currency exposures.`;
    }
  } else {
    articleSummary = `Company-specific catalyst affecting portfolio holdings. Monitor for direct impact on related positions and sector sentiment.`;
  }

  const actionable = relevanceScore >= 0.7 && (category === 'GEOPOLITICAL' || (category === 'ECONOMIC' && text.includes('rate')));

  return {
    relevanceScore: Math.round(relevanceScore * 100) / 100,
    category,
    relatedHoldings,
    summary: articleSummary,
    actionable,
    confidence: Math.round((0.6 + maxScore * 0.08) * 100) / 100
  };
}

export async function classifyArticles(articles, portfolioContext) {
  if (!articles.length) return [];
  
  console.log(`[Classifier] Processing ${articles.length} articles with smart mock...`);
  
  return articles.map((a, i) => {
    const classification = classifyArticleByContent(a, portfolioContext);
    return {
      articleId: a.articleId,
      title: a.title,
      url: a.url,
      source: a.source,
      publishedAt: a.publishedAt,
      ...classification
    };
  });
}