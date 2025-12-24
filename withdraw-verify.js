/* withdraw-verify.js
   Integrates with your existing Withdraw page + Supabase Edge email verification.

   Flow:
   1) If userEmail not set in localStorage -> popup (Go to security-center) or Cancel
   2) Block withdraw < 20 immediately
   3) If ok -> send code to email (send_email_code) then verify (confirm_email_code),
      and ONLY then call request_withdrawal RPC.

   Notes:
   - Uses SB_CONFIG (sb-config.js) like your security-center.js does.
   - Uses localStorage.userEmail (set in security-center.js).
   - Uses localStorage.currentUserId / sb_user_id_v1 (same fallbacks as withdraw.html).
*/

(function () {
  'use strict';

  var MIN_WITHDRAW = 20; // matches withdraw.html minQty=20

  // ---------- Utilities ----------
  function safeGetLS(key) {
    try { return window.localStorage.getItem(key) || ''; } catch (_e) { return ''; }
  }
  function safeSetLS(key, val) {
    try { window.localStorage.setItem(key, val); } catch (_e) {}
  }

  function getStoredEmail() {
    return (safeGetLS('userEmail') || '').trim();
  }

  async function getUserId() {
    // match withdraw.html logic
    if (window.ExaAuth && typeof window.ExaAuth.ensureSupabaseUserId === 'function') {
      try {
        var id = await window.ExaAuth.ensureSupabaseUserId();
        if (id) return id;
      } catch (_e) {}
    }
    return safeGetLS('sb_user_id_v1') || safeGetLS('currentUserId');
  }

  function mustHaveSB() {
    if (!window.SB_CONFIG || !SB_CONFIG.url || !SB_CONFIG.headers) {
      throw new Error('Supabase config not loaded');
    }
  }

  async function callEdgeFunction(fnName, payload) {
    mustHaveSB();
    var res = await fetch(SB_CONFIG.url + '/functions/v1/' + encodeURIComponent(fnName), {
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

  async function sendEmailCodeEdge(email) {
    var userId = await getUserId();
    if (!userId) throw new Error('Please login first');
    return callEdgeFunction('send_email_code', { user_id: userId, email: email });
  }

  async function confirmEmailCodeEdge(email, code) {
    var userId = await getUserId();
    if (!userId) throw new Error('Please login first');
    return callEdgeFunction('confirm_email_code', { user_id: userId, email: email, code: code });
  }

  // ---------- Supabase REST/RPC helpers (same style as withdraw.html) ----------
  function sbHeaders() {
    var SB = window.SB_CONFIG;
    if (!SB || !SB.url || !SB.anonKey) throw new Error('SB_CONFIG missing');
    return {
      'apikey': SB.anonKey,
      'Authorization': 'Bearer ' + SB.anonKey,
      'Content-Type': 'application/json'
    };
  }

  async function sbGet(path) {
    var SB = window.SB_CONFIG;
    var res = await fetch(SB.url + '/rest/v1/' + path, { headers: sbHeaders() });
    var body = await res.text();
    if (!res.ok) throw new Error(body || ('HTTP ' + res.status));
    return body ? JSON.parse(body) : null;
  }

  async function sbRpc(fn, payload) {
    var SB = window.SB_CONFIG;
    var res = await fetch(SB.url + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: sbHeaders(),
      body: JSON.stringify(payload || {})
    });
    var body = await res.text();
    if (!res.ok) {
      try {
        var j = JSON.parse(body);
        throw new Error(j.message || body);
      } catch (_) {
        throw new Error(body || ('HTTP ' + res.status));
      }
    }
    return body ? JSON.parse(body) : null;
  }

  async function refreshBalanceLikeWithdrawPage(userId, currentCurrency) {
    // your withdraw.html reads wallet_balances usdt_balance (demo). Keep same behavior.
    var rows = await sbGet('wallet_balances?select=usdt_balance,usdt_reserved&user_id=eq.' + encodeURIComponent(userId) + '&limit=1');
    var bal = 0;
    if (Array.isArray(rows) && rows[0]) bal = parseFloat(rows[0].usdt_balance || 0) || 0;

    var availableVal = document.getElementById('availableVal');
    if (availableVal) availableVal.textContent = bal.toFixed(2) + ' ' + (currentCurrency || 'USDT');
    return bal;
  }

  // ---------- UI: popups ----------
  function modalBase(title, bodyNode, buttons) {
    var overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.55)';
    overlay.style.zIndex = '99999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding = '16px';

    var card = document.createElement('div');
    card.style.width = 'min(420px, 100%)';
    card.style.background = 'rgba(18, 34, 45, 0.95)';
    card.style.border = '1px solid rgba(255,255,255,0.10)';
    card.style.borderRadius = '16px';
    card.style.padding = '16px';
    card.style.color = '#e9f1f5';
    card.style.boxShadow = '0 12px 40px rgba(0,0,0,0.45)';

    var h = document.createElement('div');
    h.textContent = title;
    h.style.fontSize = '16px';
    h.style.fontWeight = '700';
    h.style.marginBottom = '10px';

    var bodyWrap = document.createElement('div');
    bodyWrap.style.marginBottom = '14px';
    bodyWrap.appendChild(bodyNode);

    var row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '10px';
    row.style.justifyContent = 'flex-end';
    row.style.flexWrap = 'wrap';

    buttons.forEach(function (b) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = b.label;
      btn.style.borderRadius = '12px';
      btn.style.padding = '10px 12px';
      btn.style.border = '1px solid rgba(255,255,255,0.14)';
      btn.style.background = b.primary ? 'rgba(0,255,255,0.18)' : 'transparent';
      btn.style.color = '#e9f1f5';
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', function () { b.onClick(); });
      row.appendChild(btn);
    });

    card.appendChild(h);
    card.appendChild(bodyWrap);
    card.appendChild(row);
    overlay.appendChild(card);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        // click outside = cancel if provided
        var cancel = buttons.find(function (x) { return x.cancel; });
        if (cancel) cancel.onClick();
      }
    });

    document.body.appendChild(overlay);
    return {
      close: function () { try { document.body.removeChild(overlay); } catch (_e) {} }
    };
  }

  function showMissingEmailPopup() {
    return new Promise(function (resolve) {
      var p = document.createElement('div');
      p.textContent = 'لازم تضيفي إيميل قبل السحب.';

      var m = modalBase('Email Required', p, [
        {
          label: 'أضيف الإيميل هلا',
          primary: true,
          onClick: function () { m.close(); resolve('go'); }
        },
        {
          label: 'إلغاء',
          cancel: true,
          onClick: function () { m.close(); resolve('cancel'); }
        }
      ]);
    });
  }

  function showCodePopup(email) {
    return new Promise(function (resolve) {
      var wrap = document.createElement('div');

      var txt = document.createElement('div');
      txt.textContent = 'دخلّي كود التحقق المرسل إلى: ' + email;
      txt.style.marginBottom = '10px';

      var input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.placeholder = '6-digit code';
      input.maxLength = 6;
      input.style.width = '100%';
      input.style.padding = '12px';
      input.style.borderRadius = '12px';
      input.style.border = '1px solid rgba(255,255,255,0.14)';
      input.style.background = 'rgba(0,0,0,0.15)';
      input.style.color = '#e9f1f5';
      input.autofocus = true;

      var err = document.createElement('div');
      err.style.color = '#ffb4b4';
      err.style.fontSize = '13px';
      err.style.marginTop = '8px';
      err.style.minHeight = '18px';

      wrap.appendChild(txt);
      wrap.appendChild(input);
      wrap.appendChild(err);

      var m = modalBase('Email Verification', wrap, [
        {
          label: 'تأكيد',
          primary: true,
          onClick: function () {
            var code = (input.value || '').trim();
            if (!/^\d{6}$/.test(code)) {
              err.textContent = 'لازم كود من 6 أرقام.';
              return;
            }
            m.close();
            resolve(code);
          }
        },
        {
          label: 'إلغاء',
          cancel: true,
          onClick: function () { m.close(); resolve(''); }
        }
      ]);

      setTimeout(function(){ try { input.focus(); } catch(_e){} }, 0);
    });
  }

  // ---------- Core withdraw handler ----------
  async function handleWithdrawClick(e) {
    // stop existing doWithdraw in withdraw.html
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    // if address script blocked (it sets window.__withdraw_blocked__ briefly)
    if (window.__withdraw_blocked__) return;

    var qtyInput = document.getElementById('qtyInput');
    var withdrawBtn = document.getElementById('withdrawBtn');
    var currentCurrency = (document.getElementById('currencyValue')?.textContent || 'USDT').trim().toUpperCase();
    var currentNetwork = (document.body.dataset.withdrawNetwork || 'TRC20').trim().toUpperCase();

    var storedEmail = getStoredEmail();
    if (!storedEmail) {
      var r = await showMissingEmailPopup();
      if (r === 'go') window.location.href = '/security-center';
      return;
    }

    // amount checks
    var amount = parseFloat(qtyInput && qtyInput.value || '0');
    if (!isFinite(amount) || amount <= 0) {
      alert('Enter a valid amount.');
      return;
    }
    if (amount < MIN_WITHDRAW) {
      alert('Minimum withdrawal is ' + MIN_WITHDRAW + ' ' + currentCurrency + '.');
      return;
    }

    var userId = await getUserId();
    if (!userId) {
      alert('Please login again.');
      return;
    }

    // balance check like the page does (optional but keeps behavior)
    var maxAvailable = 0;
    try { maxAvailable = await refreshBalanceLikeWithdrawPage(userId, currentCurrency); } catch (_e) {}
    if (amount > maxAvailable + 1e-9) {
      alert('Insufficient balance.');
      return;
    }

    // address: use the selected address script result if present
    var addr = (window.__withdraw_selected_address__ || '').trim();
    if (!addr) {
      // fallback: try to read from visible label (addressValue)
      var addressValue = document.getElementById('addressValue');
      if (addressValue) addr = (addressValue.textContent || '').trim();
    }
    if (!addr || addr.length < 5 || /please select/i.test(addr)) {
      alert('Please select an address.');
      return;
    }

    withdrawBtn && (withdrawBtn.disabled = true);

    try {
      // Step 3: send code then verify then submit RPC
      await sendEmailCodeEdge(storedEmail);
      var code = await showCodePopup(storedEmail);
      if (!code) return;

      await confirmEmailCodeEdge(storedEmail, code);

      var reqId = await sbRpc('request_withdrawal', {
        p_user: userId,
        p_amount: amount,
        p_currency: currentCurrency.toLowerCase(),
        p_network: currentNetwork.toLowerCase(),
        p_address: addr
      });

      try { await refreshBalanceLikeWithdrawPage(userId, currentCurrency); } catch (_e2) {}
      alert('Withdrawal request submitted. Request ID: ' + reqId);

      if (qtyInput) qtyInput.value = '';
      // update fee/received values if your other script is present
      try {
        var ev = new Event('input', { bubbles: true });
        qtyInput && qtyInput.dispatchEvent(ev);
      } catch (_e3) {}
    } catch (err) {
      alert(String(err && err.message ? err.message : err));
    } finally {
      withdrawBtn && (withdrawBtn.disabled = false);
    }
  }

  function init() {
    var withdrawBtn = document.getElementById('withdrawBtn');
    if (!withdrawBtn) return;

    // capture=true so we run BEFORE withdraw.html doWithdraw
    withdrawBtn.addEventListener('click', handleWithdrawClick, true);
  }

  init();
})();
