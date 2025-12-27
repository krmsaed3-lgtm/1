;(function () {
  "use strict";

  if (!window.SB_CONFIG) {
    console.warn("lucky-draw_v3: SB_CONFIG missing");
    return;
  }
  const SB = window.SB_CONFIG;

  function headers() { return SB.headers(); }

  function getUserId() {
    const keys = ["sb_user_id_v1", "currentUserId"];
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (v && /^[0-9a-fA-F-]{36}$/.test(v)) return v;
    }
    return null;
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

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
  }

  function setStartEnabled(btn, enabled) {
    if (!btn) return;
    btn.classList.toggle("is-enabled", !!enabled);
    btn.classList.toggle("is-disabled", !enabled);
    btn.disabled = !enabled;
  }

  function isoDateRangeUTC() {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }

  async function getAvailableEntries(userId) {
    const r = isoDateRangeUTC();
    const url =
      SB.url +
      "/rest/v1/lucky_draw_entries?select=id&inviter_id=eq." +
      encodeURIComponent(userId) +
      "&status=eq.available" +
      "&created_at=gte." + encodeURIComponent(r.startISO) +
      "&created_at=lt." + encodeURIComponent(r.endISO);

    const res = await fetch(url, { headers: headers() });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error("entries_fetch_failed:" + res.status + ":" + txt);
    }
    const rows = await res.json();
    return Array.isArray(rows) ? rows.length : 0;
  }

  async function callSpinRPC(userId) {
    const url = SB.url + "/rest/v1/rpc/do_lucky_draw_spin_v3";
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

  function getCards() {
    return Array.from(document.querySelectorAll(".prize-card"));
  }

  function setActive(cardsArr, idx) {
    for (let i = 0; i < cardsArr.length; i++) {
      cardsArr[i].classList.toggle("is-active", i === idx);
    }
  }

  function findCardIndexByTitle(cardsArr, title) {
    if (!title) return -1;
    const t = String(title).trim().toLowerCase();
    for (let i = 0; i < cardsArr.length; i++) {
      const lbl = (cardsArr[i].getAttribute("data-label") || "").trim().toLowerCase();
      if (lbl === t) return i;
    }
    return -1;
  }

  function animateAndStop(cardsArr, stopIndex) {
    const n = cardsArr.length;
    const minSteps = n * 5 + stopIndex;
    return new Promise((resolve) => {
      let step = 0;
      function tick() {
        setActive(cardsArr, step % n);
        const remaining = minSteps - step;
        const delay = remaining > 25 ? 70 : Math.min(200, 70 + (25 - remaining) * 5);
        step++;
        if (step <= minSteps) setTimeout(tick, delay);
        else { setActive(cardsArr, stopIndex); resolve(); }
      }
      tick();
    });
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
      const cnt = await getAvailableEntries(userId);
      if (remainingEl) remainingEl.textContent = cnt + " times";
      setStartEnabled(btn, cnt > 0);
      return cnt;
    } catch (e) {
      console.warn(e);
      if (remainingEl) remainingEl.textContent = "0 times";
      setStartEnabled(btn, false);
      return 0;
    }
  }

  async function onStart() {
    const btn = document.getElementById("btnStart");
    const cardsArr = getCards();
    const userId = getUserId();

    if (!userId) {
      showModal("Error", "Not logged in.");
      return;
    }

    setStartEnabled(btn, false);

    let row;
    try {
      row = await callSpinRPC(userId);
    } catch (e) {
      console.warn(e);
      showModal("Error", "Spin failed. Please try again.");
      await refreshUI();
      return;
    }

    if (!row || row.ok !== true) {
      showModal("Info", "No spins available.");
      await refreshUI();
      return;
    }

    const pTitle = row.prize_title ? String(row.prize_title) : "";
    const pType = row.prize_type ? String(row.prize_type) : "usdt";
    const pAmt = Number(row.prize || 0);
    const remaining = Number(row.remaining_spins || 0);

    let stopIndex = findCardIndexByTitle(cardsArr, pTitle);
    if (stopIndex < 0 && Number.isFinite(pAmt) && pAmt > 0) {
      stopIndex = findCardIndexByTitle(cardsArr, Math.round(pAmt) + " USDT");
    }
    if (stopIndex < 0) stopIndex = Math.floor(Math.random() * Math.max(1, cardsArr.length));

    await animateAndStop(cardsArr, stopIndex);

    if (pType === "physical") {
      showModal("Congratulations", "You won " + (pTitle || "a physical prize") + ".");
    } else {
      showModal("Congratulations", "You won " + pAmt.toFixed(2) + " USDT.");
    }

    const remainingEl = document.getElementById("remainingTimes");
    if (remainingEl) remainingEl.textContent = remaining + " times";
    setStartEnabled(btn, remaining > 0);
  }

  function boot() {
    const btn = document.getElementById("btnStart");
    if (!btn) return;
    btn.addEventListener("click", onStart);
    refreshUI();
    window.addEventListener("focus", () => refreshUI());
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
