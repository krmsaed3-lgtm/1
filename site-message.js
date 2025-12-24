;(function () {
  'use strict';

  var emptyIconEl = document.getElementById('sm-empty-icon');
  var emptyTextEl = document.getElementById('sm-empty-text');
  var listEl = document.getElementById('sm-list');
  var allReadEl = document.querySelector('.header-right');

  function getUid() {
    try { return localStorage.getItem('currentUserId') || null; } catch (e) { return null; }
  }

  function loadMsgs() {
    var uid = getUid();
    if (!uid) return [];
    var key = 'jopai_msgs_' + uid;
    try { return JSON.parse(localStorage.getItem(key)[]; } catch (e) { return []; }
  }

  function saveMsgs(msgs) {
    var uid = getUid();
    if (!uid) return;
    var key = 'jopai_msgs_' + uid;
    try { localStorage.setItem(key, JSON.stringify(msgs || [])); } catch (e) {}
  }

  function showEmpty() {
    if (listEl) listEl.style.display = 'none';
    if (emptyIconEl) emptyIconEl.style.display = 'flex';
    if (emptyTextEl) emptyTextEl.style.display = 'block';
  }

  function showList() {
    if (listEl) listEl.style.display = 'block';
    if (emptyIconEl) emptyIconEl.style.display = 'none';
    if (emptyTextEl) emptyTextEl.style.display = 'none';
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString();
    } catch (e) { return ''; }
  }

  function injectStyles() {
    var css = [
      '#sm-list{ width:100%; max-width:520px; margin:0 auto; padding:0 16px 90px 16px; }',
      '.sm-card{ width:100%; border:1px solid rgba(255,255,255,0.06); background:rgba(255,255,255,0.02); border-radius:14px; padding:12px; margin:10px 0; }',
      '.sm-top{ display:flex; align-items:center; justify-content:space-between; gap:10px; }',
      '.sm-titlewrap{ display:flex; align-items:center; min-width:0; }',
      '.sm-dot{ width:8px; height:8px; border-radius:999px; background:#ff3b30; display:inline-block; margin-right:8px; }',
      '.sm-title{ font-size:14px; font-weight:600; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }',
      '.sm-time{ font-size:11px; color:rgba(255,255,255,0.55); white-space:nowrap; }',
      '.sm-body{ margin-top:8px; font-size:13px; line-height:1.55; color:rgba(255,255,255,0.72); }'
    ].join('\n');

    var style = document.createElement('style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }

  function render() {
    var msgs = loadMsgs();
    if (!msgs.length) {
      showEmpty();
      return;
    }

    msgs = msgs.slice().sort(function (a, b) {
      return new Date(b.created_at0);
    });

    showList();

    listEl.innerHTML = msgs.map(function (m) {
      var dot = m.is_read ? '' : '<span class="sm-dot"></span>';
      return (
        '<div class="sm-card">' +
          '<div class="sm-top">' +
            '<div class="sm-titlewrap">' +
              dot +
              '<div class="sm-title">' + escapeHtml(m.title || 'Message') + '</div>' +
            '</div>' +
            '<div class="sm-time">' + escapeHtml(formatDate(m.created_at)) + '</div>' +
          '</div>' +
          '<div class="sm-body">' + escapeHtml(m.body || '') + '</div>' +
        '</div>'
      );
    }).join('');
  }

  function markAllRead() {
    var msgs = loadMsgs();
    if (!msgs.length) return;
    msgs = msgs.map(function (m) { m.is_read = true; return m; });
    saveMsgs(msgs);
    render();
  }

  function init() {
    injectStyles();
    if (allReadEl) allReadEl.addEventListener('click', markAllRead);
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();