/* forgot-password.js — نفس المنطق السابق مع اعتماد data-code لتجنّب الالتباس */
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

  var prefixBtn = document.getElementById('prefixBtn');
  var prefixValue = document.getElementById('prefixValue');
  var areaModal = document.getElementById('areaModal');
  var areaMask = document.getElementById('areaMask');
  var areaList = document.getElementById('areaList');
  var areaClose = document.getElementById('areaClose');
  var areaSearch = document.getElementById('areaSearch');

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

  var state = { userId: null, phone: null, email: null, verified: false };

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
    state = { userId: null, phone: null, email: null, verified: false };
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

  // country list (same set)
  var countries = [
    { name: "Slovenia", code: "+386", iso: "si", common: true },
    { name: "Panama", code: "+507", iso: "pa", common: true },
    { name: "Syria", code: "+963", iso: "sy", common: true },
    { name: "Republic of Lebanon", code: "+961", iso: "lb", common: true },
    { name: "Cyprus", code: "+357", iso: "cy", common: true },
    { name: "Saudi Arabia", code: "+966", iso: "sa", common: true },
    { name: "United Arab Emirates", code: "+971", iso: "ae" },
    { name: "Qatar", code: "+974", iso: "qa" },
    { name: "Kuwait", code: "+965", iso: "kw" },
    { name: "Bahrain", code: "+973", iso: "bh" },
    { name: "Oman", code: "+968", iso: "om" },
    { name: "Jordan", code: "+962", iso: "jo" },
    { name: "Iraq", code: "+964", iso: "iq" },
    { name: "Turkey", code: "+90", iso: "tr" },
    { name: "Egypt", code: "+20", iso: "eg" },
    { name: "Morocco", code: "+212", iso: "ma" },
    { name: "Algeria", code: "+213", iso: "dz" },
    { name: "Tunisia", code: "+216", iso: "tn" },
    { name: "Libya", code: "+218", iso: "ly" },
    { name: "Yemen", code: "+967", iso: "ye" },
    { name: "United States", code: "+1", iso: "us" },
    { name: "Canada", code: "+1", iso: "ca" },
    { name: "United Kingdom", code: "+44", iso: "gb" },
    { name: "Germany", code: "+49", iso: "de" },
    { name: "France", code: "+33", iso: "fr" },
    { name: "Italy", code: "+39", iso: "it" },
    { name: "Spain", code: "+34", iso: "es" },
    { name: "Russia", code: "+7", iso: "ru" },
    { name: "India", code: "+91", iso: "in" },
    { name: "Pakistan", code: "+92", iso: "pk" },
    { name: "Afghanistan", code: "+93", iso: "af" },
    { name: "Iran", code: "+98", iso: "ir" },
    { name: "China", code: "+86", iso: "cn" },
    { name: "Hong Kong", code: "+852", iso: "hk" },
    { name: "Japan", code: "+81", iso: "jp" },
    { name: "South Korea", code: "+82", iso: "kr" },
    { name: "Singapore", code: "+65", iso: "sg" },
    { name: "Malaysia", code: "+60", iso: "my" },
    { name: "Indonesia", code: "+62", iso: "id" },
    { name: "Philippines", code: "+63", iso: "ph" },
    { name: "Thailand", code: "+66", iso: "th" },
    { name: "Vietnam", code: "+84", iso: "vn" },
    { name: "Australia", code: "+61", iso: "au" },
    { name: "New Zealand", code: "+64", iso: "nz" },
    { name: "Brazil", code: "+55", iso: "br" },
    { name: "Argentina", code: "+54", iso: "ar" },
    { name: "Mexico", code: "+52", iso: "mx" },
    { name: "South Africa", code: "+27", iso: "za" },
    { name: "Nigeria", code: "+234", iso: "ng" },
    { name: "Kenya", code: "+254", iso: "ke" },
    { name: "Ethiopia", code: "+251", iso: "et" },
    { name: "Sweden", code: "+46", iso: "se" },
    { name: "Norway", code: "+47", iso: "no" },
    { name: "Denmark", code: "+45", iso: "dk" },
    { name: "Netherlands", code: "+31", iso: "nl" },
    { name: "Belgium", code: "+32", iso: "be" },
    { name: "Switzerland", code: "+41", iso: "ch" },
    { name: "Austria", code: "+43", iso: "at" },
    { name: "Greece", code: "+30", iso: "gr" },
    { name: "Portugal", code: "+351", iso: "pt" },
    { name: "Ireland", code: "+353", iso: "ie" }
  ];

  function buildCountryList(filter) {
    if (!areaList) return;
    areaList.innerHTML = '';
    var q = (filter || '').toLowerCase();

    var common = countries.filter(function (c) {
      if (!c.common) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.code.indexOf(filter) !== -1;
    });

    var others = countries.filter(function (c) {
      if (c.common) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.code.indexOf(filter) !== -1;
    });

    function appendSection(title, items) {
      if (!items.length) return;
      var titleEl = document.createElement('div');
      titleEl.style.color = 'rgba(255,255,255,0.6)';
      titleEl.style.padding = '6px 6px 8px';
      titleEl.style.fontSize = '12px';
      titleEl.textContent = title;
      areaList.appendChild(titleEl);

      items.forEach(function (c) {
        var item = document.createElement('div');
        item.className = 'country-option';
        var name = document.createElement('span');
        name.style.display = 'inline-flex';
        name.style.alignItems = 'center';
        name.innerHTML = '<img class="flag" src="https://flagcdn.com/w20/' + c.iso + '.png" alt="">' + ' ' + c.name;
        var code = document.createElement('span');
        code.textContent = c.code;
        item.appendChild(name);
        item.appendChild(code);
        item.addEventListener('click', function () {
          if (prefixValue) {
            prefixValue.dataset.code = c.code;
            prefixValue.innerHTML = '<img class="flag" src="https://flagcdn.com/w20/' + c.iso + '.png" alt="">' + c.code;
          }
          closeModal();
        });
        areaList.appendChild(item);
      });
    }

    appendSection('Commonly used countries', common);
    appendSection('All countries/regions', others);
  }

  function openModal() {
    if (!areaModal) return;
    areaModal.classList.add('open');
    if (areaSearch) areaSearch.value = '';
    buildCountryList('');
  }
  function closeModal() {
    if (!areaModal) return;
    areaModal.classList.remove('open');
  }

  if (prefixBtn) prefixBtn.addEventListener('click', openModal);
  if (areaMask) areaMask.addEventListener('click', closeModal);
  if (areaClose) areaClose.addEventListener('click', closeModal);
  if (areaSearch) {
    areaSearch.addEventListener('input', function () {
      buildCountryList(areaSearch.value || '');
    });
  }

  function getPhoneDigits(v) { return String(v || '').replace(/\D/g, ''); }

  btnFind.addEventListener('click', async function () {
    clearErrors();
    var prefix = (prefixValue && prefixValue.dataset && prefixValue.dataset.code) ? prefixValue.dataset.code : '+386';
    var digits = getPhoneDigits(phoneEl.value || '');
    if (!digits || digits.length < 5) {
      phoneErr.textContent = 'Enter your phone number.';
      return;
    }

    var fullPhone;
    try {
      if (window.ExaAuth && typeof window.ExaAuth.fullPhone === 'function') {
        fullPhone = window.ExaAuth.fullPhone(prefix, digits);
      } else {
        fullPhone = prefix + digits;
      }
    } catch (_) {
      fullPhone = prefix + digits;
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

      if (!state.email) {
        phoneErr.textContent = 'لا يوجد إيميل مرتبط بهذا الحساب — راسل الدعم.';
        return;
      }

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

  // initial prefix setup
  (function initPrefix() {
    try {
      if (prefixValue && (!prefixValue.dataset || !prefixValue.dataset.code)) {
        prefixValue.dataset.code = '+386';
        prefixValue.innerHTML = '<img class="flag" src="https://flagcdn.com/w20/si.png" alt="">' + '+386';
      }
    } catch (e) {}
  })();

  setStep('stepPhone');

})();
