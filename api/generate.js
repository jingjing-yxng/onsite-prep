// Vercel serverless function — proxies LLM API calls (avoids CORS)

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { resumeText, jdText, provider, apiKey, bilingual, languages } = req.body;

  if (!resumeText || !jdText || !provider || !apiKey) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const langInstruction = bilingual && languages?.length === 2
    ? `Generate ALL content in BOTH ${langName(languages[0])} and ${langName(languages[1])}. Every text field that has language variants must include both.`
    : `Generate all content in English only. For zh/bilingual fields, leave them as empty strings.`;

  const prompt = buildPrompt(resumeText, jdText, langInstruction, bilingual, languages);

  try {
    let result;
    if (provider === 'claude') {
      result = await callClaude(apiKey, prompt);
    } else {
      result = await callOpenAICompatible(provider, apiKey, prompt);
    }

    // Try to parse JSON from the response
    let prepData;
    try {
      // Handle potential markdown code blocks
      let jsonStr = result;
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1];
      prepData = JSON.parse(jsonStr.trim());
    } catch (e) {
      return res.status(422).json({ error: 'Failed to parse AI response as JSON', raw: result.slice(0, 500) });
    }

    return res.status(200).json(prepData);
  } catch (e) {
    return res.status(500).json({ error: e.message || 'API call failed' });
  }
};

function langName(code) {
  const map = { en: 'English', zh: 'Chinese (中文)', fr: 'French', es: 'Spanish', de: 'German', ja: 'Japanese', ko: 'Korean', pt: 'Portuguese', ar: 'Arabic' };
  return map[code] || code;
}

// ===== PROMPT =====
function buildPrompt(resumeText, jdText, langInstruction, bilingual, languages) {
  const l1 = languages?.[0] || 'en';
  const l2 = languages?.[1] || 'en';

  return `You are an elite interview coach. A candidate is preparing for a specific job interview. You have their resume and the job description. Generate a COMPLETE, deeply personalized interview prep kit.

CRITICAL RULES:
- Use SPECIFIC details from the resume: real company names, real metrics, real projects, real technologies.
- Address SPECIFIC requirements from the job description: match each JD requirement to resume evidence.
- Questions should be realistic for THIS EXACT role at THIS EXACT company.
- Every answer should reference the candidate's actual experience, not generic advice.
- Strengths should directly map resume achievements to JD requirements.
- Gaps should honestly identify where the resume doesn't perfectly match the JD, with specific strategies to address each.
- STAR stories must use REAL experiences from the resume with actual numbers.
- ${langInstruction}

===== RESUME =====
${resumeText}

===== JOB DESCRIPTION =====
${jdText}

===== OUTPUT FORMAT =====
Return a single JSON object (no markdown, no explanation, ONLY valid JSON) with this exact structure:

{
  "meta": {
    "companyName": "Company Name from JD",
    "companyNameZh": "${bilingual ? 'Chinese name if known, else empty' : ''}",
    "role": "Exact role title from JD",
    "roleZh": "${bilingual ? 'Chinese role title' : ''}",
    "sidebarTitle": "CompanyName <span>x</span> CandidateFirstName",
    "sidebarSub": "Role Title<br>Company Name"
  },
  "pitch": {
    "en": {
      "label": "Memorize — say it naturally",
      "text": "A 30-second elevator pitch (3-4 sentences) that weaves the candidate's TOP achievements into why they're perfect for THIS role. Use specific metrics from resume. Must sound conversational, not robotic."
    }${bilingual ? `,
    "${l2}": {
      "label": "${l2 === 'zh' ? '背熟 — 自然地说出来' : 'Memorize — say it naturally'}",
      "text": "Same pitch translated naturally into ${langName(l2)}"
    }` : ''}
  },
  "strengths": {
    "en": {
      "rows": [
        ["JD Requirement 1", "<strong>Company</strong>: specific achievement with metrics"],
        ["JD Requirement 2", "<strong>Company</strong>: specific achievement with metrics"],
        ... (6-9 rows mapping JD requirements to resume evidence)
      ],
      "gaps": [
        { "title": "Gap: specific JD requirement not fully met", "text": "How to address it using related experience. Be specific." },
        ... (1-3 gaps)
      ]
    }${bilingual ? `,
    "${l2}": {
      "rows": [...same content translated...],
      "gaps": [...same content translated...]
    }` : ''}
  },
  "questions": {
    "categories": [
      {
        "label": { "en": "A — Role-Specific Strategy", "${l2}": "..." },
        ${bilingual ? '' : '"values": null,'}
        "items": [
          {
            "question": { "en": "Specific question about this role/company", "${l2}": "..." },
            "answer": {
              "en": "<ul><li><strong>Key point</strong> with specific resume evidence</li>...</ul>",
              "${l2}": "..."
            }
          },
          ... (2-3 questions per category)
        ]
      },
      {
        "label": { "en": "B — Company Knowledge", "${l2}": "..." },
        "items": [...]
      },
      {
        "label": { "en": "C — Behavioral / Culture Fit", "${l2}": "..." },
        "items": [...]
      },
      {
        "label": { "en": "D — Technical / Domain", "${l2}": "..." },
        "items": [...]
      }
    ]
  },
  "company": {
    "en": {
      "rows": [
        ["Founded", "Year, founder if known from JD"],
        ["Industry", "..."],
        ["Products", "Key products/services from JD"],
        ["Role Focus", "What this specific role does"],
        ["Team", "Team details if mentioned in JD"],
        ... (5-8 rows of intel extracted from JD)
      ]
    }${bilingual ? `,
    "${l2}": { "rows": [...translated...] }` : ''}
  },
  "askThem": {
    "en": [
      "Specific question showing you read the JD carefully",
      "Question about team structure/growth mentioned in JD",
      "Question about a specific challenge or initiative mentioned",
      "What does success look like in the first 90 days?",
      ... (4-5 questions)
    ]${bilingual ? `,
    "${l2}": [... translated ...]` : ''}
  },
  "sensitive": {
    "en": {
      "title": "Potential Sensitive Topic (if any, otherwise use 'Career Transitions')",
      "context": "Why this might come up based on resume/JD",
      "script": "A neutral, prepared response",
      "do_text": "What to emphasize",
      "dont_text": "What to avoid",
      "do_label": "Do",
      "dont_label": "Don't"
    }${bilingual ? `,
    "${l2}": { ... translated ... }` : ''}
  },
  "checklist": {
    "days": [
      {
        "badge": "Day 1",
        "label": { "en": "Today — Foundation", "${l2}": "..." },
        "cssClass": "day-1",
        "priority": "critical",
        "priorityLabel": "Critical",
        "items": [
          {
            "text": { "en": "<strong>Task</strong> — specific action tailored to this role", "${l2}": "..." },
            "detail": { "en": "How to do it, specific to this company/role", "${l2}": "..." },
            "time": "estimated time"
          },
          ... (4-5 items)
        ]
      },
      {
        "badge": "Day 2",
        "label": { "en": "Tomorrow — Depth & Polish", "${l2}": "..." },
        "cssClass": "day-2",
        "priority": "high",
        "priorityLabel": "High",
        "items": [... 4-5 items ...]
      },
      {
        "badge": "Interview Day",
        "label": { "en": "Morning of — Final warmup", "${l2}": "..." },
        "cssClass": "day-of",
        "priority": "medium",
        "priorityLabel": "Warmup",
        "items": [... 3 items ...]
      }
    ]
  },
  "flashcards": [
    {
      "en_q": "Most likely interview question for this role",
      "${l2}_q": "${bilingual ? 'translated' : ''}",
      "en_a": "Tailored answer with specific resume evidence",
      "${l2}_a": "${bilingual ? 'translated' : ''}"
    },
    ... (6-8 flashcards covering the key questions)
  ],
  "prepSheet": {
    "title": "CompanyName Interview Prep Sheet",
    "cards": [
      {
        "id": "card-1",
        "title": "Product/Company Notes",
        "hint": "Research the company's products. Specific things to look into based on JD.",
        "content": "<b>Key Products</b><br>• extracted from JD<br><br><b>Things to Research</b><br>• specific items based on JD requirements"
      },
      {
        "id": "card-2",
        "title": "\\"Why This Company\\" Answer",
        "hint": "The #1 question. Tailor to JD specifics.",
        "content": "<b>Draft answer:</b><br>• [specific reason tied to JD]<br>• [specific reason tied to resume match]"
      },
      {
        "id": "card-3",
        "title": "30-Second Pitch",
        "hint": "Practice until natural.",
        "content": "<b>Key points:</b><br>• [from generated pitch]"
      },
      {
        "id": "card-4",
        "title": "STAR Stories",
        "hint": "Use real experiences. 2-3 min each.",
        "content": "<b>Story 1: [Real project from resume]</b><br><i>Situation:</i> [pre-filled from resume]<br><i>Task:</i> <br><i>Action:</i> <br><i>Result:</i> [pre-filled metrics]<br><br><b>Story 2: [Another real project]</b><br>..."
      },
      {
        "id": "card-5",
        "title": "Questions to Ask",
        "hint": "Pick 3. Memorize.",
        "content": "<b>Top picks:</b><br>• [from askThem section]"
      },
      {
        "id": "card-6",
        "title": "Scratch Pad",
        "hint": null,
        "content": ""
      }
    ]
  }
}

IMPORTANT:
- Return ONLY the JSON object. No text before or after.
- All HTML in content fields should use <strong>, <br>, <ul>, <li>, <i> tags.
- Make the pitch sound natural and conversational, not like a list.
- Questions should be ones a real interviewer at this company would ask.
- Every answer must reference SPECIFIC experience from the resume.
- ${bilingual ? `For bilingual fields, "${l2}" content must be natural ${langName(l2)}, not word-for-word translation.` : 'For non-bilingual: omit all zh/second-language fields or set them to empty strings.'}`;
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
      max_tokens: 8192,
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
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      messages: [
        { role: 'system', content: 'You are an expert interview coach. Return only valid JSON, no markdown wrapping.' },
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
