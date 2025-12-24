
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
function hasEmail() {
    try { return String(localStorage.getItem('userEmail') || '').trim().length > 0; } catch (e) { return false; }
  }

  function isWithdrawIntentFromClick(target) {
    if (!target) return false;

    var btn = target.closest && target.closest('[data-action]');
    if (btn) {
      var act = String(btn.getAttribute('data-action') || '').trim().toLowerCase();
      if (act === 'withdraw' || act === 'transfer') return true;
    }

    var item = target.closest && target.closest('.actions .action-item');
    if (item) {
      var label = String(item.textContent || '').trim().toLowerCase();
      if (label.indexOf('transfer') !== -1 || label.indexOf('withdraw') !== -1) return true;
    }

    var a = target.closest && target.closest('a[href*="withdraw"]');
    if (a) return true;

    return false;
  }

  async function onClick(e) {
    if (hasEmail()) return;
    if (!isWithdrawIntentFromClick(e.target)) return;

    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
	
var go = await egOpenConfirm({
  title: 'Security Notice',
  msg: 'Please add your email address before proceeding to the withdrawal page.',
  okText: 'Add Email',
  cancelText: 'Cancel'
});

    if (go) window.location.href = 'security-center.html';
  }

  document.addEventListener('click', onClick, true);
})();
