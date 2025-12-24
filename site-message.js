// site-message.js
;(function () {
  'use strict';

  var emptyWrap = document.getElementById('sm-empty-wrap');
  var listEl = document.getElementById('sm-list');
  var allReadEl = document.getElementById('sm-allread');

  function uid() {
    try { return localStorage.getItem('currentUserId') || null; } catch (e) { return null; }
  }
  function key() {
    var id = uid();
    return id ? ('jopai_msgs_' + id) : null;
  }
  function load() {
    var k = key();
    if (!k) return [];
    try { return JSON.parse(localStorage.getItem(k)[]; } catch (e) { return []; }
  }
  function save(msgs) {
    var k = key();
    if (!k) return;
    try { localStorage.setItem(k, JSON.stringify(msgs || [])); } catch (e) {}
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }
  function fmt(iso) {
    if (!iso) return '';
    try { var d=new Date(iso); return isNaN(d)?'':d.toLocaleString(); } catch(e){ return ''; }
  }

  function render() {
    var msgs = load();

    if (!msgs.length) {
      if (emptyWrap) emptyWrap.style.display = 'flex';
      if (listEl) listEl.style.display = 'none';
      return;
    }

    msgs = msgs.slice().sort(function(a,b){
      return new Date(b.created_at||0) - new Date(a.created_at||0);
    });

    if (emptyWrap) emptyWrap.style.display = 'none';
    if (listEl) listEl.style.display = 'block';

    listEl.innerHTML = msgs.map(function (m) {
      return `
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
      `;
    }).join('');
  }

  function markAllRead() {
    var msgs = load();
    if (!msgs.length) return;
    msgs = msgs.map(function (m) { m.is_read = true; return m; });
    save(msgs);
    render();
  }

  if (allReadEl) allReadEl.addEventListener('click', markAllRead);
  render();
})();