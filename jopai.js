;(function () {
  'use strict';

  var SB = window.SB_CONFIG;
  var input = document.querySelector('.chat-input');
  var sendBtn = document.querySelector('.send-btn');
  var log = document.getElementById('chatLog');

  function bubble(text, who) {
    var d = document.createElement('div');
    d.className = 'b ' + (who === 'me' ? 'me' : 'ai');
    d.textContent = text;
    log.appendChild(d);
    try { window.scrollTo(0, document.body.scrollHeight); } catch (e) {}
  }

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^؀-ۿa-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  var KB = [];
  var KB_READY = false;

  async function loadKB() {
    if (KB_READY) return true;

    // إذا ما عندك SB_CONFIG، رح نشتغل fallback فقط
    if (!SB || !SB.url || typeof SB.headers !== 'function') {
      KB_READY = true;
      KB = [];
      return true;
    }

    try {
      var url = SB.url + '/rest/v1/jopai_faq?select=keys,answer,follow,priority&order=priority.desc';
      var res = await fetch(url, { method: 'GET', headers: SB.headers() });
      if (!res.ok) throw new Error('FAQ load failed: ' + res.status);
      var rows = await res.json();
      KB = Array.isArray(rows) ? rows : [];
      KB_READY = true;
      return true;
    } catch (e) {
      console.error(e);
      // ما نوقف الشات—بس نخلي الرد fallback
      KB_READY = true;
      KB = [];
      return true;
    }
  }

  function bestMatch(q) {
    var s = norm(q);
    if (!s) return null;

    var best = null;
    var bestScore = -1;

    for (var i = 0; i < KB.length; i++) {
      var item = KB[i];
      var keys = String(item.keys || '');
      var parts = keys.split(',').map(function (x) { return norm(x); }).filter(Boolean);

      var score = 0;
      for (var k = 0; k < parts.length; k++) {
        var key = parts[k];
        if (!key) continue;
        if (s.indexOf(key) !== -1) score += 3;

        var w = key.split(' ');
        for (var p = 0; p < w.length; p++) {
          if (w[p].length >= 3 && s.indexOf(w[p]) !== -1) score += 1;
        }
      }

      score += (parseInt(item.priority || 0, 10) || 0) * 0.01;

      if (score > bestScore) { bestScore = score; best = item; }
    }

    return bestScore > 0 ? best : null;
  }

  function fallbackReply() {
    return "آسف، لا يمكنني الرد على هذا السؤال في الوقت الحالي.";
  }

  async function onSend() {
    var text = (input && input.value ? String(input.value) : '').trim();
    if (!text) return;

    input.value = '';
    bubble(text, 'me');
    if (sendBtn) sendBtn.disabled = true;

    try {
      await loadKB();

      var hit = bestMatch(text);
      if (!hit) {
        bubble(fallbackReply(), 'ai');
        return;
      }

      bubble(String(hit.answer || fallbackReply()), 'ai');

      var follow = String(hit.follow || '').trim();
      if (follow) {
        var qs = follow.split('|').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 2);
        if (qs.length) bubble("قبل ما أكمل، جاوبيني:\n• " + qs.join("\n• "), 'ai');
      }
    } finally {
      if (sendBtn) sendBtn.disabled = false;
      try { input.focus(); } catch (e) {}
    }
  }

  if (sendBtn) sendBtn.addEventListener('click', onSend);
  if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') onSend(); });

  // لو جاي سؤال من صفحة الأدوات ?q=
  try {
    var params = new URLSearchParams(location.search);
    var q = params.get('q');
    if (q && input) input.value = q;
  } catch (e) {}
})();
