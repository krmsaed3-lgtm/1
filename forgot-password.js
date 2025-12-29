/* Forgot Password page logic (no Arabic in code) */
(function () {
  'use strict';

  var SB = window.SB_CONFIG || null;
  var toastEl = document.getElementById('toast');

  function showToast(msg) {
    try {
      toastEl.textContent = msg;
      toastEl.style.display = 'block';
      clearTimeout(showToast._t);
      showToast._t = setTimeout(function () { toastEl.style.display = 'none'; }, 2400);
    } catch (_) {}
  }

  function setDots(stepIndex) {
    var ids = ['dot1', 'dot2', 'dot3', 'dot4'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (!el) continue;
      el.style.width = (i < stepIndex ? '100%' : '0%');
    }
  }

  function setStep(stepId) {
    var steps = document.querySelectorAll('.step');
    steps.forEach(function (s) { s.classList.remove('active'); });
    var el = document.getElementById(stepId);
    if (el) el.classList.add('active');

    if (stepId === 'stepPhone') setDots(1);
    else if (stepId === 'stepEmail') setDots(2);
    else if (stepId === 'stepVerify') setDots(3);
    else if (stepId === 'stepReset') setDots(4);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function sha256Hex(str) {
    var enc = new TextEncoder().encode(str);
    var buf = await crypto.subtle.digest('SHA-256', enc);
    var arr = Array.from(new Uint8Array(buf));
    return arr.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function sbHeaders() {
    if (!SB) throw new Error('Missing SB_CONFIG');
    return {
      'apikey': SB.anonKey,
      'Authorization': 'Bearer ' + SB.anonKey,
      'Content-Type': 'application/json'
    };
  }

  async function safeText(res) {
    try { return await res.text(); } catch (_) { return 'Request failed'; }
  }

  async function sbGet(path) {
    var url = SB.url.replace(/\/$/, '') + path;
    var res = await fetch(url, { method: 'GET', headers: sbHeaders() });
    if (!res.ok) throw new Error(await safeText(res));
    return await res.json();
  }

  async function sbPost(path, body) {
    var url = SB.url.replace(/\/$/, '') + path;
    var res = await fetch(url, { method: 'POST', headers: sbHeaders(), body: JSON.stringify(body || {}) });
    if (!res.ok) throw new Error(await safeText(res));
    var text = await res.text();
    try { return text ? JSON.parse(text) : null; } catch (_) { return text; }
  }

  async function sbPatch(path, body) {
    var url = SB.url.replace(/\/$/, '') + path;
    var res = await fetch(url, { method: 'PATCH', headers: sbHeaders(), body: JSON.stringify(body || {}) });
    if (!res.ok) throw new Error(await safeText(res));
    return true;
  }

  async function findUserByPhone(fullPhone) {
    var q = '/rest/v1/users?select=id,phone,email&phone=eq.' + encodeURIComponent(fullPhone) + '&limit=1';
    var rows = await sbGet(q);
    return (rows && rows.length) ? rows[0] : null;
  }

  async function rpc(fnName, args) {
    return await sbPost('/rest/v1/rpc/' + encodeURIComponent(fnName), args || {});
  }

  // Elements
  var btnBack = document.getElementById('btnBack');

  var dialCodeEl = document.getElementById('dialCode');
  var phoneEl = document.getElementById('phone');
  var phoneErr = document.getElementById('phoneErr');
  var btnFind = document.getElementById('btnFind');

  var foundPhoneEl = document.getElementById('foundPhone');
  var btnBackToPhone = document.getElementById('btnBackToPhone');
  var emailEl = document.getElementById('email');
  var emailErr = document.getElementById('emailErr');
  var btnSendCode = document.getElementById('btnSendCode');

  var codeEl = document.getElementById('code');
  var codeErr = document.getElementById('codeErr');
  var btnVerify = document.getElementById('btnVerify');
  var btnBackToEmail = document.getElementById('btnBackToEmail');

  var newPassEl = document.getElementById('newPass');
  var newPass2El = document.getElementById('newPass2');
  var passErr = document.getElementById('passErr');
  var btnReset = document.getElementById('btnReset');
  var btnBackToVerify = document.getElementById('btnBackToVerify');

  var state = {
    userId: null,
    phone: null,
    email: null,
    verified: false
  };

  function clearErrors() {
    if (phoneErr) phoneErr.textContent = '';
    if (emailErr) emailErr.textContent = '';
    if (codeErr) codeErr.textContent = '';
    if (passErr) passErr.textContent = '';
  }

  function goBack() {
    try { location.href = 'login.html'; } catch (_) { history.back(); }
  }

  if (btnBack) btnBack.addEventListener('click', goBack);

  if (btnBackToPhone) btnBackToPhone.addEventListener('click', function () {
    clearErrors();
    state.userId = null;
    state.phone = null;
    state.email = null;
    state.verified = false;
    try { localStorage.removeItem('fp_user_id'); } catch (_) {}
    setStep('stepPhone');
  });

  if (btnBackToEmail) btnBackToEmail.addEventListener('click', function () {
    clearErrors();
    state.verified = false;
    setStep('stepEmail');
  });

  if (btnBackToVerify) btnBackToVerify.addEventListener('click', function () {
    clearErrors();
    setStep('stepVerify');
  });

  btnFind.addEventListener('click', async function () {
    clearErrors();
    var prefix = String(dialCodeEl.value || '').trim();
    var digits = String(phoneEl.value || '').trim().replace(/\s+/g, '');

    if (!digits || digits.length < 5) {
      phoneErr.textContent = 'Enter your phone number.';
      return;
    }

    var fullPhone = null;
    try {
      if (window.ExaAuth && typeof window.ExaAuth.fullPhone === 'function') {
        fullPhone = window.ExaAuth.fullPhone(prefix, digits);
      } else {
        fullPhone = String(prefix) + String(digits);
      }
    } catch (_) {
      fullPhone = String(prefix) + String(digits);
    }

    btnFind.disabled = true;
    try {
      var user = await findUserByPhone(fullPhone);
      if (!user || !user.id) {
        phoneErr.textContent = 'Phone number not found.';
        return;
      }

      state.userId = user.id;
      state.phone = user.phone || fullPhone;
      state.email = user.email || '';
      state.verified = false;

      try { localStorage.setItem('fp_user_id', state.userId); } catch (_) {}

      if (foundPhoneEl) foundPhoneEl.textContent = state.phone;
      if (emailEl) emailEl.value = state.email;

      setStep('stepEmail');
      showToast('Account found');
    } catch (e) {
      phoneErr.textContent = 'Unable to check phone. Please try again.';
      console.error(e);
    } finally {
      btnFind.disabled = false;
    }
  });

  btnSendCode.addEventListener('click', async function () {
    clearErrors();
    if (!state.userId) {
      emailErr.textContent = 'Missing account.';
      return;
    }
    var email = String(emailEl.value || '').trim();
    if (!isValidEmail(email)) {
      emailErr.textContent = 'Enter a valid email.';
      return;
    }

    btnSendCode.disabled = true;
    try {
      // Your DB should have this RPC. If it does not exist, create it in SQL.
      await rpc('request_email_verification', { p_user: state.userId, p_email: email });
      state.email = email;
      showToast('Code sent');
      setStep('stepVerify');
    } catch (e) {
      emailErr.textContent = 'Failed to send code.';
      console.error(e);
    } finally {
      btnSendCode.disabled = false;
    }
  });

  btnVerify.addEventListener('click', async function () {
    clearErrors();
    if (!state.userId) {
      codeErr.textContent = 'Missing account.';
      return;
    }
    var code = String(codeEl.value || '').trim();
    if (!code || code.length < 4) {
      codeErr.textContent = 'Enter the verification code.';
      return;
    }

    btnVerify.disabled = true;
    try {
      var ok = await rpc('verify_email_code', { p_user: state.userId, p_code: code });
      if (!(ok === true || ok === 't' || ok === 1)) {
        codeErr.textContent = 'Invalid code.';
        return;
      }
      state.verified = true;
      showToast('Verified');
      setStep('stepReset');
    } catch (e) {
      codeErr.textContent = 'Verification failed.';
      console.error(e);
    } finally {
      btnVerify.disabled = false;
    }
  });

  btnReset.addEventListener('click', async function () {
    clearErrors();
    if (!state.userId) {
      passErr.textContent = 'Missing account.';
      return;
    }
    if (!state.verified) {
      passErr.textContent = 'Verify the code first.';
      return;
    }

    var p1 = String(newPassEl.value || '');
    var p2 = String(newPass2El.value || '');
    if (p1.length < 6) {
      passErr.textContent = 'Password must be at least 6 characters.';
      return;
    }
    if (p1 !== p2) {
      passErr.textContent = 'Passwords do not match.';
      return;
    }

    btnReset.disabled = true;
    try {
      var hash = await sha256Hex(p1);
      await sbPatch('/rest/v1/users?id=eq.' + encodeURIComponent(state.userId), {
        login_password_hash: hash,
        email: state.email || String(emailEl.value || '').trim() || null,
        updated_at: new Date().toISOString()
      });

      showToast('Password updated');
      setTimeout(function () { location.href = 'login.html'; }, 650);
    } catch (e) {
      passErr.textContent = 'Reset failed. Please try again.';
      console.error(e);
    } finally {
      btnReset.disabled = false;
    }
  });

  // Init
  setStep('stepPhone');
})();
