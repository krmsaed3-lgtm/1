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
  var dialCodeEl = document.getElementById('countryCode');
  var codeLabelEl = document.getElementById('codeLabel');
  var openAreaBtn = document.getElementById('openArea');
  var areaMask = document.getElementById('areaMask');
  var areaClose = document.getElementById('areaClose');
  var areaSearch = document.getElementById('areaSearch');
  var areaList = document.getElementById('areaList');
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

  // Country calling codes (large list; searchable)
  var countries = [
    { name: 'Afghanistan', code: '+93' },
    { name: 'Albania', code: '+355' },
    { name: 'Algeria', code: '+213' },
    { name: 'American Samoa', code: '+1-684' },
    { name: 'Andorra', code: '+376' },
    { name: 'Angola', code: '+244' },
    { name: 'Anguilla', code: '+1-264' },
    { name: 'Antigua and Barbuda', code: '+1-268' },
    { name: 'Argentina', code: '+54' },
    { name: 'Armenia', code: '+374' },
    { name: 'Aruba', code: '+297' },
    { name: 'Australia', code: '+61' },
    { name: 'Austria', code: '+43' },
    { name: 'Azerbaijan', code: '+994' },
    { name: 'Bahamas', code: '+1-242' },
    { name: 'Bahrain', code: '+973' },
    { name: 'Bangladesh', code: '+880' },
    { name: 'Barbados', code: '+1-246' },
    { name: 'Belarus', code: '+375' },
    { name: 'Belgium', code: '+32' },
    { name: 'Belize', code: '+501' },
    { name: 'Benin', code: '+229' },
    { name: 'Bermuda', code: '+1-441' },
    { name: 'Bhutan', code: '+975' },
    { name: 'Bolivia', code: '+591' },
    { name: 'Bosnia and Herzegovina', code: '+387' },
    { name: 'Botswana', code: '+267' },
    { name: 'Brazil', code: '+55' },
    { name: 'British Virgin Islands', code: '+1-284' },
    { name: 'Brunei', code: '+673' },
    { name: 'Bulgaria', code: '+359' },
    { name: 'Burkina Faso', code: '+226' },
    { name: 'Burundi', code: '+257' },
    { name: 'Cambodia', code: '+855' },
    { name: 'Cameroon', code: '+237' },
    { name: 'Canada', code: '+1' },
    { name: 'Cape Verde', code: '+238' },
    { name: 'Cayman Islands', code: '+1-345' },
    { name: 'Central African Republic', code: '+236' },
    { name: 'Chad', code: '+235' },
    { name: 'Chile', code: '+56' },
    { name: 'China', code: '+86' },
    { name: 'Colombia', code: '+57' },
    { name: 'Comoros', code: '+269' },
    { name: 'Congo (DRC)', code: '+243' },
    { name: 'Congo (Republic)', code: '+242' },
    { name: 'Cook Islands', code: '+682' },
    { name: 'Costa Rica', code: '+506' },
    { name: "Cote d'Ivoire", code: '+225' },
    { name: 'Croatia', code: '+385' },
    { name: 'Cuba', code: '+53' },
    { name: 'Cyprus', code: '+357' },
    { name: 'Czechia', code: '+420' },
    { name: 'Denmark', code: '+45' },
    { name: 'Djibouti', code: '+253' },
    { name: 'Dominica', code: '+1-767' },
    { name: 'Dominican Republic', code: '+1-809' },
    { name: 'Ecuador', code: '+593' },
    { name: 'Egypt', code: '+20' },
    { name: 'El Salvador', code: '+503' },
    { name: 'Equatorial Guinea', code: '+240' },
    { name: 'Eritrea', code: '+291' },
    { name: 'Estonia', code: '+372' },
    { name: 'Eswatini', code: '+268' },
    { name: 'Ethiopia', code: '+251' },
    { name: 'Fiji', code: '+679' },
    { name: 'Finland', code: '+358' },
    { name: 'France', code: '+33' },
    { name: 'French Guiana', code: '+594' },
    { name: 'Gabon', code: '+241' },
    { name: 'Gambia', code: '+220' },
    { name: 'Georgia', code: '+995' },
    { name: 'Germany', code: '+49' },
    { name: 'Ghana', code: '+233' },
    { name: 'Gibraltar', code: '+350' },
    { name: 'Greece', code: '+30' },
    { name: 'Greenland', code: '+299' },
    { name: 'Grenada', code: '+1-473' },
    { name: 'Guadeloupe', code: '+590' },
    { name: 'Guam', code: '+1-671' },
    { name: 'Guatemala', code: '+502' },
    { name: 'Guinea', code: '+224' },
    { name: 'Guinea-Bissau', code: '+245' },
    { name: 'Guyana', code: '+592' },
    { name: 'Haiti', code: '+509' },
    { name: 'Honduras', code: '+504' },
    { name: 'Hong Kong', code: '+852' },
    { name: 'Hungary', code: '+36' },
    { name: 'Iceland', code: '+354' },
    { name: 'India', code: '+91' },
    { name: 'Indonesia', code: '+62' },
    { name: 'Iran', code: '+98' },
    { name: 'Iraq', code: '+964' },
    { name: 'Ireland', code: '+353' },
    { name: 'Israel', code: '+972' },
    { name: 'Italy', code: '+39' },
    { name: 'Jamaica', code: '+1-876' },
    { name: 'Japan', code: '+81' },
    { name: 'Jordan', code: '+962' },
    { name: 'Kazakhstan', code: '+7' },
    { name: 'Kenya', code: '+254' },
    { name: 'Kuwait', code: '+965' },
    { name: 'Kyrgyzstan', code: '+996' },
    { name: 'Laos', code: '+856' },
    { name: 'Latvia', code: '+371' },
    { name: 'Lebanon', code: '+961' },
    { name: 'Lesotho', code: '+266' },
    { name: 'Liberia', code: '+231' },
    { name: 'Libya', code: '+218' },
    { name: 'Liechtenstein', code: '+423' },
    { name: 'Lithuania', code: '+370' },
    { name: 'Luxembourg', code: '+352' },
    { name: 'Macau', code: '+853' },
    { name: 'Madagascar', code: '+261' },
    { name: 'Malawi', code: '+265' },
    { name: 'Malaysia', code: '+60' },
    { name: 'Maldives', code: '+960' },
    { name: 'Mali', code: '+223' },
    { name: 'Malta', code: '+356' },
    { name: 'Martinique', code: '+596' },
    { name: 'Mauritania', code: '+222' },
    { name: 'Mauritius', code: '+230' },
    { name: 'Mexico', code: '+52' },
    { name: 'Moldova', code: '+373' },
    { name: 'Monaco', code: '+377' },
    { name: 'Mongolia', code: '+976' },
    { name: 'Montenegro', code: '+382' },
    { name: 'Morocco', code: '+212' },
    { name: 'Mozambique', code: '+258' },
    { name: 'Myanmar', code: '+95' },
    { name: 'Namibia', code: '+264' },
    { name: 'Nepal', code: '+977' },
    { name: 'Netherlands', code: '+31' },
    { name: 'New Zealand', code: '+64' },
    { name: 'Nicaragua', code: '+505' },
    { name: 'Niger', code: '+227' },
    { name: 'Nigeria', code: '+234' },
    { name: 'North Macedonia', code: '+389' },
    { name: 'Norway', code: '+47' },
    { name: 'Oman', code: '+968' },
    { name: 'Pakistan', code: '+92' },
    { name: 'Panama', code: '+507' },
    { name: 'Paraguay', code: '+595' },
    { name: 'Peru', code: '+51' },
    { name: 'Philippines', code: '+63' },
    { name: 'Poland', code: '+48' },
    { name: 'Portugal', code: '+351' },
    { name: 'Qatar', code: '+974' },
    { name: 'Romania', code: '+40' },
    { name: 'Russia', code: '+7' },
    { name: 'Rwanda', code: '+250' },
    { name: 'Saudi Arabia', code: '+966' },
    { name: 'Senegal', code: '+221' },
    { name: 'Serbia', code: '+381' },
    { name: 'Seychelles', code: '+248' },
    { name: 'Sierra Leone', code: '+232' },
    { name: 'Singapore', code: '+65' },
    { name: 'Slovakia', code: '+421' },
    { name: 'Slovenia', code: '+386' },
    { name: 'Somalia', code: '+252' },
    { name: 'South Africa', code: '+27' },
    { name: 'South Korea', code: '+82' },
    { name: 'Spain', code: '+34' },
    { name: 'Sri Lanka', code: '+94' },
    { name: 'Sudan', code: '+249' },
    { name: 'Sweden', code: '+46' },
    { name: 'Switzerland', code: '+41' },
    { name: 'Syria', code: '+963' },
    { name: 'Taiwan', code: '+886' },
    { name: 'Tanzania', code: '+255' },
    { name: 'Thailand', code: '+66' },
    { name: 'Tunisia', code: '+216' },
    { name: 'Turkey', code: '+90' },
    { name: 'Uganda', code: '+256' },
    { name: 'Ukraine', code: '+380' },
    { name: 'United Arab Emirates', code: '+971' },
    { name: 'United Kingdom', code: '+44' },
    { name: 'United States', code: '+1' },
    { name: 'Uruguay', code: '+598' },
    { name: 'Uzbekistan', code: '+998' },
    { name: 'Venezuela', code: '+58' },
    { name: 'Vietnam', code: '+84' },
    { name: 'Yemen', code: '+967' },
    { name: 'Zambia', code: '+260' },
    { name: 'Zimbabwe', code: '+263' }
  ];

  function normalizeCode(code){
    // Store as plain "+NNN" by stripping any non-digits (e.g. "+1-684" -> "+1684").
    var digits = String(code || '').replace(/\D/g,'');
    return digits ? ('+' + digits) : '';
  }

  function openAreaModal(){
    if (!areaMask) return;
    areaMask.classList.add('show');
    areaMask.setAttribute('aria-hidden','false');
    if (areaSearch) { areaSearch.value = ''; setTimeout(function(){ areaSearch.focus(); }, 50); }
    renderAreaList('');
  }
  function closeAreaModal(){
    if (!areaMask) return;
    areaMask.classList.remove('show');
    areaMask.setAttribute('aria-hidden','true');
  }

  function setDialCode(newCode){
    var n = normalizeCode(newCode);
    dialCodeEl.value = n;
    if (codeLabelEl) codeLabelEl.textContent = n.replace(/^\+?/, '+');
  }

  function renderAreaList(q){
    if (!areaList) return;
    var query = (q || '').toLowerCase().trim();
    var current = normalizeCode(dialCodeEl.value || '+961');
    var items = countries.filter(function(c){
      if (!query) return true;
      return c.name.toLowerCase().includes(query) || c.code.replace(/\D/g,'').includes(query.replace(/\D/g,''));
    });
    areaList.innerHTML = '';
    items.slice(0, 250).forEach(function(c){
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'area-item';
      row.innerHTML = '<span class="area-name">' + escapeHtml(c.name) + '</span>' +
                      '<span class="area-code">' + escapeHtml(normalizeCode(c.code)) + '</span>';
      if (normalizeCode(c.code) === current) row.classList.add('active');
      row.addEventListener('click', function(){
        setDialCode(c.code);
        closeAreaModal();
      });
      areaList.appendChild(row);
    });
  }

  if (openAreaBtn) openAreaBtn.addEventListener('click', openAreaModal);
  if (areaClose) areaClose.addEventListener('click', closeAreaModal);
  if (areaMask) areaMask.addEventListener('click', function(e){ if (e.target === areaMask) closeAreaModal(); });
  if (areaSearch) areaSearch.addEventListener('input', function(){ renderAreaList(areaSearch.value || ''); });

  // Default dial code: Lebanon (+961)
  setDialCode(dialCodeEl.value || '+961');

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
