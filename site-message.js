;(function () {
  'use strict';

  const emptyBox = document.getElementById('emptyBox');
  const listBox  = document.getElementById('listBox');
  const allRead  = document.getElementById('allReadBtn');

  // إذا عندك نظام يسجّل currentUserId خليه يستخدمه، إذا لا رح يشتغل "حسب الجهاز"
  function getUserId() {
    try { return localStorage.getItem('currentUserId') || 'device'; }
    catch { return 'device'; }
  }

  function msgsKey() {
    return 'jopai_msgs_' + getUserId();
  }

  function createdKey() {
    return 'jopai_welcome_created_' + getUserId();
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(msgsKey())[]; }
    catch { return []; }
  }

  function save(msgs) {
    try { localStorage.setItem(msgsKey(), JSON.stringify(msgs || [])); } catch {}
  }

  function ensureWelcomeOnce() {
    try {
      if (localStorage.getItem(createdKey())) return;

      // أنشئ رسالة ترحيب واحدة فقط
      const msgs = load();
      msgs.unshift({
        id: String(Date.now()),
        title: 'Welcome to jopai',
        body: 'Welcome! We are glad to have you on jopai.',
        is_read: false,
        created_at: new Date().toISOString()
      });

      save(msgs);
      localStorage.setItem(createdKey(), '1');
    } catch {}
  }

  function esc(s){
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function fmt(iso){
    if(!iso) return '';
    try{
      const d = new Date(iso);
      return isNaN(d) ? '' : d.toLocaleString();
    }catch{ return ''; }
  }

  function render() {
    const msgs = load().slice().sort((a,b)=> new Date(b.created_at||0)-new Date(a.created_at||0));

    if (!msgs.length) {
      emptyBox.style.display = 'flex';
      listBox.style.display = 'none';
      return;
    }

    emptyBox.style.display = 'none';
    listBox.style.display = 'block';

    listBox.innerHTML = msgs.map(m => `
      <div class="msg-card">
        <div class="msg-top">
          <div class="msg-title">
            ${m.is_read ? '' : '<span class="dot"></span>'}
            ${esc(m.title || 'Message')}
          </div>
          <div class="msg-time">${esc(fmt(m.created_at))}</div>
        </div>
        <div class="msg-body">${esc(m.body || '')}</div>
      </div>
    `).join('');
  }

  function markAllRead() {
    const msgs = load();
    if (!msgs.length) return;
    msgs.forEach(m => m.is_read = true);
    save(msgs);
    render();
  }

  // ✅ أول ما تفتح الصفحة: أنشئ الترحيب مرة واحدة ثم اعرض
  ensureWelcomeOnce();
  render();

  allRead.addEventListener('click', markAllRead);
})();