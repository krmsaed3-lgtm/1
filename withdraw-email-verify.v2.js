
;(function () {
  'use strict';

  // -------- Mobile styled modal (no native confirm) --------
  var __eg_styles_added = false;
  function egEnsureStyles() {
    if (__eg_styles_added) return;
    __eg_styles_added = true;
    var css = `
#egModalRoot{position:fixed;inset:0;z-index:99999;font-family:system-ui,-apple-system}
#egModalRoot.eg-hidden{display:none}
#egModalRoot .eg-overlay{position:absolute;inset:0;background:rgba(0,0,0,.62);backdrop-filter:blur(2px)}
#egModalRoot .eg-card{position:relative;width:min(420px,92vw);margin:28vh auto 0;background:rgba(11,31,42,.96);color:#fff;border:1px solid rgba(255,255,255,.10);border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.45);padding:18px}
#egModalRoot .eg-title{font-size:16px;font-weight:800;margin:0 0 8px}
#egModalRoot .eg-msg{font-size:14px;opacity:.9;margin:0 0 12px;line-height:1.45;white-space:pre-line}
#egModalRoot .eg-actions{display:flex;gap:10px;margin-top:14px}
#egModalRoot .eg-btn{flex:1;padding:12px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#fff;font-size:14px;cursor:pointer}
#egModalRoot .eg-ok{border:none;color:#003b32;font-weight:800;background-image:linear-gradient(90deg,#18c1ff,#22e1a5)}
#egModalRoot .eg-input{width:100%;padding:12px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.18);color:#fff;font-size:16px;outline:none}
#egModalRoot .eg-hint{font-size:12px;opacity:.75;margin-top:8px}
    `.trim();
    var style = document.createElement('style');
    style.id = 'egModalStyles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function egEnsureRoot() {
    egEnsureStyles();
    var root = document.getElementById('egModalRoot');
    if (root) return root;

    root = document.createElement('div');
    root.id = 'egModalRoot';
    root.className = 'eg-hidden';
    root.innerHTML = `
      <div class="eg-overlay"></div>
      <div class="eg-card" role="dialog" aria-modal="true">
        <div class="eg-title" id="egTitle"></div>
        <div class="eg-msg" id="egMsg"></div>
        <div id="egBody"></div>
        <div class="eg-actions">
          <button class="eg-btn" id="egCancel"></button>
          <button class="eg-btn eg-ok" id="egOk"></button>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    root.querySelector('.eg-overlay').addEventListener('click', function () {
      var cancel = document.getElementById('egCancel');
      cancel && cancel.click();
    });

    return root;
  }

  function egOpenConfirm(opts) {
    opts = opts || {};
    var root = egEnsureRoot();
    var title = opts.title || 'تنبيه';
    var msg = opts.msg || '';
    var okText = opts.okText || 'حسنًا';
    var cancelText = opts.cancelText || 'إلغاء';

    document.getElementById('egTitle').textContent = title;
    document.getElementById('egMsg').textContent = msg;

    var body = document.getElementById('egBody');
    body.innerHTML = '';

    document.getElementById('egOk').textContent = okText;
    document.getElementById('egCancel').textContent = cancelText;

    root.classList.remove('eg-hidden');

    return new Promise(function (resolve) {
      var okBtn = document.getElementById('egOk');
      var cancelBtn = document.getElementById('egCancel');

      function cleanup(val) {
        root.classList.add('eg-hidden');
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        resolve(val);
      }

      okBtn.onclick = function () { cleanup(true); };
      cancelBtn.onclick = function () { cleanup(false); };
    });
  }

  function egOpenCodeInput(opts) {
    opts = opts || {};
    var root = egEnsureRoot();
    document.getElementById('egTitle').textContent = opts.title || 'Email Verification';
    document.getElementById('egMsg').textContent = opts.msg || 'اكتبي كود التحقق (6 أرقام):';
    document.getElementById('egOk').textContent = opts.okText || 'تأكيد';
    document.getElementById('egCancel').textContent = opts.cancelText || 'إلغاء';

    var body = document.getElementById('egBody');
    body.innerHTML = '';
    var input = document.createElement('input');
    input.className = 'eg-input';
    input.type = 'text';
    input.inputMode = 'numeric';
    input.placeholder = '123456';
    input.maxLength = 6;

    var hint = document.createElement('div');
    hint.className = 'eg-hint';
    hint.textContent = opts.hint || '';

    body.appendChild(input);
    if (opts.hint) body.appendChild(hint);

    root.classList.remove('eg-hidden');

    return new Promise(function (resolve) {
      var okBtn = document.getElementById('egOk');
      var cancelBtn = document.getElementById('egCancel');

      function cleanup(val) {
        root.classList.add('eg-hidden');
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        resolve(val);
      }

      okBtn.onclick = function () {
        var code = String(input.value || '').trim();
        cleanup(code);
      };
      cancelBtn.onclick = function () { cleanup(''); };

      setTimeout(function(){ try { input.focus(); } catch(e){} }, 0);
    });
  }
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
    var m = t.match(/([0-9]+(?:\.[0-9]+)?)/);
    if (!m) return 0;
    var n = parseFloat(m[1]);
    return isFinite(n) ? n : 0;
  }

  function getCurrency() {
    var cur = (document.body && document.body.dataset && document.body.dataset.withdrawCurrency) ? document.body.dataset.withdrawCurrency : '';
    if (!cur) {
      var el = document.getElementById('currencyValue');
      cur = el ? String(el.textContent || '').trim() : '';
    }
    return (cur || 'USDT').toUpperCase();
  }

  function getNetwork() {
    var net = (document.body && document.body.dataset && document.body.dataset.withdrawNetwork) ? document.body.dataset.withdrawNetwork : '';
    if (!net) net = 'TRC20';
    return String(net || 'TRC20').toUpperCase();
  }

  function getSelectedAddress() {
    var a = (window.__withdraw_selected_address__ != null) ? String(window.__withdraw_selected_address__) : '';
    a = (a || '').trim();
    return a;
  }

  async function ensureEmailOrRedirect() {
    var email = getEmail();
    if (email) return true;

    var go = await egOpenConfirm({
      title: 'تنبيه أمني',
      msg: 'لازم تضيفي الإيميل قبل السحب.',
      okText: 'أضيف الإيميل هلا',
      cancelText: 'رجوع'
    });

    if (go) window.location.href = 'security-center.html';
    else window.location.href = 'my-assets.html';
    return false;
  }

  async function onWithdrawClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    if (processing) return;
    if (!await ensureEmailOrRedirect()) return;

    var amount = parseAmount();
    if (!amount || amount <= 0) {
      await egOpenConfirm({ title:'تنبيه', msg:'أدخلي مبلغ صحيح.', okText:'حسنًا', cancelText:'إغلاق' });
      return;
    }
    if (amount < 20) {
      await egOpenConfirm({ title:'تنبيه', msg:'ممنوع السحب أقل من 20.', okText:'حسنًا', cancelText:'إغلاق' });
      return;
    }

    var available = getAvailable();
    if (amount > available + 1e-9) {
      await egOpenConfirm({ title:'تنبيه', msg:'الرصيد غير كافي.', okText:'حسنًا', cancelText:'إغلاق' });
      return;
    }

    var addr = getSelectedAddress();
    if (!addr || addr.length < 5) {
      await egOpenConfirm({ title:'تنبيه', msg:'اختاري عنوان السحب أولاً.', okText:'حسنًا', cancelText:'إغلاق' });
      return;
    }

    var email = getEmail();
    var btn = document.getElementById('withdrawBtn');

    processing = true;
    if (btn) btn.disabled = true;

    try {
      await sendEmailCode(email);

      var code = await egOpenCodeInput({
        title: 'Email Verification',
        msg: 'تم إرسال كود تحقق على الإيميل.\nاكتبي الكود (6 أرقام):',
        okText: 'تأكيد',
        cancelText: 'إلغاء',
        hint: 'إذا ما وصلك الكود، شيّكي Spam.'
      });

      if (!code) throw new Error('Cancelled');
      if (!/^\d{6}$/.test(code)) throw new Error('Invalid code');

      await confirmEmailCode(email, code);

      if (!window.DemoWallet || typeof window.DemoWallet.requestWithdrawal !== 'function') {
        throw new Error('Wallet helper not loaded');
      }

      var cur = getCurrency();
      var net = getNetwork();

      await window.DemoWallet.requestWithdrawal({
        amount: amount,
        currency: cur.toLowerCase(),
        network: net.toLowerCase(),
        address: addr
      });

      await egOpenConfirm({ title:'نجاح', msg:'تم إرسال طلب السحب ✅', okText:'تمام', cancelText:'إغلاق' });

      var qtyInput = document.getElementById('qtyInput');
      if (qtyInput) qtyInput.value = '';
    } catch (err) {
      var msg = (err && err.message) ? err.message : String(err);
      if (msg === 'Cancelled') msg = 'تم الإلغاء.';
      if (msg === 'Invalid code') msg = 'الكود لازم يكون 6 أرقام.';
      await egOpenConfirm({ title:'خطأ', msg: msg, okText:'حسنًا', cancelText:'إغلاق' });
    } finally {
      processing = false;
      if (btn) btn.disabled = false;
    }
  }

  async function init() {
    if (!await ensureEmailOrRedirect()) return;
    var btn = document.getElementById('withdrawBtn');
    if (!btn) return;
    btn.addEventListener('click', onWithdrawClick, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ init(); });
  } else {
    init();
  }
})();
