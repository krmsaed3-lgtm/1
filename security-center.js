/* security-center.js */
;(function () {
  'use strict';

  function $(id){ return document.getElementById(id); }
  function toast(msg){
    var t = $('toast');
    if(!t) return alert(msg);
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(window.__toastT);
    window.__toastT = setTimeout(function(){ t.classList.remove('show'); }, 2600);
  }

  var SB = window.SB_CONFIG;
  if (!SB) {
    console.error('SB_CONFIG missing. Load sb-config.js before security-center.js.');
    return;
  }

  function getUserId(){
    try{
      return localStorage.getItem('sb_user_id_v1') || localStorage.getItem('currentUserId') || '';
    }catch(e){ return ''; }
  }

  async function rpc(name, body){
    var url = SB.url + '/rest/v1/rpc/' + encodeURIComponent(name);
    var res = await fetch(url, {
      method: 'POST',
      headers: SB.headers(),
      body: JSON.stringify(body || {})
    });
    var txt = '';
    if(!res.ok){
      try{ txt = await res.text(); }catch(e){}
      var err = new Error(txt || ('RPC ' + name + ' failed'));
      err.status = res.status;
      throw err;
    }
    return await res.json();
  }

  async function fetchUserRow(uid){
    var url = SB.url + '/rest/v1/users?select=id,phone,email,email_verified&' +
      'id=eq.' + encodeURIComponent(uid) + '&limit=1';
    var res = await fetch(url, { method:'GET', headers: SB.headers() });
    if(!res.ok) return null;
    var rows = await res.json();
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  function setStatus(user){
    $('phoneVal').textContent = user && user.phone ? user.phone : '-';
    $('emailVal').textContent = user && user.email ? user.email : '-';
    $('emailBadge').textContent = user && user.email_verified ? 'Verified' : 'Not verified';
    $('emailBadge').className = 'badge ' + (user && user.email_verified ? 'ok' : 'warn');
  }

  async function load(){
    var uid = getUserId();
    if(!uid){
      toast('Not logged in');
      return;
    }
    try{
      var u = await fetchUserRow(uid);
      setStatus(u);
    }catch(e){
      console.error(e);
      toast('Failed to load');
    }
  }

  async function onSendCode(){
    var uid = getUserId();
    var email = ($('emailInput').value || '').trim();
    if(!uid){ toast('Not logged in'); return; }
    if(!email || email.indexOf('@') === -1){ toast('Enter a valid email'); return; }

    $('sendBtn').disabled = true;
    try{
      // Returns {code, expires_at} (code is for demo / debug)
      var out = await rpc('request_email_verification', { p_user: uid, p_email: email });
      toast('Code sent');
      // Optional: show code for demo environments
      if(out && out.code){
        $('demoCode').textContent = 'Demo code: ' + out.code;
        $('demoCode').style.display = 'block';
      }
      await load();
    }catch(e){
      console.error(e);
      toast('Send failed');
    }finally{
      $('sendBtn').disabled = false;
    }
  }

  async function onVerify(){
    var uid = getUserId();
    var code = ($('codeInput').value || '').trim();
    if(!uid){ toast('Not logged in'); return; }
    if(!code){ toast('Enter code'); return; }

    $('verifyBtn').disabled = true;
    try{
      var ok = await rpc('verify_email_code', { p_user: uid, p_code: code });
      if(ok === true || ok === 't'){
        toast('Email verified');
        $('codeInput').value = '';
        $('demoCode').style.display = 'none';
        await load();
      }else{
        toast('Invalid code');
      }
    }catch(e){
      console.error(e);
      toast('Verify failed');
    }finally{
      $('verifyBtn').disabled = false;
    }
  }

  async function onChangeLoginPassword(){
    var uid = getUserId();
    var oldp = $('oldLogin').value || '';
    var newp = $('newLogin').value || '';
    var c = $('newLogin2').value || '';
    if(!uid){ toast('Not logged in'); return; }
    if(newp.length < 6){ toast('New password too short'); return; }
    if(newp !== c){ toast('Confirm password mismatch'); return; }

    $('changeLoginBtn').disabled = true;
    try{
      var ok = await rpc('change_login_password', { p_user: uid, p_old: oldp, p_new: newp });
      if(ok === true || ok === 't'){
        toast('Password updated');
        $('oldLogin').value = '';
        $('newLogin').value = '';
        $('newLogin2').value = '';
      }else{
        toast('Wrong password');
      }
    }catch(e){
      console.error(e);
      toast('Update failed');
    }finally{
      $('changeLoginBtn').disabled = false;
    }
  }

  async function onChangeFundPassword(){
    var uid = getUserId();
    var oldp = $('oldFund').value || '';
    var newp = $('newFund').value || '';
    var c = $('newFund2').value || '';
    if(!uid){ toast('Not logged in'); return; }
    if(newp.length < 6){ toast('New password too short'); return; }
    if(newp !== c){ toast('Confirm password mismatch'); return; }

    $('changeFundBtn').disabled = true;
    try{
      var ok = await rpc('change_fund_password', { p_user: uid, p_old: oldp, p_new: newp });
      if(ok === true || ok === 't'){
        toast('Fund password updated');
        $('oldFund').value = '';
        $('newFund').value = '';
        $('newFund2').value = '';
      }else{
        toast('Wrong password');
      }
    }catch(e){
      console.error(e);
      toast('Update failed');
    }finally{
      $('changeFundBtn').disabled = false;
    }
  }

  function bind(){
    $('sendBtn').addEventListener('click', onSendCode);
    $('verifyBtn').addEventListener('click', onVerify);
    $('changeLoginBtn').addEventListener('click', onChangeLoginPassword);
    $('changeFundBtn').addEventListener('click', onChangeFundPassword);
    $('refreshBtn').addEventListener('click', load);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ bind(); load(); });
  }else{
    bind(); load();
  }
})();