/* profile-avatar-shared.js
   Shared between mine.html + account-information.html
   - Stops "old hardcoded ID/Phone" flash by painting from cached profile ASAP
   - Applies deterministic AI avatar variants (colors + ring styles) per user
*/
(function (w) {
  'use strict';

  function tryParseJson(v){ try { return JSON.parse(v); } catch(e){ return null; } }
  function safeText(v){ if(v===null||v===undefined) return ''; var t=String(v).trim(); return t; }

  function pickProfileFromStorage(){
    var keys = [
      'sb_user_profile_v1','sb_profile_v1','user_profile','profile','currentUserProfile',
      'exa_user_profile','exarai_profile','sb-user','sbUser'
    ];
    for (var i=0;i<keys.length;i++){
      var raw = localStorage.getItem(keys[i]);
      if(!raw) continue;
      var obj = tryParseJson(raw);
      if(obj && typeof obj==='object' && (obj.phone || obj.publicId || obj.id)) return obj;
    }
    for (var j=0;j<localStorage.length;j++){
      var k = localStorage.key(j);
      if(!k) continue;
      var r = localStorage.getItem(k);
      if(!r || r.length > 8000) continue;
      var o = tryParseJson(r);
      if(o && typeof o==='object' && (o.phone || o.publicId || o.id)) return o;
    }
    return null;
  }

  function cacheProfile(profile){
    try{
      if(!profile || typeof profile!=='object') return;
      // Store a compact profile snapshot for instant paint next time
      var snapshot = {
        id: profile.id || null,
        publicId: profile.publicId || profile.public_id || profile.uid || null,
        phone: profile.phone || profile.mobile || profile.phone_number || null,
        level: profile.level || profile.vipLevel || profile.vip_level || null
      };
      localStorage.setItem('sb_user_profile_v1', JSON.stringify(snapshot));
    }catch(e){}
  }

  function formatPhone(raw){
    var t = safeText(raw);
    if(!t) return '';
    var digits = t.replace(/[^\d]/g,'');
    if(!digits) return '';
    if(digits.length > 8) return digits.slice(0,3)+' '+digits.slice(3);
    return digits;
  }

  function getStableKey(profile){
    if(!profile) return 'anon';
    return safeText(profile.publicId || profile.public_id || profile.uid || profile.id || profile.phone || profile.mobile || profile.phone_number) || 'anon';
  }

  function djb2(str){
    var h = 5381;
    for (var i=0;i<str.length;i++) h = ((h<<5)+h) + str.charCodeAt(i);
    return (h >>> 0);
  }

  function ensureAvatarCSS(){
    if(document.getElementById('pa-shared-css')) return;
    var css = `
/* Shared AI avatar variants */
.pa-ring{
  position: relative;
  border-radius: 999px;
  overflow: hidden;
}
.pa-ring::before{
  content:"";
  position:absolute;
  inset:-2px;
  border-radius:999px;
  pointer-events:none;
  opacity:0.95;
  filter: blur(0.2px);
}
.pa-ring.style-0::before{ background: conic-gradient(from 180deg, rgba(0,209,255,.0), rgba(0,209,255,.65), rgba(34,225,165,.65), rgba(0,209,255,.0)); }
.pa-ring.style-1::before{ background: conic-gradient(from 90deg, rgba(255,255,255,0.0), rgba(0,228,192,.70), rgba(24,193,255,.70), rgba(255,255,255,0.0)); }
.pa-ring.style-2::before{ background: radial-gradient(circle at 30% 30%, rgba(0,209,255,.70), rgba(0,0,0,0) 55%), radial-gradient(circle at 70% 70%, rgba(34,225,165,.75), rgba(0,0,0,0) 60%); }
.pa-ring.style-3::before{ background: linear-gradient(135deg, rgba(24,193,255,.75), rgba(34,225,165,.75)); }
.pa-ring.style-4::before{ background: conic-gradient(from 0deg, rgba(255,0,153,.0), rgba(255,0,153,.55), rgba(0,209,255,.60), rgba(34,225,165,.55), rgba(255,0,153,.0)); }
.pa-ring.style-5::before{ background: linear-gradient(90deg, rgba(255,255,255,.0), rgba(0,209,255,.75), rgba(255,255,255,.0)); }
.pa-ring.pulse::before{ animation: paPulse 1.9s ease-in-out infinite; }
@keyframes paPulse{ 0%,100%{ transform: scale(0.98); opacity:0.75 } 50%{ transform: scale(1.03); opacity:1 } }
.pa-ring > img{ position:relative; z-index:1; }
.pa-hue{ will-change: filter; }
`;
    var style = document.createElement('style');
    style.id = 'pa-shared-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function applyAvatarVariants(profile){
    ensureAvatarCSS();

    var key = getStableKey(profile);
    var h = djb2(key);

    // More colors (0..23)
    var hueSteps = 24;
    var hueIndex = h % hueSteps;
    var hue = Math.round((360 / hueSteps) * hueIndex);

    // More ring styles
    var ringStyle = (h >> 8) % 6;
    var pulse = ((h >> 14) % 3) === 0; // ~33%

    // Targets (mine + account)
    var targets = [
      { img: document.getElementById('mine-avatar'), wrapSel: '.profile-card .avatar' },
      { img: document.getElementById('account-avatar'), wrapSel: '.avatar-wrapper .avatar' }
    ];

    targets.forEach(function(t){
      if(!t.img) return;
      t.img.classList.add('pa-hue');
      // keep your image but change its vibe per-user
      t.img.style.filter = 'hue-rotate(' + hue + 'deg) saturate(1.25) contrast(1.06)';
      // add ring to wrapper if possible
      var wrap = t.img.closest(t.wrapSel) || t.img.parentElement;
      if(wrap){
        wrap.classList.add('pa-ring','style-'+ringStyle);
        if(pulse) wrap.classList.add('pulse');
      }
    });
  }

  function paintMineHeader(profile){
    if(!profile) return;
    var phoneEl = document.getElementById('mine-phone');
    var idEl = document.getElementById('mine-id');
    if(phoneEl){
      var ph = formatPhone(profile.phone || profile.mobile || profile.phone_number);
      if(ph) phoneEl.textContent = ph;
    }
    if(idEl){
      var idVal = profile.publicId || profile.public_id || profile.uid || profile.id;
      if(idVal) idEl.textContent = 'ID: ' + safeText(idVal);
    }
  }

  function paintAccountInfo(profile){
    if(!profile) return;
    var idEl = document.getElementById('user-id');
    if(idEl){
      var idVal = profile.publicId || profile.public_id || profile.uid || profile.id;
      if(idVal) idEl.textContent = safeText(idVal) || '-';
    }
    var phoneEl = document.querySelector('.account-phone-value');
    if(phoneEl){
      var ph2 = formatPhone(profile.phone || profile.mobile || profile.phone_number) || safeText(profile.phone);
      if(ph2) phoneEl.textContent = ph2;
    }
  }

  function applyAll(profile){
    if(!profile) return;
    paintMineHeader(profile);
    paintAccountInfo(profile);
    applyAvatarVariants(profile);
    // keep existing avatar.js behavior too
    if(w.UserAvatar && typeof w.UserAvatar.apply === 'function'){
      try{ w.UserAvatar.apply(profile); }catch(e){}
    }
  }

  // Expose
  w.ProfileAvatar = {
    getCachedProfile: pickProfileFromStorage,
    cacheProfile: cacheProfile,
    applyAll: applyAll
  };

  // ASAP paint from cache (prevents flash)
  try{
    var cached = pickProfileFromStorage();
    if(cached) applyAll(cached);
  }catch(e){}

})(window);
