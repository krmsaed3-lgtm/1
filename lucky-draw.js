;(function () {
  "use strict";
  if (!window.SB_CONFIG) {
    console.warn("lucky-draw: SB_CONFIG missing");
    return;
  }
  const SB = window.SB_CONFIG;

  function headers() { return SB.headers(); }

  function toast(msg, ms) {
    const el = document.createElement("div");
    el.className = "ld-toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), ms || 2500);
  }

  function showModal(title, body) {
    const overlay = document.createElement("div");
    overlay.className = "ld-modal-overlay";
    const modal = document.createElement("div");
    modal.className = "ld-modal";

    const h = document.createElement("h3");
    h.textContent = title;

    const p = document.createElement("p");
    p.textContent = body;

    const actions = document.createElement("div");
    actions.className = "ld-actions";

    const ok = document.createElement("button");
    ok.type = "button";
    ok.textContent = "OK";
    ok.onclick = () => overlay.remove();

    actions.appendChild(ok);
    modal.appendChild(h);
    modal.appendChild(p);
    modal.appendChild(actions);
    overlay.appendChild(modal);

    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  function getUserId() {
    const keys = ["sb_user_id_v1", "currentUserId"];
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (v && /^[0-9a-fA-F-]{36}$/.test(v)) return v;
    }
    return null;
  }

  async function getAvailableSpins(userId) {
    const url = SB.url + "/rest/v1/lucky_draw_spins?select=id&inviter_id=eq." +
      encodeURIComponent(userId) + "&status=eq.available";
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error("spins_fetch_failed:" + res.status + ":" + txt);
    }
    const rows = await res.json();
    return Array.isArray(rows) ? rows.length : 0;
  }

  async function callSpinRPC(userId) {
    const url = SB.url + "/rest/v1/rpc/do_lucky_draw_spin";
    const res = await fetch(url, {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ p_user: userId }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error("rpc_failed:" + res.status + ":" + txt);
    }
    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
  }

  function parsePrizeValue(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function findPrizeIndex(cards, prizeNumber) {
    for (let i = 0; i < cards.length; i++) {
      const dp = cards[i].getAttribute("data-prize");
      const n = Number(dp);
      if (Number.isFinite(n) && Math.abs(n - prizeNumber) < 1e-9) return i;
    }
    const targetInt = String(Math.round(prizeNumber));
    for (let i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute("data-prize") === targetInt) return i;
    }
    return -1;
  }

  function setActive(cards, idx) {
    for (let i = 0; i < cards.length; i++) {
      cards[i].classList.toggle("is-active", i === idx);
    }
  }

  function animateAndStop(cards, stopIndex) {
    const n = cards.length;
    const minSteps = n * 5 + stopIndex;
    return new Promise((resolve) => {
      let step = 0;
      function tick() {
        const idx = step % n;
        setActive(cards, idx);
        const remaining = minSteps - step;
        const delay = remaining > 25 ? 70 : Math.min(180, 70 + (25 - remaining) * 4);
        step++;
        if (step <= minSteps) setTimeout(tick, delay);
        else { setActive(cards, stopIndex); resolve(); }
      }
      tick();
    });
  }

  function setStartEnabled(btn, enabled) {
    if (!btn) return;
    btn.classList.toggle("is-disabled", !enabled);
    btn.disabled = !enabled;
  }

  async function refreshUI() {
    const userId = getUserId();
    const remainingEl = document.getElementById("remainingTimes");
    const btn = document.getElementById("btnStart");

    if (!userId) {
      if (remainingEl) remainingEl.textContent = "0 times";
      setStartEnabled(btn, false);
      return 0;
    }

    try {
      const cnt = await getAvailableSpins(userId);
      if (remainingEl) remainingEl.textContent = cnt + " times";
      setStartEnabled(btn, cnt > 0);
      return cnt;
    } catch (e) {
      console.warn(e);
      if (remainingEl) remainingEl.textContent = "0 times";
      setStartEnabled(btn, false);
      toast("Failed to load spins. Check console.", 3000);
      return 0;
    }
  }

  async function onStart() {
    const btn = document.getElementById("btnStart");
    const cards = Array.from(document.querySelectorAll(".prize-card"));
    const userId = getUserId();

    if (!userId) { toast("Not logged in", 2500); return; }

    setStartEnabled(btn, false);

    let row;
    try { row = await callSpinRPC(userId); }
    catch (e) { console.warn(e); toast("Spin failed. Check console.", 3000); await refreshUI(); return; }

    if (!row || row.ok !== true) {
      const t = row && row.tier ? String(row.tier) : "unknown";
      if (t === "inactive") toast("Event is inactive", 2500);
      else if (t === "no_spins") toast("No spins available", 2500);
      else toast("Spin not available", 2500);
      await refreshUI();
      return;
    }

    const prize = parsePrizeValue(row.prize);
    const remaining = Number(row.remaining_spins || 0);

    let stopIndex = -1;
    if (prize != null) stopIndex = findPrizeIndex(cards, prize);
    if (stopIndex < 0) stopIndex = Math.floor(Math.random() * Math.max(1, cards.length));

    await animateAndStop(cards, stopIndex);

    if (prize != null) showModal("Congratulations", "You won " + prize.toFixed(2) + " USDT");
    else showModal("Congratulations", "You won a prize.");

    const remainingEl = document.getElementById("remainingTimes");
    if (remainingEl) remainingEl.textContent = remaining + " times";

    setStartEnabled(btn, remaining > 0);
  }

  function boot() {
    const btn = document.getElementById("btnStart");
    if (!btn) return;
    setStartEnabled(btn, false);
    btn.addEventListener("click", onStart);
    refreshUI();
    window.addEventListener("focus", () => refreshUI());
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
