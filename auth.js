// auth.js
;(function () {
  'use strict';

  const { createClient } = window.supabase;
  const supabase = createClient(SB_CONFIG.supabaseUrl, SB_CONFIG.supabaseAnonKey);

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = !!loading;
    btn.style.opacity = loading ? '0.7' : '1';
  }

  function toast(msg) {
    alert(msg);
  }

  // ✅ LOCAL welcome message (once only)
  function ensureLocalWelcomeMessageOnce(userId) {
    try {
      if (!userId) return;
      const key = 'jopai_msgs_' + userId;

      // إذا موجودة لا تعمل شي
      if (localStorage.getItem(key)) return;

      const msgs = [{
        id: String(Date.now()),
        title: 'Welcome to jopai',
        body: 'Welcome! We are glad to have you on jopai.',
        is_read: false,
        created_at: new Date().toISOString()
      }];

      localStorage.setItem(key, JSON.stringify(msgs));
    } catch (e) {}
  }

  async function loginWithPhone(phone, password, btn) {
    try {
      setLoading(btn, true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: phone + '@exa.com',
        password
      });

      if (error) {
        toast(error.message || 'Login failed');
        return;
      }

      const user = data?.user;
      if (!user?.id) {
        toast('Login failed');
        return;
      }

      // ✅ currentUserId
      localStorage.setItem('currentUserId', user.id);

      // ✅ create welcome message once
      ensureLocalWelcomeMessageOnce(user.id);

      // redirect
      window.location.href = 'index.html';
    } catch (e) {
      toast('Login failed');
    } finally {
      setLoading(btn, false);
    }
  }

  async function registerWithInvite(phone, password, inviteCode, btn) {
    try {
      setLoading(btn, true);

      const { data, error } = await supabase.auth.signUp({
        email: phone + '@exa.com',
        password
      });

      if (error) {
        toast(error.message || 'Register failed');
        return;
      }

      const user = data?.user;
      if (!user?.id) {
        toast('Register failed');
        return;
      }

      localStorage.setItem('currentUserId', user.id);

      // ✅ create welcome message once
      ensureLocalWelcomeMessageOnce(user.id);

      // (اختياري: تخزين inviteCode إذا بدك)
      if (inviteCode) localStorage.setItem('inviteCode', inviteCode);

      window.location.href = 'index.html';
    } catch (e) {
      toast('Register failed');
    } finally {
      setLoading(btn, false);
    }
  }

  async function logout() {
    try { await supabase.auth.signOut(); } catch (e) {}
    try { localStorage.removeItem('currentUserId'); } catch (e) {}
    window.location.href = 'login.html';
  }

  // expose
  window.ExaAuth = {
    loginWithPhone,
    registerWithInvite,
    logout
  };
})();