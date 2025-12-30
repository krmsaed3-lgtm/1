/* ai-robot-avatar.js - 3D-look inline SVG robot (no external images) */
(function () {
  'use strict';

  function ensureStyle() {
    if (document.getElementById('aiRobotAvatarStyle')) return;
    var css = `
/* === AI Robot Avatar (3D SVG) === */
.avatar{ position:relative; overflow:hidden !important; border-radius:999px; }
.avatar img{ opacity:0 !important; pointer-events:none; }

.ai-robot-inline{
  position:absolute; inset:0;
  border-radius:999px;
  overflow:hidden;
  pointer-events:none;
  z-index: 9999;
}
.ai-robot-inline svg{ width:100%; height:100%; display:block; }

/* life */
.ai-robot-inline .rb-float{ animation: rbFloat 6.2s ease-in-out infinite; transform-origin:center; }
@keyframes rbFloat{ 0%,100%{ transform: translateY(0); } 50%{ transform: translateY(-1.8px); } }

/* actions */
.ai-robot-inline.is-wave .rb-hand{ transform-origin: 51px 34px; animation: rbWave 900ms ease-in-out both; }
@keyframes rbWave{ 0%{transform:rotate(0)} 25%{transform:rotate(18deg)} 50%{transform:rotate(-12deg)} 75%{transform:rotate(14deg)} 100%{transform:rotate(0)} }

.ai-robot-inline.is-point .rb-arm{ transform-origin: 38px 40px; animation: rbPoint 900ms ease-in-out both; }
@keyframes rbPoint{ 0%{transform:rotate(0)} 55%{transform:rotate(-10deg)} 100%{transform:rotate(0)} }

.ai-robot-inline.is-wink .rb-eye-r{ transform-origin:center; animation: rbWink 650ms ease-in-out both; }
@keyframes rbWink{ 0%{transform:scaleY(1)} 45%{transform:scaleY(.10)} 100%{transform:scaleY(1)} }

.ai-robot-inline.is-pulse{ animation: rbPulse 650ms ease-in-out both; }
@keyframes rbPulse{ 0%{transform:scale(1.04)} 50%{transform:scale(1.10)} 100%{transform:scale(1.06)} }

@media (prefers-reduced-motion: reduce){
  .ai-robot-inline .rb-float,
  .ai-robot-inline.is-wave .rb-hand,
  .ai-robot-inline.is-point .rb-arm,
  .ai-robot-inline.is-wink .rb-eye-r,
  .ai-robot-inline.is-pulse{ animation:none !important; }
}
`;
    var style = document.createElement('style');
    style.id = 'aiRobotAvatarStyle';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function svgHTML(suffix){
    var gMain='gMain_'+suffix, gGlow='gGlow_'+suffix, gMetal='gMetal_'+suffix, gVis='gVis_'+suffix, gRing='gRing_'+suffix, fDrop='fDrop_'+suffix;
    return `
<div class="ai-robot-inline" aria-hidden="true">
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${gMain}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#18c1ff"/><stop offset="100%" stop-color="#22e1a5"/>
    </linearGradient>
    <radialGradient id="${gGlow}" cx="30%" cy="20%" r="95%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.35)"/>
      <stop offset="45%" stop-color="rgba(255,255,255,0.08)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.55)"/>
    </radialGradient>
    <linearGradient id="${gMetal}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.28)"/>
      <stop offset="55%" stop-color="rgba(255,255,255,0.06)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.40)"/>
    </linearGradient>
    <linearGradient id="${gVis}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(0,0,0,0.80)"/><stop offset="100%" stop-color="rgba(0,0,0,0.55)"/>
    </linearGradient>
    <radialGradient id="${gRing}" cx="50%" cy="35%" r="70%">
      <stop offset="0%" stop-color="rgba(34,225,165,0.95)"/>
      <stop offset="55%" stop-color="rgba(24,193,255,0.85)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
    <filter id="${fDrop}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.55)"/>
    </filter>
  </defs>

  <g class="rb-float" filter="url(#${fDrop})">
    <circle cx="32" cy="32" r="31" fill="rgba(10,12,18,0.65)"/>
    <circle cx="32" cy="32" r="29" fill="url(#${gGlow})" stroke="url(#${gMain})" stroke-width="2"/>

    <path d="M16 24c0-8 7-15 15-15h2c8 0 15 7 15 15v7c0 8-7 15-15 15h-2c-8 0-15-7-15-15v-7z"
          fill="rgba(18,22,34,0.62)" stroke="url(#${gMain})" stroke-width="2"/>
    <path d="M19 24c0-6.5 5.5-12 12-12h2c6.5 0 12 5.5 12 12v2c-7-5-21-5-26 0v-2z"
          fill="rgba(255,255,255,0.10)"/>

    <circle cx="49.5" cy="31" r="6.5" fill="rgba(0,0,0,0.35)" stroke="url(#${gMain})" stroke-width="1.5"/>
    <circle cx="49.5" cy="31" r="5" fill="url(#${gRing})"/>

    <path d="M22 28c0-4 3-7 7-7h6c4 0 7 3 7 7v4c0 4-3 7-7 7h-6c-4 0-7-3-7-7v-4z"
          fill="url(#${gVis})" stroke="rgba(255,255,255,0.10)" stroke-width="1"/>
    <path d="M24 27c2-3 6-4 10-4 3 0 5 .6 7 1.8" fill="none" stroke="rgba(255,255,255,0.18)"
          stroke-width="1.6" stroke-linecap="round"/>

    <rect x="27" y="29" width="4.5" height="6.5" rx="2.2" fill="rgba(255,255,255,0.88)"/>
    <rect x="33.5" y="29" width="4.5" height="6.5" rx="2.2" fill="rgba(255,255,255,0.88)"/>
    <circle cx="29.25" cy="32.5" r="1.5" fill="url(#${gMain})"/>
    <g class="rb-eye-r"><circle cx="35.75" cy="32.5" r="1.5" fill="url(#${gMain})"/></g>

    <path d="M28 40h8" stroke="rgba(255,255,255,0.60)" stroke-width="2.4" stroke-linecap="round"/>

    <path d="M21 46c2-6 7-9 11-9s9 3 11 9" fill="rgba(18,22,34,0.55)" stroke="rgba(255,255,255,0.10)" stroke-width="1.2"/>
    <path d="M23 46c2-4.5 6-6.8 9-6.8s7 2.3 9 6.8" fill="url(#${gMetal})" opacity="0.65"/>

    <g class="rb-arm">
      <path d="M22 44c-7 1-12 6-12 12" fill="none" stroke="url(#${gMain})" stroke-width="4" stroke-linecap="round"/>
      <path d="M10.5 55c2-3 6-4 10-4" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="2" stroke-linecap="round"/>
    </g>

    <g class="rb-hand">
      <path d="M44 41c7 1 12 6 12 12" fill="none" stroke="url(#${gMain})" stroke-width="4" stroke-linecap="round"/>
      <path d="M55 52c-2-2-5-3-8-3" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="2" stroke-linecap="round"/>
    </g>

    <path d="M15 56c5 3 12 4 17 4s12-1 17-4" fill="none" stroke="rgba(24,193,255,0.25)" stroke-width="2" stroke-linecap="round"/>
  </g>
</svg>
</div>`;
  }

  function mountById(imgId){
    var img = document.getElementById(imgId);
    if (!img) return;
    var avatar = img.closest('.avatar');
    if (!avatar) return;

    ensureStyle();
    if (avatar.querySelector('.ai-robot-inline')) return;

    img.style.opacity = '0';
    var suffix = Math.random().toString(36).slice(2,9);
    avatar.insertAdjacentHTML('beforeend', svgHTML(suffix));

    var box = avatar.querySelector('.ai-robot-inline');
    if (!box) return;

    function pulse(){
      box.classList.remove('is-pulse'); void box.offsetWidth; box.classList.add('is-pulse');
    }
    function seq(){
      box.classList.remove('is-wave','is-point','is-wink');
      pulse();
      setTimeout(function(){ box.classList.add('is-wave'); pulse(); }, 420);
      setTimeout(function(){ box.classList.remove('is-wave'); box.classList.add('is-point'); pulse(); }, 1750);
      setTimeout(function(){ box.classList.remove('is-point'); box.classList.add('is-wink'); pulse(); }, 3050);
      setTimeout(function(){ box.classList.remove('is-wink'); }, 3850);
    }
    setTimeout(seq, 1200);
    setInterval(seq, 26000);
  }

  function init(){
    mountById('mine-avatar');
    mountById('account-avatar');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
