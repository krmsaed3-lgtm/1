/* Lucky Draw FINAL (works with the official page)
   - REST RPC only (no Supabase JS client)
   - Reads user id from auth.js (ExaAuth.ensureSupabaseUserId)
   - Shows spins by reading lucky_draw_user_spins
   - UI-only animation; DB decides result via RPC lucky_draw_spin(p_user_id)
*/

(function () {
  'use strict';

  // LD_EFFECTS: sound + vibration + win popup (does not change your page style)
  var __ldSoundArmed = false;
  var __ldAudioCtx = null;

  function __ldArmSound() { __ldSoundArmed = true; }

  function __ldCtx() {
    if (!__ldSoundArmed) return null;
    if (__ldAudioCtx) return __ldAudioCtx;
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    __ldAudioCtx = new C();
    return __ldAudioCtx;
  }

  function __ldTone(freq, ms, type, gain) {
    var c = __ldCtx();
    if (!c) return;
    if (c.state === 'suspended') { try { c.resume(); } catch (e) {} }
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.value = (gain == null) ? 0.02 : gain;
    o.connect(g); g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + (ms / 1000));
  }

  function __ldTick() { __ldTone(880, 16, 'square', 0.018); }
  function __ldWin() {
    __ldTone(660, 90, 'sine', 0.04);
    setTimeout(function(){ __ldTone(880, 90, 'sine', 0.04); }, 120);
    setTimeout(function(){ __ldTone(1100, 110, 'sine', 0.045); }, 250);
  }

  function __ldVibrate() { if (navigator.vibrate) { try { navigator.vibrate([120,60,160]); } catch (e) {} } }

  function __ldEnsureModal() {
    var m = document.getElementById('ldWinModal');
    if (m) return m;

    m = document.createElement('div');
    m.id = 'ldWinModal';
    m.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.65);z-index:9999;';
    m.innerHTML =
      '<div style="width:min(360px,calc(100% - 32px));background:rgba(10,16,26,.96);border:1px solid rgba(255,255,255,.12);border-radius:16px;box-shadow:0 14px 35px rgba(0,0,0,.55);padding:18px 16px;text-align:center;">' +
        '<div style="font-size:34px;line-height:1;margin-bottom:6px;">🎉</div>' +
        '<div style="font-weight:800;font-size:18px;margin-bottom:8px;">Congratulations!</div>' +
        '<div id="ldWinText" style="color:rgba(255,255,255,.85);font-size:14px;line-height:1.4;">You won</div>' +
        '<button id="ldWinOk" style="margin-top:14px;width:100%;border:0;border-radius:12px;padding:12px 14px;font-weight:800;font-size:15px;background:linear-gradient(90deg,#18c1ff,#22e1a5);color:#031018;cursor:pointer;">OK</button>' +
      '</div>';

    document.body.appendChild(m);

    var ok = m.querySelector('#ldWinOk');
    ok.addEventListener('click', function(){ m.style.display = 'none'; });
    m.addEventListener('click', function(ev){ if (ev.target === m) m.style.display = 'none'; });

    return m;
  }

  function __ldShowWin(text) {
    var m = __ldEnsureModal();
    var t = m.querySelector('#ldWinText');
    if (t) t.textContent = text || 'You won!';
    m.style.display = 'flex';
  }
  // END_LD_EFFECTS


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
    if (__ldSoundArmed) { try { __ldTick(); } catch (e) {} }
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

      
      // LD_WIN_EFFECTS
      try {
        __ldWin();
        __ldVibrate();
        var title = (res && res.prize && res.prize.title) ? res.prize.title : 'Prize';
        var amt = (res && res.prize && res.prize.amount != null) ? (' +' + res.prize.amount) : '';
        __ldShowWin('You won ' + title + amt);
      } catch (e) {}
await refresh();
    } catch (e) {
      await refresh();
    }
  }

  if (el.back) el.back.addEventListener('click', function () { history.back(); });

  if (el.start) {
    el.start.addEventListener('click', function () {
      __ldArmSound();
      if (el.start.classList.contains('disabled')) return;
      runSpin();
    });
  }

  refresh();
})();
