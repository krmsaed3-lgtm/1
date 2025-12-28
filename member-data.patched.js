/* member-data.js (patched)
   Goals (as requested):
   - Do NOT block navigation between V1..V6 tabs (user can browse all).
   - Do NOT show popups / requirement alerts.
   - Do NOT expose "where you must reach" in the UI (no 507/50 etc). Only show current values.
   - Show REAL lock/unlock state inside each level card based on:
       * current_level / is_locked / locked_reason from user_state
       * PLUS a safe fallback: if DB level lags, unlock based on (balance + gen1 effective) rules.
   - No CSS/layout changes; only updates existing text nodes.
*/

(function () {
  'use strict';

  // ---------- CONFIG HELPERS ----------
  function getSupabaseUrl() {
    return (window.SB_CONFIG && window.SB_CONFIG.url) ? window.SB_CONFIG.url : (window.SUPABASE_URL || "");
  }

  function getAnonKey() {
    return (window.SB_CONFIG && window.SB_CONFIG.anonKey) ? window.SB_CONFIG.anonKey : (window.SUPABASE_ANON_KEY || "");
  }

  function getAccessTokenFromLocalStorage() {
    const direct = localStorage.getItem("sb-access-token");
    if (direct) return direct;

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;

      if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
        try {
          const v = JSON.parse(localStorage.getItem(k));
          const token =
            v?.access_token ||
            v?.currentSession?.access_token ||
            v?.session?.access_token ||
            null;
          if (token) return token;
        } catch (e) {}
      }
    }
    return null;
  }

  function apiHeaders() {
    if (window.SB_CONFIG && typeof window.SB_CONFIG.headers === "function") {
      return window.SB_CONFIG.headers();
    }

    const h = { "Content-Type": "application/json", "Accept": "application/json" };

    const anon = getAnonKey();
    if (anon) h.apikey = anon;

    const token = getAccessTokenFromLocalStorage();
    if (token) h.Authorization = "Bearer " + token;

    return h;
  }

  function getCurrentUserIdSyncFallback() {
    const keys = ["currentUserId", "sb_user_id_v1", "user_id", "uid", "sb-user-id"];
    for (const k of keys) {
      try {
        const v = localStorage.getItem(k);
        if (v && v.length >= 30) return v;
      } catch (e) {}
    }
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        const v = localStorage.getItem(k);
        if (v && uuidRe.test(v)) return v;
      }
    } catch (e2) {}
    return null;
  }

  async function getCurrentUserId() {
    try {
      if (window.ExaAuth && typeof window.ExaAuth.ensureSupabaseUserId === "function") {
        const id = await window.ExaAuth.ensureSupabaseUserId();
        if (id) return id;
      }
    } catch (e) {}
    return getCurrentUserIdSyncFallback();
  }

  // ---------- REST HELPERS ----------
  async function rpcGetMyTeam(ancestorId) {
    const base = getSupabaseUrl();
    if (!base) throw new Error("SUPABASE_URL is missing.");

    const url = base.replace(/\/$/, "") + "/rest/v1/rpc/get_my_team";
    const res = await fetch(url, {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({ p_ancestor: ancestorId }),
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) throw new Error(`get_my_team failed (${res.status}): ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : [];
  }

  async function fetchMyDemoBalance(userId) {
    const base = getSupabaseUrl();
    const url = base.replace(/\/$/, "") + "/rest/v1/wallet_balances"
      + "?select=usdt_balance"
      + "&user_id=eq." + encodeURIComponent(userId)
      + "&limit=1";
    const res = await fetch(url, { method: "GET", headers: apiHeaders() });
    if (!res.ok) return 0;
    const rows = await res.json().catch(() => []);
    const bal = rows && rows[0] ? Number(rows[0].usdt_balance) : 0;
    return Number.isFinite(bal) ? bal : 0;
  }

  async function fetchUserState(userId) {
    const base = getSupabaseUrl();
    const url = base.replace(/\/$/, "") + "/rest/v1/user_state"
      + "?select=current_level,is_locked,locked_reason"
      + "&user_id=eq." + encodeURIComponent(userId)
      + "&limit=1";
    const res = await fetch(url, { method: "GET", headers: apiHeaders() });
    if (!res.ok) return { current_level: null, is_locked: false, locked_reason: null };
    const rows = await res.json().catch(() => []);
    const row = rows && rows[0] ? rows[0] : {};
    return {
      current_level: (typeof row.current_level === "string" && row.current_level) ? row.current_level : null,
      is_locked: row.is_locked === true,
      locked_reason: (typeof row.locked_reason === "string" && row.locked_reason) ? row.locked_reason : null,
    };
  }

  // ---------- DOMAIN LOGIC ----------
  function isEffectiveRow(r) {
    if (!r) return false;
    if (r.is_effective === true) return true;
    const bal =
      (r.demo_balance != null ? Number(r.demo_balance) :
      (r.usdt_balance != null ? Number(r.usdt_balance) : NaN));
    return Number.isFinite(bal) ? bal >= 100 : false;
  }

  function formatNumber(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return "0";
    const s = x.toFixed(3); // keep nice precision for balance display
    return s.replace(/\.000$/, "").replace(/(\.\d{1,2})0$/, "$1");
  }

  const ORDER = ["V0","V1","V2","V3","V4","V5","V6"];
  function levelIndex(lvl) {
    const i = ORDER.indexOf(lvl);
    return i >= 0 ? i : 0;
  }
  function maxLevel(a, b) {
    return levelIndex(a) >= levelIndex(b) ? a : b;
  }

  // Rules (internal only; we do NOT show targets to the user)
  function derivedLevelFrom(balance, effGen1) {
    let lvl = "V0";
    if (balance >= 50) lvl = "V1";
    if (balance >= 500 && effGen1 >= 5) lvl = "V2";
    if (balance >= 3000 && effGen1 >= 10) lvl = "V3";
    return lvl;
  }

  function updateTopBar(currentLevel) {
    const pillSpan = document.querySelector(".current-level-pill span");
    if (pillSpan) pillSpan.textContent = "Current Member Level:" + (currentLevel || "V0");

    // user asked not to show where they must reach
    const nextEl = document.querySelector(".next-level");
    if (nextEl) nextEl.textContent = "";
  }

  function updateSectionNumbersOnly(sec, balance, effectiveUsersGen1) {
    const statValues = sec.querySelectorAll(".stat-card .stat-value");
    if (statValues.length >= 2) {
      statValues[0].textContent = formatNumber(balance);
      statValues[1].textContent = String(effectiveUsersGen1);
    }

    // keep progress bar neutral (do not reveal targets)
    const fill = sec.querySelector(".progress-bar-fill");
    if (fill) fill.style.width = "0%";
  }

  function setLockLabel(sec, text) {
    const lockEl = sec.querySelector(".vip-locked");
    if (lockEl) lockEl.textContent = text;
  }

  function applyLockStateToAllSections(effectiveLevel, isLocked, lockedReason) {
    const effIdx = levelIndex(effectiveLevel || "V0");
    const sections = document.querySelectorAll(".vip-section");

    sections.forEach(sec => {
      const level = sec.getAttribute("data-level") || "V0";
      const idx = levelIndex(level);

      // If DB locked (V3 manual review), show support message for V3+ only
      if (isLocked && idx >= levelIndex("V3")) {
        setLockLabel(sec, lockedReason || "Locked. Please contact support.");
        return;
      }

      // Otherwise, unlocked if within effective level
      if (idx <= effIdx && idx > 0) {
        setLockLabel(sec, "Unlocked");
      } else {
        setLockLabel(sec, "Locked at this Level");
      }
    });
  }

  // ---------- MAIN ----------
  async function loadMemberData() {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const [balance, state, team] = await Promise.all([
      fetchMyDemoBalance(userId),
      fetchUserState(userId),
      rpcGetMyTeam(userId),
    ]);

    const gen1 = Array.isArray(team) ? team.filter(r => r.depth === 1) : [];
    const effectiveUsersGen1 = gen1.filter(isEffectiveRow).length;

    // DB level + fallback derived level (so if DB didn't update yet, UI still unlocks correctly)
    const dbLevel = state.current_level || "V0";
    const derived = derivedLevelFrom(balance, effectiveUsersGen1);
    const effectiveLevel = maxLevel(dbLevel, derived);

    updateTopBar(effectiveLevel);

    const sections = document.querySelectorAll(".vip-section");
    sections.forEach(sec => updateSectionNumbersOnly(sec, balance, effectiveUsersGen1));

    applyLockStateToAllSections(effectiveLevel, state.is_locked, state.locked_reason);
  }

  window.loadMemberData = loadMemberData;

  document.addEventListener("DOMContentLoaded", function () {
    loadMemberData().catch(function (e) { console.error(e); });
  });
})();
