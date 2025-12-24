;(function () {
  'use strict';

  // Applies on withdraw.html:
  // 1) If no email => popup then redirect to security-center.html (or back)
  // 2) Block withdraw under 20
  // 3) Send code to email via Edge Function; only call request_withdrawal after correct code
  //
  // Uses the same Edge Functions pattern as security-center.js fileciteturn3file5L5-L33
  // Uses wallet.js global helper DemoWallet.requestWithdrawal fileciteturn2file3L55-L73

  var processing = false;

  function getEmail() {
    try { return String(localStorage.getItem('userEmail') || '').trim(); } catch (e) { return ''; }
  }

  function getCurrentUserId() {
    try { return String(localStorage.getItem('currentUserId') || localStorage.getItem('sb_user_id_v1') || '').trim(); }
    catch (e) { return ''; }
  }

  async function callEdgeFunction(fnName, payload) {
    if (!window.SB_CONFIG || !SB_CONFIG.url || !SB_CONFIG.headers) {
      throw new Error('Supabase config not loaded');
    }
    var res = await fetch(SB_CONFIG.url.replace(/\/$/, '') + '/functions/v1/' + encodeURIComponent(fnName), {
      method: 'POST',
      headers: SB_CONFIG.headers(),
      body: JSON.stringify(payload || {})
    });
    var data = null;
    try { data = await res.json(); } catch (_e) { data = null; }
    if (!res.ok) {
      var msg = data && (data.error || data.message) ? (data.error || data.message) : ('Request failed: ' + res.status);
      throw new Error(msg);
    }
    return data || {};
  }

  async function sendEmailCode(email) {
    var userId = getCurrentUserId();
    if (!userId) throw new Error('Please login first');
    return callEdgeFunction('send_email_code', { user_id: userId, email: email });
  }

  async function confirmEmailCode(email, code) {
    var userId = getCurrentUserId();
    if (!userId) throw new Error('Please login first');
    return callEdgeFunction('confirm_email_code', { user_id: userId, email: email, code: code });
  }

  function parseAmount() {
    var el = document.getElementById('qtyInput');
    var v = el ? parseFloat(el.value || '0') : 0;
    return (isFinite(v) ? v : 0);
  }

  function getAvailable() {
    var el = document.getElementById('availableVal');
    var t = el ? String(el.textContent || '') : '';
    // e.g. "82.48 USDT"
    var m = t.match(/([0-9]+(?:\.[0-9]+)?)/);
    if (!m) return 0;
    var n = parseFloat(m[1]);
    return isFinite(n) ? n : 0;
  }

  function getCurrency() {
    // withdraw.html sets dataset withdrawCurrency in its UI script fileciteturn3file14L23-L26
    var cur = (document.body && document.body.dataset && document.body.dataset.withdrawCurrency) ? document.body.dataset.withdrawCurrency : '';
    if (!cur) {
      var el = document.getElementById('currencyValue');
      cur = el ? String(el.textContent || '').trim() : '';
    }
    return (cur || 'USDT').toUpperCase();
  }

  function getNetwork() {
    // withdraw.html sets dataset withdrawNetwork in its UI script fileciteturn3file14L16-L21
    var net = (document.body && document.body.dataset && document.body.dataset.withdrawNetwork) ? document.body.dataset.withdrawNetwork : '';
    if (!net) net = 'TRC20';
    return String(net || 'TRC20').toUpperCase();
  }

  function getSelectedAddress() {
    // Address script sets window.__withdraw_selected_address__ fileciteturn3file12L69-L81
    var a = (window.__withdraw_selected_address__ != null) ? String(window.__withdraw_selected_address__) : '';
    a = (a || '').trim();
    return a;
  }

  function ensureEmailOrRedirect() {
    var email = getEmail();
    if (email) return true;

    var ok = window.confirm('لازم تضيفي الإيميل قبل السحب.\n\nOK: أضيف الإيميل هلا\nCancel: رجوع');
    if (ok) {
      window.location.href = 'security-center.html';
    } else {
      // go back to assets page
      window.location.href = 'my-assets.html';
    }
    return false;
  }

  async function onWithdrawClick(e) {
    // block other handlers in withdraw.html
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    if (processing) return;
    if (!ensureEmailOrRedirect()) return;

    var amount = parseAmount();
    if (!amount || amount <= 0) {
      alert('Enter a valid amount.');
      return;
    }

    // Minimum 20 (your requirement + UI shows 20) fileciteturn2file7L63-L71
    if (amount < 20) {
      alert('Minimum withdrawal is 20.');
      return;
    }

    var available = getAvailable();
    if (amount > available + 1e-9) {
      alert('Insufficient balance.');
      return;
    }

    var addr = getSelectedAddress();
    if (!addr || addr.length < 5) {
      alert('Please select an address.');
      return;
    }

    var email = getEmail();
    var btn = document.getElementById('withdrawBtn');

    processing = true;
    if (btn) btn.disabled = true;

    try {
      await sendEmailCode(email);
      var code = prompt('تم إرسال كود تحقق على الإيميل.\nاكتبي الكود (6 أرقام):');
      if (code === null) throw new Error('Cancelled');
      code = String(code || '').trim();
      if (!/^\d{6}$/.test(code)) throw new Error('Invalid code');

      await confirmEmailCode(email, code);

      // Call RPC through wallet.js helper if available
      if (!window.DemoWallet || typeof window.DemoWallet.requestWithdrawal !== 'function') {
        throw new Error('Wallet helper not loaded');
      }

      var cur = getCurrency();
      var net = getNetwork();

      var res = await window.DemoWallet.requestWithdrawal({
        amount: amount,
        currency: cur.toLowerCase(),
        network: net.toLowerCase(),
        address: addr
      });

      alert('Withdrawal request submitted.');
      // clear input
      var qtyInput = document.getElementById('qtyInput');
      if (qtyInput) qtyInput.value = '';
    } catch (err) {
      var msg = (err && err.message) ? err.message : String(err);
      if (msg === 'Cancelled') msg = 'تم الإلغاء.';
      alert(msg);
    } finally {
      processing = false;
      if (btn) btn.disabled = false;
    }
  }

  function init() {
    // If user opens withdraw.html directly without email -> block
    if (!ensureEmailOrRedirect()) return;

    var btn = document.getElementById('withdrawBtn');
    if (!btn) return;
    // Capture so we run before the page's existing doWithdraw handler
    btn.addEventListener('click', onWithdrawClick, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();