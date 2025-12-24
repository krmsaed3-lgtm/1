(function () {
  'use strict';

  var KEY = 'transactions_json';

  function read() {
    try {
      var data = localStorage.getItem(KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function write(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch (e) {}
  }

  function add(tx) {
    var list = read();
    list.push(tx);
    write(list);
  }

  function now() {
    return new Date().toISOString();
  }

  // واجهة عامة بدون ES6
  window.RecordLogger = {

    deposit: function (amount, currency) {
      add({
        type: 'deposit',
        amount: Number(amount) || 0,
        currency: (currency || 'USDT').toUpperCase(),
        status: 'SUCCESS',
        createdAt: now()
      });
    },

    withdraw: function (amount, currency) {
      add({
        type: 'withdraw',
        amount: Number(amount) || 0,
        currency: (currency || 'USDT').toUpperCase(),
        status: 'PENDING',
        createdAt: now()
      });
    },

    profit: function (amount, currency) {
      add({
        type: 'income',
        amount: Number(amount) || 0,
        currency: (currency || 'USDT').toUpperCase(),
        status: 'SUCCESS',
        createdAt: now()
      });
    },

    // اختياري للفحص
    getAll: function () {
      return read();
    }
  };

})();
