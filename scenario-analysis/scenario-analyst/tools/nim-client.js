import { CONFIG } from '../config.js';

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
      temperature: CONFIG.nim.temperature
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`NIM API failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('NIM returned empty content');

  try {
    return JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // fall through
      }
    }
    const objMatch = content.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        const obj = JSON.parse(objMatch[0]);
        if (Array.isArray(obj)) return obj;
        if (obj.classifications) return obj.classifications;
        return obj;
      } catch {
        // fall through
      }
    }
    throw new Error(`NIM returned non-JSON content: ${content.slice(0, 300)}`);
  }
}

export async function nimComplete(systemPrompt, userPrompt) {
  if (!CONFIG.nim.apiKey) {
    throw new Error('NVIDIA_API_KEY not configured');
  }
  return callNim(systemPrompt, userPrompt);
}