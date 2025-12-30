/* JOPAI - Offline AI Tools (UI inspired) */
(() => {
  'use strict';

  const STORAGE_SAVED = 'jopai_ai_tools_saved_v1';
  const STORAGE_WORKS = 'jopai_ai_tools_works_v1';

  // 15 tools - offline, template-based
  const tools = [
    // translate
    {
      id: 'pronounce',
      category: 'translate',
      sectionLabel: 'translate',
      title: 'English Pronunciation Helper',
      desc: 'Paste text and listen with built‑in Text‑to‑Speech. Adjust speed for practice.',
      icon: '🗣️',
      keywords: ['pronunciation', 'tts', 'english', 'speak', 'voice']
    },
    {
      id: 'lang_detect',
      category: 'translate',
      sectionLabel: 'translate',
      title: 'Language Detector',
      desc: 'Quickly guesses the script and language family (Arabic, Latin, Cyrillic, etc.).',
      icon: '📩',
      keywords: ['language', 'detect', 'arabic', 'english', 'script']
    },
    {
      id: 'clean_text',
      category: 'translate',
      sectionLabel: 'translate',
      title: 'Text Cleaner',
      desc: 'Remove extra spaces, fix line breaks, normalize punctuation, and copy clean text.',
      icon: '🧹',
      keywords: ['clean', 'format', 'spaces', 'normalize']
    },

    // office
    {
      id: 'email_assistant',
      category: 'office',
      sectionLabel: 'Office',
      title: 'Email Assistant',
      desc: 'Generate professional email drafts from a few fields (subject, tone, goal).',
      icon: '🎓',
      keywords: ['email', 'assistant', 'professional', 'reply', 'draft']
    },
    {
      id: 'contract_template',
      category: 'office',
      sectionLabel: 'Office',
      title: 'Contract/Agreement/Tender Template',
      desc: 'Creates a clean template outline you can copy and edit (no legal advice).',
      icon: '🔥',
      keywords: ['contract', 'agreement', 'tender', 'template', 'terms']
    },
    {
      id: 'work_summary_2023',
      category: 'office',
      sectionLabel: 'Office',
      title: 'Work Summary Generator',
      desc: 'Turn bullet points into a structured summary (weekly/monthly/yearly).',
      icon: '🧾',
      keywords: ['summary', 'report', 'work', 'review', 'generator']
    },

    // product design
    {
      id: 'user_portrait',
      category: 'product',
      sectionLabel: 'Product Design',
      title: 'User Portrait (Persona) Builder',
      desc: 'Create a user persona from demographics + needs + pain points + goals.',
      icon: '🔗',
      keywords: ['persona', 'user portrait', 'product', 'analysis']
    },
    {
      id: 'ux_ui_brief',
      category: 'product',
      sectionLabel: 'Product Design',
      title: 'UX/UI Designer Brief',
      desc: 'Generates a clear design brief: screens, flows, constraints, and acceptance criteria.',
      icon: '🧊',
      keywords: ['ux', 'ui', 'brief', 'design', 'flows']
    },

    // life helper
    {
      id: 'habit_plan',
      category: 'life',
      sectionLabel: 'Life Helper',
      title: 'Personal Trainer (Plan Builder)',
      desc: 'Build a simple weekly routine based on goals and available time (general guidance).',
      icon: '📈',
      keywords: ['fitness', 'plan', 'trainer', 'workout', 'routine']
    },
    {
      id: 'emergency_checklist',
      category: 'life',
      sectionLabel: 'Life Helper',
      title: 'Emergency Response Checklist',
      desc: 'Creates a calm step‑by‑step checklist you can follow and share.',
      icon: '🚨',
      keywords: ['emergency', 'checklist', 'safety', 'response']
    },

    // travel
    {
      id: 'trip_itinerary',
      category: 'travel',
      sectionLabel: 'travel',
      title: 'Travel Recommendation Planner',
      desc: 'Generate a day-by-day itinerary template: places, budget, transport, notes.',
      icon: '✨',
      keywords: ['travel', 'itinerary', 'planner', 'trip', 'budget']
    },
    {
      id: 'packing_list',
      category: 'travel',
      sectionLabel: 'travel',
      title: 'Smart Packing List',
      desc: 'Creates a packing checklist based on trip type, weather, and duration.',
      icon: '🧭',
      keywords: ['packing', 'list', 'travel', 'checklist']
    },

    // education
    {
      id: 'ielts_helper',
      category: 'education',
      sectionLabel: 'Academic/Education',
      title: 'IELTS Essay Writing Helper',
      desc: 'Generates a strong essay structure: thesis, paragraphs, linking phrases.',
      icon: '📝',
      keywords: ['ielts', 'essay', 'writing', 'structure', 'tips']
    },
    {
      id: 'lesson_plan',
      category: 'education',
      sectionLabel: 'Academic/Education',
      title: 'Write Lesson Plans',
      desc: 'Creates a flexible lesson plan: objectives, activities, timing, assessment.',
      icon: '➗',
      keywords: ['lesson', 'plan', 'teaching', 'course']
    },

    // chat
    {
      id: 'prompt_builder',
      category: 'chat',
      sectionLabel: 'chat',
      title: 'Chat Prompt Builder',
      desc: 'Build a clear prompt with role, goal, constraints, and examples (copy-ready).',
      icon: '💬',
      keywords: ['prompt', 'chat', 'assistant', 'role', 'copy']
    }
  ];

  const sectionOrder = ['travel', 'Product Design', 'Life Helper', 'Academic/Education', 'Office', 'translate', 'chat'];

  const $ = (id) => document.getElementById(id);

  const el = (tag, cls, txt) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined) e.textContent = txt;
    return e;
  };

  const loadSaved = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_SAVED) || '[]'); } catch { return []; }
  };
  const saveSaved = (arr) => localStorage.setItem(STORAGE_SAVED, JSON.stringify(arr));

  const loadWorks = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_WORKS) || '[]'); } catch { return []; }
  };
  const saveWorks = (arr) => localStorage.setItem(STORAGE_WORKS, JSON.stringify(arr));

  let savedSet = new Set(loadSaved());
  let works = loadWorks();

  let activeCategory = 'all';
  let showSavedOnly = false;

  // UI refs
  const grid = $('grid');
  const chips = $('chips');
  const search = $('search');
  const clearSearch = $('clearSearch');
  const filterAll = $('filterAll');
  const filterSaved = $('filterSaved');

  // sheet
  const backdrop = $('backdrop');
  const sheet = $('sheet');
  const sheetTitle = $('sheetTitle');
  const sheetDesc = $('sheetDesc');
  const sheetBody = $('sheetBody');
  const closeSheet = $('closeSheet');

  // drawer
  const drawer = $('drawer');
  const openWorks = $('openWorks');
  const closeDrawer = $('closeDrawer');
  const worksList = $('worksList');
  const clearWorks = $('clearWorks');
  const openHelp = $('openHelp');

  function normalize(str){
    return (str||'').toString().toLowerCase().trim();
  }

  function toolMatches(t, q){
    if (!q) return true;
    const hay = [t.title, t.desc, t.category, t.sectionLabel, ...(t.keywords||[])].join(' ').toLowerCase();
    return hay.includes(q);
  }

  function toolCategory(t){
    if (t.category === 'all') return true;
    return t.category === activeCategory;
  }

  function sectionFor(t){
    return t.sectionLabel;
  }

  function renderChips(){
    const categories = [
      {id:'all', label:'All'},
      {id:'work', label:'Workplace Assistant'},
      {id:'translate', label:'translate'},
      {id:'office', label:'Office'},
      {id:'travel', label:'travel'},
      {id:'product', label:'Product Design'},
      {id:'education', label:'Academic/Education'},
      {id:'life', label:'Life Helper'},
      {id:'chat', label:'chat'}
    ];

    chips.innerHTML = '';
    const scroller = el('div','chipScroller');
    categories.forEach(c => {
      if (c.id === 'work') return; // kept for compatibility, not used
      const b = el('button','chip' + (activeCategory === c.id ? ' isActive' : ''), c.label);
      b.type = 'button';
      b.addEventListener('click', () => {
        activeCategory = c.id;
        [...chips.querySelectorAll('.chip')].forEach(x => x.classList.remove('isActive'));
        b.classList.add('isActive');
        render();
      });
      scroller.appendChild(b);
    });
    chips.appendChild(scroller);
  }

  function createCard(t){
    const card = el('article','card');

    const top = el('div','cardTop');
    const titleWrap = el('div','cardTitleWrap');
    const h = el('h3','cardTitle', t.title);
    const p = el('p','cardDesc', t.desc);
    titleWrap.appendChild(h);
    titleWrap.appendChild(p);

    const icon = el('div','cardIcon');
    icon.textContent = t.icon || '✨';

    top.appendChild(titleWrap);
    top.appendChild(icon);

    const bottom = el('div','cardBottom');

    const saveBtn = el('button','saveBtn');
    saveBtn.type = 'button';
    saveBtn.title = 'Save';
    saveBtn.innerHTML = `<span class="star">☆</span><span class="saveText">Save</span>`;

    const isSaved = savedSet.has(t.id);
    if (isSaved) saveBtn.classList.add('isSaved');

    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSave(t.id);
      saveBtn.classList.toggle('isSaved', savedSet.has(t.id));
      if (showSavedOnly) render();
    });

    const runBtn = el('button','runBtn', 'Run');
    runBtn.type = 'button';
    runBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTool(t);
    });

    bottom.appendChild(saveBtn);
    bottom.appendChild(runBtn);

    card.appendChild(top);
    card.appendChild(bottom);

    card.addEventListener('click', () => openTool(t));
    return card;
  }

  function render(){
    const q = normalize(search.value);

    let filtered = tools.filter(t => toolMatches(t, q));

    if (activeCategory !== 'all') {
      // map UI category to tool fields
      filtered = filtered.filter(t => {
        if (activeCategory === 'product') return t.category === 'product';
        if (activeCategory === 'education') return t.category === 'education';
        return t.category === activeCategory;
      });
    }

    if (showSavedOnly) filtered = filtered.filter(t => savedSet.has(t.id));

    // group by section label in display order inspired by screenshots
    const groups = new Map();
    for (const t of filtered) {
      const k = sectionFor(t);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(t);
    }

    grid.innerHTML = '';

    const orderedKeys = Array.from(groups.keys()).sort((a,b) => {
      const ia = sectionOrder.indexOf(a);
      const ib = sectionOrder.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    if (orderedKeys.length === 0) {
      const empty = el('div','empty');
      empty.innerHTML = `<div class="emptyTitle">No tools found</div><div class="emptySub">Try another keyword or category.</div>`;
      grid.appendChild(empty);
      return;
    }

    orderedKeys.forEach((key) => {
      const sec = el('div','section');
      const head = el('div','sectionHead');
      const h = el('div','sectionTitle');
      h.innerHTML = `<span class="sectionDot"></span><span class="sectionText">${escapeHtml(key)}</span>`;
      head.appendChild(h);
      sec.appendChild(head);

      const cards = el('div','cards');
      groups.get(key).forEach(t => cards.appendChild(createCard(t)));
      sec.appendChild(cards);

      grid.appendChild(sec);
    });
  }

  function escapeHtml(str){
    return (str||'').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function toggleSave(id){
    if (savedSet.has(id)) savedSet.delete(id);
    else savedSet.add(id);
    saveSaved([...savedSet]);
  }

  function openSheet(title, desc){
    sheetTitle.textContent = title;
    sheetDesc.textContent = desc;
    backdrop.hidden = false;
    sheet.hidden = false;
    document.body.classList.add('noScroll');
  }
  function closeSheetFn(){
    backdrop.hidden = true;
    sheet.hidden = true;
    sheetBody.innerHTML = '';
    document.body.classList.remove('noScroll');
  }

  function addWork(entry){
    works.unshift(entry);
    works = works.slice(0, 120);
    saveWorks(works);
  }

  function renderWorks(){
    worksList.innerHTML = '';
    if (!works.length) {
      worksList.appendChild(el('div','worksEmpty','No saved history yet. Run any tool to create a record.'));
      return;
    }
    works.forEach(w => {
      const item = el('div','workItem');
      const t = el('div','workTitle', w.title);
      const meta = el('div','workMeta', new Date(w.ts).toLocaleString());
      const content = el('div','workContent', w.output);
      item.appendChild(t);
      item.appendChild(meta);
      item.appendChild(content);
      worksList.appendChild(item);
    });
  }

  function openDrawer(){
    renderWorks();
    drawer.hidden = false;
    backdrop.hidden = false;
    document.body.classList.add('noScroll');
  }
  function closeDrawerFn(){
    drawer.hidden = true;
    if (sheet.hidden) backdrop.hidden = true;
    document.body.classList.remove('noScroll');
  }

  // ---- Tools UI (simple offline generators) ----
  function openTool(t){
    openSheet(t.title, t.desc);

    const wrap = el('div','toolWrap');

    const out = el('textarea','toolOutput');
    out.placeholder = 'Output will appear here...';

    const actions = el('div','toolActions');
    const copyBtn = el('button','btnGhost','Copy');
    const saveBtn = el('button','btnPrimary','Save to My Works');

    copyBtn.type = saveBtn.type = 'button';

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(out.value || '');
        toast('Copied');
      } catch {
        toast('Copy failed');
      }
    });

    saveBtn.addEventListener('click', () => {
      if (!out.value.trim()) { toast('Nothing to save'); return; }
      addWork({ title: t.title, ts: Date.now(), output: out.value.trim() });
      toast('Saved');
    });

    actions.appendChild(copyBtn);
    actions.appendChild(saveBtn);

    // build form
    const form = el('div','toolForm');

    const input = (label, placeholder, type='text') => {
      const row = el('div','field');
      const l = el('div','fieldLabel', label);
      const c = type === 'textarea' ? el('textarea','fieldInput') : el('input','fieldInput');
      if (type !== 'textarea') c.type = type;
      c.placeholder = placeholder;
      row.appendChild(l);
      row.appendChild(c);
      return { row, c };
    };

    const btnRow = el('div','toolGenRow');
    const gen = el('button','btnPrimary','Generate');
    const reset = el('button','btnGhost','Reset');
    gen.type = reset.type = 'button';
    btnRow.appendChild(gen);
    btnRow.appendChild(reset);

    let fields = {};

    switch(t.id){
      case 'pronounce': {
        const {row, c} = input('Text','Type English text to pronounce...','textarea');
        const rateRow = el('div','field');
        const rateLabel = el('div','fieldLabel','Speed');
        const rate = el('input','fieldInput');
        rate.type='range'; rate.min='0.6'; rate.max='1.4'; rate.step='0.1'; rate.value='1.0';
        rateRow.appendChild(rateLabel); rateRow.appendChild(rate);

        const speakRow = el('div','toolGenRow');
        const speak = el('button','btnPrimary','Speak');
        const stop = el('button','btnGhost','Stop');
        speak.type=stop.type='button';
        speakRow.appendChild(speak); speakRow.appendChild(stop);

        speak.addEventListener('click', ()=>{
          const text = c.value.trim();
          if (!text) { toast('Enter text'); return; }
          const u = new SpeechSynthesisUtterance(text);
          u.rate = parseFloat(rate.value);
          speechSynthesis.cancel();
          speechSynthesis.speak(u);
          out.value = `Spoken (speed ${u.rate}):\n${text}`;
        });
        stop.addEventListener('click', ()=> speechSynthesis.cancel());

        form.appendChild(row);
        form.appendChild(rateRow);
        form.appendChild(speakRow);
        break;
      }
      case 'lang_detect': {
        const {row, c} = input('Text','Paste any text and we will guess the script...','textarea');
        form.appendChild(row);
        gen.addEventListener('click', ()=>{
          const text = c.value.trim();
          if (!text) { toast('Enter text'); return; }
          out.value = detectLanguage(text);
        });
        form.appendChild(btnRow);
        reset.addEventListener('click', ()=>{ c.value=''; out.value=''; });
        break;
      }
      case 'clean_text': {
        const {row, c} = input('Text','Paste messy text...','textarea');
        form.appendChild(row);
        gen.addEventListener('click', ()=>{
          const text = c.value;
          out.value = cleanText(text);
        });
        form.appendChild(btnRow);
        reset.addEventListener('click', ()=>{ c.value=''; out.value=''; });
        break;
      }
      case 'email_assistant': {
        const to = input('To (optional)','e.g., Support team');
        const subj = input('Subject','e.g., Request for account verification');
        const tone = input('Tone','Formal / Friendly / Short');
        const goal = input('Goal','What do you need?','textarea');
        form.appendChild(to.row); form.appendChild(subj.row); form.appendChild(tone.row); form.appendChild(goal.row);
        gen.addEventListener('click', ()=>{
          out.value = buildEmail({to:to.c.value, subj:subj.c.value, tone:tone.c.value, goal:goal.c.value});
        });
        form.appendChild(btnRow);
        reset.addEventListener('click', ()=>{ [to.c,subj.c,tone.c,goal.c].forEach(x=>x.value=''); out.value=''; });
        break;
      }
      case 'contract_template': {
        const type = input('Type','Service / NDA / Partnership / Tender');
        const parties = input('Parties','Company A and Company B');
        const scope = input('Scope','Describe the work / deliverables...','textarea');
        form.appendChild(type.row); form.appendChild(parties.row); form.appendChild(scope.row);
        gen.addEventListener('click', ()=>{
          out.value = buildContract({type:type.c.value, parties:parties.c.value, scope:scope.c.value});
        });
        form.appendChild(btnRow);
        reset.addEventListener('click', ()=>{ [type.c,parties.c,scope.c].forEach(x=>x.value=''); out.value=''; });
        break;
      }
      case 'work_summary_2023': {
        const period = input('Period','Daily / Weekly / Monthly / Yearly');
        const bullets = input('Bullet points','Paste your notes (one per line)...','textarea');
        form.appendChild(period.row); form.appendChild(bullets.row);
        gen.addEventListener('click', ()=>{
          out.value = buildWorkSummary({period:period.c.value, bullets:bullets.c.value});
        });
        form.appendChild(btnRow);
        reset.addEventListener('click', ()=>{ period.c.value=''; bullets.c.value=''; out.value=''; });
        break;
      }
      case 'user_portrait': {
        const target = input('Target user','e.g., New investor, beginner');
        const needs = input('Needs','What do they want?','textarea');
        const pains = input('Pain points','What problems?','textarea');
        form.appendChild(target.row); form.appendChild(needs.row); form.appendChild(pains.row);
        gen.addEventListener('click', ()=>{
          out.value = buildPersona({target:target.c.value, needs:needs.c.value, pains:pains.c.value});
        });
        form.appendChild(btnRow);
        reset.addEventListener('click', ()=>{ [target.c,needs.c,pains.c].forEach(x=>x.value=''); out.value=''; });
        break;
      }
      case 'ux_ui_brief': {
        const product = input('Product','e.g., Wallet app');
        const screens = input('Screens','List screens (comma separated)');
        const goal = input('Goal','What is success?','textarea');
        form.appendChild(product.row); form.appendChild(screens.row); form.appendChild(goal.row);
        gen.addEventListener('click', ()=>{
          out.value = buildUXBrief({product:product.c.value, screens:screens.c.value, goal:goal.c.value});
        });
        form.appendChild(btnRow);
        reset.addEventListener('click', ()=>{ [product.c,screens.c,goal.c].forEach(x=>x.value=''); out.value=''; });
        break;
      }
      case 'habit_plan': {
        const goal = input('Goal','Lose weight / Build strength / Improve energy');
        const days = input('Days per week','e.g., 3');
        const minutes = input('Minutes per session','e.g., 30');
        form.appendChild(goal.row); form.appendChild(days.row); form.appendChild(minutes.row);
        gen.addEventListener('click', ()=>{
          out.value = buildFitness({goal:goal.c.value, days:days.c.value, minutes:minutes.c.value});
        });
        form.appendChild(btnRow);
        reset.addEventListener('click', ()=>{ [goal.c,days.c,minutes.c].forEach(x=>x.value=''); out.value=''; });
        break;
      }
      case 'emergency_checklist': {
        const type = input('Emergency type','Fire / Medical / Lost wallet / Scam');
        const location = input('Location (optional)','City / Country');
        form.appendChild(type.row); form.appendChild(location.row);
        gen.addEventListener('click', ()=>{
          out.value = buildEmergency({type:type.c.value, location:location.c.value});
        });
        form.appendChild(btnRow);
        reset.addEventListener('click', ()=>{ type.c.value=''; location.c.value=''; out.value=''; });
        break;
      }
      case 'trip_itinerary': {
        const where = input('Destination','e.g., Istanbul');
        const days = input('Duration (days)','e.g., 4');
        const style = input('Travel style','Budget / Comfort / Luxury');
        form.appendChild(where.row); form.appendChild(days.row); form.appendChild(style.row);
        gen.addEventListener('click', ()=>{
          out.value = buildItinerary({where:where.c.value, days:days.c.value, style:style.c.value});
        });
        form.appendChild(btnRow);
        reset.addEventListener('click', ()=>{ where.c.value=''; days.c.value=''; style.c.value=''; out.value=''; });
        break;
      }
      case 'packing_list': {
        const type = input('Trip type','Business / Beach / Hiking');
        const days = input('Duration (days)','e.g., 5');
        const weather = input('Weather','Cold / Mild / Hot');
        form.appendChild(type.row); form.appendChild(days.row); form.appendChild(weather.row);
        gen.addEventListener('click', ()=>{
          out.value = buildPacking({type:type.c.value, days:days.c.value, weather:weather.c.value});
        });
        form.appendChild(btnRow);
        reset.addEventListener('click', ()=>{ type.c.value=''; days.c.value=''; weather.c.value=''; out.value=''; });
        break;
      }
      case 'ielts_helper': {
        const topic = input('Essay topic','Paste the question/topic here...','textarea');
        const position = input('Position','Agree / Disagree / Discuss both');
        form.appendChild(topic.row); form.appendChild(position.row);
        gen.addEventListener('click', ()=>{
          out.value = buildIELTS({topic:topic.c.value, position:position.c.value});
        });
        form.appendChild(btnRow);
        reset.addEventListener('click', ()=>{ topic.c.value=''; position.c.value=''; out.value=''; });
        break;
      }
      case 'lesson_plan': {
        const subject = input('Subject','Math / English / History');
        const level = input('Level','Grade / Age');
        const outcome = input('Learning outcomes','What should students achieve?','textarea');
        form.appendChild(subject.row); form.appendChild(level.row); form.appendChild(outcome.row);
        gen.addEventListener('click', ()=>{
          out.value = buildLesson({subject:subject.c.value, level:level.c.value, outcome:outcome.c.value});
        });
        form.appendChild(btnRow);
        reset.addEventListener('click', ()=>{ subject.c.value=''; level.c.value=''; outcome.c.value=''; out.value=''; });
        break;
      }
      case 'prompt_builder': {
        const role = input('Role','e.g., Customer support agent');
        const goal = input('Goal','What should it do?','textarea');
        const constraints = input('Constraints','Rules, tone, length...','textarea');
        form.appendChild(role.row); form.appendChild(goal.row); form.appendChild(constraints.row);
        gen.addEventListener('click', ()=>{
          out.value = buildPrompt({role:role.c.value, goal:goal.c.value, constraints:constraints.c.value});
        });
        form.appendChild(btnRow);
        reset.addEventListener('click', ()=>{ role.c.value=''; goal.c.value=''; constraints.c.value=''; out.value=''; });
        break;
      }
      default: {
        const info = el('div','toolInfo','This tool is available soon.');
        form.appendChild(info);
      }
    }

    wrap.appendChild(form);
    wrap.appendChild(el('div','toolDivider'));
    wrap.appendChild(actions);
    wrap.appendChild(out);

    sheetBody.appendChild(wrap);
  }

  // helpers
  function detectLanguage(text){
    const counts = {
      arabic: (text.match(/[\u0600-\u06FF]/g)||[]).length,
      latin: (text.match(/[A-Za-z]/g)||[]).length,
      cyrillic: (text.match(/[\u0400-\u04FF]/g)||[]).length,
      cjk: (text.match(/[\u3040-\u30FF\u3400-\u9FFF]/g)||[]).length,
      hebrew: (text.match(/[\u0590-\u05FF]/g)||[]).length,
    };

    const total = Object.values(counts).reduce((a,b)=>a+b,0) || 1;
    const pairs = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    const top = pairs[0];

    const map = {
      arabic:'Arabic script',
      latin:'Latin script (English/French/Spanish...)',
      cyrillic:'Cyrillic script',
      cjk:'CJK (Chinese/Japanese/Korean) script',
      hebrew:'Hebrew script'
    };

    const pct = Math.round((top[1]/total)*100);
    return `Detected: ${map[top[0]] || 'Unknown'}\nConfidence: ~${pct}%\n\nCharacter counts:\n- Arabic: ${counts.arabic}\n- Latin: ${counts.latin}\n- Cyrillic: ${counts.cyrillic}\n- CJK: ${counts.cjk}\n- Hebrew: ${counts.hebrew}`;
  }

  function cleanText(text){
    return (text||'')
      .replace(/\r\n/g,'\n')
      .replace(/[ \t]+/g,' ')
      .replace(/\n{3,}/g,'\n\n')
      .replace(/\s+([,.!?;:])/g,'$1')
      .trim();
  }

  function buildEmail({to,subj,tone,goal}){
    const t = (tone||'').toLowerCase();
    const greeting = t.includes('formal') ? 'Hello,' : 'Hi,';
    const closing = t.includes('formal') ? 'Sincerely,' : 'Best regards,';
    const subjectLine = (subj||'').trim() ? `Subject: ${subj.trim()}\n\n` : '';

    return `${subjectLine}${greeting}\n\n${(goal||'').trim() || 'I hope you are doing well. I am writing regarding ...'}\n\n${to ? `To: ${to.trim()}\n` : ''}Thank you for your time.\n\n${closing}\n[Your Name]`;
  }

  function buildContract({type,parties,scope}){
    const t = (type||'Agreement').trim() || 'Agreement';
    const p = (parties||'Party A and Party B').trim();
    const s = (scope||'Describe the scope here.').trim();

    return `${t.toUpperCase()} TEMPLATE\n\n1) Parties\n- ${p}\n\n2) Scope\n- ${s}\n\n3) Term\n- Start date: ____\n- End date: ____\n\n4) Payment\n- Amount: ____\n- Schedule: ____\n\n5) Confidentiality\n- Both parties agree to keep shared information confidential.\n\n6) Termination\n- Conditions for termination: ____\n\n7) Governing Law\n- Jurisdiction: ____\n\n8) Signatures\n- Party A: ________  Date: ____\n- Party B: ________  Date: ____\n\nNote: This is a general template and not legal advice.`;
  }

  function buildWorkSummary({period,bullets}){
    const p = (period||'Weekly').trim() || 'Weekly';
    const list = (bullets||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
    const lines = list.length ? list.map((x,i)=>`- ${x}`).join('\n') : '- (add your notes)';
    return `${p.toUpperCase()} WORK SUMMARY\n\nKey points:\n${lines}\n\nHighlights:\n- What went well: ____\n- Challenges: ____\n- Next steps: ____\n`;
  }

  function buildPersona({target,needs,pains}){
    return `USER PERSONA\n\nName: ${target || 'Target user'}\n\nGoals / Needs:\n${(needs||'').trim() || '- ____'}\n\nPain points:\n${(pains||'').trim() || '- ____'}\n\nBehaviors:\n- Devices: Mobile/Web\n- Frequency: ____\n- Motivation: ____\n\nOpportunities:\n- Feature ideas: ____\n- Messaging: ____`;
  }

  function buildUXBrief({product,screens,goal}){
    const scr = (screens||'').split(',').map(x=>x.trim()).filter(Boolean);
    const scrLines = scr.length ? scr.map(x=>`- ${x}`).join('\n') : '- Home\n- Details\n- Settings';
    return `UX/UI DESIGN BRIEF\n\nProduct: ${product || '____'}\n\nGoal:\n${(goal||'').trim() || '____'}\n\nScreens:\n${scrLines}\n\nUser flow:\n1) ____\n2) ____\n3) ____\n\nConstraints:\n- Mobile-first\n- Dark theme\n- Fast performance\n\nAcceptance criteria:\n- Works on mobile\n- Clear CTA buttons\n- Consistent spacing`;
  }

  function buildFitness({goal,days,minutes}){
    const d = parseInt(days,10) || 3;
    const m = parseInt(minutes,10) || 30;
    return `WEEKLY PLAN (GENERAL)\n\nGoal: ${goal || '____'}\nDays/week: ${d}\nMinutes/session: ${m}\n\nPlan:\n- Day 1: Warm-up 5m, Strength 20m, Cooldown 5m\n- Day 2: Cardio 20m, Mobility 10m\n- Day 3: Strength 20m, Core 10m\n\nNotes:\n- Start light and increase gradually.\n- If pain/dizziness occurs, stop and consult a professional.`;
  }

  function buildEmergency({type,location}){
    const t = (type||'Emergency').trim() || 'Emergency';
    return `EMERGENCY CHECKLIST\n\nType: ${t}\nLocation: ${location || '____'}\n\n1) Stay calm and assess the situation.\n2) Move to safety if needed.\n3) Call local emergency services if there is danger or injury.\n4) Contact a trusted person and share location.\n5) Document important details (time, names, photos).\n6) Follow official instructions.\n\nReminder: This is general guidance. If someone is at risk, contact emergency services immediately.`;
  }

  function buildItinerary({where,days,style}){
    const d = parseInt(days,10) || 3;
    const w = where || 'Destination';
    const s = style || 'Comfort';
    let text = `TRIP ITINERARY (${w})\nStyle: ${s}\nDays: ${d}\n\n`;
    for (let i=1;i<=d;i++){
      text += `Day ${i}:\n- Morning: ____\n- Afternoon: ____\n- Evening: ____\n- Budget: ____\n- Notes: ____\n\n`;
    }
    return text;
  }

  function buildPacking({type,days,weather}){
    const d = parseInt(days,10) || 4;
    return `PACKING LIST\n\nTrip: ${type || '____'}\nDays: ${d}\nWeather: ${weather || '____'}\n\nEssentials:\n- Passport/ID\n- Phone + charger\n- Wallet\n\nClothes (adjust as needed):\n- Tops: ${Math.ceil(d/2)}\n- Bottoms: ${Math.ceil(d/3)}\n- Underwear: ${d}\n- Socks: ${d}\n\nExtras:\n- Toiletries\n- Medication\n- Small first aid\n- Power bank\n\nNotes:\n- Keep important documents in one secure place.`;
  }

  function buildIELTS({topic,position}){
    return `IELTS ESSAY OUTLINE\n\nTopic:\n${(topic||'').trim() || '____'}\n\nPosition: ${position || '____'}\n\nIntroduction:\n- Paraphrase the question\n- Thesis statement\n\nBody Paragraph 1:\n- Main idea\n- Example\n- Explanation\n\nBody Paragraph 2:\n- Main idea\n- Example\n- Explanation\n\nConclusion:\n- Restate thesis\n- Summary of key points\n\nUseful linking phrases:\n- Moreover / Furthermore\n- However / On the other hand\n- As a result / Therefore`;
  }

  function buildLesson({subject,level,outcome}){
    return `LESSON PLAN\n\nSubject: ${subject || '____'}\nLevel: ${level || '____'}\n\nLearning outcomes:\n${(outcome||'').trim() || '- ____'}\n\nTiming (45-60 min):\n1) Warm-up (5-10m)\n2) Presentation (10-15m)\n3) Practice (15-20m)\n4) Review (5-10m)\n\nMaterials:\n- Slides / board\n- Worksheet\n\nAssessment:\n- Exit ticket / short quiz`;
  }

  function buildPrompt({role,goal,constraints}){
    return `PROMPT TEMPLATE\n\nRole: ${role || '____'}\nGoal: ${goal || '____'}\n\nConstraints:\n${(constraints||'').trim() || '- Be concise\n- Use clear steps'}\n\nOutput format:\n- Bullet points\n- Short final answer\n\nExample:\nUser: ____\nAssistant: ____`;
  }

  // toast
  let toastTimer = null;
  function toast(msg){
    let t = document.querySelector('.toast');
    if (!t) {
      t = el('div','toast');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('isShow');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> t.classList.remove('isShow'), 1400);
  }

  // wire
  function setSavedMode(on){
    showSavedOnly = on;
    filterAll.classList.toggle('isActive', !on);
    filterSaved.classList.toggle('isActive', on);
    filterAll.setAttribute('aria-selected', String(!on));
    filterSaved.setAttribute('aria-selected', String(on));
    render();
  }

  function init(){
    renderChips();
    render();

    clearSearch.addEventListener('click', ()=>{ search.value=''; render(); search.focus(); });
    $('doSearch').addEventListener('click', ()=> render());
    search.addEventListener('input', ()=> render());

    filterAll.addEventListener('click', ()=> setSavedMode(false));
    filterSaved.addEventListener('click', ()=> setSavedMode(true));

    closeSheet.addEventListener('click', closeSheetFn);
    backdrop.addEventListener('click', () => {
      if (!sheet.hidden) closeSheetFn();
      if (!drawer.hidden) closeDrawerFn();
    });
    window.addEventListener('keydown', (e)=>{
      if (e.key === 'Escape'){
        if (!sheet.hidden) closeSheetFn();
        if (!drawer.hidden) closeDrawerFn();
      }
    });

    openWorks.addEventListener('click', openDrawer);
    closeDrawer.addEventListener('click', closeDrawerFn);
    clearWorks.addEventListener('click', ()=>{ works = []; saveWorks(works); renderWorks(); toast('Cleared'); });

    openHelp.addEventListener('click', ()=>{
      openSheet('Help & Tips','This page is offline. Tools generate templates inside your browser.');
      const b = el('div','toolWrap');
      b.innerHTML = `
        <div class="helpBlock">
          <div class="helpTitle">How it works</div>
          <ul class="helpList">
            <li>Use the search box to find a tool by name.</li>
            <li>Tap Save (☆) to add a tool to your Saved list.</li>
            <li>Tap Run to open the tool, then Generate to produce output.</li>
            <li>Use “Save to My Works” to store results locally.</li>
          </ul>
          <div class="helpNote">Note: Data is saved in your browser (localStorage). Clearing browser data removes it.</div>
        </div>`;
      sheetBody.appendChild(b);
    });
  }

  init();
})();
