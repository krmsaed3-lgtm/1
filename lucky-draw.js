/* Lucky Draw (UI animation only; DB decides the slot)
   Requires: sb-config.js to expose a global `supabase` client (Supabase JS).
*/

const $ = (id) => document.getElementById(id);

const el = {
  back: $("btnBack"),
  uShort: $("uShort"),
  spins: $("spins"),
  grid: $("grid"),
  cards: Array.from(document.querySelectorAll("#grid .card")),
  start: $("btnStart"),
  status: $("status"),
  out: $("out"),
};

const SLOT_TO_INDEX = (slot) => Math.max(1, Math.min(9, Number(slot))) - 1;

function setStatus(text, ok = true) {
  el.status.textContent = text;
  el.status.className = ok ? "ok" : "err";
}

function logJson(obj, ok = true) {
  el.out.className = ok ? "ok" : "err";
  el.out.textContent = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
}

function setActive(index) {
  el.cards.forEach((c, i) => c.classList.toggle("active", i === index));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getUserId() {
  // Try Supabase auth
  if (window.supabase?.auth?.getUser) {
    const { data, error } = await window.supabase.auth.getUser();
    if (error) throw error;
    return data?.user?.id || null;
  }
  // Fallback: if your sb-user.js exposes something custom, try it here:
  if (window.SB_USER?.id) return window.SB_USER.id;
  return null;
}

async function fetchSpins(userId) {
  const { data, error } = await window.supabase
    .from("lucky_draw_user_spins")
    .select("spins_balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return Number(data?.spins_balance || 0);
}

async function refreshUI() {
  try {
    setStatus("Loading…", true);

    if (!window.supabase) {
      setStatus("Missing supabase client", false);
      logJson("sb-config.js must create window.supabase", false);
      el.start.disabled = true;
      el.start.classList.remove("enabled");
      return;
    }

    const userId = await getUserId();
    if (!userId) {
      setStatus("Not logged in", false);
      logJson("No user session found. Login first.", false);
      el.uShort.textContent = "-";
      el.spins.textContent = "0";
      el.start.disabled = true;
      el.start.classList.remove("enabled");
      return;
    }

    el.uShort.textContent = `${userId.slice(0, 6)}…${userId.slice(-4)}`;

    const spins = await fetchSpins(userId);
    el.spins.textContent = String(spins);

    if (spins > 0) {
      el.start.disabled = false;
      el.start.classList.add("enabled");
      setStatus("Ready", true);
      logJson({ user_id: userId, spins }, true);
    } else {
      el.start.disabled = true;
      el.start.classList.remove("enabled");
      setStatus("No spins", false);
      logJson({ user_id: userId, spins, hint: "Charge invited user (>=103 USDT BEP20) to grant spins to inviter." }, false);
    }
  } catch (e) {
    setStatus("Error", false);
    logJson(String(e?.message || e), false);
    el.start.disabled = true;
    el.start.classList.remove("enabled");
  }
}

async function runSpin() {
  try {
    el.start.disabled = true;
    el.start.classList.remove("enabled");

    const userId = await getUserId();
    if (!userId) throw new Error("No user session");

    // Start UI animation immediately (fake spin)
    setStatus("Spinning…", true);
    logJson("Calling RPC lucky_draw_spin…", true);

    let idx = 0;
    setActive(idx);

    const minSpinMs = 2400;
    const startAt = Date.now();

    let interval = setInterval(() => {
      idx = (idx + 1) % el.cards.length;
      setActive(idx);
    }, 80);

    // Call DB to decide result
    const rpcPromise = window.supabase.rpc("lucky_draw_spin", { p_user_id: userId });

    const [{ data, error }] = await Promise.all([rpcPromise]);
    if (error) throw error;

    // Ensure minimum spin time
    const elapsed = Date.now() - startAt;
    if (elapsed < minSpinMs) await sleep(minSpinMs - elapsed);

    // Stop interval
    clearInterval(interval);

    const res = data;
    if (!res?.ok) {
      setStatus("Failed", false);
      logJson(res, false);
      await refreshUI();
      return;
    }

    const finalSlot = res?.prize?.slot;
    const finalIndex = SLOT_TO_INDEX(finalSlot);

    // Smooth landing: slow steps to target
    for (let i = 0; i < 14; i++) {
      idx = (idx + 1) % el.cards.length;
      setActive(idx);
      await sleep(70 + i * 18);
    }
    while (idx !== finalIndex) {
      idx = (idx + 1) % el.cards.length;
      setActive(idx);
      await sleep(120);
    }

    setStatus("WIN", true);
    logJson(res, true);

    // Refresh spins number (it decreased) + keep button state accurate
    await refreshUI();
  } catch (e) {
    setStatus("Error", false);
    logJson(String(e?.message || e), false);
    await refreshUI();
  }
}

el.back.addEventListener("click", () => history.back());
el.start.addEventListener("click", runSpin);

refreshUI();
