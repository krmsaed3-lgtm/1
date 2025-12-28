;(function(){
  'use strict';

  function $(id){ return document.getElementById(id); }
  function setDbg(msg){
    var d = $('dbg');
    if(!d) return;
    d.textContent = msg || '';
  }
  function toast(msg){
    var t = $('toast');
    if(!t) { console.log('[toast]', msg); return; }
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

  var MIN_SWAP = 100;
  var FEE_RATE = 0.01;
  var DEFAULT_RATE = 1; // UI shows 1:1

  var el = {};
  var state = {
    from: 'USDT',
    to: 'USDC',
    balances: { USDT:0, USDC:0, BTC:0, ETH:0, TRX:0 },
    rate: DEFAULT_RATE
  };

  function getUserId(){
    try{
      if(window.DemoWallet && typeof window.DemoWallet.getUserId === 'function'){
        var uid = window.DemoWallet.getUserId();
        if(uid) return uid;
      }
    }catch(_){}
    // common fallbacks
    return localStorage.getItem('user_id') || localStorage.getItem('uid') || '';
  }

  function setTokenUI(which, sym){
    var token = TOKENS.find(function(t){ return t.sym===sym; }) || TOKENS[0];
    if(which==='from'){
      $('from-token-symbol').textContent = token.sym;
      $('from-token-icon').src = token.img;
    }else{
      $('to-token-symbol').textContent = token.sym;
      $('to-token-icon').src = token.img;
    }
  }

  function renderBalances(){
    $('from-balance').textContent = fmt(state.balances[state.from], 6);
    $('to-balance').textContent = fmt(state.balances[state.to], 6);
  }

  function updateExpected(){
    var fromAmt = num($('from-amount').value);
    if(fromAmt <= 0){
      $('fee-text').textContent = '-';
      $('expected-text').textContent = '-';
      return;
    }
    var fee = fromAmt * FEE_RATE;
    var net = fromAmt - fee;
    var got = net * state.rate;

    $('rate-text').textContent = '1 ' + state.from + ' = ' + fmt(state.rate, 6) + ' ' + state.to;
    $('fee-text').textContent = fmt(fee, 6) + ' ' + state.from;
    $('expected-text').textContent = fmt(got, 6) + ' ' + state.to;

    // button state
    var ok = (fromAmt >= MIN_SWAP) && (fromAmt <= state.balances[state.from]) && (state.from !== state.to);
    $('swap-btn').disabled = !ok;
  }

  function openMenu(which){
    var menu = $(which+'-token-menu');
    menu.classList.toggle('show');
  }
  function closeMenus(){
    $('from-token-menu').classList.remove('show');
    $('to-token-menu').classList.remove('show');
  }

  function attachMenus(){
    function buildMenu(which){
      var menu = $(which+'-token-menu');
      menu.innerHTML = '';
      TOKENS.forEach(function(t){
        var btn = document.createElement('button');
        btn.className = 'token-item';
        btn.type = 'button';
        btn.innerHTML = '<img src="'+t.img+'" alt="'+t.sym+'"><span>'+t.sym+'</span>';
        btn.addEventListener('click', function(){
          if(which==='from'){
            state.from = t.sym;
            // prevent same
            if(state.to===state.from){
              state.to = (t.sym==='USDT') ? 'USDC' : 'USDT';
              setTokenUI('to', state.to);
            }
            setTokenUI('from', state.from);
          }else{
            state.to = t.sym;
            if(state.to===state.from){
              state.from = (t.sym==='USDT') ? 'USDC' : 'USDT';
              setTokenUI('from', state.from);
            }
            setTokenUI('to', state.to);
          }
          closeMenus();
          renderBalances();
          updateExpected();
        });
        menu.appendChild(btn);
      });
    }
    buildMenu('from');
    buildMenu('to');
  }

  function setBalancesFromSwapRow(row){
    state.balances.USDT = Number(row.usdt_balance ?? row.usdt ?? 0) || 0;
    state.balances.USDC = Number(row.usdc_balance ?? row.usdc ?? 0) || 0;
    state.balances.BTC  = Number(row.btc_balance  ?? row.btc  ?? 0) || 0;
    state.balances.ETH  = Number(row.eth_balance  ?? row.eth  ?? 0) || 0;
    state.balances.TRX  = Number(row.trx_balance  ?? row.trx  ?? 0) || 0;
  }

  async function loadBalances(){
    var uid = getUserId();
    if(!uid){
      setDbg('❌ ما في User ID (مش مسجّل دخول) — لازم تسجّل دخول من نفس الجهاز/المتصفح.');
      // keep zeros
      return;
    }

    setDbg('✅ user_id: ' + uid + ' ... تحميل الرصيد');

    // 1) Try RPC get_swap_balances (recommended)
    try{
      if(window.DemoWallet && typeof window.DemoWallet.rpc === 'function'){
        var r = await window.DemoWallet.rpc('get_swap_balances', { p_user: uid });
        if(Array.isArray(r)) r = r[0] || null;
        if(r){
          setBalancesFromSwapRow(r);
          setDbg('✅ تم تحميل swap_balances');
          return;
        }
      }
    }catch(e){
      setDbg('⚠️ RPC get_swap_balances فشلت: ' + (e && (e.message||e.error_description||e.toString()) ));
      // continue fallback
    }

    // 2) Fallback: read swap_balances directly if client is exposed
    try{
      var client = (window.DemoWallet && window.DemoWallet.db) || window.sb || window.supabase || window.supabaseClient;
      if(client && typeof client.from === 'function'){
        var q = await client.from('swap_balances').select('*').eq('user_id', uid).maybeSingle();
        if(q && q.data){
          setBalancesFromSwapRow(q.data);
          setDbg('✅ تم تحميل swap_balances (direct)');
          return;
        }
      }
    }catch(e2){
      // continue
    }

    // 3) Last fallback: show demo USDT from wallet_balances (common expectation)
    try{
      var client2 = (window.DemoWallet && window.DemoWallet.db) || window.sb || window.supabase || window.supabaseClient;
      if(client2 && typeof client2.from === 'function'){
        var w = await client2.from('wallet_balances').select('usdt_balance').eq('user_id', uid).maybeSingle();
        if(w && w.data){
          state.balances.USDT = Number(w.data.usdt_balance || 0) || 0;
          setDbg('ℹ️ swap_balances غير متاحة — عرض USDT من wallet_balances فقط');
          return;
        }
      }
    }catch(e3){}

    setDbg('❌ ما قدرنا نجيب الرصيد. غالبًا: RPC غير معمول / صلاحيات RLS / أو DemoWallet ما عم يعرّف Supabase.');
  }

  async function performSwap(){
    var uid = getUserId();
    if(!uid){ toast('لازم تسجّل دخول أولاً'); return; }

    var fromAmt = num($('from-amount').value);
    if(fromAmt < MIN_SWAP){ toast('الحد الأدنى ' + MIN_SWAP); return; }
    if(state.from === state.to){ toast('اختر عملتين مختلفتين'); return; }
    if(fromAmt > state.balances[state.from]){ toast('رصيد غير كافي'); return; }

    $('swap-btn').disabled = true;

    try{
      if(window.DemoWallet && typeof window.DemoWallet.rpc === 'function'){
        var res = await window.DemoWallet.rpc('do_swap', {
          p_user: uid,
          p_from_currency: state.from,
          p_to_currency: state.to,
          p_from_amount: fromAmt,
          p_rate: state.rate,
          p_ref: 'web'
        });
        if(Array.isArray(res)) res = res[0] || null;
        if(res){
          setBalancesFromSwapRow(res);
          toast('تم التبديل ✅');
          $('from-amount').value = '';
          $('to-amount').value = '';
          renderBalances();
          updateExpected();
          return;
        }
      }
      throw new Error('RPC do_swap غير متاحة أو لم تُرجع نتيجة');
    }catch(e){
      toast('Swap فشل: راجع DBG/Console');
      setDbg(( $('dbg')?.textContent || '') + '\n' + '❌ do_swap: ' + (e.message || e.toString()));
    }finally{
      $('swap-btn').disabled = false;
    }
  }

  function switchTokens(){
    var tmp = state.from; state.from = state.to; state.to = tmp;
    setTokenUI('from', state.from);
    setTokenUI('to', state.to);
    renderBalances();
    updateExpected();
  }

  async function refreshAll(){
    await loadBalances();
    renderBalances();
    updateExpected();
  }

  function init(){
    // cache elements
    el.fromAmount = $('from-amount');
    el.toAmount = $('to-amount');

    // init UI
    setTokenUI('from', state.from);
    setTokenUI('to', state.to);
    attachMenus();

    $('from-token-select').addEventListener('click', function(){ openMenu('from'); });
    $('to-token-select').addEventListener('click', function(){ openMenu('to'); });
    $('switchBtn').addEventListener('click', function(){ switchTokens(); });
    $('swap-btn').addEventListener('click', function(){ performSwap(); });

    $('from-amount').addEventListener('input', updateExpected);
    $('refreshBtn').addEventListener('click', refreshAll);

    var maxBtn = $('maxBtn');
    if(maxBtn){
      maxBtn.addEventListener('click', function(){
        var b = Number(state.balances[state.from] || 0);
        $('from-amount').value = (b > 0) ? fmt(b, 6) : '';
        updateExpected();
      });
    }

    document.addEventListener('click', function(e){
      if(!$('from-token-wrapper').contains(e.target) && !$('to-token-wrapper').contains(e.target)) closeMenus();
    });

    refreshAll();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();
