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

  // Extract rich context from the prep data
  const meta = currentData.meta || {};
  const companyIntel = currentData.company?.en?.rows || [];
  const strengths = currentData.strengths?.en?.rows || [];
  const gaps = currentData.strengths?.en?.gaps || [];
  const questions = (currentData.questions?.categories || []).map(cat => ({
    category: cat.label?.en || '',
    questions: (cat.items || []).map(item => ({
      q: item.question?.en || '',
      a: (item.answer?.en || '').slice(0, 200)
    }))
  }));
  const pitch = currentData.pitch?.en?.text || '';
  const askThem = currentData.askThem?.en || [];

  return `You are a senior interview prep coach generating detailed, actionable Prep Sheet note cards. Your notes must reflect deep, specific knowledge of the company — not generic advice.

ROLE CONTEXT:
- Company: ${meta.companyName || 'Unknown'}
- Position: ${meta.role || 'Unknown'}

CANDIDATE'S 30-SECOND PITCH:
${pitch}

CANDIDATE'S STRENGTHS:
${JSON.stringify(strengths, null, 2)}

SKILL GAPS TO ADDRESS:
${JSON.stringify(gaps, null, 2)}

COMPANY INTEL (from prep kit):
${JSON.stringify(companyIntel, null, 2)}

LIKELY INTERVIEW QUESTIONS & ANSWERS:
${JSON.stringify(questions, null, 2)}

QUESTIONS THE CANDIDATE PLANS TO ASK:
${JSON.stringify(askThem, null, 2)}

CHECKLIST ACTION ITEMS:
${JSON.stringify(checklistItems, null, 2)}

EXISTING PREP SHEET (avoid duplicating these):
${JSON.stringify(currentData.prepSheet, null, 2)}

YOUR TASK:
Generate Prep Sheet note cards that give the candidate a real competitive edge. For each card:

1. **Company/Product Deep Dive**: If the company has multiple products, business lines, or platforms, create SEPARATE sections for each one that is relevant to the role. For each product/line:
   - What it does, who it serves, and its market position
   - Recent launches, pivots, or strategic shifts
   - How it connects to the role the candidate is interviewing for
   - Specific metrics, user counts, or business results if mentioned in the company intel

2. **Role-Specific Talking Points**: Don't just list company facts — translate them into things the candidate can actually SAY in the interview. Frame bullets as "When they ask about X, mention Y because Z."

3. **Connect Strengths to Products**: For each relevant product line, note which of the candidate's strengths maps to it and what specific example they could use.

4. **Prepare for Gap Questions**: For each skill gap, provide a concrete deflection strategy tied to the company's actual needs.

5. **Research Templates**: Where the candidate needs to do more research, provide specific URLs, search queries, or resources to check — not just "research the company."

Return a JSON object with this structure:
{
  "chatResponse": "Generated X detailed note cards covering [specific topics].",
  "prepSheet": {
    "title": "${currentData.prepSheet?.title || 'Interview Prep Sheet'}",
    "cards": [
      {
        "id": "card-gen-1",
        "title": "Card title",
        "hint": "How to use this card",
        "content": "<b>Section heading</b><br>• Specific, actionable bullet<br>• Another bullet with real detail<br><br><b>Another section</b><br>• ..."
      }
    ]
  }
}

Rules:
- Return ONLY valid JSON, no markdown wrapping.
- Be SPECIFIC — use real product names, features, and details from the company intel. Never write generic bullets like "research the company's products" when you have the actual product info.
- If the company has multiple products or business units, dedicate a card (or a detailed section within a card) to EACH relevant one.
- Each bullet should be something the candidate can directly use or say — not a vague reminder.
- Use <b>, <br>, <i>, <ul>, <li> for formatting.
- Keep card titles short and actionable.
- Don't duplicate cards already well-covered in the existing prep sheet.
- Aim for 8-12 cards total — more cards with focused depth is better than fewer generic ones.`;
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
  if (!data.content || !data.content[0]) throw new Error('Empty response from Claude');
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
  if (!data.choices || !data.choices[0]) throw new Error('Empty response from API');
  return data.choices[0].message.content;
}
