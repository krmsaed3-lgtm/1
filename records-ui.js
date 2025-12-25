
(function(){
  'use strict';

  var container, startInput, endInput, resetBtn, confirmBtn, typeRow, typeLabel, currencyRow, currencyLabel;
  var allTxs = [];
  var filters = { start:'', end:'', type:'all', currency:'USDT' };

  function qs(id){ return document.getElementById(id); }

  function load(){
    try{
      var raw = localStorage.getItem('records_test_data') || '[]';
      allTxs = JSON.parse(raw) || [];
    }catch(e){ allTxs = []; }
  }

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
          '<span class="bill-amount">'+tx.amount+' '+tx.currency+'</span>'+
        '</div>'+
        '<div class="bill-sub-row">'+
          '<span class="bill-status">'+tx.status+'</span>'+
          '<span class="bill-time">'+tx.date+'</span>'+
        '</div>';
      container.appendChild(d);
    });
  }

  function apply(){
    var out = allTxs.filter(function(tx){
      if(filters.type!=='all' && tx.type!==filters.type) return false;
      if(filters.currency && tx.currency!==filters.currency) return false;
      if(filters.start && tx.date < filters.start) return false;
      if(filters.end && tx.date > filters.end) return false;
      return true;
    });
    render(out);
  }

  document.addEventListener('DOMContentLoaded', function(){
    container = qs('billsContainer');
    startInput = qs('startDate');
    endInput = qs('endDate');
    resetBtn = document.querySelector('.btn-reset');
    confirmBtn = document.querySelector('.btn-confirm');
    typeRow = qs('typeRow');
    typeLabel = qs('typeLabel');
    currencyRow = qs('currencyRow');
    currencyLabel = qs('currencyLabel');

    load();
    apply();

    resetBtn.onclick = function(){
      startInput.value = '';
      endInput.value = '';
      filters = { start:'', end:'', type:'all', currency:'USDT' };
      typeLabel.textContent = 'All';
      currencyLabel.textContent = 'USDT';
      apply();
    };

    confirmBtn.onclick = function(){
      filters.start = startInput.value;
      filters.end = endInput.value;
      apply();
    };

    typeRow.onclick = function(){
      var order = ['all','deposit','withdraw','profit'];
      var i = (order.indexOf(filters.type)+1)%order.length;
      filters.type = order[i];
      typeLabel.textContent = order[i].charAt(0).toUpperCase()+order[i].slice(1);
      apply();
    };

    currencyRow.onclick = function(){
      filters.currency = filters.currency==='USDT'?'BTC':'USDT';
      currencyLabel.textContent = filters.currency;
      apply();
    };
  });
})();
