;(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var els = {
    backBtn: $('backBtn'),
    reloadBtn: $('reloadBtn'),
    claimBtn: $('claimBtn'),
    availableAmount: $('availableAmount'),
    availableCount: $('availableCount'),
    loginState: $('loginState'),
    statusBox: $('statusBox'),
    list: $('list'),
    toast: $('toast')
  };

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(function () {
      els.toast.classList.remove('show');
    }, 2600);
  }

  function getUserId() {
    try {
      return (
        localStorage.getItem('currentUserId') ||
        localStorage.getItem('sb_user_id_v1') ||
        localStorage.getItem('user_id') ||
        localStorage.getItem('uid') ||
        ''
      ).toString().trim();
    } catch (e) {
      return '';
    }
  }

  if (!window.SB_CONFIG) {
    els.statusBox.textContent = 'Missing SB_CONFIG (load sb-config.js).';
    return;
  }

  var supabase = window.supabase.createClient(window.SB_CONFIG.url, window.SB_CONFIG.anonKey);

  function setLoggedInState(isLoggedIn) {
    els.loginState.textContent = isLoggedIn ? 'Logged in' : 'Logged out';
  }

  function clearList() {
    els.list.innerHTML = '';
  }

  function render(items) {
    clearList();

    if (!items || !items.length) {
      els.statusBox.style.display = 'block';
      els.statusBox.textContent = 'No rewards.';
      return;
    }

    els.statusBox.style.display = 'none';

    items.forEach(function (r) {
      var el = document.createElement('div');
      el.className = 'item';
      el.dataset.status = (r.status || '').toString();
      el.dataset.type = 'limited';

      var createdAt = (r.created_at || '').toString().replace('T', ' ').slice(0, 19);
      var amount = Number(r.amount || 0).toFixed(2) + ' USDT';

      el.innerHTML =
        '<div class="main">' +
          '<b>Invite reward</b>' +
          '<b>' + amount + '</b>' +
        '</div>' +
        '<div class="sub">' +
          '<span class="status">' + (r.status || '').toString() + '</span>' +
          '<span>' + createdAt + '</span>' +
        '</div>';

      els.list.appendChild(el);
    });
  }

  function updateSummary(items) {
    var claimable = (items || []).filter(function (x) { return x.status === 'claimable'; });
    var total = claimable.reduce(function (s, x) { return s + Number(x.amount || 0); }, 0);

    els.availableAmount.textContent = total.toFixed(2) + ' USDT';
    els.availableCount.textContent = claimable.length + ' available rewards';

    els.claimBtn.disabled = claimable.length === 0;
  }

  async function load() {
    var userId = getUserId();
    setLoggedInState(!!userId);

    if (!userId) {
      els.statusBox.style.display = 'block';
      els.statusBox.textContent = 'Not logged in.';
      els.claimBtn.disabled = true;
      clearList();
      return;
    }

    els.statusBox.style.display = 'block';
    els.statusBox.textContent = 'Loading...';
    clearList();

    var res = await supabase
      .from('task_center')
      .select('id, inviter_id, invited_user_id, amount, status, created_at, claimed_at')
      .eq('inviter_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (res.error) {
      console.error(res.error);
      els.statusBox.textContent = 'Supabase error: ' + (res.error.message || 'unknown');
      els.claimBtn.disabled = true;
      return;
    }

    var items = Array.isArray(res.data) ? res.data : [];
    // Show only eligible records in UI (hide skipped_limit and any other non-reward statuses)
items = items.filter(function (x) {
  var st = (x && x.status || '').toString();
  return st === 'claimable' || st === 'claimed';
});

updateSummary(items);
    render(items);
  }

  async function claim() {
    var userId = getUserId();
    if (!userId) {
      toast('Not logged in.');
      return;
    }

    els.claimBtn.disabled = true;

    var res = await supabase.rpc('claim_task_center_rewards', { p_inviter_id: userId });

    if (res.error) {
      console.error(res.error);
      toast('Claim error: ' + (res.error.message || 'unknown'));
      await load();
      return;
    }

    var out = res.data || {};
    toast('Claimed: ' + (out.claimed_count || 0) + ' / ' + Number(out.claimed_amount || 0).toFixed(2) + ' USDT');
    await load();
  }

  els.backBtn.addEventListener('click', function () {
    if (history.length > 1) history.back();
  });

  els.reloadBtn.addEventListener('click', function () {
    load();
  });

  els.claimBtn.addEventListener('click', function () {
    claim();
  });

  load();
})();
