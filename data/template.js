// Blank Interview Prep Template
// This is the default data for new preps created from the dashboard.
// It gets deep-cloned into localStorage; no file is created for new preps.
window.prepData_template = {
  meta: {
    slug: "template",
    companyName: "[Company Name]",
    companyNameZh: "",
    role: "[Role Title]",
    roleZh: "",
    color: "#00C968",
    sidebarTitle: '<span>Interview</span> Prep',
    sidebarSub: ''
  },
  bilingual: false,
  pitch: {
    en: {
      label: "Memorize \u2014 say it naturally",
      text: "[Your 30-second pitch. Summarize who you are, what you\u2019ve done, and why you\u2019re the right fit \u2014 in 3-4 sentences.]"
    },
    zh: {
      label: "背熟 \u2014 自然地说出来",
      text: "[你的30秒自我介绍。用3-4句话概括你是谁、做过什么、为什么适合这个岗位。]"
    }
  },
  strengths: {
    en: {
      rows: [
        ["[Strength 1]", "[Evidence: company, metric, impact]"],
        ["[Strength 2]", "[Evidence]"],
        ["[Strength 3]", "[Evidence]"],
        ["[Strength 4]", "[Evidence]"],
        ["[Strength 5]", "[Evidence]"]
      ],
      gaps: [
        { title: "[Potential gap]", text: "[How you address it \u2014 reframe, evidence, or plan to close]" }
      ]
    },
    zh: {
      rows: [
        ["[优势1]", "[证据：公司、数据、影响]"],
        ["[优势2]", "[证据]"],
        ["[优势3]", "[证据]"],
        ["[优势4]", "[证据]"],
        ["[优势5]", "[证据]"]
      ],
      gaps: [
        { title: "[潜在短板]", text: "[应对方式\u2014\u2014重新定义、拿出证据、或弥补计划]" }
      ]
    }
  },
  questions: {
    categories: [
      {
        label: { en: "A \u2014 Role-Specific", zh: "A \u2014 岗位相关" },
        items: [
          {
            question: { en: "[Most likely question about the role]", zh: "[最可能被问到的岗位问题]" },
            answer: { en: "<ul><li>[Key point 1]</li><li>[Key point 2]</li><li>[Your proof]</li></ul>", zh: "<ul><li>[要点1]</li><li>[要点2]</li><li>[你的证据]</li></ul>" }
          },
          {
            question: { en: "[Second likely question]", zh: "[第二个可能问题]" },
            answer: { en: "<ul><li>[Answer framework]</li></ul>", zh: "<ul><li>[回答框架]</li></ul>" }
          }
        ]
      },
      {
        label: { en: "B \u2014 Company Knowledge", zh: "B \u2014 公司认知" },
        items: [
          {
            question: { en: "\"Why this company?\"", zh: "\u201C为什么选这家公司？\u201D" },
            answer: { en: "<ul><li>[Reason 1 \u2014 mission/product]</li><li>[Reason 2 \u2014 growth/opportunity]</li><li>[Why you specifically]</li></ul>", zh: "<ul><li>[原因1\u2014\u2014使命/产品]</li><li>[原因2\u2014\u2014增长/机会]</li><li>[为什么是你]</li></ul>" }
          }
        ]
      },
      {
        label: { en: "C \u2014 Behavioral", zh: "C \u2014 行为面试" },
        items: [
          {
            question: { en: "\"Tell us about a time you failed.\"", zh: "\u201C讲一个你失败的经历。\u201D" },
            answer: { en: "<ul><li>[STAR: Situation, Task, Action, Result]</li><li>[What you learned]</li></ul>", zh: "<ul><li>[STAR法则：情境、任务、行动、结果]</li><li>[你学到了什么]</li></ul>" }
          }
        ]
      }
    ]
  },
  company: {
    en: {
      rows: [
        ["Founded", "[Year, founder]"],
        ["Valuation / Stage", "[Funding, valuation]"],
        ["Core Product", "[Main product/service]"],
        ["Market", "[Target market, size]"],
        ["Competitors", "[Key competitors]"]
      ]
    },
    zh: {
      rows: [
        ["成立时间", "[年份、创始人]"],
        ["估值/阶段", "[融资、估值]"],
        ["核心产品", "[主要产品/服务]"],
        ["市场", "[目标市场、规模]"],
        ["竞争对手", "[主要竞争对手]"]
      ]
    }
  },
  askThem: {
    en: [
      "\"What does success look like for this role in the first 90 days?\"",
      "\"What\u2019s the biggest challenge the team is facing right now?\"",
      "\"How does the team make decisions when there\u2019s disagreement?\"",
      "\"What\u2019s one thing you wish you\u2019d known before joining?\""
    ],
    zh: [
      "\u201C这个岗位前90天做到什么算成功？\u201D",
      "\u201C团队目前面临的最大挑战是什么？\u201D",
      "\u201C团队意见不一致时怎么做决策？\u201D",
      "\u201C有什么是你入职前希望提前知道的？\u201D"
    ]
  },
  sensitive: {
    en: {
      items: [
        {
          title: "[Competitor: Name]",
          context: "[How they compare — product differences, market position]",
          script: "[Your response to 'Why us over them?']",
          do_text: "[Show you've researched the competitor]",
          dont_text: "[Don't trash them]",
          do_label: "Do",
          dont_label: "Don\u2019t"
        },
        {
          title: "[Company Controversy]",
          context: "[Known issues — layoffs, lawsuits, product failures, criticism]",
          script: "[Your neutral, informed response]",
          do_text: "[Acknowledge and pivot to positives]",
          dont_text: "[Don't pretend ignorance]",
          do_label: "Do",
          dont_label: "Don\u2019t"
        },
        {
          title: "[Industry Sensitivity]",
          context: "[Geopolitical, regulatory, or market topic if relevant]",
          script: "[Your balanced response]",
          do_text: "[Show informed perspective]",
          dont_text: "[Avoid strong opinions]",
          do_label: "Do",
          dont_label: "Don\u2019t"
        }
      ]
    },
    zh: {
      items: [
        {
          title: "[竞争对手：名称]",
          context: "[对比分析——产品差异、市场定位]",
          script: "[你的回答：'为什么选择我们而不是他们？']",
          do_text: "[展示你研究过竞争对手]",
          dont_text: "[不要贬低对手]",
          do_label: "可以",
          dont_label: "不要"
        },
        {
          title: "[公司争议]",
          context: "[已知问题——裁员、诉讼、产品失败、批评]",
          script: "[你中立且知情的回答]",
          do_text: "[承认并转向积极面]",
          dont_text: "[不要假装不知道]",
          do_label: "可以",
          dont_label: "不要"
        },
        {
          title: "[行业敏感话题]",
          context: "[如相关的地缘政治、监管或市场话题]",
          script: "[你平衡的回答]",
          do_text: "[展示知情的视角]",
          dont_text: "[避免强烈的政治观点]",
          do_label: "可以",
          dont_label: "不要"
        }
      ]
    }
  },
  checklist: {
    days: [
      {
        badge: "Day 1",
        label: { en: "Today \u2014 Foundation", zh: "今天 \u2014 打基础" },
        cssClass: "day-1",
        priority: "critical",
        priorityLabel: "Critical",
        items: [
          { text: { en: "<strong>Use the product extensively</strong> \u2014 Spend 1-2 hours with the company\u2019s product. Note likes, dislikes, feature ideas.", zh: "<strong>深度体验产品</strong>\u2014\u2014花1-2小时使用公司产品。记录优缺点和功能建议。" }, detail: { en: "Compare with competitors. Try edge cases.", zh: "和竞品对比。尝试边界场景。" }, time: "1-2h" },
          { text: { en: "<strong>Memorize your \u201CWhy this company\u201D answer</strong> \u2014 Know it cold.", zh: "<strong>背熟\u201C为什么选这家公司\u201D</strong>\u2014\u2014滚瓜烂熟。" }, detail: { en: "Practice out loud 5 times.", zh: "大声练习5遍。" }, time: "30m" },
          { text: { en: "<strong>Memorize 30-second pitch</strong>", zh: "<strong>背熟30秒自我介绍</strong>" }, detail: { en: "Record yourself. Listen back.", zh: "录音回听。" }, time: "30m" },
          { text: { en: "<strong>Read the Company Intel section</strong>", zh: "<strong>通读公司情报部分</strong>" }, detail: { en: "Know every row by heart.", zh: "每一行都要能讲。" }, time: "30m" },
          { text: { en: "<strong>Prepare 3 STAR stories</strong>", zh: "<strong>准备3个STAR故事</strong>" }, detail: { en: "Write bullet points. Practice out loud. 2-3 min each.", zh: "写要点提纲。大声练习。每个2-3分钟。" }, time: "1.5h" }
        ]
      },
      {
        badge: "Day 2",
        label: { en: "Tomorrow \u2014 Depth & Polish", zh: "明天 \u2014 深度准备" },
        cssClass: "day-2",
        priority: "high",
        priorityLabel: "High",
        items: [
          { text: { en: "<strong>Practice all Q&A cards</strong> \u2014 Use flashcard mode.", zh: "<strong>练习所有面试题</strong>\u2014\u2014用闪卡模式。" }, detail: { en: "Run through twice.", zh: "过两遍。" }, time: "2h" },
          { text: { en: "<strong>Research the founder / leadership</strong>", zh: "<strong>研究创始人/管理层</strong>" }, detail: { en: "Watch recent interviews. Note a quote to reference.", zh: "看近期访谈。记一个能引用的观点。" }, time: "45m" },
          { text: { en: "<strong>Draft 30-60-90 day plan</strong>", zh: "<strong>写30-60-90天计划</strong>" }, detail: { en: "Audit (30), Strategy (60), Execute (90).", zh: "调研(30)、策略(60)、执行(90)。" }, time: "1h" },
          { text: { en: "<strong>Pick 3 questions to ask them</strong>", zh: "<strong>选3个反问问题</strong>" }, detail: null, time: "15m" }
        ]
      },
      {
        badge: "Interview Day",
        label: { en: "Morning of \u2014 Final warmup", zh: "面试当天 \u2014 最后热身" },
        cssClass: "day-of",
        priority: "medium",
        priorityLabel: "Warmup",
        items: [
          { text: { en: "<strong>Speed-run flashcards</strong>", zh: "<strong>快速过一遍闪卡</strong>" }, detail: null, time: "20m" },
          { text: { en: "<strong>Say your pitch out loud once</strong>", zh: "<strong>大声说一遍自我介绍</strong>" }, detail: null, time: "5m" },
          { text: { en: "<strong>Quick scan of Company Intel</strong>", zh: "<strong>快速扫一遍公司情报</strong>" }, detail: null, time: "5m" }
        ]
      }
    ]
  },
  flashcards: [
    { en_q: "[Most likely question]", zh_q: "[最可能的问题]", en_a: "[Your answer key points]", zh_a: "[回答要点]" },
    { en_q: "\"Why this company?\"", zh_q: "\u201C为什么选这家公司？\u201D", en_a: "[Reason 1]<br>[Reason 2]<br>[Why you]", zh_a: "[原因1]<br>[原因2]<br>[为什么是你]" },
    { en_q: "What\u2019s your 30-second pitch?", zh_q: "30秒介绍你自己。", en_a: "[Your pitch key points]", zh_a: "[自我介绍要点]" },
    { en_q: "Tell us about a time you failed.", zh_q: "讲一个你失败的经历。", en_a: "[STAR story]", zh_a: "[STAR故事]" }
  ],
  prepSheet: {
    title: "[Company] Interview Prep Sheet",
    cards: [
      { id: "card-1", title: "Product Notes", hint: "Use the product. Compare with competitors. Note feedback.", content: '<b>What I liked:</b><br>\u2022 <br><br><b>What could be better:</b><br>\u2022 <br><br><b>Competitor comparison:</b><br>\u2022 ' },
      { id: "card-2", title: "\u201CWhy This Company\u201D", hint: "The #1 question.", content: '<b>My answer:</b><br><br>' },
      { id: "card-3", title: "30-Second Pitch", hint: "Practice until natural.", content: '<b>My pitch:</b><br><br>' },
      { id: "card-4", title: "STAR Stories", hint: "3 stories, 2-3 min each.", content: '<b>Story 1:</b><br><i>Situation:</i> <br><i>Task:</i> <br><i>Action:</i> <br><i>Result:</i> <br><br><b>Story 2:</b><br><i>Situation:</i> <br><i>Task:</i> <br><i>Action:</i> <br><i>Result:</i> <br><br><b>Story 3:</b><br><i>Situation:</i> <br><i>Task:</i> <br><i>Action:</i> <br><i>Result:</i> ' },
      { id: "card-5", title: "Questions to Ask", hint: "Pick 3. Memorize.", content: '<b>Question 1:</b><br><br><b>Question 2:</b><br><br><b>Question 3:</b><br><br>' },
      { id: "card-6", title: "Scratch Pad", hint: null, content: '' }
    ]
  }
};
