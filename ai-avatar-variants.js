/* AI Avatar Variants
   - Deterministic per user (stable across sessions)
   - Changes BOTH: face hue + ring frame style
*/
(function () {
  "use strict";

  // Demo face asset (animated). Replace with your own hosted GIFs later if you want.
  var FACE_GIF = "https://media1.tenor.com/m/VUx8HrR_T8AAAAAd/fandroid-wink.gif";

  function djb2(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) + h) ^ str.charCodeAt(i);
    }
    return h >>> 0;
  }

  function pick(profile) {
    var key =
      (profile && (profile.publicId || profile.id || profile.phone)) ?
      String(profile.publicId || profile.id || profile.phone) :
      "guest";
    var hash = djb2(key);
    return {
      hueIndex: hash % 5,            // 0..4
      frameIndex: (hash >> 3) % 5,   // 0..4
      pulse: ((hash >> 7) % 3) === 0 // ~1/3 get pulse ring
    };
  }

  function ensureBadge(avatarEl, text) {
    if (!avatarEl) return;
    var existing = avatarEl.querySelector(".ai-badge");
    if (existing) {
      existing.textContent = text;
      return;
    }
    var b = document.createElement("div");
    b.className = "ai-badge";
    b.textContent = text;
    avatarEl.appendChild(b);
  }

  function apply(profile) {
    var avatarWrap = document.getElementById("ai-avatar");
    var img = document.getElementById("account-avatar");
    if (!avatarWrap || !img) return;

    var v = pick(profile);

    // Face asset
    img.src = FACE_GIF;

    // Reset classes
    avatarWrap.classList.add("ai");
    for (var i = 0; i <= 4; i++) {
      avatarWrap.classList.remove("hue-" + i);
      avatarWrap.classList.remove("frame-" + i);
    }
    avatarWrap.classList.remove("pulse");

    // Apply hue + frame
    avatarWrap.classList.add("hue-" + v.hueIndex);
    if (v.frameIndex !== 0) avatarWrap.classList.add("frame-" + v.frameIndex);
    if (v.pulse) avatarWrap.classList.add("pulse");

    // Badge (can be replaced with level later)
    ensureBadge(avatarWrap, "AI");
  }

  window.AIAvatar = { apply: apply };
})();