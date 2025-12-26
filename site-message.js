/* site-message.js */
;(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function fmtTime(ts) {
    try {
      var d = new Date(ts);
      if (isNaN(d.getTime())) return '';
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, '0');
      var da = String(d.getDate()).padStart(2, '0');
      var hh = String(d.getHours()).padStart(2, '0');
      var mm = String(d.getMinutes()).padStart(2, '0');
      return y + '-' + m + '-' + da + ' ' + hh + ':' + mm;
    } catch (e) { return ''; }
  }

  var SB = window.SB_CONFIG;
  if (!SB) {
    console.error('SB_CONFIG missing. Load sb-config.js before site-message.js.');
    return;
  }

  async function rpc(name, body) {
    var url = SB.url + '/rest/v1/rpc/' + encodeURIComponent(name);
    var res = await fetch(url, {
      method: 'POST',
      headers: SB.headers(),
      body: JSON.stringify(body || {})
    });
    if (!res.ok) {
      var t = '';
      try { t = await res.text(); } catch (e) {}
      var err = new Error(t || ('RPC ' + name + ' failed'));
      err.status = res.status;
      throw err;
    }
    return await res.json();
  }

  async function fetchMessages(uid, limit) {
    limit = limit || 50;

    try {
      var rows = await rpc('get_user_messages', { p_user: uid, p_limit: limit });
      if (Array.isArray(rows)) return rows;
    } catch (e) {
      // fall back
    }

    var url =
      SB.url +
      '/rest/v1/user_messages?select=id,title,body,type,is_read,created_at' +
      '&user_id=eq.' + encodeURIComponent(uid) +
      '&order=created_at.desc' +
      '&limit=' + encodeURIComponent(limit);

    var res = await fetch(url, { method: 'GET', headers: SB.headers() });
    if (!res.ok) return [];
    var data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  async function markRead(uid, messageId) {
    try {
      await rpc('mark_user_message_read', { p_user: uid, p_message_id: messageId });
      return true;
    } catch (e) {
      // fall back
    }

    var url = SB.url + '/rest/v1/user_messages?id=eq.' + encodeURIComponent(messageId) +
      '&user_id=eq.' + encodeURIComponent(uid);

    var res = await fetch(url, {
      method: 'PATCH',
      headers: Object.assign({}, SB.headers(), { Prefer: 'return=minimal' }),
      body: JSON.stringify({ is_read: true })
    });
    return res.ok;
  }

  function render(rows) {
    var list = $('msgList');
    var empty = $('emptyState');
    var right = $('headerRight');
    var statusEl = $('statusText');

    if (!Array.isArray(rows) || rows.length === 0) {
      list.innerHTML = '';
      list.style.display = 'none';
      empty.style.display = 'flex';
      right.textContent = 'All read';
      if (statusEl && !statusEl.textContent) statusEl.textContent = '';
      return;
    }

    empty.style.display = 'none';
    list.style.display = 'block';

    var unread = rows.filter(function (r) { return !r.is_read; }).length;
    right.textContent = unread > 0 ? (unread + ' unread') : 'All read';

    list.innerHTML = rows.map(function (r) {
      var isRead = !!r.is_read;
      var badge = isRead ? '' : '<span class="unread-dot"></span>';
      var t = fmtTime(r.created_at);
      return (
        '<div class="msg-card ' + (isRead ? '' : 'unread') + '" data-id="' + esc(r.id) + '">' +
          '<div class="msg-top">' +
            '<div class="msg-title">' + badge + esc(r.title || 'Message') + '</div>' +
            '<div class="msg-time">' + esc(t) + '</div>' +
          '</div>' +
          '<div class="msg-body">' + esc(r.body || '') + '</div>' +
        '</div>'
      );
    }).join('');

    Array.prototype.forEach.call(list.querySelectorAll('.msg-card'), function (card) {
      card.addEventListener('click', function () {
        var id = card.getAttribute('data-id');
        if (!id) return;
        if (!card.classList.contains('unread')) return;

        card.classList.remove('unread');
        var dot = card.querySelector('.unread-dot');
        if (dot) dot.remove();

        var uid = window.__SITE_MSG_UID;
        markRead(uid, id).then(function () {
          var unreadNow = list.querySelectorAll('.msg-card.unread').length;
          right.textContent = unreadNow > 0 ? (unreadNow + ' unread') : 'All read';
        }).catch(function () {});
      });
    });
  }

  async function load() {
    var statusEl = $('statusText');
    if (statusEl) statusEl.textContent = 'Loading...';

    var uid = null;
    try {
      uid = localStorage.getItem('sb_user_id_v1') || localStorage.getItem('currentUserId') || null;
    } catch (e) {}

    if (!uid && window.ExaAuth && typeof window.ExaAuth.ensureSupabaseUserId === 'function') {
      uid = await window.ExaAuth.ensureSupabaseUserId();
    }

    window.__SITE_MSG_UID = uid;

    if (!uid) {
      if (statusEl) statusEl.textContent = 'Not logged in';
      render([]);
      return;
    }

    try {
      var rows = await fetchMessages(uid, 50);
      if (statusEl) statusEl.textContent = '';
      render(rows);
    } catch (e) {
      console.error(e);
      if (statusEl) statusEl.textContent = 'Failed to load';
      render([]);
    }
  }

  function bind() {
    var refreshBtn = $('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', function () { load(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { bind(); load(); });
  } else {
    bind(); load();
  }
})();