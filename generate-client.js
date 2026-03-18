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

async function generatePrepClient(resumeText, jdText, provider, apiKey, bilingual, languages) {
  const prompt = buildGeneratePrompt(resumeText, jdText, bilingual, languages);
  let result;

  if (provider === 'claude') {
    result = await callClaudeClient(apiKey, prompt);
  } else {
    // For OpenAI-compatible providers, try via Vercel proxy (they don't support CORS)
    result = await callViaProxy(resumeText, jdText, provider, apiKey, bilingual, languages);
    return result; // proxy returns parsed JSON directly
  }

  const parsed = extractJSON(result);
  if (!parsed) throw new Error('Failed to parse AI response as JSON');
  return parsed;
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
  return `You are an interview prep editor. The user has an existing interview prep kit and wants to make changes.

CURRENT PREP DATA:
${JSON.stringify(data, null, 2)}

USER REQUEST:
"${message}"

Return a JSON object containing ONLY the fields that need to change. Use the exact same structure as the input data, but only include the keys you're modifying.

Rules:
- Return ONLY valid JSON, no markdown, no explanation.
- Preserve all existing content that isn't being changed.
- For array fields, return the COMPLETE array for that field.
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
  return `Generate Prep Sheet note cards based on these checklist items.

CHECKLIST: ${JSON.stringify(checklistItems)}
EXISTING PREP SHEET: ${JSON.stringify(data.prepSheet)}

Return JSON: { "chatResponse": "...", "prepSheet": { "title": "...", "cards": [{ "id": "card-gen-1", "title": "...", "hint": "...", "content": "..." }, ...] } }

Rules: Return ONLY valid JSON. Create 1 card per major checklist item. Use <b>, <br>, <i>, <ul>, <li> for formatting. Aim for 6-10 cards.`;
}

function buildGeneratePrompt(resumeText, jdText, bilingual, languages) {
  // Find the non-English language (could be at index 0 or 1)
  const l2 = (languages && languages.find(l => l !== 'en')) || 'zh';
  const l2Name = langName(l2);
  const bilingualNote = bilingual
    ? `This prep kit must be BILINGUAL: English + ${l2Name}. Every field with language variants needs both "en" and "${l2}" keys.`
    : `This prep kit is English only. Omit all second language keys — only include "en" keys.`;

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
    "companyNameZh": "${bilingual ? 'Chinese name if known' : ''}",
    "role": "string — role title from JD",
    "roleZh": "${bilingual ? 'Chinese role title' : ''}",
    "sidebarTitle": "CompanyName <span>x</span> CandidateFirstName",
    "sidebarSub": "Role<br>Company"
  },
  "pitch": {
    "en": { "label": "Memorize — say it naturally", "text": "A conversational 30-second pitch using specific resume achievements" }${bilingual ? `,\n    "${l2}": { "label": "label in ${l2Name}", "text": "natural translation" }` : ''}
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
            "question": {"en": "Realistic question"${bilingual ? `, "${l2}": "translated"` : ''}},
            "answer": {"en": "<ul><li><strong>Point</strong> with resume evidence</li></ul>"${bilingual ? `, "${l2}": "translated"` : ''}}
          }
        ]
      }
    ]
  },
  "company": {
    "en": { "rows": [["Label", "Detail from JD"], ...5-7 rows] }${bilingual ? `,\n    "${l2}": { "rows": [...translated...] }` : ''}
  },
  "askThem": {
    "en": ["Question specific to JD", ...4 questions]${bilingual ? `,\n    "${l2}": [...translated...]` : ''}
  },
  "sensitive": {
    "en": { "title": "Topic", "context": "Why relevant", "script": "Response", "do_text": "Do this", "dont_text": "Avoid this", "do_label": "Do", "dont_label": "Don't" }${bilingual ? `,\n    "${l2}": { "title": "", "context": "", "script": "", "do_text": "", "dont_text": "", "do_label": "", "dont_label": "" }` : ''}
  },
  "checklist": {
    "days": [
      {"badge": "Day 1", "label": {"en": "Today — Foundation"${bilingual ? `, "${l2}": "translated"` : ''}}, "cssClass": "day-1", "priority": "critical", "priorityLabel": "Critical", "items": [{"text": {"en": "<strong>Task</strong>"${bilingual ? `, "${l2}": "translated"` : ''}}, "detail": {"en": "Details"${bilingual ? `, "${l2}": "translated"` : ''}}, "time": "1h"}, ...4-5 items]},
      {"badge": "Day 2", "label": {"en": "Tomorrow — Depth"${bilingual ? `, "${l2}": ""` : ''}}, "cssClass": "day-2", "priority": "high", "priorityLabel": "High", "items": [...4 items]},
      {"badge": "Interview Day", "label": {"en": "Morning — Warmup"${bilingual ? `, "${l2}": ""` : ''}}, "cssClass": "day-of", "priority": "medium", "priorityLabel": "Warmup", "items": [...3 items]}
    ]
  },
  "flashcards": [
    {"en_q": "Question", "${bilingual ? l2 + '_q' : 'en_q'}": "${bilingual ? 'translated' : ''}", "en_a": "Answer", "${bilingual ? l2 + '_a' : 'en_a'}": "${bilingual ? 'translated' : ''}"},
    ...6-8 flashcards
  ],
  "prepSheet": {
    "title": "CompanyName Interview Prep Sheet",
    "cards": [
      {"id": "card-1", "title": "Product Notes", "hint": "hints", "content": "<b>Section</b><br>• bullet"${bilingual ? `, "content_${l2}": "<b>translated section</b><br>• translated bullet"` : ''}},
      {"id": "card-2", "title": "Why This Company", "hint": "hint", "content": "<b>Draft</b><br>• reason"${bilingual ? `, "content_${l2}": "translated"` : ''}},
      {"id": "card-3", "title": "30-Second Pitch", "hint": "hint", "content": "outline"${bilingual ? `, "content_${l2}": "translated"` : ''}},
      {"id": "card-4", "title": "STAR Stories", "hint": "hint", "content": "<b>Story 1</b><br><i>Situation:</i> pre-filled"${bilingual ? `, "content_${l2}": "translated"` : ''}},
      {"id": "card-5", "title": "Questions to Ask", "hint": "hint", "content": "questions"${bilingual ? `, "content_${l2}": "translated"` : ''}},
      {"id": "card-6", "title": "Scratch Pad", "hint": null, "content": ""${bilingual ? `, "content_${l2}": ""` : ''}}
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
