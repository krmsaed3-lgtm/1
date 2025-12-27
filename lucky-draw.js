/* Lucky Draw FINAL (works with the official page)
   - REST RPC only (no Supabase JS client)
   - Reads user id from auth.js (ExaAuth.ensureSupabaseUserId)
   - Shows spins by reading lucky_draw_user_spins
   - UI-only animation; DB decides result via RPC lucky_draw_spin(p_user_id)
*/

(function () {
  'use strict';

  // --- Effects (sound + vibration + win modal). No CSS/style changes. ---
  var __audioCtx = null;
  function __ctx() {
    if (__audioCtx) return __audioCtx;
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    __audioCtx = new C();
    return __audioCtx;
  }
  function __tone(freq, ms, type, gain) {
    var c = __ctx();
    if (!c) return;
    if (c.state === 'suspended') { try { c.resume(); } catch (e) {} }
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.value = (gain == null) ? 0.025 : gain;
    o.connect(g); g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + (ms / 1000));
  }
  function playTick() { __tone(880, 18, 'square', 0.02); }
  function playWin() {
    __tone(660, 90, 'sine', 0.04);
    setTimeout(function(){ __tone(880, 90, 'sine', 0.04); }, 110);
    setTimeout(function(){ __tone(1100, 110, 'sine', 0.045); }, 220);
  }
  function vibrateWin() { if (navigator.vibrate) { try { navigator.vibrate([120,60,160]); } catch (e) {} } }
  function showWinModal(text) {
    var m = document.getElementById('ldWinModal');
    var t = document.getElementById('ldWinText');
    var ok = document.getElementById('ldWinOk');
    if (!m || !t || !ok) return;
    t.textContent = text || 'You won!';
    m.style.display = 'flex';
    ok.onclick = function(){ m.style.display = 'none'; };
    m.onclick = function(ev){ if (ev.target === m) m.style.display = 'none'; };
  }
  // -----------------------------------------------------------------------


  var SB = window.SB_CONFIG;
  function $(id) { return document.getElementById(id); }

  var el = {
    back: $('btnBack'),
    start: $('btnStart'),
    remaining: $('remainingTimes'),
    userShort: $('userShort') || $('uShort'),
    spinsText: $('spinsCount') || $('spins'),
    cards: Array.prototype.slice.call(document.querySelectorAll('.grid .prize-card'))
  };

  if (!el.cards.length) {
    el.cards = Array.prototype.slice.call(document.querySelectorAll('#grid .card'));
  }

  function showStartEnabled(enabled) {
    if (!el.start) return;
    if (el.start.tagName === 'BUTTON') el.start.disabled = !enabled;
    el.start.classList.toggle('enabled', !!enabled);
    el.start.classList.toggle('disabled', !enabled);
    el.start.setAttribute('aria-disabled', enabled ? 'false' : 'true');
    if (el.start.style) el.start.style.opacity = enabled ? '1' : '.55';
  }

  function setActive(index) {
    playTick();
    if (!el.cards.length) return;
    el.cards.forEach(function (c, i) {
      if (i === index) c.classList.add('active');
      else c.classList.remove('active');
    });
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function rpc(name, body) {
    if (!SB) return Promise.reject(new Error('SB_CONFIG missing (load sb-config.js first)'));
    return fetch(SB.url + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: SB.headers(),
      body: JSON.stringify(body || {})
    }).then(async function (res) {
      var txt = await res.text();
      if (!res.ok) {
        try {
          var j = JSON.parse(txt);
          throw new Error(j.message || j.error || txt);
        } catch (e) {
          throw new Error(txt || ('RPC ' + name + ' failed'));
        }
      }
      try { return JSON.parse(txt); } catch (e) { return txt; }
    });
  }

  async function getUserId() {
    if (window.ExaAuth && typeof window.ExaAuth.ensureSupabaseUserId === 'function') {
      return await window.ExaAuth.ensureSupabaseUserId();
    }
    try { return localStorage.getItem('sb_user_id_v1'); } catch (e) { return null; }
  }

  async function fetchSpins(userId) {
    var url = SB.url + '/rest/v1/lucky_draw_user_spins?select=spins_balance&user_id=eq.' +
      encodeURIComponent(userId) + '&limit=1';
    var res = await fetch(url, { method: 'GET', headers: SB.headers() });
    if (!res.ok) return 0;
    var rows = await res.json();
    if (!Array.isArray(rows) || !rows.length) return 0;
    return Number(rows[0].spins_balance || 0);
  }

  function slotToIndex(slot) {
    var s = Number(slot || 1);
    if (!isFinite(s)) s = 1;
    if (s < 1) s = 1;
    if (s > 9) s = 9;
    return s - 1;
  }

  function setMeta(uid, spins) {
    if (el.userShort) el.userShort.textContent = uid ? (uid.slice(0, 6) + '…' + uid.slice(-4)) : '-';
    if (el.spinsText) el.spinsText.textContent = String(spins || 0);
    if (el.remaining) {
      // If remainingTimes is inside a sentence, set only the number (or keep "X times" if present)
      var cur = (el.remaining.textContent || '').toLowerCase();
      el.remaining.textContent = cur.includes('times') ? (String(spins || 0) + ' times') : String(spins || 0);
    }
  }

  async function refresh() {
    try {
      var uid = await getUserId();
      if (!uid) {
        setMeta(null, 0);
        showStartEnabled(false);
        return;
      }
      var spins = await fetchSpins(uid);
      setMeta(uid, spins);
      showStartEnabled(spins > 0);
    } catch (e) {
      setMeta(null, 0);
      showStartEnabled(false);
    }
  }

  async function runSpin() {
    try {
      showStartEnabled(false);

      var uid = await getUserId();
      if (!uid) throw new Error('Not logged in');

      var idx = 0;
      setActive(idx);

      var minSpinMs = 2300;
      var startAt = Date.now();

      var interval = setInterval(function () {
        if (!el.cards.length) return;
        idx = (idx + 1) % el.cards.length;
        setActive(idx);
      }, 80);

      var res = await rpc('lucky_draw_spin', { p_user_id: uid });

      var elapsed = Date.now() - startAt;
      if (elapsed < minSpinMs) await sleep(minSpinMs - elapsed);

      clearInterval(interval);

      if (!res || res.ok !== true) {
        await refresh();
        return;
      }

      var finalIndex = slotToIndex(res.prize && res.prize.slot ? res.prize.slot : 1);

      for (var i = 0; i < 14; i++) {
        if (!el.cards.length) break;
        idx = (idx + 1) % el.cards.length;
        setActive(idx);
        await sleep(70 + i * 18);
      }
      while (el.cards.length && idx !== finalIndex) {
        idx = (idx + 1) % el.cards.length;
        setActive(idx);
        await sleep(120);
      }

      await refresh();
    } catch (e) {
      await refresh();
    }
  }

  if (el.back) el.back.addEventListener('click', function () { history.back(); });

  if (el.start) {
    el.start.addEventListener('click', function () {
      if (el.start.classList.contains('disabled')) return;
      runSpin();
    });
  }

  refresh();
})();
