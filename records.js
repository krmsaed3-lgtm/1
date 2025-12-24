// records.js
;(function () {
  'use strict';

  var STORAGE_KEY = 'transactions';

  function read() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function write(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function add(tx) {
    var list = read();

    list.push({
      type: tx.type || 'unknown',          // deposit | withdraw | income | swap
      amount: Number(tx.amount || 0),
      currency: (tx.currency || 'USDT').toUpperCase(),
      status: tx.status || 'SUCCESS',
      fee: Number(tx.fee || 0),
      net: Number(tx.net || tx.amount || 0),
      createdAt: new Date().toISOString()
    });

    write(list);
  }

  function getAll() {
    return read();
  }

  // ربطه مع wallet.js بدون تعديل عليه
  if (window.DemoWallet) {
    var W = window.DemoWallet;

    // مثال: تسجيل سحب
    if (typeof W.requestWithdrawal === 'function') {
      var oldWithdraw = W.requestWithdrawal;
      W.requestWithdrawal = async function (opts) {
        var res = await oldWithdraw(opts);
        add({
          type: 'withdraw',
          amount: opts.amount,
          currency: opts.currency
        });
        return res;
      };
    }

    // مثال: تسجيل ربح
    if (typeof W.performIpowerAction === 'function') {
      var oldIncome = W.performIpowerAction;
      W.performIpowerAction = async function () {
        var res = await oldIncome();
        if (res && res.amount) {
          add({
            type: 'income',
            amount: res.amount,
            currency: 'USDT'
          });
        }
        return res;
      };
    }

    // توفير الدالة لصفحة السجل
    W.getTransactions = getAll;
  }

})();
