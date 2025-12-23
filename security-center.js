(function () {

      // Supabase Edge Functions email verification
      // Requires: sb-config.js (window.SB_CONFIG) and localStorage.currentUserId
      function getCurrentUserId() {
        try { return String(localStorage.getItem('currentUserId') || ''); } catch (e) { return ''; }
      }
      async function callEdgeFunction(fnName, payload) {
        if (!window.SB_CONFIG || !SB_CONFIG.url || !SB_CONFIG.headers) {
          throw new Error('Supabase config not loaded');
        }
        const res = await fetch(SB_CONFIG.url + '/functions/v1/' + encodeURIComponent(fnName), {
          method: 'POST',
          headers: SB_CONFIG.headers(),
          body: JSON.stringify(payload || {})
        });
        let data = null;
        try { data = await res.json(); } catch (_e) { data = null; }
        if (!res.ok) {
          const msg = data && (data.error || data.message) ? (data.error || data.message) : ('Request failed: ' + res.status);
          throw new Error(msg);
        }
        return data || {};
      }
      async function sendEmailCodeEdge(email) {
        const userId = getCurrentUserId();
        if (!userId) throw new Error('Please login first');
        return callEdgeFunction('send_email_code', { user_id: userId, email });
      }
      async function confirmEmailCodeEdge(email, code) {
        const userId = getCurrentUserId();
        if (!userId) throw new Error('Please login first');
        return callEdgeFunction('confirm_email_code', { user_id: userId, email, code });
      }
      var toastEl = document.getElementById('toast');
      function showToast(message) {
        if (!toastEl) return;
        toastEl.textContent = message;
        toastEl.classList.add('toast-visible');
        window.clearTimeout(showToast._timer);
        showToast._timer = window.setTimeout(function () {
          toastEl.classList.remove('toast-visible');
        }, 2000);
      }

      function openModal(key) {
        var id = 'modal-' + key;
        var el = document.getElementById(id);
        if (el) {
          el.classList.add('is-visible');
        }
        if (key === 'email') {
          setupEmailState();
        }
      }

      function closeModal(key) {
        var id = 'modal-' + key;
        var el = document.getElementById(id);
        if (el) {
          el.classList.remove('is-visible');
        }
      }

      document.querySelectorAll('.modal-backdrop').forEach(function (backdrop) {
        backdrop.addEventListener('click', function (e) {
          if (e.target === backdrop) {
            backdrop.classList.remove('is-visible');
          }
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
          if (!key) return;
          openModal(key);
        });
      });

      // LOGIN PASSWORD LOGIC
      var lpNew = document.getElementById('lp-new');
      var lpConfirm = document.getElementById('lp-confirm');
      var lpCurrent = document.getElementById('lp-current');
      var lpSubmit = document.getElementById('lp-submit');

      function validateLoginPassword() {
        var newVal = lpNew.value || '';
        var confirmVal = lpConfirm.value || '';
        var currentVal = lpCurrent.value || '';

        var newError = '';
        var confirmError = '';
        var currentError = '';

        if (newVal.length && newVal.length < 8) {
          newError = 'Password must be at least 8 characters.';
        }
        lpConfirm.disabled = newVal.length < 8;

        if (!lpConfirm.disabled && confirmVal && confirmVal !== newVal) {
          confirmError = 'Passwords do not match.';
        }

        if (currentVal && currentVal.length < 8) {
          currentError = 'Current password must be at least 8 characters.';
        }

        document.getElementById('lp-new-error').textContent = newError;
        document.getElementById('lp-confirm-error').textContent = confirmError;
        document.getElementById('lp-current-error').textContent = currentError;

        var canSubmit = newVal.length >= 8 &&
          confirmVal === newVal &&
          currentVal.length >= 8;

        lpSubmit.disabled = !canSubmit;
      }

      if (lpNew && lpConfirm && lpCurrent) {
        lpNew.addEventListener('input', validateLoginPassword);
        lpConfirm.addEventListener('input', validateLoginPassword);
        lpCurrent.addEventListener('input', validateLoginPassword);
      }

      if (lpSubmit) {
        lpSubmit.addEventListener('click', function () {
          if (lpSubmit.disabled) return;
          showToast('Login password updated (demo).');
          lpNew.value = '';
          lpConfirm.value = '';
          lpCurrent.value = '';
          validateLoginPassword();
          closeModal('login-password');
        });
      }

      // FUND PASSWORD LOGIC
      var fpNew = document.getElementById('fp-new');
      var fpConfirm = document.getElementById('fp-confirm');
      var fpLogin = document.getElementById('fp-login');
      var fpSubmit = document.getElementById('fp-submit');

      function isSixDigits(value) {
        return /^\d{6}$/.test(value);
      }

      function validateFundPassword() {
        var newVal = fpNew.value || '';
        var confirmVal = fpConfirm.value || '';
        var loginVal = fpLogin.value || '';

        var newError = '';
        var confirmError = '';
        var loginError = '';

        if (newVal.length && !isSixDigits(newVal)) {
          newError = 'Fund password must be 6 digits.';
        }
        fpConfirm.disabled = !isSixDigits(newVal);

        if (!fpConfirm.disabled && confirmVal && confirmVal !== newVal) {
          confirmError = 'Passwords do not match.';
        }

        if (loginVal && loginVal.length < 8) {
          loginError = 'Login password must be at least 8 characters.';
        }

        document.getElementById('fp-new-error').textContent = newError;
        document.getElementById('fp-confirm-error').textContent = confirmError;
        document.getElementById('fp-login-error').textContent = loginError;

        var canSubmit = isSixDigits(newVal) &&
          confirmVal === newVal &&
          loginVal.length >= 8;

        fpSubmit.disabled = !canSubmit;
      }

      if (fpNew && fpConfirm && fpLogin) {
        fpNew.addEventListener('input', validateFundPassword);
        fpConfirm.addEventListener('input', validateFundPassword);
        fpLogin.addEventListener('input', validateFundPassword);
      }

      if (fpSubmit) {
        fpSubmit.addEventListener('click', function () {
          if (fpSubmit.disabled) return;
          showToast('Fund password updated (demo).');
          fpNew.value = '';
          fpConfirm.value = '';
          fpLogin.value = '';
          validateFundPassword();
          closeModal('fund-password');
        });
      }

      // EMAIL LOGIC
      var emailModalTitle = document.getElementById('email-modal-title');
      var emailStateNew = document.getElementById('email-state-new');
      var emailStateChange = document.getElementById('email-state-change');
      var emEmail = document.getElementById('em-email');
      var emSend = document.getElementById('em-send');
      var emCode = document.getElementById('em-code');
      var emPassword = document.getElementById('em-password');
      var emSubmit = document.getElementById('em-submit');

      var emOldEmail = document.getElementById('em-old-email');
      var emOldSend = document.getElementById('em-old-send');
      var emOldCode = document.getElementById('em-old-code');
      var emNewEmail = document.getElementById('em-new-email');
      var emNewSend = document.getElementById('em-new-send');
      var emNewCode = document.getElementById('em-new-code');
      var emChangePassword = document.getElementById('em-change-password');

      var newEmailCode = '';
      var oldEmailCode = '';
      var changeNewEmailCode = '';

      function validateEmailFormat(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      }

      function generateCode() {
        return String(Math.floor(100000 + Math.random() * 900000));
      }

      function setupEmailState() {
        var storedEmail = '';
        try {
          storedEmail = window.localStorage.getItem('userEmail') || '';
        } catch (e) { storedEmail = ''; }

        if (storedEmail) {
          if (emailModalTitle) emailModalTitle.textContent = 'Change Email';
          if (emailStateNew) emailStateNew.style.display = 'none';
          if (emailStateChange) emailStateChange.style.display = 'block';
          if (emOldEmail) emOldEmail.value = storedEmail;
        } else {
          if (emailModalTitle) emailModalTitle.textContent = 'Set Email';
          if (emailStateNew) emailStateNew.style.display = 'block';
          if (emailStateChange) emailStateChange.style.display = 'none';
        }
        resetEmailErrors();
        updateEmailSubmitState();
      }

      function resetEmailErrors() {
        var ids = [
          'em-email-error','em-code-error','em-password-error',
          'em-old-email-error','em-old-code-error',
          'em-new-email-error','em-new-code-error',
          'em-change-password-error'
        ];
        ids.forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.textContent = '';
        });
      }

      function updateEmailSubmitState() {
        var storedEmail = '';
        try {
          storedEmail = window.localStorage.getItem('userEmail') || '';
        } catch (e) { storedEmail = ''; }

        var enabled = false;
        if (!storedEmail) {
          var emailVal = emEmail ? emEmail.value : '';
          var codeVal = emCode ? emCode.value : '';
          var passVal = emPassword ? emPassword.value : '';
          enabled = validateEmailFormat(emailVal) &&
            codeVal && String(codeVal).length === 6 &&
            passVal.length >= 8;
        } else {
          var oldCodeVal = emOldCode ? emOldCode.value : '';
          var newEmailVal = emNewEmail ? emNewEmail.value : '';
          var newCodeVal = emNewCode ? emNewCode.value : '';
          var changePassVal = emChangePassword ? emChangePassword.value : '';
          enabled = validateEmailFormat(newEmailVal) &&
            oldCodeVal && oldCodeVal === oldEmailCode &&
            newCodeVal && newCodeVal === changeNewEmailCode &&
            changePassVal.length >= 8;
        }
        if (emSubmit) emSubmit.disabled = !enabled;
      }

      if (emSend) {
        emSend.addEventListener('click', async function () {
          var emailVal = emEmail.value || '';
          if (!validateEmailFormat(emailVal)) {
            document.getElementById('em-email-error').textContent = 'Enter a valid email.';
            return;
          }
          emSend.disabled = true;
          try {
            await sendEmailCodeEdge(emailVal);
            showToast('Code sent to email.');
            document.getElementById('em-email-error').textContent = '';
          } catch (err) {
            document.getElementById('em-email-error').textContent = String(err && err.message ? err.message : err);
          } finally {
            emSend.disabled = false;
          }
        });
}

      if (emOldSend) {
        emOldSend.addEventListener('click', function () {
          var emailVal = emOldEmail.value || '';
          if (!emailVal) return;
          oldEmailCode = generateCode();
          showToast('Demo code to old email: ' + oldEmailCode);
        });
      }

      if (emNewSend) {
        emNewSend.addEventListener('click', function () {
          var emailVal = emNewEmail.value || '';
          if (!validateEmailFormat(emailVal)) {
            document.getElementById('em-new-email-error').textContent = 'Enter a valid email.';
            return;
          }
          changeNewEmailCode = generateCode();
          showToast('Demo code to new email: ' + changeNewEmailCode);
          document.getElementById('em-new-email-error').textContent = '';
        });
      }

      ['input','change'].forEach(function (evt) {
        if (emEmail) emEmail.addEventListener(evt, updateEmailSubmitState);
        if (emCode) emCode.addEventListener(evt, updateEmailSubmitState);
        if (emPassword) emPassword.addEventListener(evt, updateEmailSubmitState);
        if (emOldCode) emOldCode.addEventListener(evt, updateEmailSubmitState);
        if (emNewEmail) emNewEmail.addEventListener(evt, updateEmailSubmitState);
        if (emNewCode) emNewCode.addEventListener(evt, updateEmailSubmitState);
        if (emChangePassword) emChangePassword.addEventListener(evt, updateEmailSubmitState);
      });

      if (emSubmit) {
        emSubmit.addEventListener('click', async function () {
          if (emSubmit.disabled) return;
          var storedEmail = '';
          try {
            storedEmail = window.localStorage.getItem('userEmail') || '';
          } catch (e) { storedEmail = ''; }

          if (!storedEmail) {
            var emailVal = emEmail.value || '';
            var codeVal = emCode.value || '';
            var passVal = emPassword.value || '';

            resetEmailErrors();
            if (!validateEmailFormat(emailVal)) {
              document.getElementById('em-email-error').textContent = 'Enter a valid email.';
              return;
            }
            if (!codeVal || String(codeVal).length !== 6) {
              document.getElementById('em-code-error').textContent = 'Enter 6-digit code.';
              return;
            }
            try {
              await confirmEmailCodeEdge(emailVal, codeVal);
            } catch (err) {
              document.getElementById('em-code-error').textContent = String(err && err.message ? err.message : err);
              return;
            }
            if (passVal.length < 8) {
              document.getElementById('em-password-error').textContent = 'Password must be at least 8 characters.';
              return;
            }
            try {
              window.localStorage.setItem('userEmail', emailVal);
            } catch (e) {}
            showToast('Email set (demo).');
          } else {
            var oldCodeVal = emOldCode.value || '';
            var newEmailVal = emNewEmail.value || '';
            var newCodeVal = emNewCode.value || '';
            var changePassVal = emChangePassword.value || '';

            resetEmailErrors();
            if (!oldCodeVal || oldCodeVal !== oldEmailCode) {
              document.getElementById('em-old-code-error').textContent = 'Incorrect code.';
              return;
            }
            if (!validateEmailFormat(newEmailVal)) {
              document.getElementById('em-new-email-error').textContent = 'Enter a valid email.';
              return;
            }
            if (!newCodeVal || newCodeVal !== changeNewEmailCode) {
              document.getElementById('em-new-code-error').textContent = 'Incorrect code.';
              return;
            }
            if (changePassVal.length < 8) {
              document.getElementById('em-change-password-error').textContent = 'Password must be at least 8 characters.';
              return;
            }
            try {
              window.localStorage.setItem('userEmail', newEmailVal);
            } catch (e) {}
            showToast('Email updated (demo).');
          }

          if (emEmail) emEmail.value = '';
          if (emCode) emCode.value = '';
          if (emPassword) emPassword.value = '';
          if (emOldCode) emOldCode.value = '';
          if (emNewEmail) emNewEmail.value = '';
          if (emNewCode) emNewCode.value = '';
          if (emChangePassword) emChangePassword.value = '';
          updateEmailSubmitState();
          closeModal('email');
        });
      }
    })();