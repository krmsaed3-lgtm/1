// lucky-draw.js - connects Lucky Draw page to Supabase (no UI redesign)
;(function () {
  'use strict';

  function $(sel) { return document.querySelector(sel); }

  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = String(msg || '');
    t.style.cssText =
      'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);' +
      'background:rgba(0,0,0,.75);color:#fff;padding:10px 14px;border-radius:12px;' +
      'font-size:12px;max-width:90%;z-index:99999;text-align:center;';
    document.body.appendChild(t);
    setTimeout(function () { try { t.remove(); } catch (e) {} }, 2600);
  }

  function getUserId() {
    try {
      return (
        (localStorage.getItem('sb_user_id_v1') || '').trim() ||
        (localStorage.getItem('currentUserId') || '').trim() ||
        (localStorage.getItem('user_id') || '').trim()
      );
    } catch (e) {
      return '';
    }
  }

  function getSB() {
    return window.SB_CONFIG || null;
  }

  function headers() {
    var SB = getSB();
    if (SB && typeof SB.headers === 'function') return SB.headers();

    var h = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (SB && SB.anonKey) h.apikey = SB.anonKey;
    // If you store access token, SB.headers() already handles it in your project
    return h;
  }

  async function rpc(name, payload) {
    var SB = getSB();
    if (!SB || !SB.url) throw new Error('SB_CONFIG missing');
    var url = SB.url.replace(/\/$/, '') + '/rest/v1/rpc/' + encodeURIComponent(name);
    var res = await fetch(url, { method: 'POST', headers: headers(), body: JSON.stringify(payload || {}) });
    var text = await res.text().catch(function(){ return ''; });
    var data;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    if (!res.ok) {
      var msg = (data && (data.message || data.error || data.details)) ? (data.message || data.error || data.details) : ('RPC ' + name + ' failed');
      var err = new Error(msg);
      err.status = res.status;
      err.payload = data;
      throw err;
    }
    return data;
  }

  // Prefer RPC state (security definer) so the page works even if RLS is enabled
  async function getState(uid) {
    try {
      var result = await rpc('lucky_draw_state', { p_user: uid });
      var row = Array.isArray(result) ? (result[0] || null) : result;
      return row || null;
    } catch (e) {
      return null;
    }
  }

  function parseCountFromContentRange(cr) {
    // format: 0-0/10
    if (!cr) return null;
    var m = String(cr).match(/\/(\d+)\s*$/);
    if (!m) return null;
    return Number(m[1]);
  }

  // Fallback direct count (only used if RPC state isn't installed)
  async function getRemainingSpins(uid) {
    var SB = getSB();
    if (!SB || !SB.url) throw new Error('SB_CONFIG missing');
    var url = SB.url.replace(/\/$/, '') + '/rest/v1/lucky_draw_spins?select=id&inviter_id=eq.' +
      encodeURIComponent(uid) + '&status=eq.available&limit=1';
    var res = await fetch(url, {
      method: 'GET',
      headers: (function () {
        var h = headers();
        h.Prefer = 'count=exact';
        return h;
      })()
    });
    if (!res.ok) return 0;
    var cr = res.headers.get('content-range') || res.headers.get('Content-Range');
    var c = parseCountFromContentRange(cr);
    if (c !== null && isFinite(c)) return c;
    var rows = await res.json().catch(function(){ return []; });
    return Array.isArray(rows) ? rows.length : 0;
  }

  function setRemaining(n) {
    var el = $('#remainingTimes');
    if (!el) return;
    el.textContent = String(Number(n || 0)) + ' times';
  }

  function setStartEnabled(enabled) {
    var btn = $('#btnStart');
    if (!btn) return;
    btn.style.opacity = enabled ? '1' : '0.45';
    btn.style.pointerEvents = enabled ? 'auto' : 'none';
    btn.style.cursor = enabled ? 'pointer' : 'default';
    // visual enabled/disabled
    try {
      btn.classList.toggle('is-enabled', enabled);
      btn.classList.toggle('is-disabled', !enabled);
    } catch (e) {}

  }

  async function refreshStatus() {
    var uid = getUserId();
    if (!uid) {
      setRemaining(0);
      setStartEnabled(false);
      // Avoid noisy toasts if user just opened the page
      return;
    }

    // 1) Try RPC state (recommended)
    var st = await getState(uid);
    if (st && st.is_active === false) {
      setRemaining(0);
      setStartEnabled(false);
      return;
    }
    if (st && typeof st.remaining_spins === 'number') {
      setRemaining(st.remaining_spins);
      setStartEnabled(st.remaining_spins > 0);
      return;
    }

    // 2) Fallback direct count
    var remaining = await getRemainingSpins(uid).catch(function(){ return 0; });
    setRemaining(remaining);
    setStartEnabled(remaining > 0);
  }

  async function doSpin() {
    var uid = getUserId();
    if (!uid) { toast('Please login first.'); return; }

    setStartEnabled(false);

    try {
      var result = await rpc('do_lucky_draw_spin_v2', { p_user: uid });
      // result is a set-returning function; could be array of rows or a single object
      var row = Array.isArray(result) ? (result[0] || null) : result;
      if (!row || row.ok !== true) {
        if (row && row.tier === 'inactive') toast('Lucky draw is inactive.');
        else if (row && row.tier === 'no_spins') toast('No spins available.');
        else toast('Spin failed.');
        await refreshStatus();
        return;
      }

      toast('Prize credited: ' + Number(row.prize || 0).toFixed(2) + ' USDT');
      setRemaining(row.remaining_spins || 0);

      // Optional: update wallet UI elsewhere if you have listeners
      try { if (window.DemoWallet && typeof window.DemoWallet.getAssetsSummary === 'function') { window.DemoWallet.getAssetsSummary(uid); } } catch (e) {}

    } catch (e) {
      console.error(e);
      toast(e && e.message ? e.message : 'Spin error');
      await refreshStatus();
    } finally {
      // enable only if still has spins
      var r = Number($('#remainingTimes') ? ($('#remainingTimes').textContent || '0').split(' ')[0] : 0);
      setStartEnabled(r > 0);
    }
  }

  function wire() {
    var btn = $('#btnStart');
    if (btn) {
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', function () {
        doSpin();
      });
    }
    // Back button
    var back = document.querySelector('.back-btn');
    if (back) back.addEventListener('click', function(){ history.back(); });

    refreshStatus();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

})();