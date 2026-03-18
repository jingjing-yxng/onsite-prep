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
  const l2 = (languages && languages.find(l => l !== 'en')) || 'zh';
  const l2Name = langName(l2);

  const bilingualNote = bilingual
    ? `This prep kit must be BILINGUAL: English + ${l2Name}. Every field with language variants needs both "en" and "${l2}" keys.`
    : `This prep kit is English only. Omit all "${l2}" language keys — only include "en" keys.`;

  return `You are an elite interview coach with deep knowledge of company landscapes. Generate a personalized interview prep kit from this resume and job description.

${bilingualNote}

RESUME:
${resumeText.slice(0, 8000)}

JOB DESCRIPTION:
${jdText.slice(0, 6000)}

Generate a JSON object with the structure below. Use SPECIFIC details from the resume (real company names, metrics, projects) and address SPECIFIC requirements from the JD.

CRITICAL INSTRUCTIONS — COMPANY DEPTH:
Before generating, analyze the JD to identify:
- The company's individual products, platforms, and business lines (many companies have 3-10+ distinct products under one brand — identify ALL of them that are relevant to this role)
- Which specific product/team this role sits in
- The company's competitive landscape (who are the 2-3 direct competitors? what differentiates this company?)
- The company's business model (B2B, B2C, SaaS, marketplace, etc.) and how this role contributes to revenue
- Recent strategic signals in the JD (new team, scaling, pivoting, launching)

Use this analysis throughout EVERY section — company intel, questions, checklist, and prep sheet cards.

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
    "en": { "label": "Memorize — say it naturally", "text": "A conversational 30-second pitch (3-4 sentences) using specific resume achievements that show why this candidate is perfect for THIS role. Reference the specific product/team if identifiable from the JD." }${bilingual ? `,\n    "${l2}": { "label": "label in ${l2Name}", "text": "natural translation" }` : ''}
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
            "question": {"en": "Realistic interview question tied to a specific product, initiative, or challenge the company faces"${bilingual ? `, "${l2}": "translated"` : ''}},
            "answer": {"en": "<ul><li><strong>Point</strong> with resume evidence tied to the company's specific context</li><li>Another point</li></ul>"${bilingual ? `, "${l2}": "translated"` : ''}}
          }
        ]
      }
    ]
  },
  "company": {
    "en": {
      "rows": [
        ["Product/Platform", "Name and what it does — be specific about features, target users, and market position"],
        ["Product/Platform 2", "If the company has multiple products, list EACH one separately with specifics"],
        ["Competitive Landscape", "Name 2-3 direct competitors and what differentiates this company"],
        ["Business Model", "How they make money, key metrics, pricing if known"],
        ["Team/Org", "Which team this role sits in, team size signals, reporting structure clues from JD"],
        ["Recent Signals", "New product launches, fundraising, strategic pivots inferred from JD language"],
        ["Role Impact", "How this specific role connects to business outcomes"]
      ]
    }${bilingual ? `,\n    "${l2}": { "rows": [...translated, same structure...] }` : ''}
  },
  "askThem": {
    "en": ["Product-specific question about roadmap or strategy", "Team/org structure question", "Question about success metrics for this role", "Question tied to a specific competitive challenge they face"]${bilingual ? `,\n    "${l2}": [...translated...]` : ''}
  },
  "sensitive": {
    "en": {
      "items": [
        { "title": "Competitor: [Name] — how they compare", "context": "Specific comparison: what competitor does better/worse, market share, product differences. The interviewer may ask 'Why us over [Competitor]?'", "script": "Prepared response acknowledging the competitor's strengths while highlighting THIS company's differentiators", "do_text": "Show you've used/researched the competitor's product", "dont_text": "Don't trash the competitor — show nuanced understanding", "do_label": "Do", "dont_label": "Don't" },
        { "title": "Company Controversy: [specific issue]", "context": "Any known controversies — layoffs, lawsuits, product failures, PR crises, leadership changes, regulatory issues. If none are well-known, identify the most likely criticism the company faces (e.g., market positioning weakness, scaling challenges, monetization pressure)", "script": "Neutral, informed response that shows awareness without being negative", "do_text": "Acknowledge awareness, pivot to what excites you about the company's direction", "dont_text": "Don't pretend you don't know about it or be overly critical", "do_label": "Do", "dont_label": "Don't" },
        { "title": "Industry/External Sensitivity", "context": "Geopolitical, regulatory, or market-level topics that could come up given the company's sector and geography (e.g., data privacy regulations, AI safety debates, trade tensions). Only include if genuinely relevant to this company.", "script": "Balanced, professional response", "do_text": "Show informed perspective", "dont_text": "Avoid strong political opinions", "do_label": "Do", "dont_label": "Don't" }
      ]
    }${bilingual ? `,\n    "${l2}": { "items": [...translated, same 3-item structure...] }` : ''}
  },
  "checklist": {
    "days": [
      {
        "badge": "Day 1", "label": {"en": "Today — Foundation"${bilingual ? `, "${l2}": "translated"` : ''}},
        "cssClass": "day-1", "priority": "critical", "priorityLabel": "Critical",
        "items": [
          {"text": {"en": "<strong>Task</strong> — product/company-specific details"${bilingual ? `, "${l2}": "translated"` : ''}}, "detail": {"en": "Specific instructions — e.g. 'Try [Product X] free tier, note the onboarding flow and compare to [Competitor Y]' rather than 'Research the company'"${bilingual ? `, "${l2}": "translated"` : ''}}, "time": "1h"}
        ]
      },
      {"badge": "Day 2", "label": {"en": "Tomorrow — Depth"${bilingual ? `, "${l2}": ""` : ''}}, "cssClass": "day-2", "priority": "high", "priorityLabel": "High", "items": [...]},
      {"badge": "Interview Day", "label": {"en": "Morning — Warmup"${bilingual ? `, "${l2}": ""` : ''}}, "cssClass": "day-of", "priority": "medium", "priorityLabel": "Warmup", "items": [...]}
    ]
  },
  "flashcards": [
    {"en_q": "Question referencing specific product/company context", "${l2}_q": "${bilingual ? 'translated' : ''}", "en_a": "Answer with resume evidence tied to company specifics", "${l2}_a": "${bilingual ? 'translated' : ''}"},
    ...6-8 flashcards
  ],
  "prepSheet": {
    "title": "CompanyName Interview Prep Sheet",
    "cards": [
      {"id": "card-1", "title": "Product Deep Dive", "hint": "One section PER product/platform relevant to this role", "content": "<b>[Product 1 Name]</b><ul><li>What it does and who uses it</li><li>Key features / differentiators</li><li>How this role touches it</li></ul><b>[Product 2 Name]</b><ul><li>Same structure</li></ul><b>Competitive Positioning</b><ul><li>vs [Competitor 1]: ...</li><li>vs [Competitor 2]: ...</li></ul>"},
      {"id": "card-2", "title": "Why This Company", "hint": "Tie each reason to something specific — a product, a value, a market opportunity", "content": "<b>Draft — Why [Company]</b><ul><li>Product-specific reason</li><li>Market/mission reason</li><li>Team/culture reason</li></ul>"},
      {"id": "card-3", "title": "30-Second Pitch", "hint": "hint", "content": "pitch outline"},
      {"id": "card-4", "title": "STAR Stories", "hint": "Map each story to a specific JD requirement or product area", "content": "<b>Story 1: Real project from resume → maps to [JD requirement]</b><br><i>Situation:</i> pre-filled<br><i>Task:</i> <br><i>Action:</i> <br><i>Result:</i> metrics"},
      {"id": "card-5", "title": "Questions to Ask", "hint": "hint", "content": "top questions"},
      {"id": "card-6", "title": "Scratch Pad", "hint": null, "content": ""}
    ]
  }
}

Rules:
- Return ONLY the JSON object, nothing else.
- Every answer must cite SPECIFIC resume experience with real metrics.
- Generate 3-4 question categories with 2 questions each. At least one category should be product/domain-specific (e.g., "Product & Growth" not just "Behavioral").
- Company intel MUST have 7-10 rows. Dedicate a separate row to EACH distinct product/platform. Never collapse multiple products into one generic "Products" row.
- The "sensitive" section MUST have exactly 3 items in the "items" array: (1) a competitor comparison with a NAMED competitor and specific product/market differences, (2) a company-specific controversy or known criticism — real issues like layoffs, lawsuits, failed products, regulatory trouble, or if none are public, the most credible criticism an informed candidate would know about, (3) an industry/external sensitivity only if genuinely relevant to this company's sector. Do NOT default to generic geopolitics unless it specifically affects this company.
- Checklist items must be actionable and specific — "Try the free tier of [Product X]" not "Research company products." Include specific product names, competitor names, and search terms.
- Checklist: Day 1 gets 4-5 items, Day 2 gets 4 items, Interview Day gets 3 items.
- All HTML content uses <strong>, <br>, <ul>, <li>, <i> tags. For bullet lists, ALWAYS use <ul><li>...</li></ul> — NEVER use "•" or "·" dot characters with <br> tags.`;
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
