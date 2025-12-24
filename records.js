// records.js
(function () {
  'use strict';

  const KEY = 'transactions';

  function getTransactions() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
      return [];
    }
  }

  function addTransaction(tx) {
    const list = getTransactions();
    list.push({
      type: tx.type || 'unknown',
      amount: Number(tx.amount || 0),
      currency: (tx.currency || 'USDT').toUpperCase(),
      status: tx.status || 'SUCCESS',
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  // نجعلها عالمية لصفحة السجل
  window.DemoWallet = {
    getTransactions,
    addTransaction
  };
})();
