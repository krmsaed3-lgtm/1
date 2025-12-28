;(function(){
  "use strict";

  function num(v){
    var n = parseFloat(v);
    return isFinite(n) ? n : 0;
  }
  function fmt(n, d){
    n = Number(n);
    if(!isFinite(n)) n = 0;
    var s = (d==null ? n.toFixed(8) : n.toFixed(d));
    return s.replace(/\.0+$/,'').replace(/(\.\d*[1-9])0+$/,'$1');
  }

  function setText(sel, txt){
    var el = document.querySelector(sel);
    if(el) el.textContent = txt;
  }

  function updatePercents(bal){
    var total = 0;
    ['USDT','BTC','ETH','USDC','TRX'].forEach(function(k){ total += Number(bal[k]||0); });
    if(total <= 0) total = 1;

    function pct(v){ return (Number(v||0) / total) * 100; }

    var rows = Array.from(document.querySelectorAll('.token-row'));
    rows.forEach(function(row){
      var nameEl = row.querySelector('.token-name');
      var pctEl  = row.querySelector('.token-percent');
      if(!nameEl || !pctEl) return;
      var sym = (nameEl.textContent || '').trim().toUpperCase();
      if(!sym) return;
      var p = pct(bal[sym]);
      pctEl.textContent = (p >= 0.005 ? p.toFixed(2) : '0.00') + '%';
    });

    // Donut USD approx: show USDT as "$" baseline (demo)
    setText('.assets-usd-approx', fmt(bal.USDT || 0, 2));
  }

  function applyBalances(bal){
    if(!bal || typeof bal !== 'object') return;

    // Currency list amounts
    document.querySelectorAll('.currency-amount[data-asset]').forEach(function(el){
      var sym = (el.getAttribute('data-asset') || '').toUpperCase();
      if(!sym) return;
      var v = Number(bal[sym] || 0);
      el.textContent = (sym === 'USDT') ? fmt(v, 2) : fmt(v, 8);
    });

    // Header big USDT
    var usdt = Number(bal.USDT || 0);
    var big = document.querySelector('.assets-usdt-balance');
    if(big){
      big.textContent = fmt(usdt, 2) + ' USDT';
    }

    updatePercents(bal);
  }

  async function load(){
    try{
      if(!(window.DemoWallet && typeof window.DemoWallet.getUserId === 'function' && typeof window.DemoWallet.rpc === 'function')){
        throw new Error('wallet.js not loaded');
      }
      var uid = window.DemoWallet.getUserId();
      if(!uid) return;

      var data = await window.DemoWallet.rpc('demo_get_balances', { p_user: uid });
      // rpc may return object or array
      if(Array.isArray(data)) data = data[0] || null;
      if(!data) return;

      // normalize keys
      var bal = {
        USDT: Number(data.USDT ?? data.usdt ?? data.usdt_balance ?? 0) || 0,
        USDC: Number(data.USDC ?? data.usdc ?? data.usdc_balance ?? 0) || 0,
        BTC:  Number(data.BTC  ?? data.btc  ?? data.btc_balance  ?? 0) || 0,
        ETH:  Number(data.ETH  ?? data.eth  ?? data.eth_balance  ?? 0) || 0,
        TRX:  Number(data.TRX  ?? data.trx  ?? data.trx_balance  ?? 0) || 0
      };

      applyBalances(bal);
    }catch(e){
      console.error(e);
    }
  }

  function boot(){
    load();
    // refresh every 2.5s to stay in sync after swaps
    setInterval(load, 2500);
    // refresh on visibility
    document.addEventListener('visibilitychange', function(){
      if(!document.hidden) load();
    });
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();
