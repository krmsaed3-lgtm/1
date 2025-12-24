/* site-message interactions (no changes to auth.js)
   - Loads messages for the current user (Supabase table if available; localStorage fallback)
   - Inserts a one-time welcome message after first successful login
*/
;(function () {
  'use strict';

  var STORAGE_PREFIX = 'site_messages_v1_';
  var WELCOME_PREFIX = 'welcome_sent_v1_';

  function $(sel, root) { return (root || document).querySelector(sel); }

  function safeJsonParse(s, fallback) {
    try { return JSON.parse(s); } catch (e) { return fallback; }
  }

  function formatTime(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) { return ''; }
  }

  function uuidLike() {
    return 'm_' + Math.random().toString(16).slice(2) + '_' + Date.now().toString(16);
  }

  function sbConfig() {
    return window.SB_CONFIG || null;
  }

  async function sbFetch(path, opts) {
    var SB = sbConfig();
    if (!SB!SB.headers) throw new Error('Supabase config missing');
    opts = opts || {};
    var headers = Object.assign({}, SB.headers(), opts.headers || {});
    var res = await fetch(SB.url + path, Object.assign({}, opts, { headers: headers }));
    return res;
  }

  async function trySupabaseList(userId) {
    // Assumes a table named site_messages with: user_id, is_read, created_at, title, body.
    var q =
      '/rest/v1/site_messages' +
      '?select=id,title,body,is_read,created_at' +
      '&user_id=eq.' + encodeURIComponent(userId) +
      '&order=created_at.desc&limit=50';

    var res = await sbFetch(q, { method: 'GET' });
    if (!res.ok) {
      var t = '';
      try { t = await res.text(); } catch (e) {}
      throw new Error('Supabase list failed: ' + res.status + ' ' + (t || ''));
    }

    var data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map(function (row) {
      return {
        id: row.id,
        title: row.title || 'Message',
        body: row.body || '',
        is_read: !!row.is_read,
        created_at: row.created_at || null
      };
    });
  }

  async function trySupabaseInsert(userId, msg) {
    var payload = {
      user_id: userId,
      title: msg.title,
      body: msg.body,
      is_read: !!msg.is_read
    };

    var res = await sbFetch('/rest/v1/site_messages', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      var t = '';
      try { t = await res.text(); } catch (e) {}
      throw new Error('Supabase insert failed: ' + res.status + ' ' + (t || ''));
    }

    var data = await res.json();
    var row = Array.isArray(data) && data[0] ? data[0] : null;
    return row ? row.id : null;
  }

  async function trySupabaseMarkAllRead(userId) {
    var res = await sbFetch('/rest/v1/site_messages?user_id=eq.' + encodeURIComponent(userId), {
      method: 'PATCH',
      body: JSON.stringify({ is_read: true })
    });
    if (!res.ok) {
      var t = '';
      try { t = await res.text(); } catch (e) {}
      throw new Error('Supabase update failed: ' + res.status + ' ' + (t || ''));
    }
    return true;
  }

  async function trySupabaseMarkRead(userId, messageId) {
    var res = await sbFetch(
      '/rest/v1/site_messages?id=eq.' + encodeURIComponent(messageId) +
      '&user_id=eq.' + encodeURIComponent(userId),
      {
        method: 'PATCH',
        body: JSON.stringify({ is_read: true })
      }
    );
    if (!res.ok) {
      var t = '';
      try { t = await res.text(); } catch (e) {}
      throw new Error('Supabase update failed: ' + res.status + ' ' + (t || ''));
    }
    return true;
  }

  function lsKey(userId) { return STORAGE_PREFIX + String(userId); }

  function loadLocal(userId) {
    var key = lsKey(userId);
    var raw = '[]';
    try { raw = localStorage.getItem(key) || '[]'; } catch (e) {}
    var arr = safeJsonParse(raw, []);
return Array.isArray(arr) ? arr : [];
  }

  function saveLocal(userId, arr) {
    var key = lsKey(userId);
    try { localStorage.setItem(key, JSON.stringify(arr || [])); } catch (e) {}
  }

  function upsertLocal(userId, msg) {
    var arr = loadLocal(userId);
    var idx = arr.findIndex(function (x) { return x.id === msg.id; });
    if (idx >= 0) arr[idx] = msg;
    else arr.unshift(msg);
    saveLocal(userId, arr);
    return arr;
  }

  function markAllLocalRead(userId) {
    var arr = loadLocal(userId).map(function (m) { m.is_read = true; return m; });
    saveLocal(userId, arr);
    return arr;
  }

  function markLocalRead(userId, messageId) {
    var arr = loadLocal(userId);
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].id === messageId) { arr[i].is_read = true; break; }
    }
    saveLocal(userId, arr);
    return arr;
  }

  function computeUnread(arr) {
    var n = 0;
    for (var i = 0; i < arr.length; i++) if (!arr[i].is_read) n++;
    return n;
  }

  function setHeaderUnread(unread) {
    var el = $('#markAllBtn');
    if (!el) return;

    if (unread <= 0) {
      el.textContent = 'All read';
      el.disabled = true;
      el.classList.add('is-disabled');
    } else {
      el.textContent = 'Mark all (' + unread + ')';
      el.disabled = false;
      el.classList.remove('is-disabled');
    }
  }

  function showState(name) {
    var empty = $('#emptyState');
    var list = $('#messageList');
    var loading = $('#loadingState');
    var login = $('#loginState');

    if (empty) empty.style.display = (name === 'empty') ? 'flex' : 'none';
    if (list) list.style.display = (name === 'list') ? 'block' : 'none';
    if (loading) loading.style.display = (name === 'loading') ? 'flex' : 'none';
    if (login) login.style.display = (name === 'login') ? 'flex' : 'none';
  }

  async function markReadBestEffort(userId, messageId) {
    if (!userId) return;
    try {
      await trySupabaseMarkRead(userId, messageId);
    } catch (e) {
      markLocalRead(userId, messageId);
    }
  }

  async function markAllReadBestEffort(userId) {
    if (!userId) return [];
    try {
      await trySupabaseMarkAllRead(userId);
      return await trySupabaseList(userId);
    } catch (e) {
      return markAllLocalRead(userId);
    }
  }

  async function loadMessagesBestEffort(userId) {
    if (!userId) return [];
    try {
      return await trySupabaseList(userId);
    } catch (e) {
      return loadLocal(userId);
    }
  }

  function renderMessages(arr) {
    var list = $('#messageList');
    if (!list) return;

    list.innerHTML = '';

    if (!arr || !arr.length) {
      setHeaderUnread(0);
      showState('empty');
      return;
    }

    setHeaderUnread(computeUnread(arr));
    showState('list');

    arr.forEach(function (m) {
      var item = document.createElement('div');
      item.className = 'msg-item' + (m.is_read ? ' is-read' : ' is-unread');
      item.setAttribute('data-id', m.id);

      var top = document.createElement('div');
      top.className = 'msg-top';

      var title = document.createElement('div');
      title.className = 'msg-title';
      title.textContent = m.title || 'Message';

      var time = document.createElement('div');
      time.className = 'msg-time';
      time.textContent = formatTime(m.created_at);

      top.appendChild(title);
      top.appendChild(time);

      var body = document.createElement('div');
      body.className = 'msg-body';
      body.textContent = m.body || '';

      item.appendChild(top);
      item.appendChild(body);

      item.addEventListener('click', function () {
        item.classList.toggle('is-open');

        if (!m.is_read) {
          m.is_read = true;
          item.classList.remove('is-unread');
          item.classList.add('is-read');
          setHeaderUnread(computeUnread(arr));
          markReadBestEffort(currentUserId, m.id).catch(function () {});
        }
      });

      list.appendChild(item);
    });
  }

  async function ensureWelcomeMessage(userId, profile) {
    if (!userId) return;
var flagKey = WELCOME_PREFIX + String(userId);
    var sent = false;
    try { sent = localStorage.getItem(flagKey) === '1'; } catch (e) {}
    if (sent) return;

    var name =
      (profile && profile.publicId) ? ('User ' + profile.publicId) :
      (profile && profile.phone) ? profile.phone :
      'there';

    var msg = {
      id: uuidLike(),
      title: 'Welcome',
      body: 'Welcome, ' + name + '. Thanks for logging in.',
      is_read: false,
      created_at: new Date().toISOString()
    };

    try {
      var insertedId = await trySupabaseInsert(userId, msg);
      if (insertedId) msg.id = insertedId;
    } catch (e) {
      upsertLocal(userId, msg);
    }

    try { localStorage.setItem(flagKey, '1'); } catch (e) {}
  }

  function bindUI() {
    var refresh = $('#refreshBtn');
    if (refresh) {
      refresh.addEventListener('click', function () {
        refreshMessages().catch(function () {});
      });
    }

    var markAll = $('#markAllBtn');
    if (markAll) {
      markAll.addEventListener('click', function () {
        if (markAll.disabled) return;
        showState('loading');
        markAllReadBestEffort(currentUserId)
          .then(function (arr) { renderMessages(arr); })
          .catch(function () { refreshMessages().catch(function () {}); });
      });
    }
  }

  async function refreshMessages() {
    showState('loading');
    var arr = await loadMessagesBestEffort(currentUserId);
    renderMessages(arr);
  }

  var currentUserId = null;

  async function init() {
    bindUI();

    if (!window.ExaAuth || !window.ExaAuth.ensureSupabaseUserId) {
      showState('login');
      return;
    }

    currentUserId = await window.ExaAuth.ensureSupabaseUserId();
    if (!currentUserId) {
      showState('login');
      return;
    }

    var profile = null;
    try {
      if (window.ExaAuth.getCurrentUserProfile) {
        profile = await window.ExaAuth.getCurrentUserProfile();
      }
    } catch (e) {}

    await ensureWelcomeMessage(currentUserId, profile);
    await refreshMessages();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
