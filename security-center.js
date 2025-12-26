(function () {
  'use strict';

  // Requires: sb-config.js (window.SB_CONFIG)
  // Optional: auth.js (sets sb_user_id_v1)
  function getCurrentUserId() {
    try {
      return String(
        localStorage.getItem('sb_user_id_v1') ||
        localStorage.getItem('currentUserId') ||
        ''
      );
    } catch (e) { return ''; }
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
    return sbFetch('/rest/v1/rpc/' + encodeURIComponent(name), {
      method: 'POST',
      body: JSON.stringify(body || {})
    });
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
      if (!key) return;
      openModal(key);
    });
  });

  // -------------------------
  // LOGIN PASSWORD (DB)
  // -------------------------
  const lpNew = document.getElementById('lp-new');
  const lpConfirm = document.getElementById('lp-confirm');
  const lpCurrent = document.getElementById('lp-current');
  const lpSubmit = document.getElementById('lp-submit');

  function validateLoginPassword() {
    const newVal = lpNew.value || '';
    const confirmVal = lpConfirm.value || '';
    const currentVal = lpCurrent.value || '';

    let newError = '';
    let confirmError = '';
    let currentError = '';

    if (newVal.length && newVal.length < 8) newError = 'Password must be at least 8 characters.';
    lpConfirm.disabled = newVal.length < 8;

    if (!lpConfirm.disabled && confirmVal && confirmVal !== newVal) confirmError = 'Passwords do not match.';
    if (currentVal && currentVal.length < 8) currentError = 'Current password must be at least 8 characters.';

    document.getElementById('lp-new-error').textContent = newError;
    document.getElementById('lp-confirm-error').textContent = confirmError;
    document.getElementById('lp-current-error').textContent = currentError;

    const canSubmit = newVal.length >= 8 && confirmVal === newVal && currentVal.length >= 8;
    lpSubmit.disabled = !canSubmit;
  }

  if (lpNew && lpConfirm && lpCurrent) {
    lpNew.addEventListener('input', validateLoginPassword);
    lpConfirm.addEventListener('input', validateLoginPassword);
    lpCurrent.addEventListener('input', validateLoginPassword);
  }

  if (lpSubmit) {
    lpSubmit.addEventListener('click', async function () {
      if (lpSubmit.disabled) return;
      const userId = getCurrentUserId();
      if (!userId) return showToast('Please login first');

      lpSubmit.disabled = true;
      try {
        const ok = await rpc('change_login_password', { p_user: userId, p_old: lpCurrent.value, p_new: lpNew.value });
        if (ok === true || ok === 't') {
          showToast('Login password updated');
          lpNew.value = ''; lpConfirm.value = ''; lpCurrent.value = '';
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

  // -------------------------
  // FUND PASSWORD (DB)
  // -------------------------
  const fpNew = document.getElementById('fp-new');
  const fpConfirm = document.getElementById('fp-confirm');
  const fpLogin = document.getElementById('fp-login'); // UI only
  const fpSubmit = document.getElementById('fp-submit');

  function isSixDigits(value) { return /^\d{6}$/.test(value); }

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

    document.getElementById('fp-new-error').textContent = newError;
    document.getElementById('fp-confirm-error').textContent = confirmError;
    document.getElementById('fp-login-error').textContent = loginError;

    const canSubmit = isSixDigits(newVal) && confirmVal === newVal && loginVal.length >= 8;
    fpSubmit.disabled = !canSubmit;
  }

  if (fpNew && fpConfirm && fpLogin) {
    fpNew.addEventListener('input', validateFundPassword);
    fpConfirm.addEventListener('input', validateFundPassword);
    fpLogin.addEventListener('input', validateFundPassword);
  }

  if (fpSubmit) {
    fpSubmit.addEventListener('click', async function () {
      if (fpSubmit.disabled) return;
      const userId = getCurrentUserId();
      if (!userId) return showToast('Please login first');

      fpSubmit.disabled = true;
      try {
        // NOTE: login password field is UI-only here.
        const ok = await rpc('change_fund_password', { p_user: userId, p_old: '', p_new: fpNew.value });
        if (ok === true || ok === 't') {
          showToast('Fund password updated');
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

  // -------------------------
  // EMAIL (DB via email_verifications)
  // -------------------------
  const emailModalTitle = document.getElementById('email-modal-title');
  const emailStateNew = document.getElementById('email-state-new');
  const emailStateChange = document.getElementById('email-state-change');
  const emEmail = document.getElementById('em-email');
  const emSend = document.getElementById('em-send');
  const emCode = document.getElementById('em-code');
  const emPassword = document.getElementById('em-password');
  const emSubmit = document.getElementById('em-submit');

  // Change state UI elements exist but we keep "Set Email" only for now (DB truth)
  function validateEmailFormat(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');
  }

  function resetEmailErrors() {
    const ids = [
      'em-email-error','em-code-error','em-password-error',
      'em-old-email-error','em-old-code-error',
      'em-new-email-error','em-new-code-error',
      'em-change-password-error'
    ];
    ids.forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });
  }

  async function setupEmailState() {
    const userId = getCurrentUserId();
    if (!userId) {
      if (emailModalTitle) emailModalTitle.textContent = 'Set Email';
      if (emailStateNew) emailStateNew.style.display = 'block';
      if (emailStateChange) emailStateChange.style.display = 'none';
      resetEmailErrors();
      updateEmailSubmitState();
      return;
    }

    try {
      const u = await fetchUserRow(userId);
      // If email exists, keep UI in "Set Email" mode but prefill and allow verify again.
      if (emailModalTitle) emailModalTitle.textContent = 'Set Email';
      if (emailStateNew) emailStateNew.style.display = 'block';
      if (emailStateChange) emailStateChange.style.display = 'none';
      if (u && u.email && emEmail) emEmail.value = u.email;
    } catch (_e) {}
    resetEmailErrors();
    updateEmailSubmitState();
  }

  function updateEmailSubmitState() {
    // UI requires password field, but backend does not need it now.
    const emailVal = emEmail ? emEmail.value : '';
    const codeVal = emCode ? emCode.value : '';
    const passVal = emPassword ? emPassword.value : '';
    const enabled = validateEmailFormat(emailVal) && codeVal && String(codeVal).length === 6 && passVal.length >= 8;
    if (emSubmit) emSubmit.disabled = !enabled;
  }

  ['input','change'].forEach(function (evt) {
    if (emEmail) emEmail.addEventListener(evt, updateEmailSubmitState);
    if (emCode) emCode.addEventListener(evt, updateEmailSubmitState);
    if (emPassword) emPassword.addEventListener(evt, updateEmailSubmitState);
  });

  if (emSend) {
    emSend.addEventListener('click', async function () {
      const userId = getCurrentUserId();
      if (!userId) return showToast('Please login first');

      const emailVal = (emEmail.value || '').trim();
      resetEmailErrors();
      if (!validateEmailFormat(emailVal)) {
        document.getElementById('em-email-error').textContent = 'Enter a valid email.';
        return;
      }

      emSend.disabled = true;
      try {
        await rpc('request_email_verification', { p_user: userId, p_email: emailVal });
        showToast('Code created');
        document.getElementById('em-email-error').textContent = '';
      } catch (e) {
        document.getElementById('em-email-error').textContent = String(e && e.message ? e.message : e);
      } finally {
        emSend.disabled = false;
      }
    });
  }

  if (emSubmit) {
    emSubmit.addEventListener('click', async function () {
      if (emSubmit.disabled) return;
      const userId = getCurrentUserId();
      if (!userId) return showToast('Please login first');

      const emailVal = (emEmail.value || '').trim();
      const codeVal = (emCode.value || '').trim();

      resetEmailErrors();
      if (!validateEmailFormat(emailVal)) {
        document.getElementById('em-email-error').textContent = 'Enter a valid email.';
        return;
      }
      if (!codeVal || String(codeVal).length !== 6) {
        document.getElementById('em-code-error').textContent = 'Enter 6-digit code.';
        return;
      }

      emSubmit.disabled = true;
      try {
        const ok = await rpc('verify_email_code', { p_user: userId, p_code: codeVal });
        if (ok === true || ok === 't') {
          showToast('Email verified');
          emCode.value = '';
          closeModal('email');
        } else {
          document.getElementById('em-code-error').textContent = 'Incorrect code.';
        }
      } catch (e) {
        document.getElementById('em-code-error').textContent = String(e && e.message ? e.message : e);
      } finally {
        emSubmit.disabled = false;
        updateEmailSubmitState();
      }
    });
  }

  // Initial email submit state
  updateEmailSubmitState();
})();