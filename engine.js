// ===== Interview Prep Engine — data-driven rendering + all behavior =====

let currentSlug = null;
let currentData = null;

// ===== INIT =====
function loadPrep(slug) {
  currentSlug = slug;

  // Try localStorage first (user has previously loaded this prep)
  const stored = localStorage.getItem(slug + '-content');
  if (stored) {
    currentData = JSON.parse(stored);
  } else {
    // Try seed data loaded via <script> tag
    const seed = window['prepData_' + slug];
    if (seed) {
      currentData = JSON.parse(JSON.stringify(seed)); // deep clone
    }
  }

  if (!currentData) {
    window.location.href = 'index.html';
    return;
  }

  // Apply accent color
  if (currentData.meta.color) {
    document.documentElement.style.setProperty('--accent', currentData.meta.color);
    // Derive glow from accent
    document.documentElement.style.setProperty('--accent-glow', lightenColor(currentData.meta.color, 20));
  }

  renderSidebar();
  renderGeneralPrep();
  renderPrepSheet();
  initEditable();     // Must run before loadEdits so contenteditable attrs are set
  loadChecklist();
  loadEdits();
  loadPrepSheet();
  initAddButtons();
  rebuildSheetNav();
  initScrollSpy();
  updateProgress();

  // Update flashcard button text
  const flashBtn = document.getElementById('flashcardBtn');
  if (flashBtn) flashBtn.textContent = currentData.bilingual ? 'Practice 练习' : 'Practice';

  // Update page title
  document.title = currentData.meta.companyName + ' — Interview Prep';

  // Ensure this prep is in the registry
  ensureRegistered(slug);

  // Migrate legacy kimi localStorage keys
  if (slug === 'kimi') migrateLegacyKimi();
}

function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * percent / 100));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * percent / 100));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// ===== RENDER SIDEBAR =====
function renderSidebar() {
  const d = currentData;
  document.getElementById('sidebarTitle').innerHTML = d.meta.sidebarTitle || (d.meta.companyName + ' Prep');
  document.getElementById('sidebarSub').innerHTML = d.meta.sidebarSub || (d.meta.role + (d.meta.companyNameZh ? '<br>' + d.meta.companyNameZh : ''));

  // Build General Prep nav
  const navContainer = document.getElementById('sidebarNav');
  const sections = [
    { id: 'pitch', label: d.bilingual ? 'Pitch 电梯演讲' : 'Pitch' },
    { id: 'strengths', label: d.bilingual ? 'Strengths 优势' : 'Strengths' },
    { id: 'questions', label: d.bilingual ? 'Questions 面试题' : 'Questions' },
    { id: 'company', label: d.bilingual ? 'Company 公司' : 'Company Intel' },
    { id: 'ask-them', label: d.bilingual ? 'Ask Them 反问' : 'Ask Them' },
    { id: 'controversy', label: d.bilingual ? 'Sensitive 敏感' : 'Sensitive' },
    { id: 'checklist', label: d.bilingual ? 'Checklist 清单' : 'Checklist' }
  ];
  navContainer.innerHTML = sections.map((s, i) =>
    `<a href="#${s.id}"><span class="nav-num">${i + 1}</span> ${s.label}</a>`
  ).join('');
}

// ===== TAB SWITCHING =====
function switchTab(tab) {
  document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  event.target.classList.add('active');

  const nav = document.getElementById('sidebarNav');
  const sheetNav = document.getElementById('sidebarNavSheet');
  const flashBtn = document.querySelector('.flashcard-trigger');
  if (tab === 'general') {
    nav.style.display = '';
    sheetNav.style.display = 'none';
    if (flashBtn) flashBtn.style.display = '';
  } else {
    nav.style.display = 'none';
    sheetNav.style.display = '';
    if (flashBtn) flashBtn.style.display = 'none';
  }
}

// ===== RENDER GENERAL PREP =====
function renderGeneralPrep() {
  const d = currentData;
  const bi = d.bilingual;
  const container = document.getElementById('generalPrepContent');
  const checkSvg = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5L5.5 10.5L11.5 4.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  let html = '';

  // 1. Pitch
  html += `<section id="pitch">
    <div class="section-header"><div class="section-num">1</div>
      <h2>${bi ? 'Your 30-Second Pitch &middot; 30秒电梯演讲' : 'Your 30-Second Pitch'}</h2>
    </div>
    <div class="${bi ? 'bilingual' : 'monolingual'}">
      <div class="lang-en"><span class="lang-label">English</span>
        <div class="pitch-card">
          <span class="pitch-label">${d.pitch.en.label}</span>
          <p>${d.pitch.en.text}</p>
        </div>
      </div>
      ${bi ? `<div class="lang-zh"><span class="lang-label">中文</span>
        <div class="pitch-card">
          <span class="pitch-label">${d.pitch.zh.label}</span>
          <p>${d.pitch.zh.text}</p>
        </div>
      </div>` : ''}
    </div>
  </section>`;

  // 2. Strengths
  function renderStrengthCol(lang, data) {
    let s = `<div class="lang-${lang}"><span class="lang-label">${lang === 'en' ? 'English' : '中文'}</span>
      <div class="strength-grid">`;
    data.rows.forEach(r => {
      s += `<div class="strength-row"><div>${r[0]}</div><div>${r[1]}</div></div>`;
    });
    s += '</div>';
    if (data.gaps && data.gaps.length) {
      s += '<div class="gap-cards">';
      data.gaps.forEach(g => {
        s += `<div class="gap-card"><h4>${g.title}</h4><p>${g.text}</p></div>`;
      });
      s += '</div>';
    }
    s += '</div>';
    return s;
  }
  html += `<section id="strengths">
    <div class="section-header"><div class="section-num">2</div>
      <h2>${bi ? 'Your Strengths &middot; 你的优势' : 'Your Strengths'}</h2>
    </div>
    <div class="${bi ? 'bilingual' : 'monolingual'}">
      ${renderStrengthCol('en', d.strengths.en)}
      ${bi ? renderStrengthCol('zh', d.strengths.zh) : ''}
    </div>
  </section>`;

  // 3. Questions
  function renderQACol(lang, categories) {
    let s = `<div class="lang-${lang}"><span class="lang-label">${lang === 'en' ? 'English' : '中文'}</span>`;
    categories.forEach(cat => {
      s += `<div class="qa-category"><div class="qa-category-label">${cat.label[lang]}</div>`;
      if (cat.values) {
        s += `<div class="values-bar">${cat.values[lang].map(v => `<span>${v}</span>`).join('')}</div>`;
      }
      cat.items.forEach(item => {
        s += `<div class="qa-item">
          <div class="qa-question" onclick="toggleQA(this)">
            <h3>${item.question[lang]}</h3>
            <div class="qa-toggle">+</div>
          </div>
          <div class="qa-answer"><div class="qa-answer-inner">${item.answer[lang]}</div></div>
        </div>`;
      });
      s += '</div>';
    });
    s += '</div>';
    return s;
  }
  html += `<section id="questions">
    <div class="section-header"><div class="section-num">3</div>
      <h2>${bi ? 'Likely Questions &middot; 可能的面试题' : 'Likely Questions'}</h2>
    </div>
    <div class="${bi ? 'bilingual' : 'monolingual'}">
      ${renderQACol('en', d.questions.categories)}
      ${bi ? renderQACol('zh', d.questions.categories) : ''}
    </div>
  </section>`;

  // 4. Company Intel
  function renderCompanyCol(lang, data) {
    let s = `<div class="lang-${lang}"><span class="lang-label">${lang === 'en' ? 'English' : '中文'}</span>
      <div class="company-grid">`;
    data.rows.forEach(r => {
      s += `<div class="company-row"><div>${r[0]}</div><div>${r[1]}</div></div>`;
    });
    s += '</div></div>';
    return s;
  }
  html += `<section id="company">
    <div class="section-header"><div class="section-num">4</div>
      <h2>${bi ? 'Company Intel &middot; 公司情报' : 'Company Intel'}</h2>
    </div>
    <div class="${bi ? 'bilingual' : 'monolingual'}">
      ${renderCompanyCol('en', d.company.en)}
      ${bi ? renderCompanyCol('zh', d.company.zh) : ''}
    </div>
  </section>`;

  // 5. Ask Them
  function renderAskCol(lang, items) {
    let s = `<div class="lang-${lang}"><span class="lang-label">${lang === 'en' ? 'English' : '中文'}</span>
      <div class="ask-list">`;
    items.forEach(item => {
      s += `<div class="ask-item">${item}</div>`;
    });
    s += '</div></div>';
    return s;
  }
  html += `<section id="ask-them">
    <div class="section-header"><div class="section-num">5</div>
      <h2>${bi ? 'Questions to Ask &middot; 反问环节' : 'Questions to Ask'}</h2>
    </div>
    <div class="${bi ? 'bilingual' : 'monolingual'}">
      ${renderAskCol('en', d.askThem.en)}
      ${bi ? renderAskCol('zh', d.askThem.zh) : ''}
    </div>
  </section>`;

  // 6. Sensitive
  function renderSensitiveCol(lang, data) {
    return `<div class="lang-${lang}"><span class="lang-label">${lang === 'en' ? 'English' : '中文'}</span>
      <div class="controversy-card">
        <h3>${data.title}</h3>
        <p style="font-size:12.5px;color:var(--text-dim);line-height:1.7;">${data.context}</p>
        <div class="script-box">${data.script}</div>
        <div class="do-dont">
          <div class="do-col"><h4>${data.do_label}</h4><p>${data.do_text}</p></div>
          <div class="dont-col"><h4>${data.dont_label}</h4><p>${data.dont_text}</p></div>
        </div>
      </div>
    </div>`;
  }
  html += `<section id="controversy">
    <div class="section-header"><div class="section-num">6</div>
      <h2>${bi ? 'Sensitive Topic &middot; 敏感话题' : 'Sensitive Topic'}</h2>
    </div>
    <div class="${bi ? 'bilingual' : 'monolingual'}">
      ${renderSensitiveCol('en', d.sensitive.en)}
      ${bi ? renderSensitiveCol('zh', d.sensitive.zh) : ''}
    </div>
  </section>`;

  // 7. Checklist
  let checkIdx = 0;
  function renderChecklistCol(lang, day) {
    const startIdx = checkIdx;
    let s = `<div class="lang-${lang}"><span class="lang-label">${lang === 'en' ? 'English' : '中文'}</span>
      <div class="checklist">`;
    day.items.forEach((item, i) => {
      const idx = startIdx + i;
      s += `<div class="check-item" data-idx="${idx}">
        <div class="check-box" onclick="toggleCheck(this.parentElement, ${idx})">${checkSvg}</div>
        <div><div class="check-text">${item.text[lang]}</div>${item.detail && item.detail[lang] ? `<div class="check-detail">${item.detail[lang]}</div>` : ''}</div>
        <span class="time-est">${item.time}</span>
      </div>`;
    });
    s += '</div></div>';
    return s;
  }

  html += `<section id="checklist">
    <div class="section-header"><div class="section-num">7</div>
      <h2>${bi ? 'Prep Checklist &middot; 准备清单' : 'Prep Checklist'}</h2>
    </div>`;

  d.checklist.days.forEach(day => {
    const dayLabel = bi ? `${day.label.en} ${day.label.zh}` : day.label.en;
    html += `<div class="checklist-day ${day.cssClass}">
      <div class="checklist-day-header">
        <span class="day-badge">${day.badge}</span>
        <span class="day-label">${dayLabel}</span>
        <span class="priority-tag priority-${day.priority}">${day.priorityLabel}</span>
      </div>
      <div class="${bi ? 'bilingual' : 'monolingual'}">`;

    // EN column
    html += renderChecklistCol('en', day);
    // ZH column (if bilingual)
    if (bi) {
      html += renderChecklistCol('zh', day);
    }
    // Advance the global index
    checkIdx += day.items.length;

    html += '</div></div>';
  });

  html += '</section>';

  container.innerHTML = html;

  // Count total checklist items
  window.TOTAL_CHECKS = 0;
  d.checklist.days.forEach(day => { TOTAL_CHECKS += day.items.length; });
}

// ===== RENDER PREP SHEET =====
function renderPrepSheet() {
  const d = currentData;
  const container = document.getElementById('prepSheetContent');
  const ps = d.prepSheet;

  let html = `<div class="prep-sheet-title" contenteditable="true">${ps.title}</div>
    <div class="prep-sheet-subtitle">Your working doc. Type <strong>/</strong> for formatting commands. Select text for bold/italic/underline.</div>
    <hr class="ps-divider">`;

  ps.cards.forEach(card => {
    html += `<div class="ps-section" data-card-id="${card.id}">
      <div class="ps-section-header">
        <div class="ps-section-title" contenteditable="true">${card.title}</div>
        <button class="ps-delete-btn" onclick="deleteCard(this)" title="Delete card">&times;</button>
      </div>
      ${card.hint ? `<div class="ps-section-hint">${card.hint}</div>` : ''}
      <div class="ps-editor" contenteditable="true" data-placeholder="Type your notes here... Use / for formatting commands."${!card.hint && !card.content ? ' style="min-height:200px;"' : ''}>${card.content}</div>
    </div>
    <hr class="ps-divider">`;
  });

  container.innerHTML = html;

  // Wire up title blur → save
  container.querySelectorAll('.ps-section-title, .prep-sheet-title').forEach(el => {
    el.addEventListener('blur', () => { savePrepSheet(); rebuildSheetNav(); });
  });

  // Store builtin IDs for this prep
  window.BUILTIN_IDS = ps.cards.map(c => c.id);
}


// ===== Q&A TOGGLE =====
function toggleQA(el) {
  const item = el.closest('.qa-item');
  const answer = item.querySelector('.qa-answer');
  if (item.classList.contains('open')) {
    answer.style.maxHeight = '0';
    item.classList.remove('open');
  } else {
    answer.style.maxHeight = answer.scrollHeight + 'px';
    item.classList.add('open');
  }
}

// ===== CHECKLIST =====
function toggleCheck(el, idx) {
  const pairs = document.querySelectorAll('.check-item[data-idx="' + idx + '"]');
  const isDone = !el.classList.contains('done');
  pairs.forEach(p => p.classList.toggle('done', isDone));
  updateProgress();
  saveChecklist();
}

function updateProgress() {
  const doneSet = new Set();
  document.querySelectorAll('.check-item.done[data-idx]').forEach(el => {
    doneSet.add(el.getAttribute('data-idx'));
  });
  const total = window.TOTAL_CHECKS || 13;
  const txt = document.getElementById('progressText');
  const fill = document.getElementById('progressFill');
  if (txt) txt.textContent = `${doneSet.size} / ${total} done`;
  if (fill) fill.style.width = `${(doneSet.size / total) * 100}%`;
}

function saveChecklist() {
  const states = {};
  document.querySelectorAll('.check-item[data-idx]').forEach(el => {
    states[el.getAttribute('data-idx')] = el.classList.contains('done');
  });
  localStorage.setItem(currentSlug + '-checklist', JSON.stringify(states));
}

function loadChecklist() {
  // Try new key first, then legacy
  let saved = localStorage.getItem(currentSlug + '-checklist');
  if (!saved && currentSlug === 'kimi') {
    saved = localStorage.getItem('kimi-checklist-v2');
  }
  if (saved) {
    const states = JSON.parse(saved);
    Object.keys(states).forEach(idx => {
      if (states[idx]) {
        document.querySelectorAll('.check-item[data-idx="' + idx + '"]').forEach(el => {
          el.classList.add('done');
        });
      }
    });
  }
}

// ===== SCROLL SPY =====
function initScrollSpy() {
  const navLinks = document.querySelectorAll('#sidebarNav a');
  const sections = document.querySelectorAll('#generalPrepContent section');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - 120) current = s.id; });
    navLinks.forEach(l => {
      l.classList.remove('active');
      if (l.getAttribute('href') === '#' + current) l.classList.add('active');
    });
  });
}

// ===== FLASHCARDS =====
let currentCard = 0;
function openFlashcards() {
  currentCard = 0;
  showCard();
  document.getElementById('flashcardOverlay').classList.add('active');
}
function closeFlashcards() {
  document.getElementById('flashcardOverlay').classList.remove('active');
}
function showCard() {
  const fc = currentData.flashcards[currentCard];
  const bi = currentData.bilingual;
  document.getElementById('flashcard').classList.remove('flipped');
  if (bi) {
    document.getElementById('fcFront').innerHTML = `<div class="fc-bilingual"><div class="fc-zh">${fc.zh_q}</div><div>${fc.en_q}</div></div>`;
    document.getElementById('fcBack').innerHTML = `<div class="fc-bilingual-answer"><div>${fc.zh_a}</div><div>${fc.en_a}</div></div>`;
  } else {
    document.getElementById('fcFront').innerHTML = `<div class="fc-mono">${fc.en_q}</div>`;
    document.getElementById('fcBack').innerHTML = `<div class="fc-mono-answer">${fc.en_a}</div>`;
  }
  document.getElementById('fcCounter').textContent = `${currentCard + 1} / ${currentData.flashcards.length}`;
}
function flipCard() { document.getElementById('flashcard').classList.toggle('flipped'); }
function nextCard() { currentCard = (currentCard + 1) % currentData.flashcards.length; showCard(); }
function prevCard() { currentCard = (currentCard - 1 + currentData.flashcards.length) % currentData.flashcards.length; showCard(); }

document.addEventListener('keydown', (e) => {
  const o = document.getElementById('flashcardOverlay');
  if (o && o.classList.contains('active')) {
    if (e.key === 'Escape') closeFlashcards();
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipCard(); }
    if (e.key === 'ArrowRight') nextCard();
    if (e.key === 'ArrowLeft') prevCard();
  }
});

// ===== EDITABLE CONTENT (General Prep tab) =====
function initEditable() {
  const selectors = [
    '.pitch-card p', '.pitch-label',
    '.strength-row > div',
    '.gap-card h4', '.gap-card p',
    '.qa-question h3', '.qa-answer-inner',
    '.company-row > div',
    '.ask-item',
    '.controversy-card h3', '.controversy-card > p',
    '.script-box',
    '.do-col p', '.dont-col p',
    '.values-bar span',
    '.qa-category-label',
    '.day-label',
    '.section-header h2'
  ];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      el.setAttribute('contenteditable', 'true');
      el.style.outline = 'none';
      el.style.borderRadius = '4px';
      el.style.transition = 'box-shadow 0.2s';
      el.addEventListener('focus', () => { el.style.boxShadow = '0 0 0 1px rgba(108,92,231,0.4)'; });
      el.addEventListener('blur', () => { el.style.boxShadow = 'none'; saveEdits(); });
    });
  });
}

function saveEdits() {
  const edits = {};
  document.querySelectorAll('[contenteditable="true"]').forEach((el, i) => {
    edits[i] = el.innerHTML;
  });
  localStorage.setItem(currentSlug + '-edits', JSON.stringify(edits));
}

function loadEdits() {
  // Try new key first, then legacy
  let saved = localStorage.getItem(currentSlug + '-edits');
  if (!saved && currentSlug === 'kimi') {
    saved = localStorage.getItem('kimi-prep-edits');
  }
  if (saved) {
    const edits = JSON.parse(saved);
    document.querySelectorAll('[contenteditable="true"]').forEach((el, i) => {
      if (edits[i] !== undefined) {
        el.innerHTML = edits[i];
      }
    });
  }
}

// ===== RICH TEXT SHORTCUTS (global) =====
document.addEventListener('keydown', (e) => {
  const el = document.activeElement;
  if (!el || el.getAttribute('contenteditable') !== 'true') return;
  const mod = e.metaKey || e.ctrlKey;
  if (!mod) return;
  if (e.key === 'b') { e.preventDefault(); document.execCommand('bold'); }
  if (e.key === 'i') { e.preventDefault(); document.execCommand('italic'); }
  if (e.key === 'u') { e.preventDefault(); document.execCommand('underline'); }
});

// ===== AUTO-LIST: "* " → bullet, "1. " → numbered =====
document.addEventListener('input', (e) => {
  const el = e.target;
  if (!el || el.getAttribute('contenteditable') !== 'true') return;

  const sel = window.getSelection();
  if (!sel.rangeCount || !sel.isCollapsed) return;

  const node = sel.anchorNode;
  if (!node || node.nodeType !== 3) return;

  const text = node.textContent;
  const offset = sel.anchorOffset;

  let trigger = null;
  let triggerLen = 0;
  if (offset >= 2 && text.substring(offset - 2, offset) === '* ') {
    trigger = 'insertUnorderedList'; triggerLen = 2;
  } else if (offset >= 3 && text.substring(offset - 3, offset) === '1. ') {
    trigger = 'insertOrderedList'; triggerLen = 3;
  }
  if (!trigger) return;
  if (node.parentElement.closest('li') || node.parentElement.closest('ul') || node.parentElement.closest('ol')) return;

  function getLineText(textNode, cursorOffset) {
    let lineText = textNode.textContent.substring(0, cursorOffset);
    function walkBack(startNode) {
      let n = startNode;
      while (n) {
        let sib = n.previousSibling;
        while (sib) {
          if (sib.nodeType === 1 && sib.tagName === 'BR') return lineText;
          if (sib.nodeType === 1) {
            const display = window.getComputedStyle(sib).display;
            if (display === 'block' || display === 'list-item' || display === 'table') return lineText;
          }
          lineText = (sib.textContent || '') + lineText;
          sib = sib.previousSibling;
        }
        const parent = n.parentElement;
        if (!parent || parent === el || parent.getAttribute('contenteditable') === 'true') break;
        const parentDisplay = window.getComputedStyle(parent).display;
        if (parentDisplay === 'block' || parentDisplay === 'list-item') break;
        n = parent;
      }
      return lineText;
    }
    return walkBack(textNode);
  }

  const lineText = getLineText(node, offset);
  const trimmedLine = lineText.replace(/^[\s\u200B\uFEFF\n\r]*/g, '');
  if (trigger === 'insertUnorderedList' && trimmedLine !== '* ') return;
  if (trigger === 'insertOrderedList' && trimmedLine !== '1. ') return;

  const range = document.createRange();
  range.setStart(node, offset - triggerLen);
  range.setEnd(node, offset);
  sel.removeAllRanges();
  sel.addRange(range);
  document.execCommand('delete');
  requestAnimationFrame(() => { document.execCommand(trigger); });
});


// ===== PREP SHEET: Slash commands + format bar =====
const slashCommands = [
  { label: 'Heading 1', desc: 'Large heading', icon: 'H1', action: () => document.execCommand('formatBlock', false, 'h1') },
  { label: 'Heading 2', desc: 'Medium heading', icon: 'H2', action: () => document.execCommand('formatBlock', false, 'h2') },
  { label: 'Heading 3', desc: 'Small heading', icon: 'H3', action: () => document.execCommand('formatBlock', false, 'h3') },
  { label: 'Bullet list', desc: 'Unordered list', icon: '•', action: () => document.execCommand('insertUnorderedList') },
  { label: 'Numbered list', desc: 'Ordered list', icon: '1.', action: () => document.execCommand('insertOrderedList') },
  { label: 'Quote', desc: 'Block quote', icon: '"', action: () => document.execCommand('formatBlock', false, 'blockquote') },
  { label: 'Divider', desc: 'Horizontal rule', icon: '—', action: () => document.execCommand('insertHorizontalRule') },
  { label: 'Bold', desc: 'Bold text', icon: 'B', action: () => document.execCommand('bold') },
  { label: 'Italic', desc: 'Italic text', icon: 'I', action: () => document.execCommand('italic') },
  { label: 'Underline', desc: 'Underline text', icon: 'U', action: () => document.execCommand('underline') },
  { label: 'Normal text', desc: 'Plain paragraph', icon: '¶', action: () => document.execCommand('formatBlock', false, 'div') },
];

const slashMenu = document.createElement('div');
slashMenu.className = 'slash-menu';
slashMenu.innerHTML = slashCommands.map((cmd, i) =>
  `<div class="slash-menu-item" data-idx="${i}"><span class="sm-icon">${cmd.icon}</span><div><div class="sm-label">${cmd.label}</div><div class="sm-desc">${cmd.desc}</div></div></div>`
).join('');
document.body.appendChild(slashMenu);

const formatBar = document.createElement('div');
formatBar.className = 'format-bar';
formatBar.innerHTML = `
  <button title="Bold (Cmd+B)"><b>B</b></button>
  <button title="Italic (Cmd+I)"><i>I</i></button>
  <button title="Underline (Cmd+U)"><u>U</u></button>
  <button title="Strikethrough"><s>S</s></button>
`;
document.body.appendChild(formatBar);
const fmtCmds = ['bold', 'italic', 'underline', 'strikeThrough'];
formatBar.querySelectorAll('button').forEach((btn, i) => {
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    document.execCommand(fmtCmds[i]);
  });
});

let slashActive = false;
let slashEditor = null;
let slashRange = null;
let slashFilter = '';
let slashSelected = 0;

// Listen for input in editors → save
document.addEventListener('input', (e) => {
  if (!e.target.classList.contains('ps-editor')) return;
  savePrepSheet();
});

document.addEventListener('keydown', (e) => {
  const editor = e.target.closest('.ps-editor');

  // Slash menu navigation
  if (slashActive) {
    const items = slashMenu.querySelectorAll('.slash-menu-item:not([style*="display: none"])');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      slashSelected = Math.min(slashSelected + 1, items.length - 1);
      updateSlashSelection(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      slashSelected = Math.max(slashSelected - 1, 0);
      updateSlashSelection(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[slashSelected]) items[slashSelected].click();
    } else if (e.key === 'Escape') {
      closeSlashMenu();
    } else if (e.key === 'Backspace') {
      if (slashFilter.length === 0) { closeSlashMenu(); }
      else { slashFilter = slashFilter.slice(0, -1); filterSlashMenu(); }
    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      slashFilter += e.key;
      filterSlashMenu();
    }
    return;
  }

  if (!editor) return;

  if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
    const sel = window.getSelection();
    if (sel.rangeCount) {
      slashEditor = editor;
      slashRange = sel.getRangeAt(0).cloneRange();
      slashFilter = '';
      slashSelected = 0;
      let rect = sel.getRangeAt(0).getBoundingClientRect();
      if (!rect || (rect.top === 0 && rect.left === 0) || rect.height === 0) {
        const marker = document.createElement('span');
        marker.textContent = '\u200B';
        sel.getRangeAt(0).insertNode(marker);
        rect = marker.getBoundingClientRect();
        marker.remove();
        sel.removeAllRanges();
        sel.addRange(slashRange);
      }
      slashMenu.style.top = (rect.bottom + 4) + 'px';
      slashMenu.style.left = rect.left + 'px';
      slashMenu.classList.add('active');
      slashActive = true;
      filterSlashMenu();
    }
  }
});

function filterSlashMenu() {
  const items = slashMenu.querySelectorAll('.slash-menu-item');
  let visibleCount = 0;
  items.forEach(item => {
    const label = item.querySelector('.sm-label').textContent.toLowerCase();
    const match = label.includes(slashFilter.toLowerCase());
    item.style.display = match ? '' : 'none';
    if (match) visibleCount++;
  });
  slashSelected = 0;
  updateSlashSelection(slashMenu.querySelectorAll('.slash-menu-item:not([style*="display: none"])'));
  if (visibleCount === 0) closeSlashMenu();
}

function updateSlashSelection(items) {
  slashMenu.querySelectorAll('.slash-menu-item').forEach(i => i.classList.remove('selected'));
  if (items[slashSelected]) items[slashSelected].classList.add('selected');
}

function closeSlashMenu() {
  slashMenu.classList.remove('active');
  slashActive = false;
  slashFilter = '';
}

slashMenu.addEventListener('mousedown', (e) => {
  e.preventDefault();
  const item = e.target.closest('.slash-menu-item');
  if (!item) return;
  const idx = parseInt(item.getAttribute('data-idx'));
  const cmd = slashCommands[idx];

  if (slashEditor) {
    slashEditor.focus();
    const sel = window.getSelection();
    const searchText = '/' + slashFilter;
    const walker = document.createTreeWalker(slashEditor, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walker.nextNode()) {
      const pos = node.textContent.indexOf(searchText);
      if (pos !== -1) {
        const range = document.createRange();
        range.setStart(node, pos);
        range.setEnd(node, pos + searchText.length);
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('delete');
        break;
      }
    }
  }

  const savedEditor = slashEditor;
  closeSlashMenu();
  requestAnimationFrame(() => {
    cmd.action();
    if (savedEditor) savePrepSheet();
  });
});

document.addEventListener('mousedown', (e) => {
  if (slashActive && !slashMenu.contains(e.target)) closeSlashMenu();
});

// Format bar on text selection
document.addEventListener('selectionchange', () => {
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) { formatBar.classList.remove('active'); return; }
  const anchor = sel.anchorNode;
  if (!anchor) { formatBar.classList.remove('active'); return; }
  const el = (anchor.nodeType === 3 ? anchor.parentElement : anchor).closest('[contenteditable="true"]');
  if (!el) { formatBar.classList.remove('active'); return; }
  const rect = sel.getRangeAt(0).getBoundingClientRect();
  if (rect.width < 2 || (rect.top === 0 && rect.left === 0)) { formatBar.classList.remove('active'); return; }
  const top = rect.top - 42;
  const left = Math.max(8, rect.left + rect.width / 2 - 70);
  formatBar.style.top = (top < 8 ? rect.bottom + 6 : top) + 'px';
  formatBar.style.left = left + 'px';
  formatBar.classList.add('active');
});


// ===== PREP SHEET SAVE/LOAD =====
function savePrepSheet() {
  const cardOrder = [];
  const cards = {};
  document.querySelectorAll('.ps-section[data-card-id]').forEach(card => {
    const id = card.getAttribute('data-card-id');
    cardOrder.push(id);
    const editor = card.querySelector('.ps-editor');
    const title = card.querySelector('.ps-section-title');
    const hint = card.querySelector('.ps-section-hint');
    cards[id] = {
      editor: editor ? editor.innerHTML : '',
      title: title ? title.innerHTML : '',
      hint: hint ? hint.innerHTML : '',
      isNew: !(window.BUILTIN_IDS || []).includes(id)
    };
  });
  const existingIds = new Set(cardOrder);
  const data = {
    cards,
    cardOrder,
    deletedCards: (window.BUILTIN_IDS || []).filter(id => !existingIds.has(id)),
    mainTitle: document.querySelector('.prep-sheet-title')?.innerHTML
  };
  localStorage.setItem(currentSlug + '-prep-sheet', JSON.stringify(data));
}

function loadPrepSheet() {
  // Try new key first, then legacy
  let saved = localStorage.getItem(currentSlug + '-prep-sheet');
  if (!saved && currentSlug === 'kimi') {
    saved = localStorage.getItem('kimi-prep-sheet');
  }
  if (!saved) return;
  const data = JSON.parse(saved);

  if (data.deletedCards) {
    data.deletedCards.forEach(id => {
      const card = document.querySelector(`.ps-section[data-card-id="${id}"]`);
      if (card) {
        const prev = card.previousElementSibling;
        if (prev && prev.classList.contains('ps-divider')) prev.remove();
        card.remove();
      }
    });
  }

  if (data.cards) {
    Object.keys(data.cards).forEach(id => {
      const card = document.querySelector(`.ps-section[data-card-id="${id}"]`);
      if (card) {
        const editor = card.querySelector('.ps-editor');
        const title = card.querySelector('.ps-section-title');
        if (editor && data.cards[id].editor) editor.innerHTML = data.cards[id].editor;
        if (title && data.cards[id].title) title.innerHTML = data.cards[id].title;
      }
    });
  }

  if (data.cardOrder && data.cards) {
    const sheet = document.querySelector('.prep-sheet');
    if (sheet) {
      data.cardOrder.forEach(id => {
        if (data.cards[id]?.isNew) {
          const newCard = createCard(id);
          const editor = newCard.querySelector('.ps-editor');
          const title = newCard.querySelector('.ps-section-title');
          if (data.cards[id].editor) editor.innerHTML = data.cards[id].editor;
          if (data.cards[id].title) title.innerHTML = data.cards[id].title;

          const prevId = data.cardOrder[data.cardOrder.indexOf(id) - 1];
          const prevCard = prevId ? document.querySelector(`.ps-section[data-card-id="${prevId}"]`) : null;
          if (prevCard) {
            let insertAfter = prevCard.nextElementSibling;
            if (insertAfter && insertAfter.classList.contains('ps-add-card')) {
              insertAfter.after(newCard);
            } else {
              prevCard.after(newCard);
            }
          } else {
            sheet.appendChild(newCard);
          }
        }
      });
    }
  }

  if (data.mainTitle) {
    const mt = document.querySelector('.prep-sheet-title');
    if (mt) mt.innerHTML = data.mainTitle;
  }
}


// ===== CARD MANAGEMENT =====
let cardIdCounter = 100;
function nextCardId() {
  cardIdCounter++;
  return 'card-new-' + cardIdCounter + '-' + Date.now();
}

function createCard(id) {
  const section = document.createElement('div');
  section.className = 'ps-section';
  section.setAttribute('data-card-id', id);
  section.innerHTML = `
    <div class="ps-section-header">
      <div class="ps-section-title" contenteditable="true">New Section</div>
      <button class="ps-delete-btn" onclick="deleteCard(this)" title="Delete card">&times;</button>
    </div>
    <div class="ps-editor" contenteditable="true" data-placeholder="Type your notes here... Use / for formatting commands."></div>
  `;
  section.querySelector('.ps-section-title').addEventListener('blur', () => {
    savePrepSheet();
    rebuildSheetNav();
  });
  return section;
}

function createAddBtn() {
  const div = document.createElement('div');
  div.className = 'ps-add-card';
  div.innerHTML = '<button class="ps-add-btn" title="Add card">+</button>';
  div.querySelector('.ps-add-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const id = nextCardId();
    const newCard = createCard(id);
    const newAddBtn = createAddBtn();
    div.after(newCard);
    newCard.after(newAddBtn);
    newCard.querySelector('.ps-section-title').focus();
    savePrepSheet();
    rebuildSheetNav();
  });
  return div;
}

function deleteCard(btn) {
  const card = btn.closest('.ps-section');
  if (!card) return;
  card.style.transition = 'opacity 0.3s, transform 0.3s';
  card.style.opacity = '0';
  card.style.transform = 'scale(0.97)';
  const prev = card.previousElementSibling;
  setTimeout(() => {
    if (prev && (prev.classList.contains('ps-divider') || prev.classList.contains('ps-add-card'))) prev.remove();
    card.remove();
    savePrepSheet();
    rebuildSheetNav();
  }, 300);
}

function initAddButtons() {
  const sheet = document.querySelector('.prep-sheet');
  if (!sheet) return;
  sheet.querySelectorAll('.ps-section').forEach(card => {
    const btn = createAddBtn();
    card.after(btn);
  });
}

// ===== SIDEBAR REORDER NAV =====
let dragSrcItem = null;

function rebuildSheetNav() {
  const nav = document.getElementById('sidebarNavSheet');
  if (!nav) return;
  const cards = document.querySelectorAll('.ps-section');
  nav.innerHTML = '';

  cards.forEach((card, i) => {
    const id = card.getAttribute('data-card-id');
    const titleEl = card.querySelector('.ps-section-title');
    const title = titleEl ? titleEl.textContent.trim() : 'Untitled';

    const item = document.createElement('div');
    item.className = 'sheet-nav-item';
    item.setAttribute('data-card-id', id);
    item.setAttribute('draggable', 'true');
    item.innerHTML = `
      <span class="sn-drag" title="Drag to reorder">&#x2807;</span>
      <span class="sn-num">${i + 1}</span>
      <span class="sn-title">${title}</span>
    `;

    item.querySelector('.sn-title').addEventListener('click', () => {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    item.querySelector('.sn-num').addEventListener('click', () => {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    item.addEventListener('dragstart', (e) => {
      dragSrcItem = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      nav.querySelectorAll('.sheet-nav-item').forEach(n => n.classList.remove('drag-over'));
      dragSrcItem = null;
    });
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (item !== dragSrcItem) {
        nav.querySelectorAll('.sheet-nav-item').forEach(n => n.classList.remove('drag-over'));
        item.classList.add('drag-over');
      }
    });
    item.addEventListener('dragleave', () => { item.classList.remove('drag-over'); });
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      if (!dragSrcItem || dragSrcItem === item) return;
      reorderCards(dragSrcItem.getAttribute('data-card-id'), item.getAttribute('data-card-id'));
    });

    nav.appendChild(item);
  });
}

function reorderCards(fromId, toId) {
  const sheet = document.querySelector('.prep-sheet');
  if (!sheet) return;
  const fromCard = sheet.querySelector(`.ps-section[data-card-id="${fromId}"]`);
  const toCard = sheet.querySelector(`.ps-section[data-card-id="${toId}"]`);
  if (!fromCard || !toCard || fromCard === toCard) return;
  sheet.querySelectorAll('.ps-add-card').forEach(b => b.remove());
  toCard.before(fromCard);
  sheet.querySelectorAll('.ps-section').forEach(c => { c.after(createAddBtn()); });
  savePrepSheet();
  rebuildSheetNav();
}


// ===== LEGACY KIMI MIGRATION =====
function migrateLegacyKimi() {
  // Migrate old localStorage keys to new namespaced format
  const legacyChecklist = localStorage.getItem('kimi-checklist-v2');
  if (legacyChecklist && !localStorage.getItem('kimi-checklist')) {
    localStorage.setItem('kimi-checklist', legacyChecklist);
  }
  const legacyEdits = localStorage.getItem('kimi-prep-edits');
  if (legacyEdits && !localStorage.getItem('kimi-edits')) {
    localStorage.setItem('kimi-edits', legacyEdits);
  }
  const legacySheet = localStorage.getItem('kimi-prep-sheet');
  if (legacySheet && !localStorage.getItem('kimi-prep-sheet')) {
    // Key already matches, no migration needed
  }
  // Register Kimi in the prep registry if not already there
  ensureRegistered('kimi');
}

// ===== REGISTRY HELPERS (shared with dashboard) =====
function getRegistry() {
  const raw = localStorage.getItem('interview-prep-registry');
  return raw ? JSON.parse(raw) : [];
}

function saveRegistry(registry) {
  localStorage.setItem('interview-prep-registry', JSON.stringify(registry));
}

function ensureRegistered(slug) {
  const registry = getRegistry();
  if (registry.find(r => r.slug === slug)) return;
  const d = currentData || window['prepData_' + slug];
  if (!d) return;
  registry.push({
    slug: slug,
    companyName: d.meta.companyName,
    companyNameZh: d.meta.companyNameZh || '',
    role: d.meta.role,
    roleZh: d.meta.roleZh || '',
    color: d.meta.color || '#00C968',
    bilingual: d.bilingual,
    createdAt: new Date().toISOString()
  });
  saveRegistry(registry);
}

// ===== PROGRESS FOR DASHBOARD =====
function getChecklistProgress(slug) {
  const saved = localStorage.getItem(slug + '-checklist');
  if (!saved) return { done: 0, total: 0 };
  const states = JSON.parse(saved);
  const done = Object.values(states).filter(Boolean).length;
  // Estimate total from seed data
  const seed = window['prepData_' + slug];
  let total = 0;
  if (seed) {
    seed.checklist.days.forEach(d => { total += d.items.length; });
  }
  if (total === 0) total = Object.keys(states).length;
  return { done, total };
}

// ===== AUTO-INIT =====
(function() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('prep');
  if (slug) {
    loadPrep(slug);
  }
})();
