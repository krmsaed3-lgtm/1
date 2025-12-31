(function () {
  'use strict';

  async function getCurrentUserIdAsync() {
    try {
      if (window.ExaAuth && typeof window.ExaAuth.ensureSupabaseUserId === 'function') {
        var id = await window.ExaAuth.ensureSupabaseUserId();
        if (id) return String(id);
      }
    } catch (e) {}
    return String(localStorage.getItem('currentUserId') || localStorage.getItem('sb_user_id_v1') || '');
  }

  var SB = window.SB_CONFIG;
  function ensureConfig() {
    if (!SB || !SB.url || !SB.headers) throw new Error('Supabase config not loaded');
  }

  async function sbFetch(path, opts) {
    ensureConfig();
    const res = await fetch(SB.url + path, Object.assign({ headers: SB.headers() }, opts || {}));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
    return data;
  }

  async function callEdge(fnName, body) {
    ensureConfig();
    const res = await fetch(SB.url + '/functions/v1/' + fnName, {
      method: 'POST',
      headers: {
        ...SB.headers(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Edge function failed');
    return data;
  }

  async function fetchUserRow(userId) {
    return sbFetch('/rest/v1/users?select=id,email,email_verified&id=eq.' + userId + '&limit=1', { method: 'GET' })
      .then(r => r[0] || null);
  }

  const toastEl = document.getElementById('toast');
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('toast-visible');
    setTimeout(() => toastEl.classList.remove('toast-visible'), 2400);
  }

  /* ================= EMAIL ================= */

  const emEmail = document.getElementById('em-email');
  const emSend = document.getElementById('em-send');
  const emCode = document.getElementById('em-code');
  const emSubmit = document.getElementById('em-submit');

  function validEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '');
  }

  if (emSend) {
    emSend.onclick = async () => {
      const userId = await getCurrentUserIdAsync();
      if (!userId) return showToast('Please login first');

      const email = emEmail.value.trim();
      if (!validEmail(email)) return showToast('Invalid email');

      emSend.disabled = true;
      try {
        await callEdge('sendEmailCode', { user_id: userId, email });
        showToast('Verification code sent');
      } catch (e) {
        showToast(e.message);
      } finally {
        emSend.disabled = false;
      }
    };
  }

  if (emSubmit) {
    emSubmit.onclick = async () => {
      const userId = await getCurrentUserIdAsync();
      if (!userId) return showToast('Please login first');

      const code = emCode.value.trim();
      const email = emEmail.value.trim();
      if (!code || code.length !== 6) return showToast('Invalid code');

      emSubmit.disabled = true;
      try {
        await callEdge('confirmEmailCode', { user_id: userId, email, code });
        showToast('Email verified successfully');
        emCode.value = '';
        document.getElementById('modal-email').classList.remove('is-visible');
      } catch (e) {
        showToast(e.message);
      } finally {
        emSubmit.disabled = false;
      }
    };
  }

})();