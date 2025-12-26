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

  const SB = window.SB_CONFIG;

  function ensureConfig() {
    if (!SB || !SB.url || !SB.headers) throw new Error('Supabase config not loaded');
  }

  async function sbFetch(path, opts) {
    ensureConfig();
    const res = await fetch(SB.url + path, Object.assign({ headers: SB.headers() }, opts || {}));
    let data = null;
    try { data = await res.json(); } catch (_e) { data = null; }
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) ? (data.error || data.message) : ('Request failed: ' + res.status);
      const err = new Error(msg);
      err.status = res.status;
      err.payload = data;
      throw err;
    }
    return data;
  }

  async function rpc(name, body) {
    return sbFetch('/rest/v1/rpc/' + encodeURIComponent(name), { method: 'POST', body: JSON.stringify(body || {}) });
  }

  async function fetchUserRow(userId) {
    const rows = await sbFetch('/rest/v1/users?select=id,email,email_verified&' +
      'id=eq.' + encodeURIComponent(userId) + '&limit=1', { method: 'GET' });
    return (Array.isArray(rows) && rows[0]) ? rows[0] : null;
  }

  const toastEl = document.getElementById('toast');
  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('toast-visible');
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(function () {
      toastEl.classList.remove('toast-visible');
    }, 2200);
  }

  function openModal(key) {
    const el = document.getElementById('modal-' + key);
    if (el) el.classList.add('is-visible');
    if (key === 'email') setupEmailState();
  }
  function closeModal(key) {
    const el = document.getElementById('modal-' + key);
    if (el) el.classList.remove('is-visible');
  }

  document.querySelectorAll('.modal-backdrop').forEach(function (backdrop) {
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) backdrop.classList.remove('is-visible');
    });
  });

  document.querySelectorAll('.modal-close').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const key = btn.getAttribute('data-close');
      if (key) closeModal(key);
    });
  });

  document.querySelectorAll('.security-item.is-clickable').forEach(function (item) {
    item.addEventListener('click', function () {
      const key = item.getAttribute('data-security');
      if (key) openModal(key);
    });
  });

  // LOGIN PASSWORD
  // RPC: set_or_change_login_password(p_current text, p_new text, p_user uuid) returns boolean
  const lpNew = document.getElementById('lp-new');
  const lpConfirm = document.getElementById('lp-confirm');
  const lpCurrent = document.getElementById('lp-current');
  const lpSubmit = document.getElementById('lp-submit');

  function validateLoginPassword() {
    const newVal = lpNew.value || '';
    const confirmVal = lpConfirm.value || '';

    let newError = '';
    let confirmError = '';

    if (newVal.length && newVal.length < 8) newError = 'Password must be at least 8 characters.';
    lpConfirm.disabled = newVal.length < 8;

    if (!lpConfirm.disabled && confirmVal && confirmVal !== newVal) confirmError = 'Passwords do not match.';

    const newErrEl = document.getElementById('lp-new-error');
    const confErrEl = document.getElementById('lp-confirm-error');
    if (newErrEl) newErrEl.textContent = newError;
    if (confErrEl) confErrEl.textContent = confirmError;

    lpSubmit.disabled = !(newVal.length >= 8 && confirmVal === newVal);
  }

  if (lpNew && lpConfirm) {
    lpNew.addEventListener('input', validateLoginPassword);
    lpConfirm.addEventListener('input', validateLoginPassword);
    if (lpCurrent) lpCurrent.addEventListener('input', validateLoginPassword);
  }

  if (lpSubmit) {
    lpSubmit.addEventListener('click', async function () {
      if (lpSubmit.disabled) return;

      const userId = await getCurrentUserIdAsync();
      if (!userId) return showToast('Please login first');

      lpSubmit.disabled = true;
      try {
        const ok = await rpc('set_or_change_login_password', {
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
        showToast(e.message || 'Update failed');
      } finally {
        lpSubmit.disabled = false;
      }
    });
  }

  // FUND PASSWORD
  // RPC: set_fund_password(p_user uuid, p_login text, p_new_fund text) returns boolean
  const fpNew = document.getElementById('fp-new');
  const fpConfirm = document.getElementById('fp-confirm');
  const fpLogin = document.getElementById('fp-login');
  const fpSubmit = document.getElementById('fp-submit');

  function isSixDigits(v) { return /^\d{6}$/.test(v || ''); }

  function validateFundPassword() {
    const newVal = fpNew.value || '';
    const confirmVal = fpConfirm.value || '';
    const loginVal = fpLogin.value || '';

    let newError = '';
    let confirmError = '';
    let loginError = '';

    if (newVal.length && !isSixDigits(newVal)) newError = 'Fund password must be 6 digits.';
    fpConfirm.disabled = !isSixDigits(newVal);

    if (!fpConfirm.disabled && confirmVal && confirmVal !== newVal) confirmError = 'Passwords do not match.';
    if (loginVal && loginVal.length < 8) loginError = 'Login password must be at least 8 characters.';

    const ne = document.getElementById('fp-new-error');
    const ce = document.getElementById('fp-confirm-error');
    const le = document.getElementById('fp-login-error');
    if (ne) ne.textContent = newError;
    if (ce) ce.textContent = confirmError;
    if (le) le.textContent = loginError;

    fpSubmit.disabled = !(isSixDigits(newVal) && confirmVal === newVal && loginVal.length >= 8);
  }

  if (fpNew && fpConfirm && fpLogin) {
    fpNew.addEventListener('input', validateFundPassword);
    fpConfirm.addEventListener('input', validateFundPassword);
    fpLogin.addEventListener('input', validateFundPassword);
  }

  if (fpSubmit) {
    fpSubmit.addEventListener('click', async function () {
      if (fpSubmit.disabled) return;

      const userId = await getCurrentUserIdAsync();
      if (!userId) return showToast('Please login first');

      fpSubmit.disabled = true;
      try {
        const ok = await rpc('set_fund_password', { p_user: userId, p_login: fpLogin.value, p_new_fund: fpNew.value });
        if (ok === true || ok === 't') {
          showToast('Fund password set');
          fpNew.value = ''; fpConfirm.value = ''; fpLogin.value = '';
          validateFundPassword();
          closeModal('fund-password');
        } else {
          showToast('Update failed');
        }
      } catch (e) {
        showToast(e.message || 'Update failed');
      } finally {
        fpSubmit.disabled = false;
      }
    });
  }

  // EMAIL
  const emailModalTitle = document.getElementById('email-modal-title');
  const emailStateNew = document.getElementById('email-state-new');
  const emailStateChange = document.getElementById('email-state-change');
  const emEmail = document.getElementById('em-email');
  const emSend = document.getElementById('em-send');
  const emCode = document.getElementById('em-code');
  const emPassword = document.getElementById('em-password');
  const emSubmit = document.getElementById('em-submit');

  function validateEmailFormat(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '');
  }

  function resetEmailErrors() {
    ['em-email-error','em-code-error','em-password-error'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });
  }

  async function setupEmailState() {
    const userId = await getCurrentUserIdAsync();
    if (emailModalTitle) emailModalTitle.textContent = 'Set Email';
    if (emailStateNew) emailStateNew.style.display = 'block';
    if (emailStateChange) emailStateChange.style.display = 'none';

    if (!userId) { resetEmailErrors(); updateEmailSubmitState(); return; }

    try {
      const u = await fetchUserRow(userId);
      if (u && u.email && emEmail) emEmail.value = u.email;
    } catch (_e) {}
    resetEmailErrors();
    updateEmailSubmitState();
  }

  function updateEmailSubmitState() {
    const emailVal = emEmail ? emEmail.value : '';
    const codeVal = emCode ? emCode.value : '';
    const passVal = emPassword ? emPassword.value : '';
    const enabled = validateEmailFormat(emailVal) && String(codeVal || '').length === 6 && passVal.length >= 8;
    if (emSubmit) emSubmit.disabled = !enabled;
  }

  ['input','change'].forEach(function (evt) {
    if (emEmail) emEmail.addEventListener(evt, updateEmailSubmitState);
    if (emCode) emCode.addEventListener(evt, updateEmailSubmitState);
    if (emPassword) emPassword.addEventListener(evt, updateEmailSubmitState);
  });

  if (emSend) {
    emSend.addEventListener('click', async function () {
      const userId = await getCurrentUserIdAsync();
      if (!userId) return showToast('Please login first');

      const emailVal = (emEmail.value || '').trim();
      resetEmailErrors();
      if (!validateEmailFormat(emailVal)) {
        const ee = document.getElementById('em-email-error');
        if (ee) ee.textContent = 'Enter a valid email.';
        return;
      }

      emSend.disabled = true;
      try {
        await rpc('request_email_verification', { p_user: userId, p_email: emailVal });
        showToast('Code created');
      } catch (e) {
        const ee = document.getElementById('em-email-error');
        if (ee) ee.textContent = String(e && e.message ? e.message : e);
      } finally {
        emSend.disabled = false;
      }
    });
  }

  if (emSubmit) {
    emSubmit.addEventListener('click', async function () {
      if (emSubmit.disabled) return;

      const userId = await getCurrentUserIdAsync();
      if (!userId) return showToast('Please login first');

      const codeVal = (emCode.value || '').trim();
      resetEmailErrors();

      emSubmit.disabled = true;
      try {
        const ok = await rpc('verify_email_code', { p_user: userId, p_code: codeVal });
        if (ok === true || ok === 't') {
          showToast('Email verified');
          emCode.value = '';
          closeModal('email');
        } else {
          const ce = document.getElementById('em-code-error');
          if (ce) ce.textContent = 'Incorrect code.';
        }
      } catch (e) {
        const ce = document.getElementById('em-code-error');
        if (ce) ce.textContent = String(e && e.message ? e.message : e);
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