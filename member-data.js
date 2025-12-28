/* member-data.js
   - Powers member.html (VIP levels page) with:
     1) Current user's demo USDT balance (wallet_balances.usdt_balance)
     2) Gen-1 effective users count (from RPC public.get_my_team; depth=1; is_effective=true OR demo_balance>=100)
     3) Updates the "USDT Balance" and "Number of effective users" stats for each VIP level section
   - Does NOT change any CSS/layout; only fills existing text nodes.
*/

(function () {
  'use strict';

  // ---------- CONFIG HELPERS (same style as my-team-data.fixed.js) ----------
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

    const h = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    const anon = getAnonKey();
    if (anon) h.apikey = anon;

    const token = getAccessTokenFromLocalStorage();
    if (token) h.Authorization = "Bearer " + token;

    return h;
  }

  function getCurrentUserIdSyncFallback() {
    // Try common keys (your project uses some of these)
    const keys = ["currentUserId", "sb_user_id_v1", "user_id", "uid", "sb-user-id"];
    for (const k of keys) {
      try {
        const v = localStorage.getItem(k);
        if (v && v.length >= 30) return v;
      } catch (e) {}
    }
    // UUID scan fallback
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
    // Prefer project auth helper if present
    try {
      if (window.ExaAuth && typeof window.ExaAuth.ensureSupabaseUserId === "function") {
        const id = await window.ExaAuth.ensureSupabaseUserId();
        if (id) return id;
      }
    } catch (e) {}
    return getCurrentUserIdSyncFallback();
  }

  function $(sel, root) {
    return (root || document).querySelector(sel);
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

  async function fetchMyCurrentLevel(userId) {
    const base = getSupabaseUrl();
    const url = base.replace(/\/$/, "") + "/rest/v1/user_state"
      + "?select=current_level"
      + "&user_id=eq." + encodeURIComponent(userId)
      + "&limit=1";
    const res = await fetch(url, { method: "GET", headers: apiHeaders() });
    if (!res.ok) return null;
    const rows = await res.json().catch(() => []);
    const lvl = rows && rows[0] ? rows[0].current_level : null;
    return typeof lvl === "string" && lvl ? lvl : null;
  }

  // ---------- DOMAIN LOGIC ----------
  function isEffectiveRow(r) {
    if (!r) return false;
    if (r.is_effective === true) return true;
    const bal =
      (r.demo_balance != null ? Number(r.demo_balance) :
      (r.usdt_balance != null ? Number(r.usdt_balance) : NaN));
    if (!Number.isNaN(bal)) return bal >= 100;
    return false;
  }

  function formatNumber(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return "0";
    // show up to 2 decimals, but trim trailing zeros
    const s = x.toFixed(2);
    return s.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
  }

  function nextLevelFromCurrent(current) {
    const order = ["V0","V1","V2","V3","V4","V5","V6"];
    const idx = order.indexOf(current);
    if (idx === -1) return null;
    return order[idx + 1] || null;
  }

  // Requirements shown in your UI
  const RULES = {
    V1: { minBalance: 50,   minUsers: 0 },
    V2: { minBalance: 500,  minUsers: 5 },
    V3: { minBalance: 1000, minUsers: 10 },
    V4: { minBalance: 10000, minUsers: 15 },
    V5: { minBalance: 10000, minUsers: 20 },
    V6: { minBalance: 100000, minUsers: 25 },
  };

  function updateTopBar(currentLevel, nextLevel) {
    const pillSpan = document.querySelector(".current-level-pill span");
    if (pillSpan && currentLevel) pillSpan.textContent = "Current Member Level:" + currentLevel;

    const nextEl = document.querySelector(".next-level");
    if (nextEl) nextEl.textContent = nextLevel ? ("Next Level:" + nextLevel) : "Max Level";
  }

  function updateSection(sec, balance, effectiveUsersGen1) {
    if (!sec) return;
    const level = sec.getAttribute("data-level");
    if (!level || !RULES[level]) return;

    const rules = RULES[level];
    const statValues = sec.querySelectorAll(".stat-card .stat-value");
    if (statValues.length >= 2) {
      statValues[0].textContent = formatNumber(balance) + "/" + rules.minBalance;
      statValues[1].textContent = String(effectiveUsersGen1) + "/" + rules.minUsers;
    }

    // Optional: update progress bar fill to reflect whichever requirement is "more completed"
    const fill = sec.querySelector(".progress-bar-fill");
    if (fill) {
      const balP = rules.minBalance > 0 ? Math.min(1, balance / rules.minBalance) : 1;
      const usrP = rules.minUsers > 0 ? Math.min(1, effectiveUsersGen1 / rules.minUsers) : 1;
      const p = Math.max(balP, usrP);
      fill.style.width = Math.round(p * 100) + "%";
    }
  }

  // ---------- MAIN ----------
  async function loadMemberData() {
    const userId = await getCurrentUserId();
    if (!userId) return;

    // Fetch data in parallel
    const [balance, currentLevel, team] = await Promise.all([
      fetchMyDemoBalance(userId),
      fetchMyCurrentLevel(userId),
      rpcGetMyTeam(userId),
    ]);

    // Count Gen-1 effective users
    const gen1 = Array.isArray(team) ? team.filter(r => r.depth === 1) : [];
    const effectiveUsersGen1 = gen1.filter(isEffectiveRow).length;

    // Update top bar
    const lvl = currentLevel || "V0";
    const next = nextLevelFromCurrent(lvl);
    updateTopBar(lvl, next);

    // Update each section
    const sections = document.querySelectorAll(".vip-section");
    sections.forEach(sec => updateSection(sec, balance, effectiveUsersGen1));
  }

  window.loadMemberData = loadMemberData;

  document.addEventListener("DOMContentLoaded", function () {
    loadMemberData().catch(function (e) {
      console.error(e);
    });
  });
})();
