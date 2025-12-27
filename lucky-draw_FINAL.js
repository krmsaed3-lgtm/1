;(function () {
  "use strict";

  // Requires sb-config.js which defines window.SB_CONFIG = { url, anonKey, headers() }
  if (!window.SB_CONFIG) {
    console.warn("lucky-draw: SB_CONFIG missing");
    return;
  }
  const SB = window.SB_CONFIG;

  function sbHeaders() {
    // SB.headers() should already include apikey + Authorization
    return SB.headers();
  }

  function getUserId() {
    // Matches your auth flow keys
    const keys = ["sb_user_id_v1", "currentUserId"];
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (v && /^[0-9a-fA-F-]{36}$/.test(v)) return v;
    }
    return null;
  }

  function setStartEnabled(btn, enabled) {
    if (!btn) return;
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? "1" : "0.45";
    btn.style.pointerEvents = enabled ? "auto" : "none";
    btn.style.cursor = enabled ? "pointer" : "not-allowed";
  }

  function utcDayRangeISO() {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }

  async function getAvailableSpinsToday(inviterId) {
    const r = utcDayRangeISO();
    const url =
      SB.url +
      "/rest/v1/lucky_draw_entries?select=id&inviter_id=eq." +
      encodeURIComponent(inviterId) +
      "&status=eq.available" +
      "&created_at=gte." + encodeURIComponent(r.startISO) +
      "&created_at=lt." + encodeURIComponent(r.endISO);

    const res = await fetch(url, { headers: sbHeaders() });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error("entries_fetch_failed:" + res.status + ":" + txt);
    }
    const rows = await res.json();
    return Array.isArray(rows) ? rows.length : 0;
  }

  async function spinRPC(inviterId) {
    const url = SB.url + "/rest/v1/rpc/do_lucky_draw_spin_v3";
    const res = await fetch(url, {
      method: "POST",
      headers: { ...sbHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ p_user: inviterId }),
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

  function getCardLabel(card) {
    const el = card.querySelector(".prize-label");
    return el ? el.textContent.trim() : "";
  }

  function findCardIndexByTitle(cards, prizeTitle) {
    const t = (prizeTitle || "").trim().toLowerCase();
    if (!t) return -1;
    for (let i = 0; i < cards.length; i++) {
      const lbl = getCardLabel(cards[i]).trim().toLowerCase();
      if (lbl === t) return i;
    }
    return -1;
  }

  function setActive(cards, idx) {
    for (let i = 0; i < cards.length; i++) {
      cards[i].classList.toggle("is-active", i === idx);
    }
  }

  // Inject minimal highlight style (no design change, only outline)
  function ensureStyles() {
    if (document.getElementById("ld-v3-style")) return;
    const st = document.createElement("style");
    st.id = "ld-v3-style";
    st.textContent = `
      .prize-card.is-active{
        outline:2px solid rgba(29,224,162,0.95);
        box-shadow:0 0 0 3px rgba(29,224,162,0.25), 0 10px 20px rgba(0,0,0,0.45);
        transform: translateY(-2px);
      }
      .ld-modal-overlay{
        position:fixed; inset:0; background:rgba(0,0,0,0.65);
        display:flex; align-items:center; justify-content:center;
        z-index:99998; padding:18px;
      }
      .ld-modal{
        width:92%; max-width:380px; border-radius:16px;
        background:#0b1220; border:1px solid rgba(255,255,255,0.12);
        padding:16px; color:#fff;
        box-shadow:0 14px 34px rgba(0,0,0,0.55);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
      }
      .ld-modal h3{font-size:15px; margin:0 0 8px 0; font-weight:600;}
      .ld-modal p{font-size:13px; margin:0; color:#cbd0dd; line-height:1.45;}
      .ld-modal .ld-actions{margin-top:14px; display:flex; justify-content:flex-end;}
      .ld-modal button{
        border-radius:999px; padding:8px 14px;
        border:1px solid rgba(255,255,255,0.18);
        background:rgba(255,255,255,0.10);
        color:#fff; cursor:pointer; font-size:13px;
      }
    `;
    document.head.appendChild(st);
  }

  function showModal(title, message) {
    ensureStyles();
    const overlay = document.createElement("div");
    overlay.className = "ld-modal-overlay";
    const modal = document.createElement("div");
    modal.className = "ld-modal";
    const h = document.createElement("h3");
    h.textContent = title;
    const p = document.createElement("p");
    p.textContent = message;
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

  function animateAndStop(cards, stopIndex) {
    ensureStyles();
    const n = cards.length;
    const steps = n * 5 + stopIndex; // 5 full rounds
    return new Promise((resolve) => {
      let step = 0;
      function tick() {
        setActive(cards, step % n);
        const remaining = steps - step;
        const delay = remaining > 25 ? 70 : Math.min(220, 70 + (25 - remaining) * 6);
        step++;
        if (step <= steps) setTimeout(tick, delay);
        else { setActive(cards, stopIndex); resolve(); }
      }
      tick();
    });
  }

  async function refresh() {
    const btn = document.getElementById("btnStart");
    const remainingEl = document.getElementById("remainingTimes");
    const inviterId = getUserId();

    if (!inviterId) {
      if (remainingEl) remainingEl.textContent = "0 times";
      setStartEnabled(btn, false);
      return 0;
    }

    try {
      const cnt = await getAvailableSpinsToday(inviterId);
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
    const inviterId = getUserId();
    const cards = getCards();

    if (!inviterId) {
      showModal("Error", "Not logged in.");
      return;
    }

    setStartEnabled(btn, false);

    let row;
    try {
      row = await spinRPC(inviterId);
    } catch (e) {
      console.warn(e);
      showModal("Error", "Spin failed. Please try again.");
      await refresh();
      return;
    }

    if (!row || row.ok !== true) {
      showModal("Info", "No spins available.");
      await refresh();
      return;
    }

    const prizeTitle = row.prize_title ? String(row.prize_title) : "";
    const prizeType = row.prize_type ? String(row.prize_type) : "usdt";
    const prizeAmt = Number(row.prize || 0);
    const remaining = Number(row.remaining_spins || 0);

    let stopIndex = findCardIndexByTitle(cards, prizeTitle);
    if (stopIndex < 0 && Number.isFinite(prizeAmt) && prizeAmt > 0) {
      stopIndex = findCardIndexByTitle(cards, Math.round(prizeAmt) + " USDT");
    }
    if (stopIndex < 0) stopIndex = Math.floor(Math.random() * Math.max(1, cards.length));

    await animateAndStop(cards, stopIndex);

    if (prizeType === "physical") {
      showModal("Congratulations", "You won " + (prizeTitle || "a prize") + ".");
    } else {
      showModal("Congratulations", "You won " + prizeAmt.toFixed(2) + " USDT.");
    }

    const remainingEl = document.getElementById("remainingTimes");
    if (remainingEl) remainingEl.textContent = remaining + " times";
    setStartEnabled(btn, remaining > 0);
  }

  function boot() {
    const btn = document.getElementById("btnStart");
    if (!btn) return;

    // Some templates used <div id="btnStart">; click still works
    btn.addEventListener("click", onStart);

    refresh();
    window.addEventListener("focus", refresh);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
