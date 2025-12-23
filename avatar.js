// Deterministic per-user avatar (male silhouette) shared across pages.
// Exposes: window.UserAvatar.apply(profile, options?)
;(function () {
  'use strict';

  function hash32(str) {
    str = String(str || '');
    var h = 2166136261 >>> 0; // FNV-1a
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function svgDataUrl(svg) {
    // Minimal encoding for data URL
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
      .replace(/%0A/g, '')
      .replace(/%20/g, ' ')
      .replace(/%3D/g, '=')
      .replace(/%3A/g, ':')
      .replace(/%2F/g, '/');
  }

  function makeAvatar(key) {
    var h = hash32(key);
    var hue1 = h % 360;
    var hue2 = (hue1 + 60 + (h % 120)) % 360;
    var hue3 = (hue2 + 40 + ((h >>> 8) % 80)) % 360;

    var sat1 = 70 + ((h >>> 16) % 18); // 70-87
    var sat2 = 70 + ((h >>> 20) % 18);
    var sat3 = 60 + ((h >>> 24) % 28);

    var l1 = 45 + ((h >>> 12) % 10); // 45-54
    var l2 = 40 + ((h >>> 10) % 12);
    var l3 = 18 + ((h >>> 6) % 10);

    var glow = clamp(0.35 + ((h >>> 5) % 30) / 100, 0.35, 0.65);

    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">' +
        '<defs>' +
          '<radialGradient id="bg" cx="30%" cy="25%" r="80%">' +
            '<stop offset="0%" stop-color="hsl(' + hue1 + ',' + sat1 + '%,' + l1 + '%)"/>' +
            '<stop offset="55%" stop-color="hsl(' + hue2 + ',' + sat2 + '%,' + l2 + '%)"/>' +
            '<stop offset="100%" stop-color="hsl(' + hue3 + ',' + sat3 + '%,' + l3 + '%)"/>' +
          '</radialGradient>' +
          '<filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">' +
            '<feGaussianBlur stdDeviation="6" result="blur"/>' +
            '<feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ' + glow + ' 0" result="glow"/>' +
            '<feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>' +
          '</filter>' +
          '<linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="rgba(255,255,255,0.55)"/>' +
            '<stop offset="100%" stop-color="rgba(255,255,255,0.08)"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<circle cx="128" cy="128" r="124" fill="url(#bg)"/>' +
        '<circle cx="128" cy="128" r="123" fill="none" stroke="url(#rim)" stroke-width="2"/>' +
        // Male silhouette (simple, clean)
        '<g filter="url(#softGlow)" opacity="0.98">' +
          '<path d="M128 52c-26.5 0-48 21.5-48 48 0 18.8 10.9 35 26.8 42.8-23.5 7.7-40.8 29.7-40.8 55.7 0 4.6 3.7 8.5 8.4 8.5h107.2c4.7 0 8.4-3.9 8.4-8.5 0-26-17.3-48-40.8-55.7C165.1 135 176 118.8 176 100c0-26.5-21.5-48-48-48z" fill="rgba(255,255,255,0.88)"/>' +
          '<path d="M128 64c-19.9 0-36 16.1-36 36 0 19.9 16.1 36 36 36s36-16.1 36-36c0-19.9-16.1-36-36-36z" fill="rgba(0,0,0,0.18)"/>' +
        '</g>' +
        '<circle cx="128" cy="128" r="124" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="4"/>' +
      '</svg>';

    return svgDataUrl(svg);
  }

  function getKey(profile) {
    if (!profile) return null;
    return profile.publicId || profile.id || profile.phone || null;
  }

  function apply(profile, options) {
    options = options || {};
    var key = getKey(profile);
    if (!key) return;

    var dataUrl = makeAvatar(key);

    var selectors = options.selectors || ['#mine-avatar', '#account-avatar', '[data-avatar="user"]'];
    for (var i = 0; i < selectors.length; i++) {
      var els = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < els.length; j++) {
        if (els[j] && els[j].tagName && els[j].tagName.toLowerCase() === 'img') {
          els[j].src = dataUrl;
        } else if (els[j]) {
          els[j].style.backgroundImage = 'url("' + dataUrl + '")';
          els[j].style.backgroundSize = 'cover';
          els[j].style.backgroundPosition = 'center';
        }
      }
    }
  }

  window.UserAvatar = { apply: apply };
})();