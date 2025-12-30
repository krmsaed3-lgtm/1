// Ensure only ONE bottom navigation exists on the page (mobile slider)
// If multiple navs are present (from merged pages), keep the first and remove the rest.
(function () {
  function dedupeBottomNav() {
    var navs = Array.prototype.slice.call(document.querySelectorAll('.bottom-nav'));
    if (navs.length > 1) {
      for (var i = 1; i < navs.length; i++) {
        navs[i].parentNode && navs[i].parentNode.removeChild(navs[i]);
      }
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dedupeBottomNav);
  } else {
    dedupeBottomNav();
  }
})();