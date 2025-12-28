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

  // USD rates per 1 unit (fixed from DB)
  var usd = { USDT: 1, USDC: 1, BTC: 0, ETH: 0, TRX: 0 };

  function toUSD(sym, amount){
    sym = (sym||'').toUpperCase();
    return Number(amount || 0) * Number(usd[sym] || 0);
  }

  function setPercentsAndDonut(bal){
    var totalUSD = 0;
    ['USDT','USDC','BTC','ETH','TRX'].forEach(function(k){
      totalUSD += toUSD(k, bal[k] || 0);
    });

    // Donut should represent TOTAL value in USD (stable across internal swaps, except fee)
    setText('.assets-usd-approx', (totalUSD > 0 ? fmt(totalUSD, 2) : '0.00'));

    // Percent per token based on USD value
    Array.from(document.querySelectorAll('.token-row')).forEach(function(row){
      var nameEl = row.querySelector('.token-name');
      var pctEl  = row.querySelector('.token-percent');
      if(!nameEl || !pctEl) return;
      var sym = (nameEl.textContent || '').trim().toUpperCase();
      if(!sym) return;
      var p = (totalUSD > 0) ? (toUSD(sym, bal[sym] || 0) / totalUSD * 100) : 0;
      pctEl.textContent = (p >= 0.005 ? p.toFixed(2) : '0.00') + '%';
    });
  }

  function applyBalances(bal){
    // update list amounts
    document.querySelectorAll('.currency-amount[data-asset]').forEach(function(el){
      var sym = (el.getAttribute('data-asset') || '').toUpperCase();
      if(!sym) return;
      var v = Number(bal[sym] || 0);
      el.textContent = (sym === 'USDT' || sym === 'USDC') ? fmt(v, 2) : fmt(v, 8);
    });

    // keep header as USDT amount (same UI behavior)
    var big = document.querySelector('.assets-usdt-balance');
    if(big){
      big.textContent = fmt(Number(bal.USDT || 0), 2) + ' USDT';
    }

    setPercentsAndDonut(bal);
  }

  async function loadFixedUsdRates(){
    // We store fixed pairs in fx_rates. We need: BTC->USDT, ETH->USDT, TRX->USDT, plus USDT/USDC=1.
    usd.USDT = 1; usd.USDC = 1;

    if(!(window.DemoWallet && typeof window.DemoWallet.rpc === 'function')) return;

    try{
      // demo_get_rates returns a json object of pairs: {"BTC_USDT":95000,...}
      var obj = await window.DemoWallet.rpc('demo_get_rates', {});
      if(Array.isArray(obj)) obj = obj[0] || obj;
      if(obj && typeof obj === 'object'){
        function pick(pair){ return (obj[pair] != null) ? Number(obj[pair]) : null; }
        var btc = pick('BTC_USDT'); if(btc) usd.BTC = btc;
        var eth = pick('ETH_USDT'); if(eth) usd.ETH = eth;
        var trx = pick('TRX_USDT'); if(trx) usd.TRX = trx;

        // optional: if you keep USDC_USDT etc.
        var usdc = pick('USDC_USDT'); if(usdc) usd.USDC = usdc;
        var usdt = pick('USDT_USDT'); if(usdt) usd.USDT = usdt;
      }
    }catch(e){
      // keep zeros for coins if not configured yet
      console.warn('rates not available', e);
    }
  }

  async function load(){
    if(!(window.DemoWallet && typeof window.DemoWallet.getUserId === 'function' && typeof window.DemoWallet.rpc === 'function')){
      console.warn('wallet.js not loaded');
      return;
    }
    var uid = window.DemoWallet.getUserId();
    if(!uid) return;

    await loadFixedUsdRates();

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
  }

  function boot(){
    load();
    // refresh so page stays synced after swaps
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
