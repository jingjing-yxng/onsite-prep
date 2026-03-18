// Vercel serverless function — proxies LLM API calls (avoids CORS)

// Increase Vercel function timeout to 60 seconds
module.exports.config = { maxDuration: 60 };

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { resumeText, jdText, provider, apiKey, bilingual, languages } = req.body;

  if (!resumeText || !jdText || !provider || !apiKey) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const prompt = buildPrompt(resumeText, jdText, bilingual, languages);

  try {
    let result;
    if (provider === 'claude') {
      result = await callClaude(apiKey, prompt);
    } else {
      result = await callOpenAICompatible(provider, apiKey, prompt);
    }

    // Aggressively extract JSON from response
    const prepData = extractJSON(result);
    if (!prepData) {
      return res.status(422).json({
        error: 'Failed to parse AI response as JSON',
        raw: result.slice(0, 1000)
      });
    }

    return res.status(200).json(prepData);
  } catch (e) {
    return res.status(500).json({ error: e.message || 'API call failed' });
  }
};

function extractJSON(text) {
  // Try direct parse
  try { return JSON.parse(text.trim()); } catch(e) {}

  // Try extracting from markdown code block
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1].trim()); } catch(e) {}
  }

  // Try finding the first { and last }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(text.slice(firstBrace, lastBrace + 1)); } catch(e) {}
  }

  return null;
}

function langName(code) {
  const map = { en: 'English', zh: 'Chinese (中文)', fr: 'French', es: 'Spanish', de: 'German', ja: 'Japanese', ko: 'Korean', pt: 'Portuguese', ar: 'Arabic' };
  return map[code] || code;
}

function buildPrompt(resumeText, jdText, bilingual, languages) {
  const l2 = languages?.[1] || 'zh';
  const l2Name = langName(l2);

  const bilingualNote = bilingual
    ? `This prep kit must be BILINGUAL: English + ${l2Name}. Every field with language variants needs both "en" and "${l2}" keys.`
    : `This prep kit is English only. Omit all "${l2}" language keys — only include "en" keys.`;

  return `You are an elite interview coach. Generate a personalized interview prep kit from this resume and job description.

${bilingualNote}

RESUME:
${resumeText.slice(0, 8000)}

JOB DESCRIPTION:
${jdText.slice(0, 6000)}

Generate a JSON object with this structure. Use SPECIFIC details from the resume (real company names, metrics, projects) and address SPECIFIC requirements from the JD.

Return ONLY valid JSON — no markdown, no explanation, no text before or after the JSON.

{
  "meta": {
    "companyName": "string — company name from JD",
    "companyNameZh": "string — Chinese name if bilingual, else empty",
    "role": "string — role title from JD",
    "roleZh": "string — Chinese role if bilingual, else empty",
    "sidebarTitle": "CompanyName <span>x</span> CandidateFirstName",
    "sidebarSub": "Role<br>Company"
  },
  "pitch": {
    "en": { "label": "Memorize — say it naturally", "text": "A conversational 30-second pitch (3-4 sentences) using specific resume achievements that show why this candidate is perfect for THIS role" }${bilingual ? `,\n    "${l2}": { "label": "label in ${l2Name}", "text": "natural translation" }` : ''}
  },
  "strengths": {
    "en": {
      "rows": [["JD requirement", "<strong>Company</strong>: specific achievement"], ...6-8 rows],
      "gaps": [{"title": "Gap: specific shortfall", "text": "How to address with related experience"}, ...1-2 gaps]
    }${bilingual ? `,\n    "${l2}": { "rows": [...translated...], "gaps": [...translated...] }` : ''}
  },
  "questions": {
    "categories": [
      {
        "label": {"en": "A — Category Name"${bilingual ? `, "${l2}": "translated"` : ''}},
        "items": [
          {
            "question": {"en": "Realistic interview question"${bilingual ? `, "${l2}": "translated"` : ''}},
            "answer": {"en": "<ul><li><strong>Point</strong> with resume evidence</li><li>Another point</li></ul>"${bilingual ? `, "${l2}": "translated"` : ''}}
          }
        ]
      }
    ]
  },
  "company": {
    "en": { "rows": [["Label", "Detail from JD"], ...5-7 rows] }${bilingual ? `,\n    "${l2}": { "rows": [...translated...] }` : ''}
  },
  "askThem": {
    "en": ["Question 1 specific to JD", "Question 2", "Question 3", "Question 4"]${bilingual ? `,\n    "${l2}": [...translated...]` : ''}
  },
  "sensitive": {
    "en": { "title": "Potential topic", "context": "Why it might come up", "script": "Neutral response", "do_text": "Emphasize this", "dont_text": "Avoid this", "do_label": "Do", "dont_label": "Don't" }${bilingual ? `,\n    "${l2}": { "title": "", "context": "", "script": "", "do_text": "", "dont_text": "", "do_label": "", "dont_label": "" }` : ''}
  },
  "checklist": {
    "days": [
      {
        "badge": "Day 1", "label": {"en": "Today — Foundation"${bilingual ? `, "${l2}": "translated"` : ''}},
        "cssClass": "day-1", "priority": "critical", "priorityLabel": "Critical",
        "items": [
          {"text": {"en": "<strong>Task</strong> — details"${bilingual ? `, "${l2}": "translated"` : ''}}, "detail": {"en": "How to do it"${bilingual ? `, "${l2}": "translated"` : ''}}, "time": "1h"}
        ]
      },
      {"badge": "Day 2", "label": {"en": "Tomorrow — Depth"${bilingual ? `, "${l2}": ""` : ''}}, "cssClass": "day-2", "priority": "high", "priorityLabel": "High", "items": [...]},
      {"badge": "Interview Day", "label": {"en": "Morning — Warmup"${bilingual ? `, "${l2}": ""` : ''}}, "cssClass": "day-of", "priority": "medium", "priorityLabel": "Warmup", "items": [...]}
    ]
  },
  "flashcards": [
    {"en_q": "Question", "${l2}_q": "${bilingual ? 'translated' : ''}", "en_a": "Answer with resume evidence", "${l2}_a": "${bilingual ? 'translated' : ''}"},
    ...6-8 flashcards
  ],
  "prepSheet": {
    "title": "CompanyName Interview Prep Sheet",
    "cards": [
      {"id": "card-1", "title": "Product Notes", "hint": "Research hints", "content": "<b>Section</b><br>• bullet"},
      {"id": "card-2", "title": "Why This Company", "hint": "hint", "content": "<b>Draft</b><br>• reason"},
      {"id": "card-3", "title": "30-Second Pitch", "hint": "hint", "content": "pitch outline"},
      {"id": "card-4", "title": "STAR Stories", "hint": "hint", "content": "<b>Story 1: Real project from resume</b><br><i>Situation:</i> pre-filled<br><i>Task:</i> <br><i>Action:</i> <br><i>Result:</i> metrics"},
      {"id": "card-5", "title": "Questions to Ask", "hint": "hint", "content": "top questions"},
      {"id": "card-6", "title": "Scratch Pad", "hint": null, "content": ""}
    ]
  }
}

Rules:
- Return ONLY the JSON object, nothing else.
- Every answer must cite SPECIFIC resume experience with real metrics.
- Generate 3-4 question categories with 2 questions each.
- Checklist: Day 1 gets 4-5 items, Day 2 gets 4 items, Interview Day gets 3 items.
- All HTML content uses <strong>, <br>, <ul>, <li>, <i> tags.`;
}


// ===== API CALLERS =====

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
    throw new Error(`Claude API error (${resp.status}): ${err.slice(0, 300)}`);
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
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      max_tokens: 16384,
      messages: [
        { role: 'system', content: 'You are an interview prep expert. Return ONLY valid JSON, no markdown wrapping, no text before or after.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`${provider} API error (${resp.status}): ${err.slice(0, 300)}`);
  }

  const data = await resp.json();
  if (!data.choices || !data.choices[0]) throw new Error('Empty response from API');
  return data.choices[0].message.content;
}
