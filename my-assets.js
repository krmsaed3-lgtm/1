;(function(){
  "use strict";

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

  // USD rates per 1 unit of asset
  var ratesUSD = { USDT: 1, USDC: 1, BTC: 0, ETH: 0, TRX: 0 };

  function toUSD(sym, amount){
    sym = (sym||'').toUpperCase();
    return Number(amount || 0) * Number(ratesUSD[sym] || 0);
  }

  function updatePercentsByUSD(bal){
    var totalUSD = 0;
    ['USDT','BTC','ETH','USDC','TRX'].forEach(function(k){
      totalUSD += toUSD(k, bal[k] || 0);
    });

    function pctUSD(sym){
      if(totalUSD <= 0) return 0;
      return (toUSD(sym, bal[sym] || 0) / totalUSD) * 100;
    }

    // Update % rows based on USD value (fix)
    Array.from(document.querySelectorAll('.token-row')).forEach(function(row){
      var nameEl = row.querySelector('.token-name');
      var pctEl  = row.querySelector('.token-percent');
      if(!nameEl || !pctEl) return;
      var sym = (nameEl.textContent || '').trim().toUpperCase();
      if(!sym) return;
      var p = pctUSD(sym);
      pctEl.textContent = (p >= 0.005 ? p.toFixed(2) : '0.00') + '%';
    });

    // Donut shows TOTAL USD (stays stable across internal swaps, except fees)
    setText('.assets-usd-approx', (totalUSD > 0 ? fmt(totalUSD, 2) : '0.00'));
  }

  function applyBalances(bal){
    if(!bal || typeof bal !== 'object') return;

    // Currency list amounts
    document.querySelectorAll('.currency-amount[data-asset]').forEach(function(el){
      var sym = (el.getAttribute('data-asset') || '').toUpperCase();
      if(!sym) return;
      var v = Number(bal[sym] || 0);
      el.textContent = (sym === 'USDT' || sym === 'USDC') ? fmt(v, 2) : fmt(v, 8);
    });

    // Keep header showing USDT amount (as before)
    var usdt = Number(bal.USDT || 0);
    var big = document.querySelector('.assets-usdt-balance');
    if(big){
      big.textContent = fmt(usdt, 2) + ' USDT';
    }

    updatePercentsByUSD(bal);
  }

  async function loadRates(){
    // 1) if global snapshot exists (optional)
    try{
      if(window.SwapRates && typeof window.SwapRates === 'object'){
        ['BTC','ETH','TRX','USDT','USDC'].forEach(function(k){
          if(window.SwapRates[k] != null) ratesUSD[k] = Number(window.SwapRates[k]) || ratesUSD[k];
        });
        return;
      }
    }catch(_){}

    // 2) RPC from Supabase (recommended)
    try{
      if(window.DemoWallet && typeof window.DemoWallet.rpc === 'function'){
        var r = await window.DemoWallet.rpc('demo_get_rates', {});
        if(Array.isArray(r)) r = r[0] || null;
        if(r && typeof r === 'object'){
          ['BTC','ETH','TRX','USDT','USDC'].forEach(function(k){
            if(r[k] != null) ratesUSD[k] = Number(r[k]) || ratesUSD[k];
          });
        }
      }
    }catch(e){
      // keep defaults
    }
  }

  async function load(){
    try{
      if(!(window.DemoWallet && typeof window.DemoWallet.getUserId === 'function' && typeof window.DemoWallet.rpc === 'function')){
        throw new Error('wallet.js not loaded');
      }
      var uid = window.DemoWallet.getUserId();
      if(!uid) return;

      await loadRates();

      var data = await window.DemoWallet.rpc('demo_get_balances', { p_user: uid });
      if(Array.isArray(data)) data = data[0] || null;
      if(!data) return;

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
    setInterval(load, 2500);
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
