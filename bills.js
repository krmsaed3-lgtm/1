// records.js - Records page logic (demo balance)
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

    var res = await fetch(url, {
      headers: SB.headers()
    });

    if (!res.ok) {
      console.error('Failed to load records');
      return [];
    }

    return res.json();
  }

  function render(records) {
    var tbody = document.getElementById('records-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!records.length) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;color:#7b8194">No records</td></tr>';
      return;
    }

    records.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.type}</td>
        <td>${Number(r.amount).toFixed(2)}</td>
        <td>${r.source || '-'}</td>
        <td>${Number(r.balance_after).toFixed(2)}</td>
        <td>${r.status}</td>
        <td>${new Date(r.created_at).toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.addEventListener('DOMContentLoaded', async function () {
    var records = await fetchRecords();
    render(records);
  });
})();
