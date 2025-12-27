;(function () {
  "use strict";

  if (!window.SB_CONFIG) {
    console.warn("lucky-draw: SB_CONFIG missing");
    return;
  }
  const SB = window.SB_CONFIG;

  function sbHeaders() {
    return SB.headers ? SB.headers() : {};
  }

  function getUserId() {
    const keys = ["sb_user_id_v1", "currentUserId"];
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (v && /^[0-9a-fA-F-]{36}$/.test(v)) return v;
    }
    return null;
  }

  function elStart() {
    // Your page uses <div class="start-text">Start</div>
    return document.querySelector(".start-text");
  }
  function elRemainingSpan() {
    // Remaining <span>0 times</span>
    return document.querySelector(".remaining span");
  }
  function getCards() {
    return Array.from(document.querySelectorAll(".prize-card"));
  }
  function getCardLabel(card) {
    const el = card.querySelector(".prize-label");
    return el ? el.textContent.trim() : "";
  }

  function ensureStyles() {
    if (document.getElementById("ld-run-style")) return;
    const st = document.createElement("style");
    st.id = "ld-run-style";
    st.textContent = `
      .prize-card.is-active{
        outline:2px solid rgba(29,224,162,0.95);
        box-shadow:0 0 0 3px rgba(29,224,162,0.22), 0 10px 20px rgba(0,0,0,0.45);
        transform: translateY(-2px);
      }
      .start-text.is-disabled{opacity:.45; pointer-events:none; cursor:not-allowed;}
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
      .ld-modal p{font-size:13px; margin:0; color:#cbd0dd; line-height:1.45; white-space:pre-wrap;}
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

  async function fetchJSON(url, options) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch {}
    return { res, text, json };
  }

  async function getAvailableSpins(inviterId) {
    const url =
      SB.url +
      "/rest/v1/lucky_draw_entries?select=id&inviter_id=eq." +
      encodeURIComponent(inviterId) +
      "&status=eq.available";

    const { res, text, json } = await fetchJSON(url, { headers: sbHeaders() });
    if (!res.ok) throw new Error("entries_fetch_failed:" + res.status + ":" + text);
    return Array.isArray(json) ? json.length : 0;
  }

  async function spinRPC(inviterId) {
    const attempts = [
      { fn: "do_lucky_draw_spin_v3", body: { p_user: inviterId } },
      { fn: "do_lucky_draw_spin_v3", body: { user_id: inviterId } },
      { fn: "do_lucky_draw_spin", body: { p_user: inviterId } },
      { fn: "do_lucky_draw_spin", body: { user_id: inviterId } },
    ];

    let last = null;
    for (const a of attempts) {
      const url = SB.url + "/rest/v1/rpc/" + a.fn;
      const { res, text, json } = await fetchJSON(url, {
        method: "POST",
        headers: { ...sbHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(a.body),
      });

      if (res.ok) {
        const data = Array.isArray(json) ? json[0] : json;
        return data;
      }
      last = { fn: a.fn, status: res.status, text: text || "" };

      if (res.status === 404 || /Could not find the function|does not exist/i.test(text)) continue;
      break;
    }
    throw new Error("rpc_failed:" + (last ? (last.fn + " -> " + last.status + ": " + last.text) : "unknown"));
  }

  function setActive(cards, idx) {
    for (let i = 0; i < cards.length; i++) {
      cards[i].classList.toggle("is-active", i === idx);
    }
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

  function animateAndStop(cards, stopIndex) {
    ensureStyles();
    const n = cards.length || 1;
    const steps = n * 5 + stopIndex;
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

  function setStartEnabled(enabled) {
    const s = elStart();
    if (!s) return;
    s.classList.toggle("is-disabled", !enabled);
  }

  async function refresh() {
    const span = elRemainingSpan();
    const inviterId = getUserId();
    if (!inviterId) {
      if (span) span.textContent = "0 times";
      setStartEnabled(false);
      return 0;
    }

    try {
      const cnt = await getAvailableSpins(inviterId);
      if (span) span.textContent = cnt + " times";
      setStartEnabled(cnt > 0);
      return cnt;
    } catch (e) {
      console.warn(e);
      if (span) span.textContent = "0 times";
      setStartEnabled(false);
      return 0;
    }
  }

  async function onStart() {
    const inviterId = getUserId();
    if (!inviterId) {
      showModal("Error", "Not logged in.");
      return;
    }

    setStartEnabled(false);

    let row;
    try {
      row = await spinRPC(inviterId);
    } catch (e) {
      showModal("Error", String(e && e.message ? e.message : e));
      await refresh();
      return;
    }

    // Accept different return shapes
    const ok = row && (row.ok === true || row.success === true || row.prize_title || row.prize_type || row.prize || row.amount);
    if (!ok) {
      showModal("Info", "No spins available.");
      await refresh();
      return;
    }

    const cards = getCards();
    const prizeTitle = row.prize_title ? String(row.prize_title) : "";
    const prizeType = row.prize_type ? String(row.prize_type) : "usdt";
    const prizeAmt = Number(row.prize || row.amount || 0);
    const remaining = Number(row.remaining_spins || row.remaining || 0);

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

    // Update remaining on UI
    const span = elRemainingSpan();
    if (span && Number.isFinite(remaining)) span.textContent = remaining + " times";
    setStartEnabled(remaining > 0);
  }

  function boot() {
    const s = elStart();
    if (!s) {
      console.warn("lucky-draw: .start-text not found");
      return;
    }
    s.addEventListener("click", onStart);
    refresh();
    window.addEventListener("focus", refresh);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
