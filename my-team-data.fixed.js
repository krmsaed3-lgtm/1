/* my-team-data.js
   - Loads team data from Supabase RPC: public.get_my_team
   - Renders Team Size, Effective members, LV.0/LV.1, and a Gen1 table
*/

(function () {
  // ---------- CONFIG HELPERS ----------
  function getSupabaseUrl() {
    return (window.SB_CONFIG && window.SB_CONFIG.url) ? window.SB_CONFIG.url : (window.SUPABASE_URL || "");
  }

  function getAnonKey() {
    return (window.SB_CONFIG && window.SB_CONFIG.anonKey) ? window.SB_CONFIG.anonKey : (window.SUPABASE_ANON_KEY || "");
  }

  function getAccessTokenFromLocalStorage() {
    // Common patterns: sb-access-token OR supabase-js auth token key
    const direct = localStorage.getItem("sb-access-token");
    if (direct) return direct;

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;

      // supabase-js: sb-<project-ref>-auth-token
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
    // If your project already defines SB_CONFIG.headers(), use it
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

  // Try to detect current user id
  function getCurrentUserId() {
    // 1) If you set it manually
    if (window.CURRENT_USER_ID) return window.CURRENT_USER_ID;

    // 2) Common keys you might have
    const keys = [
      "user_id",
      "current_user_id",
      "demo_user_id",
      "uid",
      "sb-user-id",
    ];
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (v && v.length >= 30) return v;
    }

    // 3) Try to find any UUID-like value in localStorage
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      const v = localStorage.getItem(k);
      if (v && uuidRe.test(v)) return v;
    }

    return null;
  }

  function $(sel) {
    return document.querySelector(sel);
  }

  function setText(sel, value) {
    const el = $(sel);
    if (!el) return;
    el.textContent = String(value);
  }

  function setStatus(msg) {
    const el = $("#statusLine");
    if (!el) return;
    el.textContent = msg || "";
  }

  function showError(msg) {
    const el = $("#errorBox");
    if (!el) return;
    el.style.display = "block";
    el.textContent = msg;
  }

  function hideError() {
    const el = $("#errorBox");
    if (!el) return;
    el.style.display = "none";
    el.textContent = "";
  }

  // ---------- RPC CALL ----------
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
    if (!res.ok) {
      throw new Error(`get_my_team failed (${res.status}): ${text.slice(0, 300)}`);
    }
    return text ? JSON.parse(text) : [];
  }

  // ---------- RENDER ----------
  function isEffectiveRow(r) {
    if (!r) return false;
    if (r.is_effective === true) return true;
    const bal =
      (r.demo_balance != null ? Number(r.demo_balance) :
      (r.usdt_balance != null ? Number(r.usdt_balance) : NaN));
    if (!Number.isNaN(bal)) return bal >= 100;
    return r.is_funded === true;
  }

  function compute(data) {
    const gen1 = data.filter(r => r.depth === 1);
    const gen2 = data.filter(r => r.depth === 2);
    const gen3 = data.filter(r => r.depth === 3);

    const funded1 = gen1.filter(isEffectiveRow).length;
    const funded2 = gen2.filter(isEffectiveRow).length;
    const funded3 = gen3.filter(isEffectiveRow).length;

    return {
      gen1, gen2, gen3,
      total: data.length,
      effectiveAll: funded1 + funded2 + funded3,
      funded1, funded2, funded3
    };
  }

  function renderSummary(total, effectiveAll) {
    // Team Size card
    setText("#teamSizeValue", `${effectiveAll}/${total}`);

    // Earnings placeholders (you can wire these later to another RPC)
    setText("#todayEarningsValue", "0/0");
    setText("#totalRevenueValue", "0/0");
  }

  function renderGenBox(genIndex, effective, total, commissionPercent, incomeText) {
    setText(`#gen${genIndex}Title`, `${genIndex}Generation`);
    setText(`#gen${genIndex}Effective`, `${effective}/${total}`);
    setText(`#gen${genIndex}Commission`, `${commissionPercent}%`);
    setText(`#gen${genIndex}Income`, incomeText);
  }

  function maskPhone(phone) {
    if (!phone) return "-";
    // Keep it simple
    if (phone.length <= 4) return phone;
    return phone.slice(0, 3) + "****" + phone.slice(-2);
  }

  function renderGen1Table(rows) {
    const tbody = $("#gen1TableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!rows.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="4" style="opacity:.75;padding:12px;">No members yet.</td>`;
      tbody.appendChild(tr);
      return;
    }

    for (const r of rows) {
      const lvl = isEffectiveRow(r) ? \"LV.1\" : \"LV.0\";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="padding:10px;border-top:1px solid rgba(255,255,255,.06);">${r.public_id ?? "-"}</td>
        <td style="padding:10px;border-top:1px solid rgba(255,255,255,.06);">${maskPhone(r.phone)}</td>
        <td style="padding:10px;border-top:1px solid rgba(255,255,255,.06);">${lvl}</td>
        <td style="padding:10px;border-top:1px solid rgba(255,255,255,.06);">${Number(r.usdt_balance ?? 0).toFixed(2)}</td>
      `;
      tbody.appendChild(tr);
    }
  }

  // ---------- MAIN ----------
  async function loadTeam() {
    hideError();
    setStatus("Loading team...");

    const userId = getCurrentUserId();
    if (!userId) {
      showError("Current user id not found. Please login first (or set window.CURRENT_USER_ID).");
      setStatus("");
      return;
    }

    try {
      const team = await rpcGetMyTeam(userId);
      const c = compute(team);

      // Summary
      renderSummary(c.total, c.effectiveAll);

      // Generation boxes (same logic as your UI)
      renderGenBox(1, c.funded1, c.gen1.length, 20, "0/0");
      renderGenBox(2, c.funded2, c.gen2.length, 5,  "0/0");
      renderGenBox(3, c.funded3, c.gen3.length, 3,  "0/0");

      // Table
      renderGen1Table(c.gen1);

      setStatus("");
    } catch (err) {
      console.error(err);
      showError(String(err.message || err));
      setStatus("");
    }
  }

  // Expose for manual reload
  window.loadMyTeam = loadTeam;

  document.addEventListener("DOMContentLoaded", loadTeam);
})();
