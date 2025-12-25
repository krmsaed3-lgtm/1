
/*
  records-logger.js
  INTERNAL transaction logger (NO DB)
  Listens to deposit / withdraw / profit events and stores locally
*/
(function(){
  'use strict';
  var KEY = 'records_test_data';

  function load(){
    try { return JSON.parse(localStorage.getItem(KEY)||'[]') || []; }
    catch(e){ return []; }
  }
  function save(arr){
    localStorage.setItem(KEY, JSON.stringify(arr));
  }
  function add(rec){
    var all = load();
    all.unshift(rec);
    save(all);
  }

  // expose global helper
  window.RecordLog = {
    deposit: function(amount,currency){
      add({type:'deposit',amount:amount,currency:currency||'USDT',status:'SUCCESS',date:new Date().toISOString().slice(0,10)});
    },
    withdraw: function(amount,currency){
      add({type:'withdraw',amount:amount,currency:currency||'USDT',status:'PENDING',date:new Date().toISOString().slice(0,10)});
    },
    profit: function(amount,currency){
      add({type:'profit',amount:amount,currency:currency||'USDT',status:'SUCCESS',date:new Date().toISOString().slice(0,10)});
    }
  };
})();
