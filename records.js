// records.js - Mobile records page (demo balance)
;(function () {
  'use strict';

  if (!window.SB_CONFIG) {
    console.error('SB_CONFIG not loaded');
    return;
  }

  var SB = window.SB_CONFIG;

  function getUserId() {
    try {
      return (localStorage.getItem('sb_user_id_v1') || '').trim();
    } catch (e) {
      return '';
    }
  }

  async function fetchRecords() {
    var userId = getUserId();
    if (!userId) return [];

    var url =
      SB.url +
      '/rest/v1/financial_transactions' +
      '?user_id=eq.' + encodeURIComponent(userId) +
      '&select=type,amount,source,balance_after,status,created_at' +
      '&order=created_at.desc';

    var res = await fetch(url, { headers: SB.headers() });
    if (!res.ok) return [];
    return res.json();
  }

  function formatDate(d) {
    return new Date(d).toLocaleString();
  }

  function render(records) {
    var list = document.getElementById('records-list');
    list.innerHTML = '';

    if (!records.length) {
      list.innerHTML = '<div class="empty">No records yet</div>';
      return;
    }

    records.forEach(function (r) {
      var item = document.createElement('div');
      item.className = 'record';
      item.innerHTML = `
        <div class="row">
          <span class="type ${r.type}">${r.type}</span>
          <span class="amount">${Number(r.amount).toFixed(2)}</span>
        </div>
        <div class="row small">
          <span>${r.source || '-'}</span>
          <span>${r.status}</span>
        </div>
        <div class="row small">
          <span>Balance: ${Number(r.balance_after).toFixed(2)}</span>
          <span>${formatDate(r.created_at)}</span>
        </div>
      `;
      list.appendChild(item);
    });
  }

  document.addEventListener('DOMContentLoaded', async function () {
    render(await fetchRecords());
  });
})();
