// wallet.js - RPC-first wallet + records support
;(function () {
  'use strict';

  var SB = window.SB_CONFIG;
  if (!SB) {
    console.error('SB_CONFIG is not defined. Ensure sb-config.js is loaded first.');
    return;
  }

  var USER_ID_KEY = 'sb_user_id_v1';

  function getUserId() {
    try {
      return (localStorage.getItem(USER_ID_KEY) || '').trim();
    } catch (e) {
      return '';
    }
  }

  function fmtUSDT(n) {
    var x = Number(n);
    if (!isFinite(x)) x = 0;
    return x.toFixed(2) + ' USDT';
  }

  async function rpc(fnName, payload) {
    var url = SB.url.replace(/\/$/, '') + '/rest/v1/rpc/' + encodeURIComponent(fnName);
    var res = await fetch(url, {
      method: 'POST',
      headers: SB.headers(),
      body: JSON.stringify(payload || {})
    });

    var text = await res.text();
    var data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = text;
    }

    if (!res.ok) {
      var msg =
        (data && (data.message || data.error || data.details))
          ? (data.message || data.error || data.details)
          : ('RPC ' + fnName + ' failed');
      throw new Error(msg);
    }
    return data;
  }

  async function getAssetsSummary(userId) {
    var uid = userId || getUserId();
    if (!uid) throw new Error('Missing user session');
    return await rpc('get_assets_summary', { p_user: uid });
  }

  async function performIpowerAction(userId) {
    var uid = userId || getUserId();
    if (!uid) throw new Error('Missing user session');
    var rows = await rpc('perform_ipower_action', { p_user: uid });
    return Array.isArray(rows) ? rows[0] || null : rows;
  }

  async function requestWithdrawal(opts) {
    opts = opts || {};
    var uid = opts.user_id || getUserId();
    if (!uid) throw new Error('Missing user session');

    return await rpc('request_withdrawal', {
      p_user: uid,
      p_amount: Number(opts.amount || 0),
      p_currency: String(opts.currency || 'usdt'),
      p_network: String(opts.network || 'bep20'),
      p_address: String(opts.address || '').trim()
    });
  }

  async function getUserState(userId) {
    var uid = userId || getUserId();
    if (!uid) throw new Error('Missing user session');

    var url =
      SB.url.replace(/\/$/, '') +
      '/rest/v1/user_state?select=current_level,is_locked,is_funded,is_activated' +
      '&user_id=eq.' + encodeURIComponent(uid) +
      '&limit=1';

    var res = await fetch(url, {
      method: 'GET',
      headers: SB.headers()
    });

    if (!res.ok) return null;
    var rows = await res.json();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  }

  // ✅ هذه الدالة هي اللي تشغّل صفحة Records
  async function getTransactions(userId) {
    var uid = userId || getUserId();
    if (!uid) return [];

    var url =
      SB.url.replace(/\/$/, '') +
      '/rest/v1/transactions?user_id=eq.' +
      encodeURIComponent(uid) +
      '&order=created_at.desc';

    var res = await fetch(url, {
      method: 'GET',
      headers: SB.headers()
    });

    if (!res.ok) return [];
    return await res.json();
  }

  // ✅ التصدير النهائي
  window.DemoWallet = {
    getUserId: getUserId,
    fmtUSDT: fmtUSDT,
    rpc: rpc,
    getAssetsSummary: getAssetsSummary,
    performIpowerAction: performIpowerAction,
    requestWithdrawal: requestWithdrawal,
    getUserState: getUserState,
    getTransactions: getTransactions
  };
})();
