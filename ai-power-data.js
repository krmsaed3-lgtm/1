;(function () {
  "use strict";

  var SB = window.SB_CONFIG;
  if (!SB) {
    console.error("SB_CONFIG missing (sb-config.js not loaded)");
    return;
  }

  function rpc(name, body) {
    return fetch(SB.url + "/rest/v1/rpc/" + name, {
      method: "POST",
      headers: SB.headers(),
      body: JSON.stringify(body || {})
    }).then(async function (res) {
      var txt = await res.text();
      if (!res.ok) {
        // Supabase often returns plain text or JSON error
        try {
          var j = JSON.parse(txt);
          throw new Error(j.message || j.error || txt || ("RPC " + name + " failed"));
        } catch (e) {
          throw new Error(txt || ("RPC " + name + " failed"));
        }
      }
      try { return JSON.parse(txt); } catch (e) { return txt; }
    });
  }

  function getUserId() {
    if (!window.ExaAuth || typeof window.ExaAuth.ensureSupabaseUserId !== "function") {
      return Promise.resolve("");
    }
    return window.ExaAuth.ensureSupabaseUserId().then(function (uid) { return uid || ""; });
  }

  function levelRank(lvl) {
  var s = String(lvl || "").trim().toUpperCase();
  var m = /^V(\d+)$/.exec(s);
  if (m) return parseInt(m[1], 10) || 0;
  return 0;
}


  function fetchUserState(userId) {
    var url = SB.url + "/rest/v1/user_state?select=current_level,is_locked,locked_reason,is_funded,is_activated&user_id=eq." +
      encodeURIComponent(userId) + "&limit=1";
    return fetch(url, { method: "GET", headers: SB.headers() }).then(function (res) {
      if (!res.ok) return [];
      return res.json();
    }).then(function (rows) {
      return (Array.isArray(rows) && rows[0]) ? rows[0] : null;
    });
  }

  function setText(el, text) {
    if (!el) return;
    el.textContent = text;
  }

  function formatUSDT(x) {
    var n = Number(x || 0);
    if (!isFinite(n)) n = 0;
    return n.toFixed(2) + " USDT";
  }

  // --- UI handles ---
  var topCard = document.querySelector(".card");
  var topAmountEl = topCard ? topCard.querySelector(".card-value") : null;

  var cardRowValues = document.querySelectorAll(".card-row .card-value");
  var timesCardValueEl = cardRowValues && cardRowValues[0] ? cardRowValues[0] : null;
  var runRoomValueEl  = cardRowValues && cardRowValues[1] ? cardRowValues[1] : null;

  var levelTagEl = document.querySelector(".experience-tag");

  var modal = document.getElementById("runModal");
  var countdownEl = document.getElementById("runModalCountdown");
  var progressEl = document.getElementById("runModalProgress");

  var confirmModal = document.getElementById("runConfirmModal");
  var confirmOkBtn = document.getElementById("confirmOkBtn");
  var confirmCancelBtn = document.getElementById("confirmCancelBtn");

  // GPU cards
  var cards = Array.from(document.querySelectorAll(".gpu-card"));
  function getCardLevel(cardEl) {
    // second column -> first row -> value contains V1/V2/...
    var el = cardEl.querySelector(".gpu-col:nth-child(2) .gpu-row:nth-child(1) .gpu-value");
    return (el ? el.textContent : "").trim() || "V0";
  }
  function getLockTextEl(cardEl) {
    return cardEl.querySelector(".gpu-lock span:last-child");
  }
  function getTodayProfitEl(cardEl) {
    return cardEl.querySelector(".gpu-value-accent");
  }
  function getRunTimesEl(cardEl) {
    // first column -> 3rd row -> value is 0/2 ...
    return cardEl.querySelector(".gpu-col:nth-child(1) .gpu-row:nth-child(3) .gpu-value");
  }
  function getRunBtn(cardEl) {
    return cardEl.querySelector(".gpu-button-wrap .btn-gradient");
  }


function applyCardVisibility() {
  // Hide only levels below current level; keep current and higher levels visible
  cards.forEach(function (cardEl) {
    var lvl = getCardLevel(cardEl);
    var rnk = levelRank(lvl);
    cardEl.style.display = (rnk < currentRank) ? "none" : "";
  });
}

  function showModal(seconds) {
    if (!modal || !countdownEl) return function(){};
    modal.style.display = "flex";
    countdownEl.textContent = seconds + "s";
    if (progressEl) progressEl.style.width = "0%";
    return function hide() { modal.style.display = "none"; };
  }

function openConfirmModal() {
  return new Promise(function (resolve) {
    if (!confirmModal || !confirmOkBtn || !confirmCancelBtn) return resolve(true);

    function cleanup() {
      confirmOkBtn.removeEventListener("click", onOk);
      confirmCancelBtn.removeEventListener("click", onCancel);
      confirmModal.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKey);
    }
    function close(result) {
      try { confirmModal.style.display = "none"; } catch(e){}
      cleanup();
      resolve(result);
    }
    function onOk() { close(true); }
    function onCancel() { close(false); }
    function onBackdrop(e) {
      if (e && e.target === confirmModal) close(false);
    }
    function onKey(e) {
      if (!e) return;
      if (e.key === "Escape") close(false);
    }

    // reset
    confirmModal.style.display = "flex";
    confirmOkBtn.addEventListener("click", onOk);
    confirmCancelBtn.addEventListener("click", onCancel);
    confirmModal.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey);
  });
}


  function runWithCountdown(seconds, onFinish) {
  seconds = seconds || 8;
  var total = seconds;
  var hide = showModal(seconds);
  var remaining = seconds;

  return new Promise(function (resolve, reject) {
    // initial progress (0%)
    if (progressEl) progressEl.style.width = "0%";

    var timer = setInterval(function () {
      remaining -= 1;

      var done = Math.min(1, Math.max(0, (total - Math.max(remaining, 0)) / total));
      if (progressEl) progressEl.style.width = Math.round(done * 100) + "%";
      if (countdownEl) countdownEl.textContent = (remaining >= 0 ? remaining : 0) + "s";

      if (remaining < 0) {
        clearInterval(timer);
        if (progressEl) progressEl.style.width = "100%";
        try { hide(); } catch(e){}
        Promise.resolve().then(onFinish).then(resolve).catch(reject);
      }
    }, 1000);
  });
}

  function refreshTopSummary(userId) {
    return rpc("get_assets_summary", { p_user: userId }).then(function (rows) {
      var s = Array.isArray(rows) ? rows[0] : rows;
      if (!s) return;
      // Top card shows total assets
      setText(topAmountEl, formatUSDT(s.usdt_balance));
      // Remaining times is controlled by per-level logic (e.g., V1 daily cap)
      setText(runRoomValueEl, (currentLevel || "V0"));
      // Update today's profit on unlocked cards (use today's personal income)
      cards.forEach(function (c) {
        var profEl = getTodayProfitEl(c);
        if (profEl) profEl.textContent = formatUSDT(s.today_personal);
      });
    }).catch(function () {});
  }


// ---------------------------
// V1 daily cap (Canada time)
// - V1 allows 2 runs per Canada day (America/Toronto)
// - UI disables Run button after cap is reached to prevent useless clicks
// Notes:
// - Earning percentage (e.g., 1.75%) remains enforced by Supabase RPC perform_ipower_action
// ---------------------------
var TZ_CANADA = "America/Toronto";
var MAX_RUNS = { V1: 2, V2: 3 };

function getOffsetMinutes(date, timeZone) {
  // Returns offset minutes for `timeZone` at `date` (positive east of UTC).
  // Uses Intl timeZoneName: 'shortOffset' when available (e.g., 'GMT-5').
  try {
    var dtf = new Intl.DateTimeFormat("en-US", { timeZone: timeZone, timeZoneName: "shortOffset" });
    var parts = dtf.formatToParts(date);
    var tzPart = parts.find(function(p){ return p.type === "timeZoneName"; });
    var s = tzPart ? tzPart.value : "";
    // Possible values: "GMT-5", "GMT-05:00", "UTC+03:00"
    var m = s.match(/([+-])(\d{1,2})(?::?(\d{2}))?/);
    if (m) {
      var sign = (m[1] === "-") ? -1 : 1;
      var hh = parseInt(m[2], 10) || 0;
      var mm = parseInt(m[3] || "0", 10) || 0;
      return sign * (hh * 60 + mm);
    }
  } catch (e) {}
  // Fallback: approximate using local offset (less correct for Canada if browser tz differs)
  return -date.getTimezoneOffset();
}

function getNowPartsInTZ(timeZone) {
  var dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false
  });
  var parts = dtf.formatToParts(new Date());
  function p(type){ var x = parts.find(function(i){ return i.type === type; }); return x ? x.value : ""; }
  return {
    year: parseInt(p("year"), 10),
    month: parseInt(p("month"), 10),
    day: parseInt(p("day"), 10)
  };
}

function getCanadaDayRangeUTC() {
  // Compute [startUTC, endUTC) for current Canada day (America/Toronto)
  var d = getNowPartsInTZ(TZ_CANADA);
  var approx = new Date(Date.UTC(d.year, d.month - 1, d.day, 0, 0, 0));
  var offMin = getOffsetMinutes(approx, TZ_CANADA);
  // Local midnight (Canada) -> UTC instant = local - offset
  var startMs = Date.UTC(d.year, d.month - 1, d.day, 0, 0, 0) - offMin * 60 * 1000;
  var endMs = startMs + 24 * 60 * 60 * 1000;
  return { start: new Date(startMs), end: new Date(endMs) };
}

function iso(d) { return d.toISOString(); }

function fetchRunsToday(userId) {
  // Count ipower_actions for this user in current Canada day window
  var r = getCanadaDayRangeUTC();
  var url = SB.url + "/rest/v1/ipower_actions?select=id,created_at"
    + "&user_id=eq." + encodeURIComponent(userId)
    + "&created_at=gte." + encodeURIComponent(iso(r.start))
    + "&created_at=lt." + encodeURIComponent(iso(r.end))
    + "&order=created_at.desc&limit=20";
  return fetch(url, { method: "GET", headers: SB.headers() })
    .then(function(res){ if (!res.ok) return []; return res.json(); })
    .then(function(rows){ return Array.isArray(rows) ? rows.length : 0; })
    .catch(function(){ return 0; });
}

function setBtnState(btn, enabled, label) {
  if (!btn) return;
  btn.disabled = !enabled;
  if (label) btn.textContent = label;
  // inline only (no CSS changes)
  btn.style.opacity = enabled ? "" : "0.55";
  btn.style.cursor = enabled ? "" : "not-allowed";
}

async function refreshDailyUI(userId) {
  // Updates the top "Number of times..." card and the active level card (V1/V2) using Canada day window
  if (!userId) return;

  if (locked || currentRank < 1 || currentRank > 2) {
    if (timesCardValueEl) timesCardValueEl.textContent = "0 Times";
    cards.forEach(function (cardEl) {
      var btn = getRunBtn(cardEl);
      if (btn) setBtnState(btn, false, "Run");
      var runTimesEl = getRunTimesEl(cardEl);
      if (runTimesEl) runTimesEl.textContent = "—";
    });
    return;
  }

  var runs = await fetchRunsToday(userId);
  var max = (currentRank === 1) ? MAX_RUNS.V1 : MAX_RUNS.V2;
  var remaining = Math.max(0, max - runs);

  if (timesCardValueEl) timesCardValueEl.textContent = remaining + " Times";

  cards.forEach(function (cardEl) {
    var lvl = String(getCardLevel(cardEl) || "").toUpperCase();
    var reqRank = levelRank(lvl);

    var btn = getRunBtn(cardEl);
    var runTimesEl = getRunTimesEl(cardEl);

    if (reqRank !== currentRank) {
      if (runTimesEl) runTimesEl.textContent = "—";
      if (btn) btn.dataset.remainingRuns = "0";
      return;
    }

    if (runTimesEl) runTimesEl.textContent = runs + "/" + max;
    if (btn) btn.dataset.remainingRuns = String(remaining);

    if (remaining <= 0) {
      setBtnState(btn, false, "Come back tomorrow");
    } else {
      setBtnState(btn, true, "Run");
    }
  });
}


  var currentLevel = "V0";
  var currentRank = 0;
  var locked = false;
  var lockReason = "";

  function bindCards(userId) {
    cards.forEach(function (cardEl) {
      var lvl = getCardLevel(cardEl);
      var reqRank = levelRank(lvl);

      var lockTextEl = getLockTextEl(cardEl);
      var btn = getRunBtn(cardEl);
      var runTimesEl = getRunTimesEl(cardEl);

      // Only V1–V2 are usable in your backend rules; keep others locked cosmetically.
      var isUsableLevel = reqRank >= 1 && reqRank <= 2;

      var unlocked = (!locked) && isUsableLevel && (currentRank >= reqRank);

      if (lockTextEl) lockTextEl.textContent = unlocked ? "Unlocked" : "Not unlocked";
      if (btn) btn.textContent = unlocked ? "Run" : "Run after unlocking";
      // Per-level run-times display (V1 uses live daily count)
      if (runTimesEl && String(lvl).toUpperCase() !== "V1") runTimesEl.textContent = "—";

      if (!btn) return;

      btn.addEventListener("click", function () {
        if (locked) {
          alert(lockReason || "Account is locked.");
          return;
        }
        if (!unlocked) {
          alert("This computing power package is locked. Please upgrade your member level to use it.");
          return;
        }

        // V1 daily cap guard (2 runs per Canada day)
        if (String(lvl).toUpperCase() === "V1") {
          var rem = Number((btn && btn.dataset && btn.dataset.remainingRuns) ? btn.dataset.remainingRuns : 0);
          if (!(rem > 0)) {
            alert("Today's runs are completed. Come back tomorrow.");
            return;
          }
        }


openConfirmModal().then(function (ok) {
  if (!ok) return;
  btn.disabled = true;
  return runWithCountdown(8, function () {
          return rpc("perform_ipower_action", { p_user: userId });
        }).then(function (rows) {
          var r = Array.isArray(rows) ? rows[0] : rows;
          // r has earning_amount & new_balance in your SQL
          var earned = r && (r.earning_amount ?? r.earning_amount === 0 ? r.earning_amount : null);
          var newBal = r && (r.new_balance ?? null);

          // Update UI quickly
          if (newBal != null) setText(topAmountEl, formatUSDT(newBal));
          if (earned != null) {
            var profEl = getTodayProfitEl(cardEl);
            if (profEl) profEl.textContent = formatUSDT(earned); // shows last run earning (safe)
            alert("Run completed. Profit +" + Number(earned).toFixed(2) + " USDT");
          } else {
            alert("Run completed.");
          }

          // Refresh totals (today/total/team) via summary
          return refreshTopSummary(userId).then(function(){ return refreshDailyUI(userId); });
        }).catch(function (err) {
          var msg = (err && err.message) ? err.message : String(err || "Run failed");
          // Make backend errors readable
          alert(msg);
        }).finally(function () {
          // Do NOT blindly re-enable the button here.
          // refreshDailyUI() already computed remaining runs and will disable the button
          // when the daily cap is reached. Re-enabling here was allowing extra clicks
          // (no earnings) after the cap.
          var lvlUp = String(lvl || "").toUpperCase();
          var rem = Number((btn && btn.dataset && btn.dataset.remainingRuns) ? btn.dataset.remainingRuns : 0);
          if (lvlUp === "V1" || lvlUp === "V2") {
            if (rem > 0) {
              setBtnState(btn, true, "Run");
            } else {
              setBtnState(btn, false, "Come back tomorrow");
            }
          } else {
            // default: allow normal behavior for other levels
            btn.disabled = false;
          }
        });
      });
      });
    });
  }

  // Init
  getUserId().then(function (userId) {
    if (!userId) {
      alert("Please login first.");
      window.location.href = "login.html";
      return;
    }

    return fetchUserState(userId).then(function (st) {
      currentLevel = (st && st.current_level) ? String(st.current_level).toUpperCase() : "V0";
      currentRank = levelRank(currentLevel);
      locked = !!(st && st.is_locked);
      lockReason = (st && st.locked_reason) ? String(st.locked_reason) : "";

      if (levelTagEl) levelTagEl.textContent = "Level:" + currentLevel;
      setText(runRoomValueEl, currentLevel);

      applyCardVisibility();
      bindCards(userId);
      return refreshTopSummary(userId).then(function(){ return refreshDailyUI(userId); });
    });
  }).catch(function (e) {
    console.error(e);
  });

})();
