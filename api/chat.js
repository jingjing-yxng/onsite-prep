// Vercel serverless function — handles chat edits + prep sheet generation

module.exports.config = { maxDuration: 60 };

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, currentData, provider, apiKey, action } = req.body;

  if (!provider || !apiKey) return res.status(400).json({ error: 'Missing API key' });

  try {
    let prompt;

    if (action === 'generate-notes') {
      prompt = buildNotesPrompt(currentData);
    } else {
      prompt = buildChatPrompt(message, currentData);
    }

    let result;
    if (provider === 'claude') {
      result = await callClaude(apiKey, prompt);
    } else {
      result = await callOpenAICompatible(provider, apiKey, prompt);
    }

    // Parse JSON from response
    const parsed = extractJSON(result);
    if (!parsed) {
      return res.status(422).json({ error: 'Failed to parse response', raw: result.slice(0, 500) });
    }

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message || 'API call failed' });
  }
};


function buildChatPrompt(message, currentData) {
  return `You are an interview prep editor. The user has an existing interview prep kit and wants to make changes.

CURRENT PREP DATA:
${JSON.stringify(currentData, null, 2)}

USER REQUEST:
"${message}"

Return a JSON object containing ONLY the fields that need to change. Use the exact same structure as the input data, but only include the keys you're modifying. For example, if the user asks to shorten the pitch, return:
{ "pitch": { "en": { "label": "...", "text": "updated shorter pitch" } } }

If the user asks to add a question, return the full updated questions object.
If the user asks to change company intel, return the updated company object.

Rules:
- Return ONLY valid JSON, no markdown, no explanation.
- Preserve all existing content that isn't being changed.
- For array fields (like questions.categories, flashcards, checklist items), return the COMPLETE array for that field, not just the new item.
- Keep the same tone, specificity, and personalization as the existing content.
- If the user's request is unclear, make your best interpretation and apply it.
- Also return a "chatResponse" field with a brief (1 sentence) confirmation of what you changed.

Example response format:
{
  "chatResponse": "Updated the pitch to be more concise.",
  "pitch": { ... }
}`;
}


function buildNotesPrompt(currentData) {
  // Extract checklist items
  const checklistItems = [];
  if (currentData.checklist?.days) {
    currentData.checklist.days.forEach(day => {
      day.items.forEach(item => {
        checklistItems.push({
          day: day.badge,
          text: item.text?.en || '',
          detail: item.detail?.en || ''
        });
      });
    });
  }

  return `You are an interview prep assistant. Generate Prep Sheet note cards based on the user's checklist action items.

CHECKLIST ITEMS:
${JSON.stringify(checklistItems, null, 2)}

EXISTING PREP SHEET:
${JSON.stringify(currentData.prepSheet, null, 2)}

Generate new Prep Sheet cards that serve as working templates for each major checklist action item. Each card should have a structured template that helps the user complete that checklist task.

Return a JSON object with this structure:
{
  "chatResponse": "Generated X note cards from your checklist items.",
  "prepSheet": {
    "title": "${currentData.prepSheet?.title || 'Interview Prep Sheet'}",
    "cards": [
      {
        "id": "card-gen-1",
        "title": "Card title matching the checklist item",
        "hint": "Brief instruction on how to use this card",
        "content": "<b>Section heading</b><br>• Structured template bullet<br>• Another prompt to fill in<br><br><b>Another section</b><br>• ..."
      },
      ...
    ]
  }
}

Rules:
- Return ONLY valid JSON, no markdown wrapping.
- Create 1 card per major checklist item (combine related items).
- Each card should have pre-structured sections with bullet templates the user can fill in.
- Use <b>, <br>, <i>, <ul>, <li> for formatting.
- Keep card titles short and actionable.
- Don't create duplicate cards for items already well-covered in existing prep sheet.
- Aim for 6-10 cards total.`;
}


function extractJSON(text) {
  try { return JSON.parse(text.trim()); } catch(e) {}
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) { try { return JSON.parse(codeBlock[1].trim()); } catch(e) {} }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(text.slice(firstBrace, lastBrace + 1)); } catch(e) {}
  }
  return null;
}

// ===== API CALLERS (same as generate.js) =====

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
      max_tokens: 16384,
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
      model, max_tokens: 16384,
      messages: [
        { role: 'system', content: 'You are an expert interview coach. Return only valid JSON.' },
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
