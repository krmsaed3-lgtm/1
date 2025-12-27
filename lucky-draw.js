;(function () {
  "use strict";

  function $(sel) { return document.querySelector(sel); }
  function $all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function toast(msg) {
    var t = document.createElement("div");
    t.textContent = String(msg || "");
    t.style.cssText =
      "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);" +
      "background:rgba(0,0,0,.75);color:#fff;padding:10px 14px;border-radius:12px;" +
      "font-size:12px;max-width:90%;z-index:99999;text-align:center;" +
      "border:1px solid rgba(255,255,255,.12);";
    document.body.appendChild(t);
    setTimeout(function () { try { t.remove(); } catch (e) {} }, 2600);
  }

  function showModal(title, body) {
    var overlay = document.createElement("div");
    overlay.className = "ld-modal-overlay";
    var modal = document.createElement("div");
    modal.className = "ld-modal";

    var h = document.createElement("h3");
    h.textContent = String(title || "");

    var p = document.createElement("p");
    p.textContent = String(body || "");

    var actions = document.createElement("div");
    actions.className = "ld-actions";

    var ok = document.createElement("button");
    ok.type = "button";
    ok.textContent = "OK";
    ok.onclick = function () { try { overlay.remove(); } catch (e) {} };

    actions.appendChild(ok);
    modal.appendChild(h);
    modal.appendChild(p);
    modal.appendChild(actions);
    overlay.appendChild(modal);

    overlay.addEventListener("click", function (e) { if (e.target === overlay) ok.click(); });
    document.body.appendChild(overlay);
  }

  function getUserId() {
    try {
      var v = (localStorage.getItem("sb_user_id_v1") || localStorage.getItem("currentUserId") || "").trim();
      return /^[0-9a-fA-F-]{36}$/.test(v) ? v : "";
    } catch (e) { return ""; }
  }

  function getSB() { return window.SB_CONFIG || null; }

  function headers() {
    var SB = getSB();
    if (SB && typeof SB.headers === "function") return SB.headers();
    var h = { "Content-Type": "application/json", "Accept": "application/json" };
    if (SB && SB.anonKey) h.apikey = SB.anonKey;
    return h;
  }

  async function rpc(name, payload) {
    var SB = getSB();
    if (!SB || !SB.url) throw new Error("SB_CONFIG missing");
    var url = SB.url.replace(/\/$/, "") + "/rest/v1/rpc/" + encodeURIComponent(name);
    var res = await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify(payload || {}) });
    var text = await res.text().catch(function(){ return ""; });
    var data;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    if (!res.ok) {
      var msg = (data && (data.message || data.error || data.details)) ? (data.message || data.error || data.details) : ("RPC " + name + " failed");
      var err = new Error(msg);
      err.status = res.status;
      err.payload = data;
      throw err;
    }
    return data;
  }

  async function getConfig() {
    var SB = getSB();
    if (!SB || !SB.url) throw new Error("SB_CONFIG missing");
    var url = SB.url.replace(/\/$/, "") + "/rest/v1/lucky_draw_config?select=is_active&id=eq.1&limit=1";
    var res = await fetch(url, { method: "GET", headers: headers() });
    if (!res.ok) return null;
    var rows = await res.json().catch(function(){ return []; });
    return (rows && rows[0]) ? rows[0] : null;
  }

  function parseCountFromContentRange(cr) {
    if (!cr) return null;
    var m = String(cr).match(/\/(\d+)\s*$/);
    if (!m) return null;
    return Number(m[1]);
  }

  async function getRemainingSpins(uid) {
    var SB = getSB();
    if (!SB || !SB.url) throw new Error("SB_CONFIG missing");
    var url = SB.url.replace(/\/$/, "") + "/rest/v1/lucky_draw_spins?select=id&inviter_id=eq." +
      encodeURIComponent(uid) + "&status=eq.available&limit=1";
    var res = await fetch(url, {
      method: "GET",
      headers: (function () {
        var h = headers();
        h.Prefer = "count=exact";
        return h;
      })()
    });
    if (!res.ok) return 0;
    var cr = res.headers.get("content-range") || res.headers.get("Content-Range");
    var c = parseCountFromContentRange(cr);
    if (c !== null && isFinite(c)) return c;
    var rows = await res.json().catch(function(){ return []; });
    return Array.isArray(rows) ? rows.length : 0;
  }

  function setRemaining(n) {
    var el = $("#remainingTimes");
    if (!el) return;
    el.textContent = String(Number(n || 0)) + " times";
  }

  function setStartEnabled(enabled) {
    var btn = $("#btnStart");
    if (!btn) return;
    btn.classList.toggle("is-disabled", !enabled);
    btn.disabled = !enabled;
    btn.style.color = enabled ? "#ffffff" : "#555a68";
  }

  function setActive(cards, idx) {
    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.toggle("is-active", i === idx);
    }
  }

  function findStopIndex(cards, prizeNum) {
    if (!(isFinite(prizeNum))) return -1;
    var target = String(Math.round(prizeNum));
    for (var i = 0; i < cards.length; i++) {
      if (String(cards[i].getAttribute("data-prize") || "") === target) return i;
    }
    return -1;
  }

  function animateAndStop(cards, stopIndex) {
    var n = cards.length;
    var steps = n * 5 + stopIndex; // 5 full loops then stop
    return new Promise(function (resolve) {
      var step = 0;
      function tick() {
        var idx = step % n;
        setActive(cards, idx);
        var remaining = steps - step;
        var delay = remaining > 25 ? 70 : Math.min(180, 70 + (25 - remaining) * 4);
        step++;
        if (step <= steps) setTimeout(tick, delay);
        else { setActive(cards, stopIndex); resolve(); }
      }
      tick();
    });
  }

  async function refreshStatus() {
    var uid = getUserId();
    if (!uid) {
      setRemaining(0);
      setStartEnabled(false);
      return;
    }

    var cfg = await getConfig().catch(function(){ return null; });
    if (cfg && cfg.is_active === false) {
      setRemaining(0);
      setStartEnabled(false);
      return;
    }

    var remaining = await getRemainingSpins(uid).catch(function(){ return 0; });
    setRemaining(remaining);
    setStartEnabled(remaining > 0);
  }

  async function doSpin() {
    var uid = getUserId();
    if (!uid) { toast("Please login first."); return; }

    var btn = $("#btnStart");
    setStartEnabled(false);

    try {
      // IMPORTANT: use v2 (safe)
      var result = await rpc("do_lucky_draw_spin_v2", { p_user: uid });
      var row = Array.isArray(result) ? (result[0] || null) : result;

      if (!row || row.ok !== true) {
        if (row && row.tier === "inactive") toast("Lucky draw is inactive.");
        else if (row && row.tier === "no_spins") toast("No spins available.");
        else toast("Spin failed.");
        await refreshStatus();
        return;
      }

      var cards = $all(".prize-card");
      var prize = Number(row.prize || 0);
      var stopIndex = findStopIndex(cards, prize);
      if (stopIndex < 0) stopIndex = Math.floor(Math.random() * Math.max(1, cards.length));

      await animateAndStop(cards, stopIndex);

      // USDT only (as requested)
      showModal("Congratulations", "You won " + prize.toFixed(2) + " USDT");

      setRemaining(row.remaining_spins || 0);
      setStartEnabled(Number(row.remaining_spins || 0) > 0);

      try {
        if (window.DemoWallet && typeof window.DemoWallet.getAssetsSummary === "function") {
          window.DemoWallet.getAssetsSummary(uid);
        }
      } catch (e) {}

    } catch (e) {
      console.error(e);
      toast(e && e.message ? e.message : "Spin error");
      await refreshStatus();
    }
  }

  function wire() {
    var btn = $("#btnStart");
    if (btn) {
      btn.addEventListener("click", function () { doSpin(); });
    }

    var back = document.querySelector(".back-btn");
    if (back) back.addEventListener("click", function(){ history.back(); });

    refreshStatus();
    window.addEventListener("focus", function () { refreshStatus(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();