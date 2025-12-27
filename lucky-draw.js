/* Lucky Draw (REST RPC, no Supabase JS client)
   - Uses SB_CONFIG from sb-config.js
   - Uses ExaAuth.ensureSupabaseUserId() from auth.js to get current user id
   - Animation is UI-only; DB decides the final slot via RPC lucky_draw_spin
*/

(function () {
  'use strict';

  var SB = window.SB_CONFIG;
  if (!SB) {
    console.error('SB_CONFIG missing. Load sb-config.js before lucky-draw.js');
    return;
  }

  function $(id) { return document.getElementById(id); }

  var el = {
    back: $('btnBack'),
    uShort: $('uShort'),
    spins: $('spins'),
    start: $('btnStart'),
    status: $('status'),
    out: $('out'),
    cards: Array.prototype.slice.call(document.querySelectorAll('#grid .card'))
  };

  function setStatus(text, ok) {
    el.status.textContent = text;
    el.status.className = ok ? 'ok' : 'err';
  }

  function logJson(obj, ok) {
    el.out.className = ok ? 'ok' : 'err';
    el.out.textContent = (typeof obj === 'string') ? obj : JSON.stringify(obj, null, 2);
  }

  function setActive(index) {
    el.cards.forEach(function (c, i) {
      if (i === index) c.classList.add('active');
      else c.classList.remove('active');
    });
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function rpc(name, body) {
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
    var url = SB.url + '/rest/v1/lucky_draw_user_spins?select=spins_balance&user_id=eq.' + encodeURIComponent(userId) + '&limit=1';
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

  async function refreshUI() {
    try {
      setStatus('Loading…', true);

      var uid = await getUserId();
      if (!uid) {
        el.uShort.textContent = '-';
        el.spins.textContent = '0';
        el.start.disabled = true;
        el.start.classList.remove('enabled');
        setStatus('Not logged in', false);
        logJson('Login first (currentUserId missing in localStorage).', false);
        return;
      }

      el.uShort.textContent = uid.slice(0, 6) + '…' + uid.slice(-4);

      var spins = await fetchSpins(uid);
      el.spins.textContent = String(spins);

      if (spins > 0) {
        el.start.disabled = false;
        el.start.classList.add('enabled');
        setStatus('Ready', true);
        logJson({ user_id: uid, spins: spins }, true);
      } else {
        el.start.disabled = true;
        el.start.classList.remove('enabled');
        setStatus('No spins', false);
        logJson({ user_id: uid, spins: spins, hint: 'No spins in lucky_draw_user_spins for this user yet.' }, false);
      }
    } catch (e) {
      el.start.disabled = true;
      el.start.classList.remove('enabled');
      setStatus('Error', false);
      logJson(String(e && e.message ? e.message : e), false);
    }
  }

  async function runSpin() {
    try {
      el.start.disabled = true;
      el.start.classList.remove('enabled');

      var uid = await getUserId();
      if (!uid) throw new Error('Not logged in');

      setStatus('Spinning…', true);
      logJson('Calling RPC lucky_draw_spin…', true);

      var idx = 0;
      setActive(idx);

      var minSpinMs = 2400;
      var startAt = Date.now();

      var interval = setInterval(function () {
        idx = (idx + 1) % el.cards.length;
        setActive(idx);
      }, 80);

      // DB decides result
      var res = await rpc('lucky_draw_spin', { p_user_id: uid });

      var elapsed = Date.now() - startAt;
      if (elapsed < minSpinMs) await sleep(minSpinMs - elapsed);

      clearInterval(interval);

      if (!res || res.ok !== true) {
        setStatus('Failed', false);
        logJson(res || { ok: false, error: 'EMPTY_RESPONSE' }, false);
        await refreshUI();
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

      setStatus('WIN', true);
      logJson(res, true);

      await refreshUI();
    } catch (e) {
      setStatus('Error', false);
      logJson(String(e && e.message ? e.message : e), false);
      await refreshUI();
    }
  }

  if (el.back) el.back.addEventListener('click', function () { history.back(); });
  if (el.start) el.start.addEventListener('click', runSpin);

  refreshUI();
})();
