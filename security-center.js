(function () {
  'use strict';

  async function getCurrentUserIdAsync() {
    try {
      if (window.ExaAuth && typeof window.ExaAuth.ensureSupabaseUserId === 'function') {
        var id = await window.ExaAuth.ensureSupabaseUserId();
        if (id) return String(id);
      }
    } catch (e) {}

    try {
      return String(localStorage.getItem('currentUserId') || localStorage.getItem('sb_user_id_v1') || '');
    } catch (e) {
      return '';
    }
  }

  var SB = window.SB_CONFIG;

  function ensureConfig() {
    if (!SB || !SB.url || !SB.headers) throw new Error('Supabase config not loaded');
  }

  async function sbFetch(path, opts) {
    ensureConfig();
    var res = await fetch(SB.url + path, Object.assign({ headers: SB.headers() }, opts || {}));
    var text = '';
    var data = null;

    try { data = await res.json(); }
    catch (_e) { try { text = await res.text(); } catch (__e) {} }

    if (!res.ok) {
      var msg = '';
      if (data && (data.message || data.error)) msg = String(data.message || data.error);
      else if (text) msg = text;
      else msg = 'Request failed: ' + res.status;

      var err = new Error(msg);
      err.status = res.status;
      err.payload = data || text;
      throw err;
    }
    return data;
  }

  async function rpc(name, body) {
    return sbFetch('/rest/v1/rpc/' + encodeURIComponent(name), {
      method: 'POST',
      body: JSON.stringify(body || {})
    });
  }
  async function callEdge(fnName, body) {
    ensureConfig();
    var url = SB.url + '/functions/v1/' + fnName;
    var res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: Object.assign({}, SB.headers(), { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body || {})
      });
    } catch (e) {
      var err = new Error((e && e.message) ? e.message : 'Load failed');
      err.status = 0;
      throw err;
    }

    var data = null;
    var text = '';
    try { data = await res.json(); }
    catch (_e) { try { text = await res.text(); } catch (__e) {} }

    if (!res.ok) {
      var msg = '';
      if (data && (data.error || data.message)) msg = String(data.error || data.message);
      else if (text) msg = text;
      else msg = 'Request failed: ' + res.status;

      var err2 = new Error(msg);
      err2.status = res.status;
      err2.payload = data || text;
      throw err2;
    }
    return data;
  }



  async function fetchUserRow(userId) {
    var rows = await sbFetch('/rest/v1/users?select=id,email,email_verified&' +
      'id=eq.' + encodeURIComponent(userId) + '&limit=1', { method: 'GET' });
    return (Array.isArray(rows) && rows[0]) ? rows[0] : null;
  }

  async function ensureUserExists(userId) {
    try {
      var u = await fetchUserRow(userId);
      return !!u;
    } catch (_e) {
      return false;
    }
  }


  var toastEl = document.getElementById('toast');
  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('toast-visible');
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(function () {
      toastEl.classList.remove('toast-visible');
    }, 2400);
  }

  function openModal(key) {
    var el = document.getElementById('modal-' + key);
    if (el) el.classList.add('is-visible');
    if (key === 'email') setupEmailState();
  }
  function closeModal(key) {
    var el = document.getElementById('modal-' + key);
    if (el) el.classList.remove('is-visible');
  }

  document.querySelectorAll('.modal-backdrop').forEach(function (backdrop) {
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) backdrop.classList.remove('is-visible');
    });
  });

  document.querySelectorAll('.modal-close').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-close');
      if (key) closeModal(key);
    });
  });

  document.querySelectorAll('.security-item.is-clickable').forEach(function (item) {
    item.addEventListener('click', function () {
      var key = item.getAttribute('data-security');
      if (key) openModal(key);
    });
  });

  // LOGIN PASSWORD
  // RPC: set_or_change_login_password(p_current text, p_new text, p_user uuid) returns boolean
  var lpNew = document.getElementById('lp-new');
  var lpConfirm = document.getElementById('lp-confirm');
  var lpCurrent = document.getElementById('lp-current');
  var lpSubmit = document.getElementById('lp-submit');

  function validateLoginPassword() {
    var newVal = (lpNew && lpNew.value) ? lpNew.value : '';
    var confirmVal = (lpConfirm && lpConfirm.value) ? lpConfirm.value : '';

    var newError = '';
    var confirmError = '';

    if (newVal.length && newVal.length < 8) newError = 'Password must be at least 8 characters.';
    if (lpConfirm) lpConfirm.disabled = newVal.length < 8;

    if (lpConfirm && !lpConfirm.disabled && confirmVal && confirmVal !== newVal) confirmError = 'Passwords do not match.';

    var newErrEl = document.getElementById('lp-new-error');
    var confErrEl = document.getElementById('lp-confirm-error');
    if (newErrEl) newErrEl.textContent = newError;
    if (confErrEl) confErrEl.textContent = confirmError;

    if (lpSubmit) lpSubmit.disabled = !(newVal.length >= 8 && confirmVal === newVal);
  }

  if (lpNew && lpConfirm) {
    lpNew.addEventListener('input', validateLoginPassword);
    lpConfirm.addEventListener('input', validateLoginPassword);
    if (lpCurrent) lpCurrent.addEventListener('input', validateLoginPassword);
  }

  if (lpSubmit) {
    lpSubmit.addEventListener('click', async function () {
      if (lpSubmit.disabled) return;

      var userId = await getCurrentUserIdAsync();
      if (!userId) return showToast('Please login first');
      var exists = await ensureUserExists(userId);
      if (!exists) return showToast('Session invalid. Please login again');
      var exists = await ensureUserExists(userId);
      if (!exists) return showToast('Session invalid. Please login again');
      var exists = await ensureUserExists(userId);
      if (!exists) return showToast('Session invalid. Please login again');
      var exists = await ensureUserExists(userId);
      if (!exists) return showToast('Session invalid. Please login again');

      lpSubmit.disabled = true;
      try {
        var ok = await rpc('set_or_change_login_password', {
          p_current: (lpCurrent ? lpCurrent.value : ''),
          p_new: lpNew.value,
          p_user: userId
        });

        if (ok === true || ok === 't') {
          showToast('Login password updated');
          lpNew.value = ''; lpConfirm.value = '';
          if (lpCurrent) lpCurrent.value = '';
          validateLoginPassword();
          closeModal('login-password');
        } else {
          showToast('Wrong current password');
        }
      } catch (e) {
        showToast((e && e.message) ? e.message : 'Update failed');
      } finally {
        lpSubmit.disabled = false;
      }
    });
  }

  // FUND PASSWORD
  // RPC (preferred): set_fund_password(p_user uuid, p_login text, p_new_fund text) returns boolean
  // Fallback (if your SQL uses different param name): p_new
  var fpNew = document.getElementById('fp-new');
  var fpConfirm = document.getElementById('fp-confirm');
  var fpLogin = document.getElementById('fp-login');
  var fpSubmit = document.getElementById('fp-submit');

  function isSixDigits(v) { return /^\d{6}$/.test(v || ''); }

  function validateFundPassword() {
    var newVal = (fpNew && fpNew.value) ? fpNew.value : '';
    var confirmVal = (fpConfirm && fpConfirm.value) ? fpConfirm.value : '';
    var loginVal = (fpLogin && fpLogin.value) ? fpLogin.value : '';

    var newError = '';
    var confirmError = '';
    var loginError = '';

    if (newVal.length && !isSixDigits(newVal)) newError = 'Fund password must be 6 digits.';
    if (fpConfirm) fpConfirm.disabled = !isSixDigits(newVal);

    if (fpConfirm && !fpConfirm.disabled && confirmVal && confirmVal !== newVal) confirmError = 'Passwords do not match.';
    if (loginVal && loginVal.length < 8) loginError = 'Login password must be at least 8 characters.';

    var ne = document.getElementById('fp-new-error');
    var ce = document.getElementById('fp-confirm-error');
    var le = document.getElementById('fp-login-error');
    if (ne) ne.textContent = newError;
    if (ce) ce.textContent = confirmError;
    if (le) le.textContent = loginError;

    if (fpSubmit) fpSubmit.disabled = !(isSixDigits(newVal) && confirmVal === newVal && loginVal.length >= 8);
  }

  if (fpNew && fpConfirm && fpLogin) {
    fpNew.addEventListener('input', validateFundPassword);
    fpConfirm.addEventListener('input', validateFundPassword);
    fpLogin.addEventListener('input', validateFundPassword);
  }

  async function callSetFundPassword(userId, loginPassword, fundPassword) {
    try {
      return await rpc('set_fund_password', { p_user: userId, p_login: loginPassword, p_new_fund: fundPassword });
    } catch (e1) {
      // fallback param name for older SQL versions
      try {
        return await rpc('set_fund_password', { p_user: userId, p_login: loginPassword, p_new: fundPassword });
      } catch (e2) {
        throw e1;
      }
    }
  }

  if (fpSubmit) {
    fpSubmit.addEventListener('click', async function () {
      if (fpSubmit.disabled) return;

      var userId = await getCurrentUserIdAsync();
      if (!userId) return showToast('Please login first');

      fpSubmit.disabled = true;
      try {
        var ok = await callSetFundPassword(userId, fpLogin.value, fpNew.value);

        if (ok === true || ok === 't') {
          showToast('Fund password set');
          fpNew.value = ''; fpConfirm.value = ''; fpLogin.value = '';
          validateFundPassword();
          closeModal('fund-password');
        } else {
          showToast('Wrong login password or fund already set');
        }
      } catch (e) {
        showToast((e && e.message) ? e.message : 'Update failed');
      } finally {
        fpSubmit.disabled = false;
      }
    });
  }

  // EMAIL
  var emailModalTitle = document.getElementById('email-modal-title');
  var emailStateNew = document.getElementById('email-state-new');
  var emailStateChange = document.getElementById('email-state-change');
  var emEmail = document.getElementById('em-email');
  var emSend = document.getElementById('em-send');
  var emCode = document.getElementById('em-code');
  var emPassword = document.getElementById('em-password');
  var emSubmit = document.getElementById('em-submit');

  function validateEmailFormat(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '');
  }

  function resetEmailErrors() {
    ['em-email-error','em-code-error','em-password-error'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = '';
    });
  }

  async function setupEmailState() {
    var userId = await getCurrentUserIdAsync();
    if (emailModalTitle) emailModalTitle.textContent = 'Set Email';
    if (emailStateNew) emailStateNew.style.display = 'block';
    if (emailStateChange) emailStateChange.style.display = 'none';

    if (!userId) { resetEmailErrors(); updateEmailSubmitState(); return; }

    try {
      var u = await fetchUserRow(userId);
      if (u && u.email && emEmail) emEmail.value = u.email;
    } catch (_e) {}
    resetEmailErrors();
    updateEmailSubmitState();
  }

  function updateEmailSubmitState() {
    var emailVal = emEmail ? emEmail.value : '';
    var codeVal = emCode ? emCode.value : '';
    var passVal = emPassword ? emPassword.value : '';
    var enabled = validateEmailFormat(emailVal) && String(codeVal || '').length === 6 && passVal.length >= 8;
    if (emSubmit) emSubmit.disabled = !enabled;
  }

  ['input','change'].forEach(function (evt) {
    if (emEmail) emEmail.addEventListener(evt, updateEmailSubmitState);
    if (emCode) emCode.addEventListener(evt, updateEmailSubmitState);
    if (emPassword) emPassword.addEventListener(evt, updateEmailSubmitState);
  });

  if (emSend) {
    emSend.addEventListener('click', async function () {
      var userId = await getCurrentUserIdAsync();
      if (!userId) return showToast('Please login first');

      var emailVal = (emEmail.value || '').trim();
      resetEmailErrors();
      if (!validateEmailFormat(emailVal)) {
        var ee = document.getElementById('em-email-error');
        if (ee) ee.textContent = 'Enter a valid email.';
        return;
      }

      emSend.disabled = true;
      try {
        await callEdge('send_email_code', { user_id: userId, email: emailVal });
        showToast('Verification code sent');
      } catch (e) {
        var ee2 = document.getElementById('em-email-error');
        if (ee2) ee2.textContent = String(e && e.message ? e.message : e);
      } finally {
        emSend.disabled = false;
      }
    });
  }

  if (emSubmit) {
    emSubmit.addEventListener('click', async function () {
      if (emSubmit.disabled) return;

      var userId = await getCurrentUserIdAsync();
      if (!userId) return showToast('Please login first');

      var codeVal = (emCode.value || '').trim();
      resetEmailErrors();
var passVal = (emPassword && emPassword.value) ? String(emPassword.value || '') : '';
if (!passVal || passVal.length < 8) {
  var pe0 = document.getElementById('em-password-error');
  if (pe0) pe0.textContent = 'Enter login password.';
  return;
}


      emSubmit.disabled = true;
      try {
        await callEdge('confirm_email_code', { user_id: userId, email: (emEmail ? String(emEmail.value || '').trim() : ''), code: codeVal });
        showToast('Email verified');
        emCode.value = '';
        closeModal('email');
      } catch (e) {
        var ce2 = document.getElementById('em-code-error');
        if (ce2) ce2.textContent = String(e && e.message ? e.message : e);
      } finally {
        emSubmit.disabled = false;
        updateEmailSubmitState();
      }
    });
  }

  updateEmailSubmitState();
  validateLoginPassword();
  validateFundPassword();
})();