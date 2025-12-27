/* Lucky Draw PROD (REST RPC, no Supabase JS client)
   - Uses SB_CONFIG from sb-config.js
   - Uses ExaAuth.ensureSupabaseUserId() from auth.js
   - Animation is UI-only; DB decides final slot via RPC lucky_draw_spin
*/

(function () {
  'use strict';

  var SB = window.SB_CONFIG;
  function $(id) { return document.getElementById(id); }

  var el = {
    back: $('btnBack'),
    start: $('btnStart'),
    remaining: $('remainingTimes'),
    cards: Array.prototype.slice.call(document.querySelectorAll('.grid .prize-card'))
  };

  function setStartEnabled(enabled) {
    if (!el.start) return;
    el.start.classList.toggle('enabled', !!enabled);
    el.start.classList.toggle('disabled', !enabled);
    el.start.setAttribute('aria-disabled', enabled ? 'false' : 'true');
    el.start.style.opacity = enabled ? '1' : '.55';
  }

  function setActive(index) {
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
    return null;
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

  function setRemaining(spins) {
    if (el.remaining) el.remaining.textContent = String(spins) + ' times';
  }

  async function refresh() {
    try {
      var uid = await getUserId();
      if (!uid) {
        setRemaining(0);
        setStartEnabled(false);
        return;
      }
      var spins = await fetchSpins(uid);
      setRemaining(spins);
      setStartEnabled(spins > 0);
    } catch (e) {
      setRemaining(0);
      setStartEnabled(false);
    }
  }

  async function runSpin() {
    try {
      setStartEnabled(false);

      var uid = await getUserId();
      if (!uid) throw new Error('Not logged in');

      // UI-only animation
      var idx = 0;
      setActive(idx);

      var minSpinMs = 2200;
      var startAt = Date.now();

      var interval = setInterval(function () {
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

      // Slow landing
      for (var i = 0; i < 14; i++) {
        idx = (idx + 1) % el.cards.length;
        setActive(idx);
        await sleep(70 + i * 18);
      }
      while (idx !== finalIndex) {
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
  if (el.start) el.start.addEventListener('click', runSpin);

  refresh();
})();
