;(function () {
  'use strict';

  var SB = window.SB_CONFIG;
  if (!SB) {
    console.error('SB_CONFIG missing. Ensure sb-config.js loads before jopai.js');
    return;
  }

  var input = document.querySelector('.chat-input');
  var sendBtn = document.querySelector('.send-btn');
  var log = document.getElementById('chatLog');

  function bubble(text, who) {
    var d = document.createElement('div');
    var isMe = who === 'me';
    d.style.alignSelf = isMe ? 'flex-end' : 'flex-start';
    d.style.background = isMe ? 'rgba(0,209,255,.14)' : 'rgba(255,255,255,.08)';
    d.style.border = isMe ? '1px solid rgba(0,209,255,.20)' : '1px solid rgba(255,255,255,.10)';
    d.style.padding = '10px 12px';
    d.style.borderRadius = '14px';
    d.style.maxWidth = '90%';
    d.style.whiteSpace = 'pre-wrap';
    d.textContent = text;
    log.appendChild(d);
    // scroll to bottom
    try { window.scrollTo(0, document.body.scrollHeight); } catch (e) {}
  }

  function getUserId() {
    try {
      return localStorage.getItem('currentUserId') || localStorage.getItem('sb_user_id_v1') || null;
    } catch (e) {
      return null;
    }
  }

  async function askJopai(message) {
    var userId = getUserId();
    if (!userId) {
      bubble('لازم تسجّل دخول أولاً.', 'ai');
      return;
    }

    // call Supabase Edge Function
    var url = SB.url + '/functions/v1/jopai-chat';
    var res = await fetch(url, {
      method: 'POST',
      headers: Object.assign({}, SB.headers(), {
        // supabase edge functions expect json
        'Content-Type': 'application/json'
      }),
      body: JSON.stringify({ user_id: userId, message: message })
    });

    if (!res.ok) {
      var t = '';
      try { t = await res.text(); } catch (e) {}
      console.error('jopai-chat error:', t);
      bubble('صار خطأ بالسيرفر. جرّب مرة ثانية.', 'ai');
      return;
    }

    var data = await res.json();
    bubble((data && data.answer) ? data.answer : 'ما فهمت عليك، فيك تعيد السؤال؟', 'ai');
  }

  async function onSend() {
    var text = (input && input.value ? String(input.value) : '').trim();
    if (!text) return;

    input.value = '';
    bubble(text, 'me');

    if (sendBtn) sendBtn.disabled = true;
    try {
      await askJopai(text);
    } finally {
      if (sendBtn) sendBtn.disabled = false;
      try { input.focus(); } catch (e) {}
    }
  }

  if (sendBtn) sendBtn.addEventListener('click', onSend);
  if (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') onSend();
    });
  }
})();
