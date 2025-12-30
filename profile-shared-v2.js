/* profile-shared-v2.js
   - Prevents flash of old hardcoded ID/phone by painting from localStorage ASAP
   - Then refreshes from Supabase (SBUser.getCurrentProfile) when available
   - Applies MANY avatar variants (hue + frame) per user, keeps animated GIF
*/
(function () {
  "use strict";

  var TENOR_GIF = "https://media1.tenor.com/m/VUx8HrR_T8AAAAAd/fandroid-wink.gif";

  function safeText(v) {
    if (v === null || v === undefined) return "";
    return String(v).trim();
  }

  function tryParseJson(v) {
    try { return JSON.parse(v); } catch(e) { return null; }
  }

  function pickProfileFromStorage() {
    var keys = [
      "sb_user_profile_v1","sb_profile_v1","user_profile","profile","currentUserProfile",
      "exa_user_profile","exarai_profile","sb-user","sbUser"
    ];
    for (var i=0;i<keys.length;i++) {
      var raw = localStorage.getItem(keys[i]);
      if (!raw) continue;
      var obj = tryParseJson(raw);
      if (obj && (obj.phone || obj.publicId || obj.id)) return obj;
    }
    for (var j=0;j<localStorage.length;j++) {
      var k = localStorage.key(j);
      if (!k) continue;
      var r = localStorage.getItem(k);
      if (!r || r.length > 8000) continue;
      var o = tryParseJson(r);
      if (o && typeof o === "object" && (o.phone || o.publicId || o.id)) return o;
    }
    return null;
  }

  function cacheProfile(profile) {
    if (!profile) return;
    try {
      localStorage.setItem("sb_user_profile_v1", JSON.stringify(profile));
    } catch(e) {}
  }

  function djb2(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) + h) ^ str.charCodeAt(i);
    }
    return h >>> 0;
  }

  // Many colors: map hash -> hue 0..359 (stable)
  function applyAvatarVariants(profile) {
    var key = safeText(profile && (profile.publicId || profile.id || profile.phone)) || "guest";
    var hash = djb2(key);
    var hue = hash % 360;                 // 360 colors
    var framePick = (hash >> 4) % 3;      // 0..2
    var pulse = ((hash >> 7) % 4) === 0;  // 25% pulse

    // Account Information page
    var accWrap = document.getElementById("ai-avatar");
    var accImg = document.getElementById("account-avatar");
    if (accWrap && accImg) {
      // keep animated robot
      if (!accImg.src || accImg.src.indexOf("tenor.com") === -1) accImg.src = TENOR_GIF;

      accWrap.style.setProperty("--ai-h", String(hue));
      accWrap.classList.remove("frame-dash","frame-double","pulse");
      if (framePick === 1) accWrap.classList.add("frame-dash");
      if (framePick === 2) accWrap.classList.add("frame-double");
      if (pulse) accWrap.classList.add("pulse");
    }

    // Mine page
    var mineWrap = document.getElementById("mine-ai-avatar");
    var mineImg = document.querySelector("#mine-ai-avatar img");
    if (mineWrap && mineImg) {
      // Do NOT overwrite user photo if you want; but if it's empty, use animated robot
      if (!mineImg.getAttribute("data-user-photo")) {
        if (!mineImg.src || mineImg.src.indexOf("tenor.com") === -1) mineImg.src = TENOR_GIF;
      }
      mineWrap.style.setProperty("--ai-h", String(hue));
      mineWrap.classList.remove("frame-dash","frame-double","pulse");
      if (framePick === 1) mineWrap.classList.add("frame-dash");
      if (framePick === 2) mineWrap.classList.add("frame-double");
      if (pulse) mineWrap.classList.add("pulse");
    }
  }

  function setReady(el) {
    if (!el) return;
    el.classList.add("ready");
  }

  function paintAccount(profile) {
    if (!profile) return;
    var id = safeText(profile.publicId || profile.id);
    var phone = safeText(profile.phone);

    var idEl = document.getElementById("user-id");
    if (idEl && id) { idEl.textContent = id; setReady(idEl); }

    var phoneEl = document.querySelector(".account-phone-value");
    if (phoneEl && phone) { phoneEl.textContent = phone; setReady(phoneEl); }

    applyAvatarVariants(profile);
  }

  function formatPhone(raw) {
    var t = safeText(raw);
    if (!t) return "";
    var digits = t.replace(/[^\d]/g, "");
    return digits;
  }

  function paintMine(profile) {
    if (!profile) return;
    var ph = formatPhone(profile.phone || profile.mobile || profile.phone_number);
    var idVal = profile.publicId || profile.public_id || profile.uid || profile.id;

    var phoneEl = document.getElementById("mine-phone");
    if (phoneEl && ph) { phoneEl.textContent = ph; setReady(phoneEl); }

    var idEl = document.getElementById("mine-id");
    if (idEl && idVal) { idEl.textContent = "ID: " + safeText(idVal); setReady(idEl); }

    applyAvatarVariants(profile);
  }

  function paintAll(profile) {
    paintAccount(profile);
    paintMine(profile);
  }

  // 1) Paint from cache ASAP (prevents flash)
  var cached = pickProfileFromStorage();
  if (cached) paintAll(cached);

  // 2) Then refresh from Supabase if available
  async function refresh() {
    try {
      if (!window.SBUser || typeof window.SBUser.getCurrentProfile !== "function") return;
      var p = await window.SBUser.getCurrentProfile();
      if (!p) return;
      cacheProfile(p);
      paintAll(p);
    } catch(e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh);
  } else {
    refresh();
  }
})();
