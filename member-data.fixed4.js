/* member-data.fixed4.js
   - Powers member.html (VIP levels page)
   - Shows:
     1) Demo USDT balance (wallet_balances.usdt_balance)
     2) Gen-1 effective users count (based on v_user_effective_demo / get_my_team)
     3) Current member level + lock status (from user_state)
   - IMPORTANT (per product requirement):
     - Do NOT block navigating between levels/tabs
     - Do NOT show requirement thresholds (no "/50", no alerts, no "Next Level")
     - Only toggle Locked/Unlocked label per level based on current_level + is_locked
   - Does NOT change CSS/layout; only fills existing text nodes.
*/
(function () {
  'use strict';

  function getSupabaseUrl() {
    return (window.SB_CONFIG && window.SB_CONFIG.url) ? window.SB_CONFIG.url : (window.SUPABASE_URL || "");
  }
  function getAnonKey() {
    return (window.SB_CONFIG && window.SB_CONFIG.anonKey) ? window.SB_CONFIG.anonKey : (window.SUPABASE_ANON_KEY || "");
  }

  function getAccessTokenFromLocalStorage() {
    try {
      // Supabase v2 stores session under: sb-<project-ref>-auth-token
      // We'll scan localStorage for a key containing "-auth-token"
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (k.includes("-auth-token")) {
          const raw = localStorage.getItem(k);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          // v2: { access_token, ... } OR { currentSession: { access_token } }
          if (parsed && parsed.access_token) return parsed.access_token;
          if (parsed && parsed.currentSession && parsed.currentSession.access_token) return parsed.currentSession.access_token;
        }
      }
    } catch (_) {}
    return null;
  }

  function buildHeaders() {
    const h = { "Content-Type": "application/json", "Accept": "application/json" };
    const anon = getAnonKey();
    if (anon) h.apikey = anon;
    const token = getAccessTokenFromLocalStorage();
    if (token) h.Authorization = "Bearer " + token;
    return h;
  }

  async function fetchJson(url, opts) {
    const res = await fetch(url, opts);
    const txt = await res.text();
    let data = null;
    try { data = txt ? JSON.parse(txt) : null; } catch (_) {}
    if (!res.ok) {
      const msg = (data && (data.message || data.error_description || data.error)) ? (data.message || data.error_description || data.error) : txt;
      throw new Error("HTTP " + res.status + ": " + msg);
    }
    return data;
  }

  async function getCurrentUserId() {
    // Prefer supabase-js if present
    try {
      if (window.supabase && window.supabase.auth && typeof window.supabase.auth.getUser === "function") {
        const { data } = await window.supabase.auth.getUser();
        if (data && data.user && data.user.id) return data.user.id;
      }
    } catch (_) {}

    // Fallback: parse token payload (JWT)
    const token = getAccessTokenFromLocalStorage();
    if (token && token.split(".").length === 3) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (payload && payload.sub) return payload.sub;
      } catch (_) {}
    }
    return null;
  }

  function fmtNum(x) {
    if (!Number.isFinite(x)) return "0";
    // Keep up to 3 decimals if present, trim trailing zeros
    const s = x.toFixed(3);
    return s.replace(/\.?0+$/, "");
  }

  async function fetchSingle(table, select, matchObj) {
    const base = getSupabaseUrl();
    const params = new URLSearchParams();
    params.set("select", select);
    Object.keys(matchObj || {}).forEach(k => params.set(k, "eq." + matchObj[k]));
    const url = base.replace(/\/$/, "") + "/rest/v1/" + table + "?" + params.toString() + "&limit=1";
    const data = await fetchJson(url, { method: "GET", headers: buildHeaders() });
    return Array.isArray(data) && data.length ? data[0] : null;
  }

  async function rpcGetMyTeam(userId) {
    const base = getSupabaseUrl().replace(/\/$/, "");
    // Some projects implement get_my_team without args and uses auth.uid()
    // We'll try no-arg first, then with p_user / uid if needed.
    const headers = buildHeaders();

    async function call(body) {
      const url = base + "/rest/v1/rpc/get_my_team";
      return fetchJson(url, { method: "POST", headers, body: JSON.stringify(body || {}) });
    }

    try {
      return await call({});
    } catch (e) {
      // retry with common param names
      try { return await call({ p_user: userId }); } catch (_) {}
      try { return await call({ uid: userId }); } catch (_) {}
      throw e;
    }
  }

  function isEffectiveRow(row) {
    if (!row) return false;
    if (row.is_effective === true) return true;
    if (typeof row.demo_balance === "number") return row.demo_balance >= 100;
    if (typeof row.demo_balance === "string") return parseFloat(row.demo_balance) >= 100;
    return false;
  }

  function levelIndex(lvl) {
    const order = ["V0","V1","V2","V3","V4","V5","V6"];
    const i = order.indexOf(String(lvl || "V0").toUpperCase());
    return i === -1 ? 0 : i;
  }

  function setTopBar(currentLevel) {
    const pillSpan = document.querySelector(".current-level-pill span");
    if (pillSpan) pillSpan.textContent = "Current Member Level:" + (currentLevel || "V0");

    // Hide "Next Level" text (do not reveal targets). Keep element to preserve layout.
    const nextEl = document.querySelector(".next-level");
    if (nextEl) nextEl.textContent = "";
  }

  function updateStatsInSection(sec, balance, effectiveUsersGen1) {
    if (!sec) return;

    // Stat values exist as two cards: balance + effective users
    const statValues = sec.querySelectorAll(".stat-card .stat-value");
    if (statValues.length >= 1) statValues[0].textContent = fmtNum(balance);
    if (statValues.length >= 2) statValues[1].textContent = String(effectiveUsersGen1);

    // Progress bar: keep visual but don't reveal thresholds; show completion based on current balance vs 50
    // We'll show a soft progress based on balance capped at 100%.
    const fill = sec.querySelector(".progress-bar-fill");
    if (fill) {
      const p = Math.max(0, Math.min(1, balance / 50));
      fill.style.width = Math.round(p * 100) + "%";
    }
  }

  function setLockLabelForSection(sec, currentLevel, isLocked, lockedReason) {
    if (!sec) return;
    const lvl = sec.getAttribute("data-level");
    const lockEl = sec.querySelector(".vip-locked");
    if (!lockEl || !lvl) return;

    const curIdx = levelIndex(currentLevel);
    const secIdx = levelIndex(lvl);

    // If account is locked at V3, keep V3 as locked and prevent "Unlocked" beyond it.
    if (isLocked && String(currentLevel || "").toUpperCase() === "V3") {
      if (secIdx <= 2) { // V1,V2
        lockEl.textContent = "Unlocked";
      } else {
        lockEl.textContent = lockedReason ? lockedReason : "Locked";
      }
      return;
    }

    // Normal: unlocked if section level <= current_level
    lockEl.textContent = (secIdx <= curIdx) ? "Unlocked" : "Locked at this Level";
  }

  function wireTabs_NoBlocking() {
    // Ensure tabs switch content, but NEVER block or alert.
    const tabs = Array.from(document.querySelectorAll(".tabs .tab"));
    const sections = Array.from(document.querySelectorAll(".vip-section"));
    if (!tabs.length || !sections.length) return;

    function showLevel(level) {
      tabs.forEach(t => t.classList.toggle("active", t.getAttribute("data-level") === level));
      sections.forEach(s => {
        const lv = s.getAttribute("data-level");
        s.style.display = (lv === level) ? "" : "none";
      });
    }

    tabs.forEach(t => {
      t.addEventListener("click", function () {
        const level = t.getAttribute("data-level");
        showLevel(level);
      });
    });

    // Ensure initial state shows active tab's section
    const active = tabs.find(t => t.classList.contains("active")) || tabs[0];
    if (active) showLevel(active.getAttribute("data-level"));
  }

  async function loadMemberData() {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("Not logged in (no user id).");

    // Fetch core data
    const [wallet, state, team] = await Promise.all([
      fetchSingle("wallet_balances", "usdt_balance", { user_id: userId }),
      fetchSingle("user_state", "current_level,is_locked,locked_reason", { user_id: userId }),
      rpcGetMyTeam(userId)
    ]);

    const balance = wallet && wallet.usdt_balance != null ? Number(wallet.usdt_balance) : 0;
    const currentLevel = state && state.current_level ? state.current_level : "V0";
    const isLocked = state && state.is_locked === true;
    const lockedReason = state && state.locked_reason ? String(state.locked_reason) : null;

    const gen1 = Array.isArray(team) ? team.filter(r => Number(r.depth) === 1) : [];
    const effectiveUsersGen1 = gen1.filter(isEffectiveRow).length;

    setTopBar(currentLevel);

    // Update stats + lock labels
    const sections = document.querySelectorAll(".vip-section");
    sections.forEach(sec => {
      updateStatsInSection(sec, balance, effectiveUsersGen1);
      setLockLabelForSection(sec, currentLevel, isLocked, lockedReason);
    });

    // Make sure tabs are wired without blocking
    wireTabs_NoBlocking();
  }

  window.loadMemberData = loadMemberData;

  document.addEventListener("DOMContentLoaded", function () {
    loadMemberData().catch(function (e) { console.error(e); });
  });
})();
