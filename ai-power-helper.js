// ai-power-helper.js - Binds AI Power "Run" buttons to perform_ipower_action() (server-side)
;(function () {
  'use strict';

  // --- Daily cooldown (24h) ---
  var RUN_COOLDOWN_MS = 24 * 60 * 60 * 1000;
  function lastRunKey(userId){ return "aiPower_lastRunAt__" + String(userId || ""); }
  function getLastRun(userId){
    try { var v = localStorage.getItem(lastRunKey(userId)); var n = Number(v); return isFinite(n) ? n : 0; } catch(e){ return 0; }
  }
  function setLastRun(userId, ts){
    try { localStorage.setItem(lastRunKey(userId), String(ts || Date.now())); } catch(e){}
  }
  function remainingMs(userId){
    var last = getLastRun(userId);
    if (!last) return 0;
    var rem = (last + RUN_COOLDOWN_MS) - Date.now();
    return rem > 0 ? rem : 0;
  }
  function fmtRemaining(ms){
    ms = Math.max(0, Number(ms || 0));
    var totalSec = Math.ceil(ms / 1000);
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    if (h > 0) return h + "h " + m + "m";
    if (m > 0) return m + "m " + s + "s";
    return s + "s";
  }


  function qs(sel, root){ return (root || document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function fmt2(n){
    var x = Number(n);
    if (!isFinite(x)) x = 0;
    return x.toFixed(2);
  }

  function setText(elOrSel, text){
    var el = (typeof elOrSel === 'string') ? qs(elOrSel) : elOrSel;
    if (el) el.textContent = text;
  }

  function showModal(show){
    var modal = qs('#runModal');
    if (!modal) return;
    modal.style.display = show ? 'flex' : 'none';
  }

  function runCountdown(seconds, onDone){
    var countdownEl = qs('#runModalCountdown');
    var s = seconds;
    if (countdownEl) countdownEl.textContent = s + 's';
    var t = setInterval(function(){
      s -= 1;
      if (countdownEl) countdownEl.textContent = (s >= 0 ? s : 0) + 's';
      if (s < 0){
        clearInterval(t);
        onDone && onDone();
      }
    }, 1000);
    return function(){ try{ clearInterval(t); }catch(e){} };
  }


  async function getUserId(){
    try {
      if (window.ExaAuth && typeof window.ExaAuth.ensureSupabaseUserId === 'function') {
        return (await window.ExaAuth.ensureSupabaseUserId()) || '';
      }
    } catch(e){}
    try {
      if (window.DemoWallet && typeof window.DemoWallet.getUserId === 'function') {
        return (await window.DemoWallet.getUserId()) || '';
      }
    } catch(e){}
    return '';
  }

  async function refreshUI(){
    if (!window.DemoWallet) return;

    // Summary numbers
    try {
      var sum = await window.DemoWallet.getAssetsSummary();
      if (sum) {
        // "Amount that can be run today" -> show current balance (base for earning)
        setText('.card .card-value', fmt2(sum.usdt_balance || 0));

        // Profit labels on GPU cards -> show today's personal profit
        qsa('.gpu-value-accent').forEach(function(el){
          el.textContent = fmt2(sum.today_personal || 0) + ' USDT';
        });
      }
    } catch (e) {}

    // Level tag
    try {
      var st = await window.DemoWallet.getUserState();
      if (st && st.current_level) {
        setText('.experience-tag', 'Level:' + st.current_level);
      }
    } catch (e) {}
  }

  function setRunsLeft(canRun){
    // "Number of times that can be run today"
    // First .card-row .card-value is "0 Times"
    var el = qs('.card-row .card .card-value');
    if (el) el.textContent = (canRun ? '1 Times' : '0 Times');

    // Update per-card "0/2" etc. keep as-is, but we can visually hint by disabling buttons
  }

  function bind(){
    if (!window.DemoWallet || typeof window.DemoWallet.performIpowerAction !== 'function') {
      console.warn('DemoWallet.performIpowerAction is missing. Ensure wallet.js is updated.');
      return;
    }

    var buttons = [];
    // Top "Run record" button
    var topBtn = qs('.card .btn-gradient');
    if (topBtn) buttons.push(topBtn);
    // GPU buttons
    qsa('.gpu-button-wrap .btn-gradient').forEach(function(b){ buttons.push(b); });

    function setDisabled(disabled){
      buttons.forEach(function(b){
        b.disabled = !!disabled;
        b.style.opacity = disabled ? '0.65' : '';
        b.style.cursor = disabled ? 'not-allowed' : '';
        b.style.pointerEvents = disabled ? 'none' : '';
      });
    }

    async function doRun(){
      var uid = await getUserId();
      var remMs = remainingMs(uid);
      if (remMs > 0) {
        setRunsLeft(false);
        setDisabled(true);
        alert('Too soon. Please try again after ' + fmtRemaining(remMs) + ' (Canada time).');
        return;
      }

      setDisabled(true);
      showModal(true);

      var stop = runCountdown(8, async function(){
        try {
          var row = await window.DemoWallet.performIpowerAction();
          showModal(false);

          // row has earning_amount, new_balance (from DB function)
          var earned = row && (row.earning_amount ?? row.earning ?? row.earningAmount);
          var newBal = row && (row.new_balance ?? row.newBalance);

          // Refresh UI + assets page will auto-refresh by sb-balance.js
          await refreshUI();

          // If we got a server response, show it
          if (earned != null) {
            alert('Success! +' + fmt2(earned) + ' USDT');
          } else {
            alert('Success!');
          }
          // After success, cannot run again for 24h
          try { setLastRun(uid, Date.now()); } catch(e){}
          setRunsLeft(false);
          setDisabled(true);
        } catch (e) {
          showModal(false);
          var msg = (e && e.message) ? e.message : 'Run failed';
          alert(msg);

          // If too soon, lock the run for today
          if (/Too soon|24 hours|Wait/i.test(msg)) {
            setRunsLeft(false);
          } else {
            setDisabled(false);
          }
        }
      });

      // If user closes / navigates, at least stop timer
      window.addEventListener('beforeunload', function(){ try{ stop(); }catch(e){} }, { once: true });
    }

    buttons.forEach(function(btn){
      btn.addEventListener('click', function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        doRun();
      });
    });

    // Initial UI
    refreshUI().then(function(){
      // Check local 24h cooldown
      var uid = await getUserId();
      var rem = remainingMs(uid);
      var can = !(rem > 0);
      setRunsLeft(can);
      setDisabled(!can);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();