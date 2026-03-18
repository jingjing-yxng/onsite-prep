// Vercel serverless function — sentence-level bilingual sync translation

module.exports.config = { maxDuration: 30 };

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sentences, fromLang, toLang, context, provider, apiKey } = req.body;

  if (!provider || !apiKey) return res.status(400).json({ error: 'Missing API key' });
  if (!sentences || !sentences.length) return res.status(400).json({ error: 'No sentences to translate' });

  const prompt = buildSyncPrompt(sentences, fromLang, toLang, context);

  try {
    let result;
    if (provider === 'claude') {
      result = await callClaude(apiKey, prompt);
    } else {
      result = await callOpenAICompatible(provider, apiKey, prompt);
    }

    let parsed;
    try {
      let jsonStr = result;
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1];
      parsed = JSON.parse(jsonStr.trim());
    } catch (e) {
      return res.status(422).json({ error: 'Failed to parse response', raw: result.slice(0, 500) });
    }

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message || 'API call failed' });
  }
};


function buildSyncPrompt(sentences, fromLang, toLang, context) {
  const langNames = { en: 'English', zh: 'Chinese', fr: 'French', es: 'Spanish', de: 'German', ja: 'Japanese', ko: 'Korean', pt: 'Portuguese', ar: 'Arabic' };
  const from = langNames[fromLang] || fromLang;
  const to = langNames[toLang] || toLang;

  return `You are a precise translator for interview prep content. Translate the following sentences from ${from} to ${to}.

CONTEXT (the full block these sentences belong to, for reference):
"${context}"

SENTENCES TO TRANSLATE:
${JSON.stringify(sentences)}

Return a JSON object with exactly this structure:
{ "translations": ["translated sentence 1", "translated sentence 2", ...] }

Rules:
- Return ONLY valid JSON, no markdown, no explanation.
- Maintain the same tone, formality, and specificity as the source.
- Keep proper nouns, company names, and technical terms as-is where appropriate.
- The number of translations MUST match the number of input sentences exactly.
- Each translation corresponds to the sentence at the same index.`;
}


// ===== API CALLERS (same as chat.js) =====

async function callClaude(apiKey, prompt) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Claude API error (${resp.status}): ${err}`);
  }
  const data = await resp.json();
  return data.content[0].text;
}

async function callOpenAICompatible(provider, apiKey, prompt) {
  const endpoints = {
    openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o' },
    deepseek: { url: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat' },
    kimi: { url: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-auto' }
  };
  const { url, model } = endpoints[provider] || endpoints.openai;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model, max_tokens: 4096,
      messages: [
        { role: 'system', content: 'You are a precise translator. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ]
    })
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`${provider} API error (${resp.status}): ${err}`);
  }
  const data = await resp.json();
  return data.choices[0].message.content;
}
