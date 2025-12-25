
;(function(){
  'use strict';
  function norm(r){
    return {
      type: String(r.type||r.kind||'').toLowerCase(),
      amount: Number(r.amount||0)||0,
      currency: String(r.currency||'USDT').toUpperCase(),
      status: String(r.status||'SUCCESS'),
      createdAt: r.created_at||r.createdAt||new Date().toISOString(),
      fee: Number(r.fee||0)||0,
      net: Number(r.net||r.amount||0)||0
    };
  }
  async function load(){
    try{
      if (window.DemoWallet && DemoWallet.rpc){
        const rows = await DemoWallet.rpc('get_wallet_records', {});
        return Array.isArray(rows)? rows.map(norm):[];
      }
    }catch(e){}
    try{
      const raw = localStorage.getItem('transactions')||'[]';
      const arr = JSON.parse(raw);
      return Array.isArray(arr)? arr.map(norm):[];
    }catch(e){ return []; }
  }
  window.DemoWallet = window.DemoWallet||{};
  window.DemoWallet.getTransactions = load;
})();
