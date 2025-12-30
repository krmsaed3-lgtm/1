/* JOPAI - AI Tools (offline / internal)
   - No external APIs
   - Search + category filter + saved
   - Each tool runs in a modal
*/

const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

const LS_SAVED = 'jopai_ai_tools_saved_v1';
const LS_WORKS = 'jopai_ai_tools_myworks_v1';

const TOOLS = [
  {
    id:'summarize',
    cat:'Write',
    title:'Text Summarizer',
    desc:'Summarize long text into key sentences (offline).',
    icon:'🧠'
  },
  {
    id:'keywords',
    cat:'Write',
    title:'Keyword Extractor',
    desc:'Extract top keywords from any paragraph.',
    icon:'🔑'
  },
  {
    id:'rewrite',
    cat:'Write',
    title:'Rewrite Helper',
    desc:'Rewrite text with a different tone (rules-based).',
    icon:'✍️'
  },
  {
    id:'grammar',
    cat:'Write',
    title:'Grammar & Spelling Check',
    desc:'Quick checks for common mistakes and typos.',
    icon:'✅'
  },
  {
    id:'email',
    cat:'Office',
    title:'Email Assistant',
    desc:'Generate professional email templates instantly.',
    icon:'📧'
  },
  {
    id:'meeting',
    cat:'Office',
    title:'Meeting Notes → Summary',
    desc:'Turn raw meeting notes into a clean summary.',
    icon:'🗒️'
  },
  {
    id:'todo',
    cat:'Life',
    title:'To‑Do Planner',
    desc:'Plan tasks, set priorities, save locally.',
    icon:'📌'
  },
  {
    id:'habit',
    cat:'Life',
    title:'Habit Tracker',
    desc:'Daily habit checklist stored on your device.',
    icon:'📅'
  },
  {
    id:'speech_tts',
    cat:'Audio',
    title:'Text → Speech',
    desc:'Speak any text using device voice.',
    icon:'🔊'
  },
  {
    id:'speech_stt',
    cat:'Audio',
    title:'Speech → Text',
    desc:'Dictation to text (browser supported).',
    icon:'🎙️'
  },
  {
    id:'password',
    cat:'Tools',
    title:'Password Generator',
    desc:'Create strong passwords instantly.',
    icon:'🔒'
  },
    {
    id:'base64',
    cat:'Tools',
    title:'Base64 Encoder/Decoder',
    desc:'Encode or decode Base64 text offline.',
    icon:'🧩'
  },
  {
    id:'cleaner',
    cat:'Tools',
    title:'Text Cleaner',
    desc:'Remove extra spaces, duplicates, empty lines.',
    icon:'🧹'
  },
  {
    id:'json',
    cat:'Dev',
    title:'JSON Formatter',
    desc:'Validate and prettify JSON offline.',
    icon:'{}'
  },
  {
    id:'unit',
    cat:'Tools',
    title:'Unit Converter',
    desc:'Quick conversions for length, weight, temp.',
    icon:'📏'
  }
];

const CATS = ['All', ...Array.from(new Set(TOOLS.map(t=>t.cat)))];

// -------------------------
// Saved + Works
// -------------------------
function getSaved(){
  try{return JSON.parse(localStorage.getItem(LS_SAVED)||'[]');}catch{ return []; }
}
function setSaved(arr){ localStorage.setItem(LS_SAVED, JSON.stringify(arr)); }
function isSaved(id){ return getSaved().includes(id); }

function addWork(entry){
  const now = new Date();
  const item = { ...entry, at: now.toISOString() };
  const list = getWorks();
  list.unshift(item);
  localStorage.setItem(LS_WORKS, JSON.stringify(list.slice(0,200))); // cap
}
function getWorks(){
  try{return JSON.parse(localStorage.getItem(LS_WORKS)||'[]');}catch{ return []; }
}

// -------------------------
// Render
// -------------------------
const els = {
  catBar: $('#catBar'),
  toolGrid: $('#toolGrid'),
  search: $('#searchInput'),
  count: $('#countText'),
  onlySaved: $('#onlySaved'),
  modal: $('#modal'),
  modalTitle: $('#modalTitle'),
  modalBody: $('#modalBody'),
  closeModal: $('#closeModal'),
  myWorksBtn: $('#myWorksBtn'),
  toolBtn: $('#toolBtn'),
  myWorksPanel: $('#myWorksPanel'),
  myWorksList: $('#myWorksList'),
  clearWorks: $('#clearWorks'),
};

let state = {
  cat:'All',
  q:'',
  savedOnly:false
};

function renderCats(){
  els.catBar.innerHTML='';
  CATS.forEach(c=>{
    const b=document.createElement('button');
    b.className='chip'+(state.cat===c?' active':'');
    b.textContent=c;
    b.addEventListener('click',()=>{state.cat=c; render();});
    els.catBar.appendChild(b);
  });
}

function render(){
  const q = state.q.trim().toLowerCase();
  const saved = getSaved();

  let list = TOOLS.filter(t=>{
    const matchCat = state.cat==='All' || t.cat===state.cat;
    const matchQ = !q || (t.title+' '+t.desc+' '+t.cat).toLowerCase().includes(q);
    const matchSaved = !state.savedOnly || saved.includes(t.id);
    return matchCat && matchQ && matchSaved;
  });

  els.count.textContent = `${list.length} tools`;

  els.toolGrid.innerHTML='';
  list.forEach(t=>{
    const card=document.createElement('div');
    card.className='card';
    card.innerHTML = `
      <div class="cardTop">
        <div class="icon" aria-hidden="true">${escapeHtml(t.icon)}</div>
        <button class="star" title="Save" aria-label="Save">
          ${isSaved(t.id) ? '★' : '☆'}
        </button>
      </div>
      <div class="cardBody">
        <div class="title">${escapeHtml(t.title)}</div>
        <div class="desc">${escapeHtml(t.desc)}</div>
        <div class="meta">
          <span class="badge">${escapeHtml(t.cat)}</span>
          <button class="run btn" data-id="${t.id}">
            <span class="play">▶</span> Run
          </button>
        </div>
      </div>
    `;

    // save toggle
    const star = $('.star', card);
    star.addEventListener('click',(e)=>{
      e.stopPropagation();
      const s=getSaved();
      const idx=s.indexOf(t.id);
      if(idx>=0) s.splice(idx,1); else s.push(t.id);
      setSaved(s);
      render();
    });

    // run
    $('.run', card).addEventListener('click',()=> openTool(t));

    els.toolGrid.appendChild(card);
  });
}

// -------------------------
// Modal
// -------------------------
function openModal(title, bodyNode){
  els.modalTitle.textContent=title;
  els.modalBody.innerHTML='';
  els.modalBody.appendChild(bodyNode);
  els.modal.classList.add('open');
  document.body.style.overflow='hidden';
}
function closeModal(){
  els.modal.classList.remove('open');
  document.body.style.overflow='';
}
els.closeModal.addEventListener('click', closeModal);
els.modal.addEventListener('click', (e)=>{
  if(e.target===els.modal) closeModal();
});
window.addEventListener('keydown',(e)=>{
  if(e.key==='Escape' && els.modal.classList.contains('open')) closeModal();
});

// -------------------------
// Tools UI
// -------------------------
function openTool(tool){
  const body = buildToolUI(tool.id);
  openModal(tool.title, body);
}

function buildToolUI(id){
  const wrap = document.createElement('div');
  wrap.className='toolwrap';

  const header = document.createElement('div');
  header.className='toolhint';
  header.innerHTML = `<span class="dot"></span> Runs locally (no external API).`;
  wrap.appendChild(header);

  switch(id){
    case 'summarize': wrap.appendChild(uiSummarize()); break;
    case 'keywords': wrap.appendChild(uiKeywords()); break;
    case 'rewrite': wrap.appendChild(uiRewrite()); break;
    case 'grammar': wrap.appendChild(uiGrammar()); break;
    case 'email': wrap.appendChild(uiEmail()); break;
    case 'meeting': wrap.appendChild(uiMeeting()); break;
    case 'todo': wrap.appendChild(uiTodo()); break;
    case 'habit': wrap.appendChild(uiHabit()); break;
    case 'speech_tts': wrap.appendChild(uiTTS()); break;
    case 'speech_stt': wrap.appendChild(uiSTT()); break;
    case 'password': wrap.appendChild(uiPassword()); break;
    case 'base64': wrap.appendChild(uiBase64()); break;
    case 'cleaner': wrap.appendChild(uiCleaner()); break;
    case 'json': wrap.appendChild(uiJSON()); break;
    case 'unit': wrap.appendChild(uiUnit()); break;
    default:
      wrap.appendChild(note('Tool not found.'));
  }

  return wrap;
}

function note(text){
  const d=document.createElement('div');
  d.className='note';
  d.textContent=text;
  return d;
}

function formRow(label, field){
  const row=document.createElement('div');
  row.className='row';
  const l=document.createElement('div');
  l.className='label';
  l.textContent=label;
  row.appendChild(l);
  row.appendChild(field);
  return row;
}

function textArea(ph=''){ const t=document.createElement('textarea'); t.placeholder=ph; return t; }
function input(ph=''){ const i=document.createElement('input'); i.type='text'; i.placeholder=ph; return i; }

// ----- Summarizer (simple frequency scoring)
function uiSummarize(){
  const box=document.createElement('div');
  box.className='form';

  const ta=textArea('Paste text here...');
  ta.rows=8;

  const n=document.createElement('input');
  n.type='number';
  n.min='1';
  n.max='12';
  n.value='3';

  const out=textArea('Summary will appear here...');
  out.rows=6;

  const btn=document.createElement('button');
  btn.className='btn primary';
  btn.textContent='Summarize';

  btn.addEventListener('click',()=>{
    const text=ta.value.trim();
    const k=Math.max(1, Math.min(12, parseInt(n.value||'3',10)));
    const summary = summarizeText(text, k);
    out.value = summary || '';
    addWork({tool:'Text Summarizer', inputLen:text.length, outputLen:summary.length});
  });

  box.appendChild(formRow('Text', ta));
  box.appendChild(formRow('Sentences', n));
  box.appendChild(btn);
  box.appendChild(formRow('Result', out));

  return box;
}

function summarizeText(text, maxSentences=3){
  if(!text) return '';
  const sentences = text
    .replace(/\s+/g,' ')
    .split(/(?<=[.!?])\s+/)
    .map(s=>s.trim())
    .filter(s=>s.length>20);
  if(sentences.length<=maxSentences) return sentences.join(' ');

  const words = text.toLowerCase().match(/[a-z\u0600-\u06ff0-9']+/g) || [];
  const stop = new Set(['the','and','a','an','to','of','in','on','for','with','is','are','was','were','it','this','that','as','at','by','or','be','from','have','has','had']);
  const freq = {};
  for(const w of words){
    if(w.length<3 || stop.has(w)) continue;
    freq[w]=(freq[w]||0)+1;
  }
  const score = (s)=>{
    const ws = s.toLowerCase().match(/[a-z\u0600-\u06ff0-9']+/g) || [];
    let total=0;
    for(const w of ws){ total += (freq[w]||0); }
    return total / Math.max(1, ws.length);
  };

  const ranked = sentences.map((s,i)=>({s,i,sc:score(s)}))
    .sort((a,b)=>b.sc-a.sc)
    .slice(0,maxSentences)
    .sort((a,b)=>a.i-b.i)
    .map(x=>x.s);

  return ranked.join(' ');
}

// ----- Keywords
function uiKeywords(){
  const box=document.createElement('div');
  box.className='form';

  const ta=textArea('Paste text here...');
  ta.rows=7;

  const n=document.createElement('input');
  n.type='number';
  n.min='3';
  n.max='30';
  n.value='10';

  const out=input('Keywords...');

  const btn=document.createElement('button');
  btn.className='btn primary';
  btn.textContent='Extract';

  btn.addEventListener('click',()=>{
    const text=ta.value;
    const k=Math.max(3, Math.min(30, parseInt(n.value||'10',10)));
    const keys = extractKeywords(text, k);
    out.value = keys.join(', ');
    addWork({tool:'Keyword Extractor', items:keys.length});
  });

  box.appendChild(formRow('Text', ta));
  box.appendChild(formRow('Top N', n));
  box.appendChild(btn);
  box.appendChild(formRow('Keywords', out));
  return box;
}

function extractKeywords(text, topN=10){
  const words = (text.toLowerCase().match(/[a-z\u0600-\u06ff0-9']+/g) || [])
    .filter(w=>w.length>=4);
  const stop = new Set(['the','and','that','this','have','with','from','your','about','into','will','would','there','their','they','them','what','when','where','which','then','than','because','could']);
  const freq = {};
  for(const w of words){
    if(stop.has(w)) continue;
    freq[w]=(freq[w]||0)+1;
  }
  return Object.entries(freq)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,topN)
    .map(([w])=>w);
}

// ----- Rewrite helper (simple tone presets)
function uiRewrite(){
  const box=document.createElement('div');
  box.className='form';

  const ta=textArea('Write your text...'); ta.rows=7;
  const tone=document.createElement('select');
  ['Professional','Friendly','Short','More Detailed'].forEach(x=>{
    const o=document.createElement('option'); o.value=x; o.textContent=x; tone.appendChild(o);
  });

  const out=textArea('Rewritten text...'); out.rows=7;
  const btn=document.createElement('button'); btn.className='btn primary'; btn.textContent='Rewrite';

  btn.addEventListener('click',()=>{
    const text=ta.value.trim();
    const t=tone.value;
    const rewritten = rewriteRules(text, t);
    out.value=rewritten;
    addWork({tool:'Rewrite Helper', tone:t, inputLen:text.length});
  });

  box.appendChild(formRow('Text', ta));
  box.appendChild(formRow('Tone', tone));
  box.appendChild(btn);
  box.appendChild(formRow('Result', out));
  return box;
}

function rewriteRules(text, tone){
  if(!text) return '';
  let t=text.replace(/\s+/g,' ').trim();
  // Light normalization
  t=t.replace(/\bi\b/gi,'I');
  if(tone==='Short'){
    // remove filler words
    t=t.replace(/\b(very|really|actually|just|basically|kind of|sort of)\b/gi,'').replace(/\s+/g,' ').trim();
    // try to keep first 2 sentences
    const s=t.split(/(?<=[.!?])\s+/).filter(Boolean);
    return s.slice(0,2).join(' ');
  }
  if(tone==='Professional'){
    // upgrade simple words
    const map=[
      [/\bhelp\b/gi,'assist'],
      [/\buse\b/gi,'utilize'],
      [/\bget\b/gi,'obtain'],
      [/\bshow\b/gi,'demonstrate'],
      [/\bfix\b/gi,'resolve']
    ];
    for(const [r,rep] of map) t=t.replace(r,rep);
    if(!/[.!?]$/.test(t)) t+='.';
    return t;
  }
  if(tone==='Friendly'){
    if(!/^(hi|hello|hey)/i.test(t)) t='Hey! '+t;
    if(!/[.!?]$/.test(t)) t+=' 🙂';
    return t;
  }
  // More Detailed
  const bullet = t.split(/(?<=[.!?])\s+/).filter(s=>s.trim().length>0);
  return bullet.map(s=>`- ${s.trim()}`).join('\n');
}

// ----- Grammar (basic)
function uiGrammar(){
  const box=document.createElement('div');
  box.className='form';

  const ta=textArea('Paste text...'); ta.rows=7;
  const out=textArea('Suggestions...'); out.rows=7; out.readOnly=false;

  const btn=document.createElement('button'); btn.className='btn primary'; btn.textContent='Check';
  btn.addEventListener('click',()=>{
    const text=ta.value;
    const tips = grammarTips(text);
    out.value = tips.join('\n') || 'No common issues found.';
    addWork({tool:'Grammar & Spelling Check', issues:tips.length});
  });

  box.appendChild(formRow('Text', ta));
  box.appendChild(btn);
  box.appendChild(formRow('Result', out));
  return box;
}

function grammarTips(text){
  const tips=[];
  if(!text.trim()) return tips;
  if(/\s{2,}/.test(text)) tips.push('• Multiple spaces detected → consider cleaning spaces.');
  if(/\bteh\b/i.test(text)) tips.push('• Possible typo: "teh" → "the".');
  if(/\brecieve\b/i.test(text)) tips.push('• Possible typo: "recieve" → "receive".');
  if(/\bi\s(am|have|will|can)\b/.test(text)) tips.push('• Capitalize "I" when used as a pronoun.');
  const lines=text.split('\n');
  lines.forEach((l,idx)=>{
    if(l.trim() && !/[.!?]$/.test(l.trim()) && l.trim().split(' ').length>6){
      tips.push(`• Line ${idx+1}: consider adding punctuation at the end.`);
    }
  });
  return tips;
}

// ----- Email assistant
function uiEmail(){
  const box=document.createElement('div');
  box.className='form';

  const purpose=document.createElement('select');
  ['Request','Follow up','Apology','Thank you','Support Reply'].forEach(x=>{
    const o=document.createElement('option'); o.value=x; o.textContent=x; purpose.appendChild(o);
  });
  const name=input('Your name (optional)');
  const to=input('Recipient name (optional)');
  const topic=input('Topic / subject');
  const details=textArea('Key details...'); details.rows=5;

  const out=textArea('Email output...'); out.rows=9;

  const btn=document.createElement('button'); btn.className='btn primary'; btn.textContent='Generate';
  btn.addEventListener('click',()=>{
    const email = generateEmail({purpose:purpose.value, name:name.value, to:to.value, topic:topic.value, details:details.value});
    out.value=email;
    addWork({tool:'Email Assistant', purpose:purpose.value});
  });

  box.appendChild(formRow('Purpose', purpose));
  box.appendChild(formRow('To', to));
  box.appendChild(formRow('Subject', topic));
  box.appendChild(formRow('Details', details));
  box.appendChild(formRow('Signature', name));
  box.appendChild(btn);
  box.appendChild(formRow('Result', out));
  return box;
}

function generateEmail({purpose,name,to,topic,details}){
  const rName = (to||'there').trim();
  const sig = (name||'').trim();
  const subject = topic?.trim() ? topic.trim() : `${purpose}`;
  const bodyDetails = (details||'').trim();

  const opening = {
    'Request': `I hope you are doing well. I’m reaching out regarding ${subject}.`,
    'Follow up': `I’m following up regarding ${subject}.`,
    'Apology': `I’m sorry for the inconvenience regarding ${subject}.`,
    'Thank you': `Thank you for your help regarding ${subject}.`,
    'Support Reply': `Thanks for contacting support about ${subject}.`
  }[purpose] || `Regarding ${subject},`;

  const closing = {
    'Request': 'Please let me know if you need any additional information.',
    'Follow up': 'Could you please share an update when possible?',
    'Apology': 'Thank you for your understanding.',
    'Thank you': 'I really appreciate your time and support.',
    'Support Reply': 'If you have any other questions, feel free to reply here.'
  }[purpose] || 'Thank you.';

  return `Subject: ${subject}\n\nHi ${rName},\n\n${opening}\n\n${bodyDetails ? bodyDetails + '\n\n' : ''}${closing}\n\nBest regards,\n${sig || '—'}`;
}

// ----- Meeting notes → summary
function uiMeeting(){
  const box=document.createElement('div');
  box.className='form';

  const ta=textArea('Paste meeting notes...'); ta.rows=8;
  const out=textArea('Structured summary...'); out.rows=10;

  const btn=document.createElement('button'); btn.className='btn primary'; btn.textContent='Create Summary';
  btn.addEventListener('click',()=>{
    const text=ta.value.trim();
    const bullets = makeMeetingSummary(text);
    out.value = bullets;
    addWork({tool:'Meeting Notes → Summary', inputLen:text.length});
  });

  box.appendChild(formRow('Notes', ta));
  box.appendChild(btn);
  box.appendChild(formRow('Result', out));
  return box;
}

function makeMeetingSummary(text){
  if(!text) return '';
  const key = extractKeywords(text, 8);
  const summ = summarizeText(text, 4);

  const actionLines = text.split('\n').filter(l=>/\b(action|todo|follow up|next|owner)\b/i.test(l));
  const actions = actionLines.slice(0,6).map(l=>`- ${l.trim()}`);

  return [
    'Summary:',
    summ ? `- ${summ}` : '- (No summary)',
    '',
    'Key Topics:',
    key.length ? `- ${key.join(', ')}` : '- (None)',
    '',
    'Action Items:',
    actions.length ? actions.join('\n') : '- (No action items detected)'
  ].join('\n');
}

// ----- ToDo planner
function uiTodo(){
  const box=document.createElement('div');
  box.className='form';

  const title=input('Task title');
  const pr=document.createElement('select');
  ['Low','Medium','High'].forEach(x=>{ const o=document.createElement('option'); o.value=x; o.textContent=x; pr.appendChild(o); });
  pr.value='Medium';

  const list=document.createElement('div');
  list.className='list';

  const btnAdd=document.createElement('button'); btnAdd.className='btn primary'; btnAdd.textContent='Add Task';
  const btnClear=document.createElement('button'); btnClear.className='btn'; btnClear.textContent='Clear Completed';

  const key='jopai_todo_v1';
  const load=()=>{
    let items=[];
    try{items=JSON.parse(localStorage.getItem(key)||'[]')}catch{}
    return items;
  }
  const save=(items)=>localStorage.setItem(key, JSON.stringify(items));

  const renderList=()=>{
    const items=load();
    list.innerHTML='';
    if(!items.length){ list.appendChild(note('No tasks yet.')); return; }
    items.forEach((it,idx)=>{
      const row=document.createElement('div');
      row.className='item'+(it.done?' done':'');
      row.innerHTML=`
        <label class="chk">
          <input type="checkbox" ${it.done?'checked':''}/>
          <span></span>
        </label>
        <div class="itxt">
          <div class="ititle">${escapeHtml(it.title)}</div>
          <div class="isub">Priority: ${escapeHtml(it.priority)}</div>
        </div>
        <button class="mini" title="Delete">✕</button>
      `;
      $('input', row).addEventListener('change',(e)=>{
        const arr=load();
        arr[idx].done=e.target.checked;
        save(arr); renderList();
      });
      $('.mini', row).addEventListener('click',()=>{
        const arr=load();
        arr.splice(idx,1);
        save(arr); renderList();
      });
      list.appendChild(row);
    });
  }

  btnAdd.addEventListener('click',()=>{
    const t=title.value.trim();
    if(!t) return;
    const items=load();
    items.unshift({title:t, priority:pr.value, done:false, at:Date.now()});
    save(items.slice(0,200));
    title.value='';
    renderList();
    addWork({tool:'To‑Do Planner', action:'add'});
  });

  btnClear.addEventListener('click',()=>{
    const items=load().filter(x=>!x.done);
    save(items);
    renderList();
    addWork({tool:'To‑Do Planner', action:'clear_completed'});
  });

  box.appendChild(formRow('Title', title));
  box.appendChild(formRow('Priority', pr));
  const actions=document.createElement('div'); actions.className='actions';
  actions.appendChild(btnAdd); actions.appendChild(btnClear);
  box.appendChild(actions);
  box.appendChild(list);

  renderList();
  return box;
}

// ----- Habit tracker
function uiHabit(){
  const box=document.createElement('div');
  box.className='form';

  const h=input('New habit');
  const btnAdd=document.createElement('button'); btnAdd.className='btn primary'; btnAdd.textContent='Add Habit';

  const key='jopai_habits_v1';
  const todayKey = () => new Date().toISOString().slice(0,10);

  const load=()=>{ try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []} };
  const save=(arr)=>localStorage.setItem(key, JSON.stringify(arr));

  const list=document.createElement('div'); list.className='list';

  const renderHabits=()=>{
    const arr=load();
    list.innerHTML='';
    if(!arr.length){ list.appendChild(note('Add a few habits and check them daily.')); return; }
    const d=todayKey();
    arr.forEach((it,idx)=>{
      const checked = (it.done||{})[d]===true;
      const row=document.createElement('div');
      row.className='item'+(checked?' done':'');
      row.innerHTML=`
        <label class="chk">
          <input type="checkbox" ${checked?'checked':''}/>
          <span></span>
        </label>
        <div class="itxt">
          <div class="ititle">${escapeHtml(it.name)}</div>
          <div class="isub">Today: ${checked?'Done':'Not yet'}</div>
        </div>
        <button class="mini" title="Delete">✕</button>
      `;
      $('input', row).addEventListener('change',(e)=>{
        const a=load();
        a[idx].done = a[idx].done || {};
        a[idx].done[d]=e.target.checked;
        save(a); renderHabits();
      });
      $('.mini', row).addEventListener('click',()=>{
        const a=load(); a.splice(idx,1); save(a); renderHabits();
      });
      list.appendChild(row);
    });
  }

  btnAdd.addEventListener('click',()=>{
    const name=h.value.trim();
    if(!name) return;
    const a=load();
    a.unshift({name, done:{}});
    save(a.slice(0,100));
    h.value='';
    renderHabits();
    addWork({tool:'Habit Tracker', action:'add'});
  });

  const actions=document.createElement('div'); actions.className='actions';
  actions.appendChild(btnAdd);

  box.appendChild(formRow('Habit', h));
  box.appendChild(actions);
  box.appendChild(list);
  renderHabits();
  return box;
}

// ----- Text to speech
function uiTTS(){
  const box=document.createElement('div');
  box.className='form';

  const ta=textArea('Text to speak...'); ta.rows=6;
  const voicesSel=document.createElement('select');
  const rate=document.createElement('input'); rate.type='range'; rate.min='0.7'; rate.max='1.3'; rate.step='0.05'; rate.value='1';

  const btnSpeak=document.createElement('button'); btnSpeak.className='btn primary'; btnSpeak.textContent='Speak';
  const btnStop=document.createElement('button'); btnStop.className='btn'; btnStop.textContent='Stop';

  const fillVoices=()=>{
    const voices = speechSynthesis.getVoices();
    voicesSel.innerHTML='';
    voices.forEach((v,i)=>{
      const o=document.createElement('option');
      o.value=String(i);
      o.textContent=`${v.name} (${v.lang})`;
      voicesSel.appendChild(o);
    });
  }
  if('speechSynthesis' in window){
    fillVoices();
    window.speechSynthesis.onvoiceschanged = fillVoices;
  }

  btnSpeak.addEventListener('click',()=>{
    if(!('speechSynthesis' in window)) return;
    const text=ta.value.trim();
    if(!text) return;
    const u = new SpeechSynthesisUtterance(text);
    const voices=speechSynthesis.getVoices();
    const idx=parseInt(voicesSel.value||'0',10);
    if(voices[idx]) u.voice = voices[idx];
    u.rate = parseFloat(rate.value||'1');
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    addWork({tool:'Text → Speech', chars:text.length});
  });
  btnStop.addEventListener('click',()=>{ if('speechSynthesis' in window) speechSynthesis.cancel(); });

  box.appendChild(formRow('Text', ta));
  if(!('speechSynthesis' in window)){
    box.appendChild(note('Text-to-speech is not supported in this browser.'));
    return box;
  }
  box.appendChild(formRow('Voice', voicesSel));
  box.appendChild(formRow('Rate', rate));
  const actions=document.createElement('div'); actions.className='actions';
  actions.appendChild(btnSpeak); actions.appendChild(btnStop);
  box.appendChild(actions);
  return box;
}

// ----- Speech to text
function uiSTT(){
  const box=document.createElement('div');
  box.className='form';

  const out=textArea('Your dictation will appear here...'); out.rows=8;
  const lang=document.createElement('select');
  ['en-US','en-GB','ar-LB','ar-SA','fr-FR'].forEach(l=>{
    const o=document.createElement('option'); o.value=l; o.textContent=l; lang.appendChild(o);
  });

  const btnStart=document.createElement('button'); btnStart.className='btn primary'; btnStart.textContent='Start';
  const btnStop=document.createElement('button'); btnStop.className='btn'; btnStop.textContent='Stop';

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    box.appendChild(note('Speech-to-text is not supported in this browser.'));
    return box;
  }

  const rec = new SR();
  rec.continuous = true;
  rec.interimResults = true;

  let listening=false;

  rec.onresult = (event)=>{
    let final='';
    for(let i=event.resultIndex;i<event.results.length;i++){
      const res=event.results[i];
      if(res.isFinal) final += res[0].transcript;
    }
    if(final){
      out.value = (out.value + ' ' + final).replace(/\s+/g,' ').trim();
    }
  };
  rec.onend = ()=>{ listening=false; };

  btnStart.addEventListener('click',()=>{
    if(listening) return;
    rec.lang = lang.value;
    try{ rec.start(); listening=true; addWork({tool:'Speech → Text', action:'start', lang:lang.value}); }
    catch{}
  });
  btnStop.addEventListener('click',()=>{ try{rec.stop(); listening=false; addWork({tool:'Speech → Text', action:'stop'});}catch{} });

  box.appendChild(formRow('Language', lang));
  const actions=document.createElement('div'); actions.className='actions';
  actions.appendChild(btnStart); actions.appendChild(btnStop);
  box.appendChild(actions);
  box.appendChild(formRow('Text', out));
  return box;
}

// ----- Password generator
function uiPassword(){
  const box=document.createElement('div');
  box.className='form';

  const len=document.createElement('input'); len.type='number'; len.min='8'; len.max='64'; len.value='16';
  const cUpper=mkCheck('Uppercase', true);
  const cLower=mkCheck('Lowercase', true);
  const cNum=mkCheck('Numbers', true);
  const cSym=mkCheck('Symbols', true);
  const out=input('Generated password');
  const btn=document.createElement('button'); btn.className='btn primary'; btn.textContent='Generate';
  const copy=document.createElement('button'); copy.className='btn'; copy.textContent='Copy';

  btn.addEventListener('click',()=>{
    const pw = genPassword({
      len:parseInt(len.value||'16',10),
      upper:cUpper.input.checked,
      lower:cLower.input.checked,
      num:cNum.input.checked,
      sym:cSym.input.checked
    });
    out.value=pw;
    addWork({tool:'Password Generator', length:pw.length});
  });
  copy.addEventListener('click',async()=>{
    if(!out.value) return;
    try{ await navigator.clipboard.writeText(out.value); copy.textContent='Copied'; setTimeout(()=>copy.textContent='Copy',900); }catch{}
  });

  box.appendChild(formRow('Length', len));
  const g=document.createElement('div'); g.className='grid2';
  g.appendChild(cUpper.wrap); g.appendChild(cLower.wrap); g.appendChild(cNum.wrap); g.appendChild(cSym.wrap);
  box.appendChild(g);

  const actions=document.createElement('div'); actions.className='actions';
  actions.appendChild(btn); actions.appendChild(copy);
  box.appendChild(actions);
  box.appendChild(formRow('Password', out));
  return box;
}

function mkCheck(labelText, checked){
  const wrap=document.createElement('label');
  wrap.className='check';
  const input=document.createElement('input'); input.type='checkbox'; input.checked=checked;
  const span=document.createElement('span'); span.textContent=labelText;
  wrap.appendChild(input); wrap.appendChild(span);
  return {wrap,input};
}

function genPassword({len=16, upper=true, lower=true, num=true, sym=true}){
  len=Math.max(8, Math.min(64, len));
  const sets=[];
  if(upper) sets.push('ABCDEFGHJKLMNPQRSTUVWXYZ');
  if(lower) sets.push('abcdefghijkmnopqrstuvwxyz');
  if(num) sets.push('23456789');
  if(sym) sets.push('!@#$%^&*_-+=?');
  const all = sets.join('') || 'abcdefghijkmnopqrstuvwxyz23456789';
  // ensure at least one from each enabled set
  let out='';
  for(const s of sets){ out += s[Math.floor(Math.random()*s.length)]; }
  while(out.length<len){ out += all[Math.floor(Math.random()*all.length)]; }
  return shuffle(out).slice(0,len);
}
function shuffle(str){
  const a=str.split('');
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a.join('');
}

// ----- Base64
function uiBase64(){
  const box=document.createElement('div');
  box.className='form';

  const ta=textArea('Paste text...');
  ta.rows=7;
  const out=textArea('Output...');
  out.rows=7;

  const btnRow=document.createElement('div'); btnRow.className='rowBtns';
  const enc=document.createElement('button'); enc.className='btn primary'; enc.textContent='Encode';
  const dec=document.createElement('button'); dec.className='btn'; dec.textContent='Decode';

  enc.addEventListener('click',()=>{
    try{
      const v=ta.value;
      out.value = btoa(unescape(encodeURIComponent(v)));
      addWork({tool:'Base64 Encoder/Decoder', chars:v.length});
    }catch(e){
      out.value = 'Error: cannot encode this text.';
    }
  });

  dec.addEventListener('click',()=>{
    try{
      const v=ta.value.trim();
      out.value = decodeURIComponent(escape(atob(v)));
      addWork({tool:'Base64 Encoder/Decoder'});
    }catch(e){
      out.value = 'Error: invalid Base64 input.';
    }
  });

  btnRow.appendChild(enc);
  btnRow.appendChild(dec);

  box.appendChild(formRow('Input', ta));
  box.appendChild(btnRow);
  box.appendChild(formRow('Result', out));
  box.appendChild(note('Works fully offline. Tip: This tool is for text.'));
  return box;
}

// ----- Text cleaner
function uiCleaner(){
  const box=document.createElement('div');
  box.className='form';

  const ta=textArea('Paste text...'); ta.rows=7;
  const out=textArea('Cleaned output...'); out.rows=7;

  const rmEmpty=mkCheck('Remove empty lines', true);
  const rmDup=mkCheck('Remove duplicate lines', false);
  const trimSpaces=mkCheck('Trim extra spaces', true);

  const btn=document.createElement('button'); btn.className='btn primary'; btn.textContent='Clean';
  btn.addEventListener('click',()=>{
    const cleaned = cleanText(ta.value, {
      rmEmpty:rmEmpty.input.checked,
      rmDup:rmDup.input.checked,
      trimSpaces:trimSpaces.input.checked
    });
    out.value=cleaned;
    addWork({tool:'Text Cleaner'});
  });

  const g=document.createElement('div'); g.className='grid2';
  g.appendChild(rmEmpty.wrap); g.appendChild(rmDup.wrap); g.appendChild(trimSpaces.wrap);

  box.appendChild(formRow('Text', ta));
  box.appendChild(g);
  box.appendChild(btn);
  box.appendChild(formRow('Result', out));
  return box;
}

function cleanText(text, {rmEmpty=true, rmDup=false, trimSpaces=true}={}){
  let lines=text.split('\n');
  if(trimSpaces) lines=lines.map(l=>l.replace(/\s+/g,' ').trimEnd());
  if(rmEmpty) lines=lines.filter(l=>l.trim().length>0);
  if(rmDup){
    const seen=new Set();
    lines=lines.filter(l=>{ const k=l.trim(); if(seen.has(k)) return false; seen.add(k); return true; });
  }
  return lines.join('\n');
}

// ----- JSON formatter
function uiJSON(){
  const box=document.createElement('div');
  box.className='form';

  const ta=textArea('{"hello":"world"}'); ta.rows=7;
  const out=textArea('Formatted JSON...'); out.rows=7;

  const btn=document.createElement('button'); btn.className='btn primary'; btn.textContent='Format';
  btn.addEventListener('click',()=>{
    try{
      const obj=JSON.parse(ta.value);
      out.value = JSON.stringify(obj, null, 2);
      addWork({tool:'JSON Formatter', ok:true});
    }catch(e){
      out.value = 'Invalid JSON: '+e.message;
      addWork({tool:'JSON Formatter', ok:false});
    }
  });

  box.appendChild(formRow('Input', ta));
  box.appendChild(btn);
  box.appendChild(formRow('Result', out));
  return box;
}

// ----- Unit converter
function uiUnit(){
  const box=document.createElement('div');
  box.className='form';

  const type=document.createElement('select');
  ['Length','Weight','Temperature'].forEach(x=>{ const o=document.createElement('option'); o.value=x; o.textContent=x; type.appendChild(o); });

  const from=document.createElement('select');
  const to=document.createElement('select');
  const val=document.createElement('input'); val.type='number'; val.value='1'; val.step='any';
  const out=input('Result');

  const btn=document.createElement('button'); btn.className='btn primary'; btn.textContent='Convert';

  const options = {
    'Length': ['m','km','cm','mm','in','ft','yd','mi'],
    'Weight': ['kg','g','lb','oz'],
    'Temperature': ['C','F','K']
  };

  const fill=()=>{
    const arr=options[type.value];
    from.innerHTML=''; to.innerHTML='';
    arr.forEach(u=>{ const a=document.createElement('option'); a.value=u; a.textContent=u; from.appendChild(a); });
    arr.forEach(u=>{ const a=document.createElement('option'); a.value=u; a.textContent=u; to.appendChild(a); });
    from.value=arr[0]; to.value=arr[1]||arr[0];
  };
  fill();
  type.addEventListener('change', fill);

  btn.addEventListener('click',()=>{
    const v=parseFloat(val.value||'0');
    const r=convert(type.value, v, from.value, to.value);
    out.value = Number.isFinite(r) ? String(roundNice(r)) : '—';
    addWork({tool:'Unit Converter', type:type.value});
  });

  box.appendChild(formRow('Type', type));
  const row=document.createElement('div'); row.className='grid3';
  row.appendChild(val);
  row.appendChild(from);
  row.appendChild(to);
  box.appendChild(row);
  box.appendChild(btn);
  box.appendChild(formRow('Result', out));
  return box;
}

function roundNice(n){
  const abs=Math.abs(n);
  if(abs===0) return 0;
  if(abs<1) return parseFloat(n.toFixed(6));
  if(abs<100) return parseFloat(n.toFixed(4));
  return parseFloat(n.toFixed(2));
}

function convert(type, value, from, to){
  if(type==='Temperature'){
    let c;
    if(from==='C') c=value;
    if(from==='F') c=(value-32)*(5/9);
    if(from==='K') c=value-273.15;
    if(to==='C') return c;
    if(to==='F') return c*(9/5)+32;
    if(to==='K') return c+273.15;
  }
  if(type==='Length'){
    const m = {
      m:1, km:1000, cm:0.01, mm:0.001,
      in:0.0254, ft:0.3048, yd:0.9144, mi:1609.344
    };
    return value*m[from]/m[to];
  }
  if(type==='Weight'){
    const kg = {kg:1, g:0.001, lb:0.45359237, oz:0.028349523125};
    return value*kg[from]/kg[to];
  }
  return NaN;
}

// -------------------------
// My Works panel
// -------------------------
function renderWorks(){
  const works=getWorks();
  els.myWorksList.innerHTML='';
  if(!works.length){
    els.myWorksList.appendChild(note('No work history yet. Run any tool and it will appear here.'));
    return;
  }
  works.slice(0,60).forEach(w=>{
    const row=document.createElement('div');
    row.className='work';
    const dt=new Date(w.at);
    row.innerHTML = `
      <div class="wtitle">${escapeHtml(w.tool||'Tool')}</div>
      <div class="wsub">${escapeHtml(dt.toLocaleString())}</div>
    `;
    els.myWorksList.appendChild(row);
  });
}

els.myWorksBtn.addEventListener('click',()=>{
  els.myWorksPanel.classList.add('open');
  renderWorks();
});
$('#closeWorks').addEventListener('click',()=>els.myWorksPanel.classList.remove('open'));
els.myWorksPanel.addEventListener('click',(e)=>{ if(e.target===els.myWorksPanel) els.myWorksPanel.classList.remove('open'); });
els.clearWorks.addEventListener('click',()=>{
  localStorage.removeItem(LS_WORKS);
  renderWorks();
});

// -------------------------
// Events
// -------------------------
els.search.addEventListener('input',(e)=>{
  state.q=e.target.value;
  render();
});
els.onlySaved.addEventListener('change',(e)=>{
  state.savedOnly=e.target.checked;
  render();
});

// “Tool” button can simply scroll to tools list for now
els.toolBtn.addEventListener('click',()=>{
  closeModal();
  window.scrollTo({top:0, behavior:'smooth'});
});

function escapeHtml(s){
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

// Init
renderCats();
render();
