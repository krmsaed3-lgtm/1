
;(function(){
  'use strict';

  function readRecords(){
    try{
      var raw = localStorage.getItem('wallet_records') || '[]';
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    }catch(e){ return []; }
  }

  function normalize(r){
    return {
      type: String(r.type || '').toLowerCase(),
      amount: Number(r.amount || 0) || 0,
      currency: String(r.currency || 'USDT').toUpperCase(),
      status: String(r.status || 'SUCCESS'),
      createdAt: r.createdAt || r.created_at || ''
    };
  }

  function init(){
    var container = document.getElementById('billsContainer');
    var resetBtn = document.querySelector('.btn-reset');
    var confirmBtn = document.querySelector('.btn-confirm');
    var startInput = document.getElementById('startDate');
    var endInput = document.getElementById('endDate');

    var all = readRecords().map(normalize);

    function render(list){
      if(!list.length){
        container.className = 'empty-state';
        container.textContent = 'No records yet.';
        return;
      }
      container.className = 'bill-list';
      container.innerHTML = '';
      list.forEach(function(tx){
        var d = document.createElement('div');
        d.className = 'bill-item';
        d.innerHTML =
          '<div class="bill-main-row">'+
            '<span class="bill-type">'+tx.type+'</span>'+
            '<span class="bill-amount">'+tx.amount.toFixed(2)+' '+tx.currency+'</span>'+
          '</div>'+
          '<div class="bill-sub-row">'+
            '<span class="bill-status">'+tx.status+'</span>'+
            '<span class="bill-time">'+tx.createdAt+'</span>'+
          '</div>';
        container.appendChild(d);
      });
    }

    function apply(){
      var s = startInput.value;
      var e = endInput.value;
      var out = all.filter(function(tx){
        if(s && tx.createdAt < s) return false;
        if(e && tx.createdAt > e) return false;
        return true;
      });
      render(out);
    }

    resetBtn.onclick = function(){
      startInput.value = '';
      endInput.value = '';
      render(all);
    };

    confirmBtn.onclick = apply;

    render(all);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
