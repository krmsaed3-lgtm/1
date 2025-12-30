/* profile-shared-v3.js
   Fixes:
   1) No more flash of old hardcoded ID/phone (placeholders stay hidden until ready)
   2) Mine old static avatar is overridden (always uses AI GIF)
   3) Variants: 360 hues + 3 frame styles + pulse (stable per user)
*/
(function(){
  "use strict";
  var AI_GIF = "https://media1.tenor.com/m/VUx8HrR_T8AAAAAd/fandroid-wink.gif";

  function safe(v){ return (v===null||v===undefined) ? "" : String(v).trim(); }
  function djb2(str){ var h=5381; for(var i=0;i<str.length;i++) h=((h<<5)+h)^str.charCodeAt(i); return h>>>0; }

  function pickKey(profile){
    return safe(profile && (profile.publicId || profile.public_id || profile.id || profile.uid || profile.phone || profile.mobile || profile.phone_number)) || "guest";
  }

  function setReady(el){ if(el) el.classList.add("ready"); }

  function applyVariants(profile){
    var key = pickKey(profile);
    var hash = djb2(key);
    var hue = hash % 360;
    var framePick = (hash >> 4) % 3;      // 0..2
    var pulse = ((hash >> 7) % 4) === 0;  // 25%

    function applyTo(wrap){
      if(!wrap) return;
      wrap.style.setProperty("--ai-h", String(hue));
      wrap.classList.remove("frame-dash","frame-double","pulse");
      if(framePick===1) wrap.classList.add("frame-dash");
      if(framePick===2) wrap.classList.add("frame-double");
      if(pulse) wrap.classList.add("pulse");
    }

    applyTo(document.getElementById("ai-avatar"));
    applyTo(document.getElementById("mine-ai-avatar"));
  }

  function paintAccount(profile){
    if(!profile) return;
    var id = safe(profile.publicId || profile.public_id || profile.id || profile.uid);
    var phone = safe(profile.phone || profile.mobile || profile.phone_number);

    var idEl = document.getElementById("user-id");
    if(idEl && id){ idEl.textContent = id; setReady(idEl); }

    var phoneEl = document.querySelector(".account-phone-value");
    if(phoneEl && phone){ phoneEl.textContent = phone.replace(/[^\d]/g,''); setReady(phoneEl); }

    var img = document.getElementById("account-avatar");
    if(img) img.src = AI_GIF;

    applyVariants(profile);
  }

  function paintMine(profile){
    if(!profile) return;
    var ph = safe(profile.phone || profile.mobile || profile.phone_number).replace(/[^\d]/g,'');
    var idv = safe(profile.publicId || profile.public_id || profile.uid || profile.id);

    var phEl = document.getElementById("mine-phone");
    if(phEl && ph){ phEl.textContent = ph; setReady(phEl); }

    var idEl = document.getElementById("mine-id");
    if(idEl && idv){ idEl.textContent = "ID: " + idv; setReady(idEl); }

    // Force AI GIF on Mine to eliminate old static avatar
    var mineImg = document.getElementById("mine-avatar");
    if(mineImg) mineImg.src = AI_GIF;

    applyVariants(profile);
  }

  // Cache and fast paint
  function tryParseJson(v){ try{ return JSON.parse(v); }catch(e){ return null; } }
  function readCached(){
    var raw = localStorage.getItem("sb_user_profile_v1") || localStorage.getItem("profile") || localStorage.getItem("user_profile");
    var obj = raw ? tryParseJson(raw) : null;
    return obj && typeof obj==="object" ? obj : null;
  }
  function writeCached(p){ try{ localStorage.setItem("sb_user_profile_v1", JSON.stringify(p)); }catch(e){} }

  var cached = readCached();
  if(cached){ paintAccount(cached); paintMine(cached); }

  async function refresh(){
    try{
      if(!window.SBUser || typeof window.SBUser.getCurrentProfile !== "function") return;
      var p = await window.SBUser.getCurrentProfile();
      if(!p) return;
      writeCached(p);
      paintAccount(p);
      paintMine(p);
    }catch(e){}
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", refresh);
  else refresh();
})();