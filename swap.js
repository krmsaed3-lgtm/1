;(function(){
  'use strict';

  // Run after DOM is ready (swap.html loads scripts in <head>)
  function __run(){


  function $(id){ return document.getElementById(id); }
  function toast(msg){
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(window.__toastT);
    window.__toastT = setTimeout(function(){ t.classList.remove('show'); }, 2800);
  }
  function num(v){ var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function fmt(n, d){
    n = Number(n); if(!isFinite(n)) n = 0;
    var s = (d==null ? n.toFixed(8) : n.toFixed(d));
    return s.replace(/\.0+$/,'').replace(/(\.\d*[1-9])0+$/,'$1');
  }

  var TOKENS = [
    {sym:'USDT', img:'images/usdt.png', cg:'tether'},
    {sym:'USDC', img:'images/usdc.png', cg:'usd-coin'},
    {sym:'BTC',  img:'images/btc.png',  cg:'bitcoin'},
    {sym:'ETH',  img:'images/eth.png',  cg:'ethereum'},
    {sym:'TRX',  img:'images/trx.png',  cg:'tron'}
  ];

  var MIN_SWAP = 1;
  var FEE_RATE = 0.01;

  var state = {
    from:'USDT',
    to:'USDC',
    pricesUSD: { USDT:1, USDC:1, BTC:60000, ETH:3000, TRX:0.1 },
    balances: { USDT:0, USDC:0, BTC:0, ETH:0, TRX:0 }
  };

  var el = {
    backBtn: $('backBtn'),
    refreshBtn: $('refreshBtn'),
    switchBtn: $('switchBtn'),
    maxBtn: $('maxBtn'),
    fromAmount: $('from-amount'),
    toAmount: $('to-amount'),
    fromBalance: $('from-balance'),
    toBalance: $('to-balance'),
    swapBtn: $('swap-btn'),
    rateText: $('rate-text'),
    feeText: $('fee-text'),
    expectedText: $('expected-text'),

    fromSelect: $('from-token-select'),
    toSelect: $('to-token-select'),
    fromMenu: $('from-token-menu'),
    toMenu: $('to-token-menu'),
    fromIcon: $('from-token-icon'),
    toIcon: $('to-token-icon'),
    fromSym: $('from-token-symbol'),
    toSym: $('to-token-symbol'),
    fromWrap: $('from-token-wrapper'),
    toWrap: $('to-token-wrapper')
  };

  function token(sym){
    return TOKENS.find(function(t){ return t.sym === sym; }) || TOKENS[0];
  }

  function renderMenus(){
    function mkOption(side, t){
      var div = document.createElement('div');
      div.className = 'token-option';
      div.innerHTML = '<div class="token-icon"><img src="'+t.img+'" alt="'+t.sym+'"></div><span>'+t.sym+'</span>';
      div.addEventListener('click', function(){ selectToken(side, t.sym); });
      return div;
    }
    el.fromMenu.innerHTML = '';
    el.toMenu.innerHTML = '';
    TOKENS.forEach(function(t){
      el.fromMenu.appendChild(mkOption('from', t));
      el.toMenu.appendChild(mkOption('to', t));
    });
  }

  function openMenu(side){
    var menu = side === 'from' ? el.fromMenu : el.toMenu;
    var other = side === 'from' ? el.toMenu : el.fromMenu;
    other.classList.remove('open');
    menu.classList.toggle('open');
  }

  function closeMenus(){
    el.fromMenu.classList.remove('open');
    el.toMenu.classList.remove('open');
  }

  function selectToken(side, sym){
    if(side === 'from'){ state.from = sym; }
    else { state.to = sym; }

    if(state.from === state.to){
      state.to = (state.from === 'USDT') ? 'USDC' : 'USDT';
    }

    el.fromSym.textContent = state.from;
    el.toSym.textContent = state.to;
    el.fromIcon.src = token(state.from).img;
    el.toIcon.src = token(state.to).img;

    closeMenus();
    updateUI();
  }

  function switchTokens(){
    var tmp = state.from;
    state.from = state.to;
    state.to = tmp;

    if(state.from === state.to){
      state.to = (state.from === 'USDT') ? 'USDC' : 'USDT';
    }

    el.fromSym.textContent = state.from;
    el.toSym.textContent = state.to;
    el.fromIcon.src = token(state.from).img;
    el.toIcon.src = token(state.to).img;

    updateUI();
  }

  function rate(from, to){
    var pf = state.pricesUSD[from];
    var pt = state.pricesUSD[to];
    if(!pf || !pt) return 0;
    return pf / pt;
  }

  function updateBalancesUI(){
    el.fromBalance.textContent = fmt(state.balances[state.from], 6);
    el.toBalance.textContent = fmt(state.balances[state.to], 6);
  }

  function updateExpected(){
    var amount = num(el.fromAmount.value);
    var bal = Number(state.balances[state.from] || 0);

    el.swapBtn.disabled = true;
    el.toAmount.value = '';
    el.expectedText.textContent = '-';
    el.feeText.textContent = '-';

    var r = rate(state.from, state.to);
    el.rateText.textContent = '1 ' + state.from + ' = ' + fmt(r, 8) + ' ' + state.to;

    if(!(amount > 0)) return;
    if(amount < MIN_SWAP) return;
    if(amount > bal) return;
    if(!(r > 0)) return;
    if(state.from === state.to) return;

    var fee = amount * FEE_RATE;
    var net = amount - fee;
    var out = net * r;

    el.feeText.textContent = fmt(fee, 8) + ' ' + state.from;
    el.toAmount.value = fmt(out, 8);
    el.expectedText.textContent = fmt(out, 8) + ' ' + state.to;

    el.swapBtn.disabled = false;
  }

  function setMax(){
    el.fromAmount.value = fmt(state.balances[state.from] || 0, 6);
    updateExpected();
  }

  function setBalancesFromRow(row){
    if(!row || typeof row !== 'object') return;
    state.balances.USDT = Number(row.usdt_balance ?? row.usdt ?? row.balance ?? 0) || 0;
    state.balances.USDC = Number(row.usdc_balance ?? row.usdc ?? 0) || 0;
    state.balances.BTC  = Number(row.btc_balance  ?? row.btc  ?? 0) || 0;
    state.balances.ETH  = Number(row.eth_balance  ?? row.eth  ?? 0) || 0;
    state.balances.TRX  = Number(row.trx_balance  ?? row.trx  ?? 0) || 0;
  }

  async function loadBalances(){
    var uid = (window.DemoWallet && typeof window.DemoWallet.getUserId === 'function') ? window.DemoWallet.getUserId() : '';
    if(!uid){
      // still allow viewing rates, but show 0 balances
      return;
    }

    // Preferred: new RPC get_swap_balances
    try{
      if(window.DemoWallet && typeof window.DemoWallet.rpc === 'function'){
        var r1 = await window.DemoWallet.rpc('get_swap_balances', { p_user: uid });
        if(Array.isArray(r1)) r1 = r1[0] || null;
        if(r1){
          setBalancesFromRow(r1);
          return;
        }
      }
    }catch(e){
      // ignore, fallback below
    }

    // Fallback: get_assets_summary (may return array or object)
    try{
      if(window.DemoWallet && typeof window.DemoWallet.getAssetsSummary === 'function'){
        var s = await window.DemoWallet.getAssetsSummary(uid);
        if(Array.isArray(s)) s = s[0] || null;
        if(s) setBalancesFromRow(s);
        return;
      }
    }catch(e){
      // ignore
    }
  }

  async function loadPrices(){
    try{
      var ids = TOKENS.map(function(t){ return t.cg; }).join(',');
      var url = 'https://api.coingecko.com/api/v3/simple/price?ids=' + encodeURIComponent(ids) + '&vs_currencies=usd';
      var res = await fetch(url, { method:'GET' });
      if(!res.ok) throw new Error('price fetch failed');
      var j = await res.json();

      var map = {};
      TOKENS.forEach(function(t){
        var v = j && j[t.cg] && j[t.cg].usd;
        if(isFinite(Number(v)) && Number(v) > 0) map[t.sym] = Number(v);
      });

      map.USDT = map.USDT || 1;
      map.USDC = map.USDC || 1;

      if(Object.keys(map).length >= 3){
        state.pricesUSD = Object.assign({}, state.pricesUSD, map);
      }
    }catch(e){
      // keep fallback
    }
  }

  async function refreshAll(){
    el.swapBtn.disabled = true;
    await Promise.all([loadBalances(), loadPrices()]);
    updateUI();
  }

  function updateUI(){
    updateBalancesUI();
    updateExpected();
  }

  async function performSwap(){
    var uid = (window.DemoWallet && typeof window.DemoWallet.getUserId === 'function') ? window.DemoWallet.getUserId() : '';
    if(!uid){ toast('Not logged in'); return; }

    var amount = num(el.fromAmount.value);
    var bal = Number(state.balances[state.from] || 0);
    var r = rate(state.from, state.to);

    if(!(amount > 0)){ toast('Enter amount'); return; }
    if(amount < MIN_SWAP){ toast('Min is ' + MIN_SWAP); return; }
    if(amount > bal){ toast('Insufficient balance'); return; }
    if(!(r > 0)){ toast('Rate not available'); return; }
    if(state.from === state.to){ toast('Choose different tokens'); return; }

    el.swapBtn.disabled = true;

    try{
      if(!(window.DemoWallet && typeof window.DemoWallet.rpc === 'function')){
        throw new Error('wallet.js not loaded');
      }

      // Real swap (updates balances + inserts swap_ledger)
      var resp = await window.DemoWallet.rpc('do_swap', {
        p_user: uid,
        p_from_currency: state.from,
        p_to_currency: state.to,
        p_amount: amount,
        p_rate: r,
        p_ref: 'WEB_SWAP'
      });

      // resp may be row/object or array
      if(Array.isArray(resp)) resp = resp[0] || null;
      if(resp) setBalancesFromRow(resp);

      toast('Swap completed');
      el.fromAmount.value = '';
      el.toAmount.value = '';
      await refreshAll();
    }catch(e){
      console.error(e);
      toast('Swap error: ' + (e.message || 'unknown'));
      await refreshAll();
    }
  }

  renderMenus();

  el.backBtn.addEventListener('click', function(){
    if(history.length > 1) history.back();
  });
  el.refreshBtn.addEventListener('click', function(){ refreshAll(); });
  el.switchBtn.addEventListener('click', function(){ switchTokens(); });
  el.maxBtn.addEventListener('click', function(){ setMax(); });
  el.fromAmount.addEventListener('input', function(){ updateExpected(); });

  el.fromSelect.addEventListener('click', function(){ openMenu('from'); });
  el.toSelect.addEventListener('click', function(){ openMenu('to'); });

  el.swapBtn.addEventListener('click', function(){ performSwap(); });

  document.addEventListener('click', function(e){
    if(!el.fromWrap.contains(e.target) && !el.toWrap.contains(e.target)){
      closeMenus();
    }
  });

  refreshAll();

  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', __run);
  } else {
    __run();
  }
})();