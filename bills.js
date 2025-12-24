(function () {
  'use strict';

  var KEY = 'transactions_json';

  function read() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function write(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function add(tx) {
    var list = read();
    list.push(tx);
    write(list);
  }

  function now() {
    return new Date().toISOString();
  }

  window.RecordLogger = {

    deposit(amount, currency) {
      add({
        type: 'deposit',
        amount: Number(amount) || 0,
        currency: (currency || 'USDT').toUpperCase(),
        status: 'SUCCESS',
        createdAt: now()
      });
    },

    withdraw(amount, currency) {
      add({
        type: 'withdraw',
        amount: Number(amount) || 0,
        currency: (currency || 'USDT').toUpperCase(),
        status: 'PENDING',
        createdAt: now()
      });
    },

    profit(amount, currency) {
      add({
        type: 'income',
        amount: Number(amount) || 0,
        currency: (currency || 'USDT').toUpperCase(),
        status: 'SUCCESS',
        createdAt: now()
      });
    }
  };
})();
