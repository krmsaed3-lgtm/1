/* ai-robot-avatar.js - Inline SVG robot avatar (no external images) */
(function () {
  'use strict';

  function ensureStyle() {
    if (document.getElementById('aiRobotAvatarStyle')) return;

    var css = `
/* === AI Robot Inline Avatar (No Images) === */
.avatar{ position:relative; overflow:hidden !important; border-radius:999px; }
.avatar img{ opacity:0 !important; pointer-events:none; }

.ai-robot-inline{
  position:absolute; inset:0;
  border-radius:999px;
  overflow:hidden;
  pointer-events:none;
}
.ai-robot-inline svg{ width:100%; height:100%; display:block; }

/* subtle life */
.ai-robot-inline .rb-float{ animation: rbFloat 5.8s ease-in-out infinite; transform-origin:center; }
@keyframes rbFloat{ 0%,100%{ transform: translateY(0); } 50%{ transform: translateY(-1.5px); } }

/* wink */
.ai-robot-inline.is-wink .rb-eye-r{ transform-origin:center; animation: rbWink 650ms ease-in-out both; }
@keyframes rbWink{ 0%{ transform: scaleY(1); } 45%{ transform: scaleY(0.12); } 100%{ transform: scaleY(1); } }

/* wave */
.ai-robot-inline.is-wave .rb-hand{ transform-origin: 48px 34px; animation: rbWave 900ms ease-in-out both; }
@keyframes rbWave{
  0%{ transform: rotate(0deg); }
  20%{ transform: rotate(18deg); }
  40%{ transform: rotate(-12deg); }
  60%{ transform: rotate(16deg); }
  80%{ transform: rotate(-8deg); }
  100%{ transform: rotate(0deg); }
}

/* point right */
.ai-robot-inline.is-point .rb-arm{ transform-origin: 40px 40px; animation: rbPoint 900ms ease-in-out both; }
@keyframes rbPoint{
  0%{ transform: rotate(0deg); }
  45%{ transform: rotate(-10deg); }
  100%{ transform: rotate(0deg); }
}

/* small pulse on change */
.ai-robot-inline.is-pulse{ animation: rbPulse 700ms ease-in-out both; }
@keyframes rbPulse{ 0%{ transform: scale(1.06); } 50%{ transform: scale(1.12); } 100%{ transform: scale(1.08); } }

@media (prefers-reduced-motion: reduce){
  .ai-robot-inline .rb-float,
  .ai-robot-inline.is-wink .rb-eye-r,
  .ai-robot-inline.is-wave .rb-hand,
  .ai-robot-inline.is-point .rb-arm,
  .ai-robot-inline.is-pulse{ animation:none !important; }
}
`;
    var style = document.createElement('style');
    style.id = 'aiRobotAvatarStyle';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function makeSVG(idSuffix) {
    var gid = 'rbG_' + idSuffix;
    var glow = 'rbGlow_' + idSuffix;

    return `
<div class="ai-robot-inline" aria-hidden="true">
  <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img">
    <defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#18c1ff"/>
        <stop offset="100%" stop-color="#22e1a5"/>
      </linearGradient>
      <radialGradient id="${glow}" cx="30%" cy="25%" r="85%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.35)"/>
        <stop offset="55%" stop-color="rgba(255,255,255,0.06)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.35)"/>
      </radialGradient>
    </defs>

    <g class="rb-float">
      <!-- background -->
      <rect x="0" y="0" width="64" height="64" rx="32" fill="rgba(0,0,0,0.35)"/>
      <rect x="2" y="2" width="60" height="60" rx="30" fill="url(#${glow})" stroke="url(#${gid})" stroke-width="2"/>

      <!-- antenna -->
      <path d="M32 7v8" stroke="url(#${gid})" stroke-width="2" stroke-linecap="round"/>
      <circle cx="32" cy="6" r="2.6" fill="url(#${gid})"/>

      <!-- head -->
      <path d="M16 22c0-7 6-13 13-13h6c7 0 13 6 13 13v10c0 7-6 13-13 13h-6c-7 0-13-6-13-13V22z"
            fill="rgba(0,0,0,0.38)" stroke="url(#${gid})" stroke-width="2"/>
      <path d="M18 24c0-6 5-11 11-11h6c6 0 11 5 11 11v7c0 6-5 11-11 11h-6c-6 0-11-5-11-11v-7z"
            fill="rgba(255,255,255,0.07)"/>

      <!-- left arm (point) -->
      <g class="rb-arm">
        <path d="M19 41c-7 2-11 7-11 13" fill="none" stroke="url(#${gid})" stroke-width="4" stroke-linecap="round"/>
        <path d="M9 53c2-3 5-4 9-4" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="2" stroke-linecap="round"/>
      </g>

      <!-- right hand (wave) -->
      <g class="rb-hand">
        <path d="M46 38c6 1 10 5 10 11" fill="none" stroke="url(#${gid})" stroke-width="4" stroke-linecap="round"/>
        <path d="M56 49c-2-2-4-3-7-3" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="2" stroke-linecap="round"/>
      </g>

      <!-- eyes -->
      <circle cx="28" cy="32" r="4" fill="rgba(255,255,255,0.88)"/>
      <circle cx="36" cy="32" r="4" fill="rgba(255,255,255,0.88)"/>
      <circle cx="28" cy="32" r="1.6" fill="url(#${gid})"/>
      <g class="rb-eye-r">
        <circle cx="36" cy="32" r="1.6" fill="url(#${gid})"/>
      </g>

      <!-- mouth -->
      <path d="M27 42h10" stroke="rgba(255,255,255,0.6)" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M24 39h16" stroke="rgba(24,193,255,0.25)" stroke-width="1.2" stroke-linecap="round"/>
    </g>
  </svg>
</div>`;
  }

  function mount(imgId) {
    var img = document.getElementById(imgId);
    if (!img) return;

    var avatar = img.closest('.avatar');
    if (!avatar) return;

    ensureStyle();

    // Avoid double mount
    if (avatar.querySelector('.ai-robot-inline')) return;

    // Keep avatar.js intact but hide visual image
    img.style.opacity = '0';

    var suffix = Math.random().toString(36).slice(2, 9);
    avatar.insertAdjacentHTML('beforeend', makeSVG(suffix));

    var box = avatar.querySelector('.ai-robot-inline');
    if (!box) return;

    function pulse() {
      box.classList.remove('is-pulse');
      void box.offsetWidth;
      box.classList.add('is-pulse');
    }

    function seq() {
      // wave -> point -> wink (short, non-annoying)
      box.classList.remove('is-wave', 'is-point', 'is-wink');
      pulse();

      window.setTimeout(function () { box.classList.add('is-wave'); pulse(); }, 400);
      window.setTimeout(function () { box.classList.remove('is-wave'); box.classList.add('is-point'); pulse(); }, 1700);
      window.setTimeout(function () { box.classList.remove('is-point'); box.classList.add('is-wink'); pulse(); }, 3000);
      window.setTimeout(function () { box.classList.remove('is-wink'); }, 3800);
    }

    window.setTimeout(seq, 1200);
    window.setInterval(seq, 26000);
  }

  document.addEventListener('DOMContentLoaded', function () {
    mount('mine-avatar');
    mount('account-avatar');
  });
})();
