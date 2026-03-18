// ===== Client-side LLM generation (bypasses Vercel function timeout) =====

function langName(code) {
  const map = { en: 'English', zh: 'Chinese (中文)', fr: 'French', es: 'Spanish', de: 'German', ja: 'Japanese', ko: 'Korean', pt: 'Portuguese', ar: 'Arabic' };
  return map[code] || code;
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

async function generatePrepClient(resumeText, jdText, provider, apiKey, bilingual, languages, onStepDone) {
  if (provider !== 'claude') {
    // Non-Claude: fall back to single call via proxy
    const result = await callViaProxy(resumeText, jdText, provider, apiKey, bilingual, languages);
    return result;
  }

  const l2 = (languages && languages.find(l => l !== 'en')) || 'zh';
  const l2Name = langName(l2);
  const biNote = bilingual
    ? `BILINGUAL: Include both "en" and "${l2}" keys for every text field.`
    : `English only. No second language keys.`;
  const context = `RESUME:\n${resumeText.slice(0, 6000)}\n\nJOB DESCRIPTION:\n${jdText.slice(0, 5000)}\n\n${biNote}`;
  const jsonRule = 'Return ONLY valid JSON, no markdown, no explanation.';

  // 4 parallel calls, each generating a subset of the prep data
  const calls = [
    // Call 1: Meta + Pitch + Strengths
    callClaudeClient(apiKey, `${context}\n\nGenerate a JSON object with ONLY these fields. Use SPECIFIC resume details and JD requirements. ${jsonRule}\n\n{
  "meta": { "companyName": "from JD", "companyNameZh": "${bilingual ? 'Chinese name' : ''}", "role": "from JD", "roleZh": "${bilingual ? 'Chinese' : ''}", "sidebarTitle": "Company <span>x</span> FirstName", "sidebarSub": "Role<br>Company" },
  "pitch": { "en": { "label": "Memorize — say it naturally", "text": "3-4 sentence pitch using SPECIFIC resume achievements for THIS role" }${bilingual ? `, "${l2}": { "label": "...", "text": "natural translation" }` : ''} },
  "strengths": { "en": { "rows": [["JD requirement", "<strong>Company</strong>: specific achievement"], ...6-8 rows], "gaps": [{"title": "Gap: ...", "text": "How to address"}, ...1-2] }${bilingual ? `, "${l2}": { "rows": [...], "gaps": [...] }` : ''} }
}`).then(r => { if (onStepDone) onStepDone('pitch'); return r; }),

    // Call 2: Questions + Flashcards
    callClaudeClient(apiKey, `${context}\n\nGenerate a JSON object with ONLY these fields. Questions should be realistic for THIS role. Every answer must cite specific resume evidence. ${jsonRule}\n\n{
  "questions": { "categories": [{ "label": {"en": "A — Category"${bilingual ? `, "${l2}": "..."` : ''}}, "items": [{ "question": {"en": "..."${bilingual ? `, "${l2}": "..."` : ''}}, "answer": {"en": "<ul><li>...</li></ul>"${bilingual ? `, "${l2}": "..."` : ''}} }] }, ...3-4 categories with 2 questions each] },
  "flashcards": [{"en_q": "Q", "${l2}_q": "${bilingual ? 'translated' : ''}", "en_a": "A with resume evidence", "${l2}_a": "${bilingual ? 'translated' : ''}"}, ...6-8 cards]
}`).then(r => { if (onStepDone) onStepDone('questions'); return r; }),

    // Call 3: Company + Ask Them + Sensitive
    callClaudeClient(apiKey, `${context}\n\nGenerate a JSON object with ONLY these fields. Company intel must have 7+ rows with SPECIFIC product/team details from JD. ${jsonRule}\n\n{
  "company": { "en": { "rows": [["Label", "Specific detail"], ...7-10 rows covering products, competitors, business model, team, strategy] }${bilingual ? `, "${l2}": { "rows": [...] }` : ''} },
  "askThem": { "en": ["Specific question about the role/company", ...4-5 questions]${bilingual ? `, "${l2}": [...]` : ''} },
  "sensitive": { "en": { "title": "Topic", "context": "Why relevant", "script": "Response", "do_text": "Do", "dont_text": "Avoid", "do_label": "Do", "dont_label": "Don't" }${bilingual ? `, "${l2}": { "title": "", "context": "", "script": "", "do_text": "", "dont_text": "", "do_label": "", "dont_label": "" }` : ''} }
}`).then(r => { if (onStepDone) onStepDone('company'); return r; }),

    // Call 4: Checklist + Prep Sheet
    callClaudeClient(apiKey, `${context}\n\nGenerate a JSON object with ONLY these fields. Checklist tasks must be specific and actionable (use real product names, competitor names). ${jsonRule}\n\n{
  "checklist": { "days": [
    {"badge": "Day 1", "label": {"en": "Today — Foundation"${bilingual ? `, "${l2}": "..."` : ''}}, "cssClass": "day-1", "priority": "critical", "priorityLabel": "Critical", "items": [{"text": {"en": "<strong>Task</strong> — specific"${bilingual ? `, "${l2}": "..."` : ''}}, "detail": {"en": "How"${bilingual ? `, "${l2}": "..."` : ''}}, "time": "1h"}, ...4-5 items]},
    {"badge": "Day 2", "label": {"en": "Tomorrow — Depth"${bilingual ? `, "${l2}": "..."` : ''}}, "cssClass": "day-2", "priority": "high", "priorityLabel": "High", "items": [...4 items]},
    {"badge": "Interview Day", "label": {"en": "Morning — Warmup"${bilingual ? `, "${l2}": "..."` : ''}}, "cssClass": "day-of", "priority": "medium", "priorityLabel": "Warmup", "items": [...3 items]}
  ]},
  "prepSheet": { "title": "CompanyName Interview Prep Sheet", "cards": [
    {"id": "card-1", "title": "Product Deep Dive", "hint": "...", "content": "<b>Product 1</b><br>• ..."${bilingual ? `, "content_${l2}": "translated"` : ''}},
    {"id": "card-2", "title": "Why This Company", "hint": "...", "content": "..."${bilingual ? `, "content_${l2}": "..."` : ''}},
    {"id": "card-3", "title": "30-Second Pitch", "hint": "...", "content": "..."${bilingual ? `, "content_${l2}": "..."` : ''}},
    {"id": "card-4", "title": "STAR Stories", "hint": "...", "content": "<b>Story 1</b><br>..."${bilingual ? `, "content_${l2}": "..."` : ''}},
    {"id": "card-5", "title": "Questions to Ask", "hint": "...", "content": "..."${bilingual ? `, "content_${l2}": "..."` : ''}},
    {"id": "card-6", "title": "Scratch Pad", "hint": null, "content": ""}
  ]}
}`).then(r => { if (onStepDone) onStepDone('finalize'); return r; })
  ];

  // Run all 4 in parallel
  const results = await Promise.all(calls.map(async (call) => {
    const text = await call;
    const parsed = extractJSON(text);
    if (!parsed) throw new Error('Failed to parse a section response');
    return parsed;
  }));

  // Merge all results into one object
  const merged = {};
  results.forEach(r => Object.assign(merged, r));
  return merged;
}

async function callClaudeClient(apiKey, prompt) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
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

async function callViaProxy(resumeText, jdText, provider, apiKey, bilingual, languages) {
  const resp = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText, jdText, provider, apiKey, bilingual, languages })
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    let errMsg = `API returned ${resp.status}`;
    try { const j = JSON.parse(text); errMsg = j.error || errMsg; } catch(e) {}
    if (resp.status === 504) errMsg = 'Request timed out. Try using Claude as your provider (direct browser connection, no timeout).';
    throw new Error(errMsg);
  }

  return await resp.json();
}

// Same for chat
async function chatClient(message, currentData, provider, apiKey, action) {
  if (provider === 'claude') {
    const prompt = action === 'generate-notes'
      ? buildNotesPromptClient(currentData)
      : buildChatPromptClient(message, currentData);

    const result = await callClaudeClient(apiKey, prompt);
    const parsed = extractJSON(result);
    if (!parsed) throw new Error('Failed to parse AI response');
    return parsed;
  } else {
    // Use proxy for non-Claude providers
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, currentData, provider, apiKey, action })
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      let errMsg = `API returned ${resp.status}`;
      try { const j = JSON.parse(text); errMsg = j.error || errMsg; } catch(e) {}
      throw new Error(errMsg);
    }
    return await resp.json();
  }
}

function buildChatPromptClient(message, data) {
  const meta = data.meta || {};
  return `You are an interview prep editor with deep knowledge of ${meta.companyName || 'the company'}'s product landscape. The user has an existing interview prep kit for a ${meta.role || ''} role and wants to make changes.

CURRENT PREP DATA:
${JSON.stringify(data, null, 2)}

USER REQUEST:
"${message}"

Return a JSON object containing ONLY the fields that need to change. Use the exact same structure as the input data, but only include the keys you're modifying.

Rules:
- Return ONLY valid JSON, no markdown, no explanation.
- Preserve all existing content that isn't being changed.
- For array fields, return the COMPLETE array for that field.
- SPECIFICITY IS CRITICAL: When adding or updating company research, questions, or talking points, always reference specific products, features, competitors, and metrics — never produce generic bullets. If the company has multiple products/platforms, address each relevant one individually.
- When the user asks to "add more detail" or "research more," break down the company's product portfolio and competitive landscape rather than adding surface-level facts.
- Also return a "chatResponse" field with a brief (1 sentence) confirmation of what you changed.`;
}

function buildNotesPromptClient(data) {
  const checklistItems = [];
  if (data.checklist?.days) {
    data.checklist.days.forEach(day => {
      day.items.forEach(item => {
        checklistItems.push({ day: day.badge, text: item.text?.en || '', detail: item.detail?.en || '' });
      });
    });
  }

  const meta = data.meta || {};
  const companyIntel = data.company?.en?.rows || [];
  const strengths = data.strengths?.en?.rows || [];
  const gaps = data.strengths?.en?.gaps || [];
  const questions = (data.questions?.categories || []).map(cat => ({
    category: cat.label?.en || '',
    questions: (cat.items || []).map(item => ({
      q: item.question?.en || '',
      a: (item.answer?.en || '').slice(0, 200)
    }))
  }));
  const pitch = data.pitch?.en?.text || '';
  const askThem = data.askThem?.en || [];

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
${JSON.stringify(data.prepSheet, null, 2)}

YOUR TASK:
Generate Prep Sheet note cards that give the candidate a real competitive edge. For each card:

1. **Company/Product Deep Dive**: If the company has multiple products, business lines, or platforms, create SEPARATE sections for each one that is relevant to the role. For each product/line:
   - What it does, who it serves, and its market position
   - Recent launches, pivots, or strategic shifts
   - How it connects to the role the candidate is interviewing for
   - Specific metrics, user counts, or business results if mentioned in the company intel

2. **Role-Specific Talking Points**: Don't just list company facts — translate them into things the candidate can actually SAY in the interview. Frame bullets as "When they ask about X, mention Y because Z."

3. **Connect Strengths to Products**: For each relevant product line, note which of the candidate's strengths maps to it and what specific example they could use.

4. **Competitive Intelligence**: Identify 2-3 direct competitors from the company intel. For each, note what differentiates this company and how the candidate can reference that understanding in answers.

5. **Prepare for Gap Questions**: For each skill gap, provide a concrete deflection strategy tied to the company's actual needs.

6. **Research Templates**: Where the candidate needs to do more research, provide specific URLs, search queries, or resources to check — not just "research the company."

Return a JSON object with this structure:
{
  "chatResponse": "Generated X detailed note cards covering [specific topics].",
  "prepSheet": {
    "title": "${data.prepSheet?.title || 'Interview Prep Sheet'}",
    "cards": [
      {
        "id": "card-gen-1",
        "title": "Card title",
        "hint": "How to use this card",
        "content": "<b>Section heading</b><ul><li>Specific, actionable bullet</li><li>Another bullet with real detail</li></ul><b>Another section</b><ul><li>...</li></ul>"
      }
    ]
  }
}

Rules:
- Return ONLY valid JSON, no markdown wrapping.
- Be SPECIFIC — use real product names, features, and details from the company intel. Never write generic bullets like "research the company's products" when you have the actual product info.
- If the company has multiple products or business units, dedicate a card (or a detailed section within a card) to EACH relevant one.
- Each bullet should be something the candidate can directly use or say — not a vague reminder.
- Use <b>, <br>, <i>, <ul>, <li> for formatting. For bullet lists, ALWAYS use <ul><li>...</li></ul> — NEVER use "•" or "·" dot characters with <br> tags.
- Keep card titles short and actionable.
- Don't duplicate cards already well-covered in the existing prep sheet.
- Aim for 8-12 cards total — more cards with focused depth is better than fewer generic ones.`;
}

function buildGeneratePrompt(resumeText, jdText, bilingual, languages) {
  // Find the non-English language (could be at index 0 or 1)
  const l2 = (languages && languages.find(l => l !== 'en')) || 'zh';
  const l2Name = langName(l2);
  const bilingualNote = bilingual
    ? `This prep kit must be BILINGUAL: English + ${l2Name}. Every field with language variants needs both "en" and "${l2}" keys.`
    : `This prep kit is English only. Omit all second language keys — only include "en" keys.`;

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
    "companyNameZh": "${bilingual ? 'Chinese name if known' : ''}",
    "role": "string — role title from JD",
    "roleZh": "${bilingual ? 'Chinese role title' : ''}",
    "sidebarTitle": "CompanyName <span>x</span> CandidateFirstName",
    "sidebarSub": "Role<br>Company"
  },
  "pitch": {
    "en": { "label": "Memorize — say it naturally", "text": "A conversational 30-second pitch using specific resume achievements. Reference the specific product/team if identifiable from the JD." }${bilingual ? `,\n    "${l2}": { "label": "label in ${l2Name}", "text": "natural translation" }` : ''}
  },
  "strengths": {
    "en": {
      "rows": [["JD requirement", "<strong>Company</strong>: specific achievement"], ...6-8 rows],
      "gaps": [{"title": "Gap: shortfall", "text": "How to address it"}, ...1-2 gaps]
    }${bilingual ? `,\n    "${l2}": { "rows": [...translated...], "gaps": [...translated...] }` : ''}
  },
  "questions": {
    "categories": [
      {
        "label": {"en": "A — Category"${bilingual ? `, "${l2}": "translated"` : ''}},
        "items": [
          {
            "question": {"en": "Realistic question tied to a specific product, initiative, or challenge the company faces"${bilingual ? `, "${l2}": "translated"` : ''}},
            "answer": {"en": "<ul><li><strong>Point</strong> with resume evidence tied to the company's specific context</li></ul>"${bilingual ? `, "${l2}": "translated"` : ''}}
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
        { "title": "Competitor: [Name] — how they compare", "context": "Specific comparison: what competitor does better/worse, market share, product differences", "script": "Prepared response for 'Why us over [Competitor]?'", "do_text": "Show you've researched the competitor", "dont_text": "Don't trash the competitor", "do_label": "Do", "dont_label": "Don't" },
        { "title": "Company Controversy: [specific issue]", "context": "Known controversies — layoffs, lawsuits, product failures, PR crises, regulatory issues. Or the most likely criticism the company faces", "script": "Neutral, informed response", "do_text": "Acknowledge and pivot to what excites you", "dont_text": "Don't pretend ignorance or be overly critical", "do_label": "Do", "dont_label": "Don't" },
        { "title": "Industry/External Sensitivity", "context": "Geopolitical, regulatory, or market topics relevant to this company's sector/geography", "script": "Balanced response", "do_text": "Show informed perspective", "dont_text": "Avoid strong political opinions", "do_label": "Do", "dont_label": "Don't" }
      ]
    }${bilingual ? `,\n    "${l2}": { "items": [...translated, same 3-item structure...] }` : ''}
  },
  "checklist": {
    "days": [
      {"badge": "Day 1", "label": {"en": "Today — Foundation"${bilingual ? `, "${l2}": "translated"` : ''}}, "cssClass": "day-1", "priority": "critical", "priorityLabel": "Critical", "items": [{"text": {"en": "<strong>Task</strong> — product/company-specific"${bilingual ? `, "${l2}": "translated"` : ''}}, "detail": {"en": "Specific instructions — e.g. 'Try [Product X] free tier, note the onboarding flow' not 'Research the company'"${bilingual ? `, "${l2}": "translated"` : ''}}, "time": "1h"}, ...4-5 items]},
      {"badge": "Day 2", "label": {"en": "Tomorrow — Depth"${bilingual ? `, "${l2}": ""` : ''}}, "cssClass": "day-2", "priority": "high", "priorityLabel": "High", "items": [...4 items]},
      {"badge": "Interview Day", "label": {"en": "Morning — Warmup"${bilingual ? `, "${l2}": ""` : ''}}, "cssClass": "day-of", "priority": "medium", "priorityLabel": "Warmup", "items": [...3 items]}
    ]
  },
  "flashcards": [
    {"en_q": "Question referencing specific product/company context", "${bilingual ? l2 + '_q' : 'en_q'}": "${bilingual ? 'translated' : ''}", "en_a": "Answer with resume evidence tied to company specifics", "${bilingual ? l2 + '_a' : 'en_a'}": "${bilingual ? 'translated' : ''}"},
    ...6-8 flashcards
  ],
  "prepSheet": {
    "title": "CompanyName Interview Prep Sheet",
    "cards": [
      {"id": "card-1", "title": "Product Deep Dive", "hint": "One section PER product/platform relevant to this role", "content": "<b>[Product 1 Name]</b><ul><li>What it does and who uses it</li><li>Key features / differentiators</li><li>How this role touches it</li></ul><b>[Product 2 Name]</b><ul><li>Same structure</li></ul><b>Competitive Positioning</b><ul><li>vs [Competitor 1]: ...</li><li>vs [Competitor 2]: ...</li></ul>"${bilingual ? `, "content_${l2}": "<b>translated</b><ul><li>translated</li></ul>"` : ''}},
      {"id": "card-2", "title": "Why This Company", "hint": "Tie each reason to something specific — a product, a value, a market opportunity", "content": "<b>Draft — Why [Company]</b><ul><li>Product-specific reason</li><li>Market/mission reason</li><li>Team/culture reason</li></ul>"${bilingual ? `, "content_${l2}": "translated"` : ''}},
      {"id": "card-3", "title": "30-Second Pitch", "hint": "hint", "content": "outline"${bilingual ? `, "content_${l2}": "translated"` : ''}},
      {"id": "card-4", "title": "STAR Stories", "hint": "Map each story to a specific JD requirement or product area", "content": "<b>Story 1: Real project → maps to [JD requirement]</b><br><i>Situation:</i> pre-filled<br><i>Task:</i> <br><i>Action:</i> <br><i>Result:</i> metrics"${bilingual ? `, "content_${l2}": "translated"` : ''}},
      {"id": "card-5", "title": "Questions to Ask", "hint": "hint", "content": "questions"${bilingual ? `, "content_${l2}": "translated"` : ''}},
      {"id": "card-6", "title": "Scratch Pad", "hint": null, "content": ""${bilingual ? `, "content_${l2}": ""` : ''}}
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
