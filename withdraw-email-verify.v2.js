;(function () {
  'use strict';

  var MIN_WITHDRAW = 20;
  var processing = false;

  function getEmail() {
    try { return String(localStorage.getItem('userEmail') || '').trim(); } catch (e) { return ''; }
  }
  function getUserId() {
    try { return String(localStorage.getItem('currentUserId') || localStorage.getItem('sb_user_id_v1') || '').trim(); }
    catch (e) { return ''; }
  }

  async function callEdge(fnName, payload) {
    if (!window.SB_CONFIG || !SB_CONFIG.url || !SB_CONFIG.headers) throw new Error('Supabase config not loaded');
    var res = await fetch(SB_CONFIG.url.replace(/\/$/, '') + '/functions/v1/' + encodeURIComponent(fnName), {
      method: 'POST',
      headers: SB_CONFIG.headers(),
      body: JSON.stringify(payload || {})
    });
    var data = null;
    try { data = await res.json(); } catch (_e) { data = null; }
    if (!res.ok) throw new Error((data && (data.error || data.message)) || ('Request failed: ' + res.status));
    return data || {};
  }

  async function ensureEmailOrRedirect() {
    var email = getEmail();
    if (email) return true;

    var go = await egModal.confirm({
      title: 'Security Notice',
      msg: 'Please add your email address before proceeding to the withdrawal page.',
      okText: 'Add Email',
      cancelText: 'Cancel'
    });

    if (go) window.location.href = 'security-center.html';
    else window.location.href = 'my-assets.html';
    return false;
  }

  function getAmount() {
    var el = document.getElementById('qtyInput');
    var v = el ? parseFloat(el.value || '0') : 0;
    return isFinite(v) ? v : 0;
  }

  function getSelectedAddress() {
    var a = (window.__withdraw_selected_address__ != null) ? String(window.__withdraw_selected_address__) : '';
    return (a || '').trim();
  }

  async function onWithdrawClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    if (processing) return;

    if (!(await ensureEmailOrRedirect())) return;

    var amount = getAmount();
    if (!amount || amount <= 0) {
      await egModal.alert('Please enter a valid amount.', { title: 'Invalid Amount' });
      return;
    }
    if (amount < MIN_WITHDRAW) {
      await egModal.alert('Minimum withdrawal amount is ' + MIN_WITHDRAW + '.', { title: 'Minimum Amount' });
      return;
    }

    var addr = getSelectedAddress();
    if (!addr) {
      await egModal.alert('Please select a withdrawal address.', { title: 'Address Required' });
      return;
    }

    var email = getEmail();
    var userId = getUserId();
    if (!userId) {
      await egModal.alert('Session expired. Please log in again.', { title: 'Login Required' });
      return;
    }

    var btn = document.getElementById('withdrawBtn');
    processing = true;
    if (btn) btn.disabled = true;

    try {
      await callEdge('send_email_code', { user_id: userId, email: email });

      var code = await egModal.prompt({
        title: 'Email Verification',
        msg: 'Enter the 6-digit verification code sent to your email.',
        okText: 'Verify',
        cancelText: 'Cancel',
        placeholder: '123456',
        inputMode: 'numeric',
        maxLength: 6
      });

      if (code === null) return;
      if (!/^\d{6}$/.test(code)) {
        await egModal.alert('Invalid code format. Please enter 6 digits.', { title: 'Invalid Code' });
        return;
      }

      await callEdge('confirm_email_code', { user_id: userId, email: email, code: code });

      if (!window.DemoWallet || typeof window.DemoWallet.requestWithdrawal !== 'function') {
        throw new Error('Wallet helper not loaded');
      }

      // Read current currency/network from page dataset (existing withdraw.html)
      var cur = (document.body.dataset.withdrawCurrency || 'USDT').toLowerCase();
      var net = (document.body.dataset.withdrawNetwork || 'TRC20').toLowerCase();

      await window.DemoWallet.requestWithdrawal({
        amount: amount,
        currency: cur,
        network: net,
        address: addr
      });

      await egModal.alert('Withdrawal request submitted successfully.', { title: 'Success' });

      var qtyInput = document.getElementById('qtyInput');
      if (qtyInput) qtyInput.value = '';
    } catch (err) {
      await egModal.alert(String(err && err.message ? err.message : err), { title: 'Error' });
    } finally {
      processing = false;
      if (btn) btn.disabled = false;
    }
  }

  async function init() {
    if (!window.egModal) return;
    if (!(await ensureEmailOrRedirect())) return;
    var btn = document.getElementById('withdrawBtn');
    if (!btn) return;
    btn.addEventListener('click', onWithdrawClick, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();