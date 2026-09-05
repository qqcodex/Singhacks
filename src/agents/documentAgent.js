const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

async function processDocument(content, clientId) {
  if (!process.env.GEMINI_API_KEY) {
    return {
      status: 'offline',
      message: 'Gemini API key not configured. Document stored but not processed.',
      summary: null,
      insights: []
    };
  }

  try {
    const prompt = `You are a wealth management document analyzer. Analyze the following document content and extract key information relevant to a client's wealth profile.

Document content:
${content.substring(0, 30000)}  // Limit to avoid token limits

Extract the following information:
1. A brief summary (2-3 sentences)
2. Key financial figures mentioned (amounts, dates, percentages)
3. Important dates (deadlines, review dates, maturity dates)
4. Document classification (e.g., "Financial Statement", "Legal Document", "Meeting Notes", "Tax Document", "Investment Proposal")
5. Actionable insights (what should the RM do about this document?)

Format your response as JSON with the following structure:
{
  "summary": "...",
  "keyFigures": [{"type": "amount|date|percentage", "value": "...", "context": "..."}],
  "importantDates": [{"date": "...", "description": "..."}],
  "documentCategory": "...",
  "actionableInsights": ["insight1", "insight2"],
  "relevanceScore": 0-100
}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'x-goog-api-key': process.env.GEMINI_API_KEY 
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { 
          temperature: 0.2,
          maxOutputTokens: 800,
          responseMimeType: 'application/json'
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini returned ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) {
      throw new Error('No response from Gemini');
    }

    const parsedResult = JSON.parse(resultText);
    
    // Save to database
    // await saveDocumentInsights(clientId, parsedResult);

    return {
      status: 'success',
      summary: parsedResult.summary,
      keyFigures: parsedResult.keyFigures,
      importantDates: parsedResult.importantDates,
      documentCategory: parsedResult.documentCategory,
      actionableInsights: parsedResult.actionableInsights,
      relevanceScore: parsedResult.relevanceScore
    };

  } catch (error) {
    console.error('Document processing error:', error);
    return {
      status: 'error',
      message: error.message,
      summary: null,
      insights: []
    };
  }
}

module.exports = { processDocument };