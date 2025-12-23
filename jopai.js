;(function () {
  'use strict';

  var SB = window.SB_CONFIG;
  if (!SB) {
    console.error('SB_CONFIG missing. تأكدي إن sb-config.js قبل jopai.js');
    return;
  }

  var input = document.querySelector('.chat-input');
  var sendBtn = document.querySelector('.send-btn');
  var log = document.getElementById('chatLog');

  function bubble(text, who) {
    var d = document.createElement('div');
    d.className = 'bubble ' + (who === 'me' ? 'me' : 'ai');
    d.textContent = text;
    log.appendChild(d);
    try { window.scrollTo(0, document.body.scrollHeight); } catch (e) {}
  }

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  var KB = [];
  var KB_READY = false;

  async function loadKB() {
    if (KB_READY) return true;
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
      bubble('صار مشكلة بتحميل ردود Jopai من السيرفر. جرّبي تحديث الصفحة.', 'ai');
      return false;
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
        // تطابق جزئي
        var w = key.split(' ');
        for (var p = 0; p < w.length; p++) {
          if (w[p].length >= 3 && s.indexOf(w[p]) !== -1) score += 1;
        }
      }

      // أولوية من DB
      score += (parseInt(item.priority || 0, 10) || 0) * 0.01;

      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }

    return bestScore > 0 ? best : null;
  }

  function fallbackReply() {
    return (
      "فهمت عليك 👌\n" +
      "بس اختار/ي واحد:\n" +
      "1) كيف أربح؟\n" +
      "2) كم ربح اليوم حسب رصيدي؟\n" +
      "3) كيف أضاعف أرباحي؟\n" +
      "4) دعوة الأصدقاء\n\n" +
      "اكتب/ي رقم الخيار أو اسأل/ي بسؤال أقصر."
    );
  }

  async function onSend() {
    var text = (input && input.value ? String(input.value) : '').trim();
    if (!text) return;

    input.value = '';
    bubble(text, 'me');
    if (sendBtn) sendBtn.disabled = true;

    try {
      var ok = await loadKB();
      if (!ok) return;

      var hit = bestMatch(text);
      if (!hit) {
        bubble(fallbackReply(), 'ai');
        return;
      }

      bubble(String(hit.answer || '...'), 'ai');

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
})();
