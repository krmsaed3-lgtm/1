/* lucky-draw-debug.js (no Arabic inside code) */
;(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const grid = $("grid");
  const cards = Array.from(grid.querySelectorAll(".card"));
  const out = $("out");
  const statusEl = $("status");
  const spinsEl = $("spins");
  const uShort = $("uShort");
  const btnStart = $("btnStart");
  const btnRefresh = $("btnRefresh");
  const btnBack = $("btnBack");

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = cls ? cls : "";
  }
  function log(obj) {
    out.textContent = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
  }

  function pickUserIdFromStorage() {
    return (
      localStorage.getItem("sb_user_id_v1") ||
      localStorage.getItem("currentUserId") ||
      ""
    );
  }

  function sbHeaders() {
    const SB = window.SB_CONFIG;
    if (!SB || !SB.headers) return {};
    return SB.headers();
  }

  async function getProfile() {
    try {
      if (window.SBUser && typeof window.SBUser.getCurrentProfile === "function") {
        return await window.SBUser.getCurrentProfile();
      }
    } catch (e) {}
    const id = pickUserIdFromStorage();
    return id ? { id } : null;
  }

  async function fetchAvailableSpins(userId) {
    const SB = window.SB_CONFIG;
    const url =
      SB.url +
      "/rest/v1/lucky_draw_entries" +
      "?select=id,inviter_id,invited_user_id,status,created_at,source_table,source_key" +
      "&inviter_id=eq." +
      encodeURIComponent(userId) +
      "&status=eq.available" +
      "&order=created_at.desc";

    const res = await fetch(url, { headers: sbHeaders() });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error("entries_fetch_failed " + res.status + " " + txt);
    }
    const rows = await res.json();
    return rows || [];
  }

  async function spinRPC(userId) {
    const SB = window.SB_CONFIG;
    const res = await fetch(SB.url + "/rest/v1/rpc/do_lucky_draw_spin_v3", {
      method: "POST",
      headers: { ...sbHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ p_user: userId }),
    });
    const txt = await res.text().catch(() => "");
    if (!res.ok) throw new Error("rpc_failed " + res.status + " " + txt);
    try {
      return JSON.parse(txt);
    } catch {
      return txt;
    }
  }

  function animateSpin(finalIndex) {
    // 5 loops then stop on finalIndex
    const loops = 5;
    const total = loops * cards.length + finalIndex;
    let i = 0;

    return new Promise((resolve) => {
      const step = () => {
        cards.forEach((c) => c.classList.remove("active"));
        const idx = i % cards.length;
        cards[idx].classList.add("active");

        i += 1;
        // slow down near the end
        const remaining = total - i;
        const delay = remaining < 18 ? 120 + (18 - remaining) * 18 : 60;

        if (i <= total) {
          setTimeout(step, delay);
        } else {
          resolve();
        }
      };
      step();
    });
  }

  function prizeCodeToIndex(code) {
    const map = [
      "p_95_usdt",
      "p_5_usdt",
      "p_iphone17",
      "p_9_usdt",
      "p_audia6",
      "p_15_usdt",
      "p_ipad",
      "p_25_usdt",
      "p_55_usdt",
    ];
    const idx = map.indexOf(code);
    return idx >= 0 ? idx : 0;
  }

  async function refresh() {
    if (!window.SB_CONFIG) {
      setStatus("SB_CONFIG missing", "err");
      log("Missing sb-config.js (SB_CONFIG). Put this file in the same folder.");
      return;
    }

    setStatus("Loading…", "");
    btnStart.disabled = true;
    btnStart.classList.remove("enabled");

    const profile = await getProfile();
    const userId = profile && profile.id ? profile.id : "";
    uShort.textContent = userId ? userId.slice(0, 8) + "…" : "-";

    if (!userId) {
      setStatus("No user", "err");
      log({
        error: "No user detected",
        localStorage: {
          sb_user_id_v1: localStorage.getItem("sb_user_id_v1"),
          currentUserId: localStorage.getItem("currentUserId"),
          currentPhone: localStorage.getItem("currentPhone"),
        },
        tip: "Login first (auth.js) then open this page.",
      });
      return;
    }

    const entries = await fetchAvailableSpins(userId);
    spinsEl.textContent = String(entries.length);

    log({
      user: userId,
      available_entries: entries.length,
      latest_entries: entries.slice(0, 5),
    });

    if (entries.length > 0) {
      btnStart.disabled = false;
      btnStart.classList.add("enabled");
      setStatus("Ready", "ok");
    } else {
      setStatus("No spins", "");
    }
  }

  async function onStart() {
    try {
      btnStart.disabled = true;
      btnStart.classList.remove("enabled");
      setStatus("Spinning…", "");

      const profile = await getProfile();
      const userId = profile && profile.id ? profile.id : "";
      if (!userId) throw new Error("no_user");

      const result = await spinRPC(userId);
      // Expected result from RPC: { ok:true, prize_code:'p_...', title:'...', prize_type:'usdt|physical', amount:... }
      log({ rpc_result: result });

      const prizeCode =
        (result && (result.prize_code || result.prizeCode || result.code)) || "p_5_usdt";
      const finalIndex = prizeCodeToIndex(prizeCode);

      await animateSpin(finalIndex);

      setStatus("Done", "ok");
      alert("Winner: " + prizeCode);
      await refresh();
    } catch (e) {
      setStatus("Error", "err");
      log({ error: String(e && e.message ? e.message : e) });
      alert("Spin failed. See debug output.");
      await refresh();
    }
  }

  btnRefresh.addEventListener("click", () => refresh().catch((e) => {
    setStatus("Error", "err");
    log({ error: String(e && e.message ? e.message : e) });
  }));

  btnStart.addEventListener("click", () => onStart());

  btnBack.addEventListener("click", () => {
    // Go back if possible
    if (history.length > 1) history.back();
  });

  // init
  refresh().catch((e) => {
    setStatus("Error", "err");
    log({ error: String(e && e.message ? e.message : e) });
  });
})();
