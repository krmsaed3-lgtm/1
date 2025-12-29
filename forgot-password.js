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

  function setStep(stepId) {
    var steps = document.querySelectorAll('.step');
    steps.forEach(function (s) { s.classList.remove('active'); });
    var el = document.getElementById(stepId);
    if (el) el.classList.add('active');
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

  async function safeText(res) {
    try { return await res.text(); } catch (_) { return 'Request failed'; }
  }

  async function findUserByPhone(dialCode, phone) {
    var p = encodeURIComponent(phone);
    var d = encodeURIComponent(dialCode);
    var q = '/rest/v1/users?select=user_id,email,dial_code,phone&dial_code=eq.' + d + '&phone=eq.' + p + '&limit=1';
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
  var newPassEl = document.getElementById('newPass');
  var newPass2El = document.getElementById('newPass2');
  var passErr = document.getElementById('passErr');
  var btnReset = document.getElementById('btnReset');

  var state = { userId: null, dialCode: null, phone: null };

  function clearErrors() {
    phoneErr.textContent = '';
    emailErr.textContent = '';
    codeErr.textContent = '';
    passErr.textContent = '';
  }

  function goBack() {
    // Prefer login page if exists
    try { location.href = 'login.html'; } catch (_) { history.back(); }
  }

  if (btnBack) btnBack.addEventListener('click', goBack);

  btnBackToPhone.addEventListener('click', function () {
    clearErrors();
    state.userId = null;
    localStorage.removeItem('fp_user_id');
    setStep('stepPhone');
  });

  btnFind.addEventListener('click', async function () {
    clearErrors();
    var dial = (dialCodeEl.value || '').trim();
    var phone = (phoneEl.value || '').trim().replace(/\s+/g, '');
    if (!phone || phone.length < 5) {
      phoneErr.textContent = 'Enter your phone number.';
      return;
    }
    btnFind.disabled = true;
    try {
      var user = await findUserByPhone(dial, phone);
      if (!user || !user.user_id) {
        phoneErr.textContent = 'Phone number not found.';
        return;
      }
      state.userId = user.user_id;
      state.dialCode = dial;
      state.phone = phone;
      localStorage.setItem('fp_user_id', state.userId);

      foundPhoneEl.textContent = dial + ' ' + phone;
      if (user.email) emailEl.value = user.email;

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
    var email = (emailEl.value || '').trim();
    if (!isValidEmail(email)) {
      emailErr.textContent = 'Enter a valid email.';
      return;
    }
    btnSendCode.disabled = true;
    try {
      await rpc('request_email_verification', { p_user: state.userId, p_email: email });
      showToast('Code created. Check your email (or use the code from admin flow).');
    } catch (e) {
      emailErr.textContent = 'Failed to create code.';
      console.error(e);
    } finally {
      btnSendCode.disabled = false;
    }
  });

  btnReset.addEventListener('click', async function () {
    clearErrors();
    if (!state.userId) {
      codeErr.textContent = 'Missing account.';
      return;
    }
    var email = (emailEl.value || '').trim();
    if (!isValidEmail(email)) {
      emailErr.textContent = 'Enter a valid email.';
      return;
    }
    var code = (codeEl.value || '').trim();
    if (!code || code.length < 4) {
      codeErr.textContent = 'Enter the verification code.';
      return;
    }
    var p1 = (newPassEl.value || '');
    var p2 = (newPass2El.value || '');
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
      var ok = await rpc('verify_email_code', { p_user: state.userId, p_code: code });
      if (!(ok === true || ok === 't')) {
        codeErr.textContent = 'Invalid code.';
        return;
      }

      var hash = await sha256Hex(p1);
      // Update password hash (and email if empty)
      await sbPatch('/rest/v1/users?user_id=eq.' + encodeURIComponent(state.userId), {
        login_password_hash: hash,
        email: email,
        updated_at: new Date().toISOString()
      });

      showToast('Password updated');
      setTimeout(function () { location.href = 'login.html'; }, 650);
    } catch (e) {
      codeErr.textContent = 'Reset failed. Please try again.';
      console.error(e);
    } finally {
      btnReset.disabled = false;
    }
  });

  // Prefill if user comes back
  try {
    var stored = localStorage.getItem('fp_user_id');
    if (stored) state.userId = stored;
  } catch (_) {}
})();
