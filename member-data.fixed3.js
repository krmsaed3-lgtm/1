/* member-data.fixed3.js
   - Powers member page (VIP levels) with:
     1) Demo USDT balance (wallet_balances.usdt_balance)
     2) Gen-1 effective users count (RPC public.get_my_team; depth=1; is_effective=true OR demo_balance>=100)
     3) Current level + lock flags from user_state (current_level, is_locked, locked_reason)
     4) REAL unlock/lock behavior:
        - Tabs/sections above current_level are blocked (cannot open)
        - At V3 with is_locked=true: V3 shows support message; V4-V6 blocked
   - Does NOT change layout; only updates existing text + adds minimal behavior.
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

  async function getCurrentUserId() {
    try {
      if (window.ExaAuth && typeof window.ExaAuth.ensureSupabaseUserId === "function") {
        const id = await window.ExaAuth.ensureSupabaseUserId();
        if (id) return id;
      }
    } catch (e) {}

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
    const r = rows && rows[0] ? rows[0] : {};
    return {
      current_level: (typeof r.current_level === "string" && r.current_level) ? r.current_level : null,
      is_locked: !!r.is_locked,
      locked_reason: (typeof r.locked_reason === "string" && r.locked_reason) ? r.locked_reason : null,
    };
  }

  // ---------- DOMAIN ----------
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
    const s = x.toFixed(3); // show 3 decimals like your DB examples
    return s.replace(/0+$/, "").replace(/\.$/, "");
  }

  function levelToNum(level) {
    const m = String(level || "").match(/^V(\d+)$/i);
    return m ? Number(m[1]) : 0;
  }

  function nextLevelFromCurrent(current) {
    const n = levelToNum(current);
    return n >= 6 ? null : ("V" + (n + 1));
  }

  // IMPORTANT: V3 in DB requires 3000 + 10 (not 1000)
  const RULES = {
    V1: { minBalance: 50,    minUsers: 0 },
    V2: { minBalance: 500,   minUsers: 5 },
    V3: { minBalance: 3000,  minUsers: 10 },
    V4: { minBalance: 10000, minUsers: 15 },
    V5: { minBalance: 10000, minUsers: 20 },
    V6: { minBalance: 100000,minUsers: 25 },
  };

  function updateTopBar(currentLevel, nextLevel) {
    const pillSpan = document.querySelector(".current-level-pill span");
    if (pillSpan) pillSpan.textContent = "Current Member Level:" + (currentLevel || "V0");

    const nextEl = document.querySelector(".next-level");
    if (nextEl) nextEl.textContent = nextLevel ? ("Next Level:" + nextLevel) : "Max Level";
  }

  function ensureUnlockedStyleInjected() {
    if (document.getElementById("member-unlock-style")) return;
    const st = document.createElement("style");
    st.id = "member-unlock-style";
    // Keep same design; only remove lock icon when unlocked.
    st.textContent = `
      .vip-locked.unlocked::before { content: ""; margin-right: 0; }
    `;
    document.head.appendChild(st);
  }

  function setLockBadge(section, isUnlocked) {
    const badge = section ? section.querySelector(".vip-locked") : null;
    if (!badge) return;
    if (isUnlocked) {
      badge.textContent = "Unlocked";
      badge.classList.add("unlocked");
    } else {
      badge.textContent = "Locked at this Level";
      badge.classList.remove("unlocked");
    }
  }

  function updateSectionStats(sec, balance, effectiveUsersGen1) {
    const level = sec.getAttribute("data-level");
    const rules = RULES[level];
    if (!rules) return;

    const statValues = sec.querySelectorAll(".stat-card .stat-value");
    if (statValues.length >= 2) {
      statValues[0].textContent = formatNumber(balance) + "/" + rules.minBalance;
      statValues[1].textContent = String(effectiveUsersGen1) + "/" + rules.minUsers;
    }

    const fill = sec.querySelector(".progress-bar-fill");
    if (fill) {
      const balP = rules.minBalance > 0 ? Math.min(1, balance / rules.minBalance) : 1;
      const usrP = rules.minUsers > 0 ? Math.min(1, effectiveUsersGen1 / rules.minUsers) : 1;
      const p = Math.max(balP, usrP);
      fill.style.width = Math.round(p * 100) + "%";
    }
  }

  function showMessage(msg) {
    // Keep it simple and reliable (no UI changes).
    alert(msg);
  }

  function getRequirementsText(level) {
    const r = RULES[level];
    if (!r) return "Not available.";
    if (r.minUsers > 0) {
      return `Requirements: Balance >= ${r.minBalance} USDT and Effective Users >= ${r.minUsers}.`;
    }
    return `Requirements: Balance >= ${r.minBalance} USDT.`;
  }

  function canOpenLevel(targetLevel, currentLevel, isLocked) {
    const cur = levelToNum(currentLevel || "V0");
    const tgt = levelToNum(targetLevel);
    if (isLocked) {
      // When locked at V3 (manual review): allow viewing up to V3 only
      return tgt <= Math.min(cur, 3);
    }
    return tgt <= cur;
  }

  function guardTabs(currentLevel, isLocked, lockedReason) {
    const tabsWrap = document.querySelector(".tabs");
    if (!tabsWrap) return;
    if (tabsWrap.__guardInstalled) return;
    tabsWrap.__guardInstalled = true;

    // Capture-phase handler to stop the inline click handler in HTML
    tabsWrap.addEventListener("click", function (ev) {
      const tab = ev.target && ev.target.closest ? ev.target.closest(".tab") : null;
      if (!tab) return;

      const targetLevel = tab.getAttribute("data-level");
      if (!targetLevel) return;

      if (!canOpenLevel(targetLevel, currentLevel, isLocked)) {
        ev.preventDefault();
        ev.stopPropagation();
        if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();

        if (isLocked) {
          showMessage(lockedReason || "Your account is locked at V3. Please contact support.");
        } else {
          showMessage(getRequirementsText(targetLevel));
        }
      }
    }, true);
  }

  function syncLockBadges(currentLevel, isLocked) {
    const sections = document.querySelectorAll(".vip-section");
    const curNum = levelToNum(currentLevel || "V0");
    sections.forEach(sec => {
      const level = sec.getAttribute("data-level");
      if (!level) return;
      const n = levelToNum(level);
      const unlocked = isLocked ? (n <= Math.min(curNum, 3)) : (n <= curNum);
      setLockBadge(sec, unlocked);
    });
  }

  // ---------- MAIN ----------
  async function loadMemberData() {
    ensureUnlockedStyleInjected();

    const userId = await getCurrentUserId();
    if (!userId) return;

    const [balance, userState, team] = await Promise.all([
      fetchMyDemoBalance(userId),
      fetchUserState(userId),
      rpcGetMyTeam(userId),
    ]);

    const gen1 = Array.isArray(team) ? team.filter(r => r.depth === 1) : [];
    const effectiveUsersGen1 = gen1.filter(isEffectiveRow).length;

    const currentLevel = userState.current_level || "V0";
    const nextLevel = nextLevelFromCurrent(currentLevel);
    updateTopBar(currentLevel, nextLevel);

    // Update stats in every section
    document.querySelectorAll(".vip-section").forEach(sec => {
      updateSectionStats(sec, balance, effectiveUsersGen1);
    });

    // Real lock/unlock
    syncLockBadges(currentLevel, userState.is_locked);
    guardTabs(currentLevel, userState.is_locked, userState.locked_reason);
  }

  window.loadMemberData = loadMemberData;

  document.addEventListener("DOMContentLoaded", function () {
    loadMemberData().catch(function (e) {
      console.error(e);
    });
  });
})();
