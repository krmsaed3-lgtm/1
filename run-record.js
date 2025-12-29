;(function () {
  "use strict";

  var SB = window.SB_CONFIG;
  if (!SB) {
    console.error("SB_CONFIG missing (sb-config.js not loaded)");
    return;
  }

  function getUserId() {
    if (!window.ExaAuth || typeof window.ExaAuth.ensureSupabaseUserId !== "function") {
      return Promise.resolve("");
    }
    return window.ExaAuth.ensureSupabaseUserId().then(function (uid) { return uid || ""; });
  }

  function setText(el, text) {
    if (!el) return;
    el.textContent = text;
  }

  // Canada day helpers (America/Toronto)
  var TZ_CANADA = "America/Toronto";

  function getOffsetMinutes(date, timeZone) {
    try {
      var dtf = new Intl.DateTimeFormat("en-US", { timeZone: timeZone, timeZoneName: "shortOffset" });
      var parts = dtf.formatToParts(date);
      var tzPart = parts.find(function(p){ return p.type === "timeZoneName"; });
      var s = tzPart ? tzPart.value : "";
      var m = s.match(/([+-])(\d{1,2})(?::?(\d{2}))?/);
      if (m) {
        var sign = (m[1] === "-") ? -1 : 1;
        var hh = parseInt(m[2], 10) || 0;
        var mm = parseInt(m[3] || "0", 10) || 0;
        return sign * (hh * 60 + mm);
      }
    } catch (e) {}
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
    var d = getNowPartsInTZ(TZ_CANADA);
    var approx = new Date(Date.UTC(d.year, d.month - 1, d.day, 0, 0, 0));
    var offMin = getOffsetMinutes(approx, TZ_CANADA);
    var startMs = Date.UTC(d.year, d.month - 1, d.day, 0, 0, 0) - offMin * 60 * 1000;
    var endMs = startMs + 24 * 60 * 60 * 1000;
    return { start: new Date(startMs), end: new Date(endMs) };
  }

  function iso(d) { return d.toISOString(); }

  function updateLastUpdated() {
    try {
      var d = new Date();
      var s = d.toLocaleString([], { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
      setText(lastUpdatedEl, "Last updated: " + s);
    } catch (e) {
      setText(lastUpdatedEl, "Last updated: —");
    }
  }

  function fmtTime(isoStr) {
    try {
      var d = new Date(isoStr);
      return d.toLocaleString([], { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
    } catch (e) {
      return String(isoStr || "");
    }
  }

  // UI
  var listEl = document.getElementById("list");
  var loadingEl = document.getElementById("loading");
  var countValueEl = document.getElementById("countValue");
  var countSubEl = document.getElementById("countSub");

  var tabToday = document.getElementById("tabToday");
  var tabAll = document.getElementById("tabAll");
  var loadMoreBtn = document.getElementById("loadMoreBtn");

  var modeLabelEl = document.getElementById("modeLabel");
  var lastUpdatedEl = document.getElementById("lastUpdated");
  var refreshBtn = document.getElementById("refreshBtn");
  var refreshTopBtn = document.getElementById("refreshTopBtn");
  var exportBtn = document.getElementById("exportBtn");


  var mode = "today"; // 'today' | 'all'
  var pageSize = 20;
  var offset = 0;
  var userId = "";

  function setActiveTab() {
    if (tabToday) tabToday.classList.toggle("active", mode === "today");
    if (tabAll) tabAll.classList.toggle("active", mode === "all");
    setText(modeLabelEl, mode === "today" ? "Today" : "All");
  }

  function clearList() {
    offset = 0;
    if (listEl) listEl.innerHTML = '<div class="loading" id="loading"><div class="spinner"></div>Loading…</div>';
    loadingEl = document.getElementById("loading");
    if (loadMoreBtn) loadMoreBtn.style.display = "none";
    updateLastUpdated();
  }

  function buildQueryUrl(userId, mode, limit, offset) {
    var base = SB.url + "/rest/v1/ipower_actions?select=id,created_at,action_type";
    base += "&user_id=eq." + encodeURIComponent(userId);
    if (mode === "today") {
      var r = getCanadaDayRangeUTC();
      base += "&created_at=gte." + encodeURIComponent(iso(r.start));
      base += "&created_at=lt." + encodeURIComponent(iso(r.end));
    }
    base += "&order=created_at.desc";
    base += "&limit=" + encodeURIComponent(String(limit));
    base += "&offset=" + encodeURIComponent(String(offset));
    return base;
  }

  function renderItems(rows, append) {
    if (!listEl) return;

    if (!append) {
      listEl.innerHTML = "";
    } else {
      // remove loading if present
      var l = document.getElementById("loading");
      if (l) l.remove();
    }

    if (!rows || rows.length === 0) {
      if (!append) {
        listEl.innerHTML = '<div class="empty">No records found.</div>';
      }
      if (loadMoreBtn) loadMoreBtn.style.display = "none";
      return;
    }

    rows.forEach(function (r) {
      var item = document.createElement("div");
      item.className = "item";

      var top = document.createElement("div");
      top.className = "item-top";

      var t = document.createElement("div");
      t.className = "time";
      t.textContent = fmtTime(r.created_at);

      var b = document.createElement("div");
      b.className = "badge";
      b.textContent = "Completed";

      top.appendChild(t);
      top.appendChild(b);

      var meta = document.createElement("div");
      meta.className = "meta";
      var left = document.createElement("div");
      left.textContent = "Type: " + String(r.action_type || "tap");
      var right = document.createElement("div");
      right.textContent = "Record #" + String(r.id || "");
      meta.appendChild(left);
      meta.appendChild(right);

      item.appendChild(top);
      item.appendChild(meta);

      listEl.appendChild(item);
    });
  }

  function fetchPage(append) {
    if (!userId) return Promise.resolve();

    if (loadingEl) loadingEl.style.display = "flex";
    var url = buildQueryUrl(userId, mode, pageSize, offset);

    return fetch(url, { method: "GET", headers: SB.headers() })
      .then(function (res) {
        if (!res.ok) return [];
        return res.json();
      })
      .then(function (rows) {
        renderItems(rows, append);

        // Update counters
        var currentCount = (mode === "today") ? (offset + rows.length) : (offset + rows.length);
        setText(countValueEl, String(currentCount));
        setText(countSubEl, mode === "today" ? (String(currentCount) + " today") : (String(currentCount) + " loaded"));

        updateLastUpdated();

        // pagination
        if (rows.length === pageSize) {
          if (loadMoreBtn) loadMoreBtn.style.display = "block";
        } else {
          if (loadMoreBtn) loadMoreBtn.style.display = "none";
        }

        offset += rows.length;
      })
      .catch(function (e) {
        if (listEl) listEl.innerHTML = '<div class="empty">Failed to load records.</div>';
        if (loadMoreBtn) loadMoreBtn.style.display = "none";
      })
      .finally(function () {
        var l = document.getElementById("loading");
        if (l) l.style.display = "none";
      });
  }

  function switchMode(nextMode) {
    if (mode === nextMode) return;
    mode = nextMode;
    setActiveTab();
    clearList();
    return fetchPage(false);
  }

  if (tabToday) tabToday.addEventListener("click", function () { switchMode("today"); });
  if (tabAll) tabAll.addEventListener("click", function () { switchMode("all"); });
  if (loadMoreBtn) loadMoreBtn.addEventListener("click", function () { fetchPage(true); });

  function hardRefresh() {
    clearList();
    return fetchPage(false);
  }

  if (refreshBtn) refreshBtn.addEventListener("click", function () { hardRefresh(); });
  if (refreshTopBtn) refreshTopBtn.addEventListener("click", function () { hardRefresh(); });
  if (exportBtn) exportBtn.addEventListener("click", function () { /* reserved */ });

  // Init
  getUserId().then(function (uid) {
    userId = uid || "";
    if (!userId) {
      window.location.href = "login.html";
      return;
    }
    setActiveTab();
    clearList();
    return fetchPage(false);
  });

})();