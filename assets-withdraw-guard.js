;(function () {
  'use strict';

  // Blocks navigation to withdraw.html if userEmail is not set.
  // Works with my-assets.html where navigation is done via [data-action] and .actions .action-item labels. 

  function hasEmail() {
    try { return String(localStorage.getItem('userEmail') || '').trim().length > 0; } catch (e) { return false; }
  }

  function showEmailPopup() {
    // Simple 2-option popup (OK -> go security-center, Cancel -> stay)
    var ok = window.confirm('لازم تضيفي الإيميل قبل ما تفوتي على صفحة السحب.\n\nOK: أضيف الإيميل هلا\nCancel: إلغاء');
    if (ok) {
      // your project uses security-center.js on security-center page
      window.location.href = 'security-center.html';
    }
  }

  function isWithdrawIntentFromClick(target) {
    if (!target) return false;

    // Buttons in currency actions: <button data-action="Withdraw">Transfer</button>
    var btn = target.closest && target.closest('[data-action]');
    if (btn) {
      var act = String(btn.getAttribute('data-action') || '').trim();
      // In my-assets.html mapping includes Withdraw and Transfer -> withdraw.html fileciteturn3file10L9-L22
      if (act.toLowerCase() === 'withdraw' || act.toLowerCase() === 'transfer') return true;
    }

    // Top circles: label text includes "Transfer"
    var item = target.closest && target.closest('.actions .action-item');
    if (item) {
      var label = String(item.textContent || '').trim().toLowerCase();
      if (label.indexOf('transfer') !== -1 || label.indexOf('withdraw') !== -1) return true;
    }

    return false;
  }

  function onClick(e) {
    if (hasEmail()) return;
    if (!isWithdrawIntentFromClick(e.target)) return;

    // Block the existing click handlers in my-assets.html
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    showEmailPopup();
  }

  document.addEventListener('click', onClick, true);
})();