(function () {
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      // If there is history, go back; otherwise do nothing.
      if (window.history.length > 1) window.history.back();
    });
  }

  // Click-to-navigate behavior (safe: only navigates if target exists as a file path)
  const items = document.querySelectorAll('.item[data-target]');
  items.forEach((el) => {
    el.addEventListener('click', () => {
      const target = el.getAttribute('data-target');
      if (!target) return;
      // Navigate (you can change these targets to your real pages)
      window.location.href = target;
    });
  });
})();
