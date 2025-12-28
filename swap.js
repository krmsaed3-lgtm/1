;(function(){
  'use strict';

  function $(id){ return document.getElementById(id); }
  function toast(msg){
    var t = $('toast');
    if(!t){ console.log('[toast]', msg); return; }
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
    {sym:'USDT', img:'images/usdt.png'},
    {sym:'USDC', img:'images/usdc.png'},
    {sym:'BTC',  img:'images/btc.png'},
    {sym:'ETH',  img:'images/eth.png'},
    {sym:'TRX',  img:'images/trx.png'}
  ];

  var MIN_SWAP = 100;
  var FEE_RATE = 0.01;

  var state = {
    from:'USDT',
    to:'USDC',
    rate: 0,
    balances: { USDT:0, USDC:0, BTC:0, ETH:0, TRX:0 }
  };

  var el = {};

  function token(sym){
    for(var i=0;i<TOKENS.length;i++) if(TOKENS[i].sym===sym) return TOKENS[i];
    return TOKENS[0];
  }

  function getUserId(){
    try{
      if(window.DemoWallet && typeof window.DemoWallet.getUserId === 'function'){
        return window.DemoWallet.getUserId() || '';
      }
    }catch(_){}
    return '';
  }

  function setBalancesFromJson(obj){
    if(!obj || typeof obj !== 'object') return;
    state.balances.USDT = Number(obj.USDT ?? obj.usdt ?? obj.usdt_balance ?? 0) || 0;
    state.balances.USDC = Number(obj.USDC ?? obj.usdc ?? obj.usdc_balance ?? 0) || 0;
    state.balances.BTC  = Number(obj.BTC  ?? obj.btc  ?? obj.btc_balance  ?? 0) || 0;
    state.balances.ETH  = Number(obj.ETH  ?? obj.eth  ?? obj.eth_balance  ?? 0) || 0;
    state.balances.TRX  = Number(obj.TRX  ?? obj.trx  ?? obj.trx_balance  ?? 0) || 0;
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
    if(side === 'from'){ state.from = sym; } else { state.to = sym; }
    if(state.from === state.to){
      state.to = (state.from === 'USDT') ? 'USDC' : 'USDT';
    }

    el.fromSym.textContent = state.from;
    el.toSym.textContent = state.to;
    el.fromIcon.src = token(state.from).img;
    el.toIcon.src = token(state.to).img;

    closeMenus();
    refreshRateAndUI();
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

    refreshRateAndUI();
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

    if(state.rate > 0){
      el.rateText.textContent = '1 ' + state.from + ' = ' + fmt(state.rate, 12) + ' ' + state.to;
    }else{
      el.rateText.textContent = '-';
    }

    if(!(amount > 0)) return;
    if(amount < MIN_SWAP) return;
    if(amount > bal) return;
    if(!(state.rate > 0)) return;
    if(state.from === state.to) return;

    var fee = amount * FEE_RATE;
    var net = amount - fee;
    var out = net * state.rate;

    el.feeText.textContent = fmt(fee, 8) + ' ' + state.from;
    el.toAmount.value = fmt(out, 8);
    el.expectedText.textContent = fmt(out, 8) + ' ' + state.to;

    el.swapBtn.disabled = false;
  }

  function updateUI(){
    updateBalancesUI();
    updateExpected();
  }

  async function loadBalances(){
    var uid = getUserId();
    if(!uid) return;

    try{
      if(!(window.DemoWallet && typeof window.DemoWallet.rpc === 'function')){
        throw new Error('wallet.js not loaded');
      }
      var b = await window.DemoWallet.rpc('demo_get_balances', { p_user: uid });
      if(Array.isArray(b)) b = b[0] || null;
      setBalancesFromJson(b);
    }catch(e){
      console.error(e);
      toast('Balance error');
    }
  }

  async function loadRate(){
    try{
      if(!(window.DemoWallet && typeof window.DemoWallet.rpc === 'function')){
        throw new Error('wallet.js not loaded');
      }
      var r = await window.DemoWallet.rpc('demo_get_rate', { p_from: state.from, p_to: state.to });
      if(Array.isArray(r)) r = r[0];
      state.rate = Number(r) || 0;
    }catch(e){
      console.error(e);
      state.rate = 0;
      toast('Rate not available');
    }
  }

  async function refreshAll(){
    el.swapBtn.disabled = true;
    await loadBalances();
    await loadRate();
    updateUI();
  }

  async function refreshRateAndUI(){
    el.swapBtn.disabled = true;
    await loadRate();
    updateUI();
  }

  async function performSwap(){
    var uid = getUserId();
    if(!uid){ toast('Not logged in'); return; }

    var amount = num(el.fromAmount.value);
    var bal = Number(state.balances[state.from] || 0);

    if(!(amount > 0)){ toast('Enter amount'); return; }
    if(amount < MIN_SWAP){ toast('Min is ' + MIN_SWAP); return; }
    if(amount > bal){ toast('Insufficient balance'); return; }
    if(!(state.rate > 0)){ toast('Rate not available'); return; }
    if(state.from === state.to){ toast('Choose different tokens'); return; }

    el.swapBtn.disabled = true;

    try{
      if(!(window.DemoWallet && typeof window.DemoWallet.rpc === 'function')){
        throw new Error('wallet.js not loaded');
      }

      var resp = await window.DemoWallet.rpc('demo_swap', {
        p_user: uid,
        p_from: state.from,
        p_to: state.to,
        p_amount: amount
      });

      if(Array.isArray(resp)) resp = resp[0] || null;
      setBalancesFromJson(resp);

      toast('Swap completed');
      el.fromAmount.value = '';
      el.toAmount.value = '';
      await refreshAll();
    }catch(e){
      console.error(e);
      toast('Swap error');
      await refreshAll();
    }
  }

  function setMax(){
    el.fromAmount.value = fmt(state.balances[state.from] || 0, 6);
    updateExpected();
  }

  function init(){
    el.backBtn = $('backBtn');
    el.refreshBtn = $('refreshBtn');
    el.switchBtn = $('switchBtn');
    el.maxBtn = $('maxBtn');
    el.fromAmount = $('from-amount');
    el.toAmount = $('to-amount');
    el.fromBalance = $('from-balance');
    el.toBalance = $('to-balance');
    el.swapBtn = $('swap-btn');
    el.rateText = $('rate-text');
    el.feeText = $('fee-text');
    el.expectedText = $('expected-text');

    el.fromSelect = $('from-token-select');
    el.toSelect = $('to-token-select');
    el.fromMenu = $('from-token-menu');
    el.toMenu = $('to-token-menu');
    el.fromIcon = $('from-token-icon');
    el.toIcon = $('to-token-icon');
    el.fromSym = $('from-token-symbol');
    el.toSym = $('to-token-symbol');
    el.fromWrap = $('from-token-wrapper');
    el.toWrap = $('to-token-wrapper');

    renderMenus();

    el.backBtn.addEventListener('click', function(){ if(history.length > 1) history.back(); });
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

    el.fromSym.textContent = state.from;
    el.toSym.textContent = state.to;
    el.fromIcon.src = token(state.from).img;
    el.toIcon.src = token(state.to).img;

    refreshAll();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();
