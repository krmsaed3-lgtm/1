/* member-data.js
   - يفصل منطق قراءة البيانات عن member.html بدون ما يغير التصميم
   - يقرأ الرصيد من wallet_balances (usdt_balance)
   - يقرأ عدد الأعضاء الفعّالين (Gen1 فقط) من RPC: public.get_my_team
   - يعتمد نفس تعريف الفعالية: is_effective=true أو demo_balance/usdt_balance >= 100
*/

(function () {
  'use strict';

  var SB = window.SB_CONFIG || {};

  function sbHeaders() {
    if (SB && typeof SB.headers === 'function') return SB.headers();
    var h = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (SB && SB.anonKey) h.apikey = SB.anonKey;
    return h;
  }

  function $(sel) { return document.querySelector(sel); }

  function setText(el, txt) {
    if (!el) return;
    el.textContent = String(txt);
  }

  function getCurrentUserIdSync() {
    // mimic patterns used across pages
    try {
      if (window.CURRENT_USER_ID) return window.CURRENT_USER_ID;
    } catch (e) {}
    var keys = ['currentUserId', 'sb_user_id_v1', 'user_id', 'uid', 'sb-user-id'];
    for (var i = 0; i < keys.length; i++) {
      try {
        var v = localStorage.getItem(keys[i]);
        if (v && v.length >= 30) return v;
      } catch (e2) {}
    }
    // try to detect UUID in localStorage
    var uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    try {
      for (var j = 0; j < localStorage.length; j++) {
        var k = localStorage.key(j);
        if (!k) continue;
        var val = localStorage.getItem(k);
        if (val && uuidRe.test(val)) return val;
      }
    } catch (e3) {}
    return '';
  }

  async function getCurrentUserId() {
    try {
      if (window.ExaAuth && typeof window.ExaAuth.ensureSupabaseUserId === 'function') {
        var uid = await window.ExaAuth.ensureSupabaseUserId();
        if (uid) return uid;
      }
    } catch (e) {}
    return getCurrentUserIdSync();
  }

  async function rpcGetMyTeam(ancestorId) {
    if (!SB || !SB.url) throw new Error('SB_CONFIG missing');
    var url = String(SB.url).replace(/\/$/, '') + '/rest/v1/rpc/get_my_team';
    var res = await fetch(url, {
      method: 'POST',
      headers: sbHeaders(),
      body: JSON.stringify({ p_ancestor: ancestorId })
    });
    var text = await res.text().catch(function () { return ''; });
    if (!res.ok) throw new Error('get_my_team failed: ' + text.slice(0, 200));
    return text ? JSON.parse(text) : [];
  }

  function isEffectiveRow(r) {
    if (!r) return false;
    if (r.is_effective === true) return true;
    var bal = null;
    if (r.demo_balance != null) bal = Number(r.demo_balance);
    else if (r.usdt_balance != null) bal = Number(r.usdt_balance);
    if (bal != null && isFinite(bal)) return bal >= 100;
    return r.is_funded === true;
  }

  async function fetchWalletBalance(uid) {
    if (!SB || !SB.url) return 0;
    var url = String(SB.url).replace(/\/$/, '') +
      '/rest/v1/wallet_balances?select=usdt_balance&user_id=eq.' + encodeURIComponent(uid) + '&limit=1';
    var res = await fetch(url, { method: 'GET', headers: sbHeaders() });
    if (!res.ok) return 0;
    var rows = await res.json();
    var v = rows && rows[0] ? Number(rows[0].usdt_balance) : 0;
    return isFinite(v) ? v : 0;
  }

  // نفس هيكل الصفحة الحالي
  var rulesByLevel = {
    V1: { minBalance: 50,     minUsersTotal: 0  },
    V2: { minBalance: 500,    minUsersTotal: 5  },
    V3: { minBalance: 3000,   minUsersTotal: 10 },
    V4: { minBalance: 10000,  minUsersTotal: 30 },
    V5: { minBalance: 30000,  minUsersTotal: 50 },
    V6: { minBalance: 100000, minUsersTotal: 75 }
  };
  var levelOrder = ['V0','V1','V2','V3','V4','V5','V6'];

  function calculateCurrentLevel(balance, directEffective) {
    var current = 'V0';
    if (balance >= rulesByLevel.V1.minBalance && directEffective >= rulesByLevel.V1.minUsersTotal) current = 'V1';
    if (balance >= rulesByLevel.V2.minBalance && directEffective >= rulesByLevel.V2.minUsersTotal) current = 'V2';
    if (balance >= rulesByLevel.V3.minBalance && directEffective >= rulesByLevel.V3.minUsersTotal) current = 'V3';
    if (balance >= rulesByLevel.V4.minBalance && directEffective >= rulesByLevel.V4.minUsersTotal) current = 'V4';
    if (balance >= rulesByLevel.V5.minBalance && directEffective >= rulesByLevel.V5.minUsersTotal) current = 'V5';
    if (balance >= rulesByLevel.V6.minBalance && directEffective >= rulesByLevel.V6.minUsersTotal) current = 'V6';
    return current;
  }

  function getNextLevel(currentLevel) {
    var idx = levelOrder.indexOf(currentLevel);
    if (idx < 0 || idx >= levelOrder.length - 1) return null;
    return levelOrder[idx + 1];
  }

  async function loadDirectEffectiveAndBalance() {
    var uid = await getCurrentUserId();
    if (!uid) throw new Error('Missing user session');

    var team = await rpcGetMyTeam(uid);
    var gen1 = (team || []).filter(function (r) { return r && Number(r.depth) === 1; });
    var directEffective = gen1.filter(isEffectiveRow).length;

    var balance = await fetchWalletBalance(uid);
    return { balance: balance, directEffective: directEffective };
  }

  async function applyVipLogic() {
    var balance = 0;
    var directEffective = 0;

    try {
      var data = await loadDirectEffectiveAndBalance();
      balance = typeof data.balance === 'number' ? data.balance : 0;
      directEffective = typeof data.directEffective === 'number' ? data.directEffective : 0;
    } catch (e) {
      balance = 0;
      directEffective = 0;
    }

    var currentLevel = calculateCurrentLevel(balance, directEffective);
    var nextLevel = getNextLevel(currentLevel);

    // Top pills
    var pillSpan = document.querySelector('.current-level-pill span');
    if (pillSpan) pillSpan.textContent = 'Current Member Level:' + currentLevel;

    var nextLevelEl = document.querySelector('.next-level');
    if (nextLevelEl) nextLevelEl.textContent = nextLevel ? ('Next Level:' + nextLevel) : 'Max Level';

    // Update each section counters + lock text فقط (نفس الصفحة)
    var sections = document.querySelectorAll('.vip-section');
    for (var i = 0; i < sections.length; i++) {
      var sec = sections[i];
      var level = sec.getAttribute('data-level');
      var rules = rulesByLevel[level];
      if (!rules) continue;

      var statValues = sec.querySelectorAll('.stat-card .stat-value');
      if (statValues && statValues.length >= 2) {
        statValues[0].textContent = String(balance) + '/' + String(rules.minBalance);

        var prevIndex = levelOrder.indexOf(level) - 1;
        var prevLevelName = prevIndex >= 1 ? levelOrder[prevIndex] : null;
        var prevTotal = (prevLevelName && rulesByLevel[prevLevelName]) ? rulesByLevel[prevLevelName].minUsersTotal : 0;

        var requiredIncrement = rules.minUsersTotal - prevTotal;
        if (requiredIncrement < 0) requiredIncrement = 0;

        if (requiredIncrement === 0) statValues[1].textContent = String(directEffective) + '/0';
        else statValues[1].textContent = String(directEffective) + '/' + String(requiredIncrement);
      }

      var lockedLabel = sec.querySelector('.vip-locked');
      if (lockedLabel) {
        var achieved = false;
        if (rules.minUsersTotal === 0) achieved = balance >= rules.minBalance;
        else achieved = (balance >= rules.minBalance && directEffective >= rules.minUsersTotal);
        lockedLabel.textContent = achieved ? 'Unlocked' : 'Locked at this Level';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyVipLogic);
  } else {
    applyVipLogic();
  }

})();
