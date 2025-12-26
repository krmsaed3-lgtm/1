;(function () {
  "use strict";

  function log() {
    try { console.log.apply(console, arguments); } catch (e) {}
  }
  function warn() {
    try { console.warn.apply(console, arguments); } catch (e) {}
  }

  if (!window.SB_CONFIG) {
    warn("ai-power-popup: SB_CONFIG missing (load sb-config.js before ai-power-popup.js)");
    return;
  }

  const SB = window.SB_CONFIG;

  function fetchPopupAd() {
    const url =
      SB.url +
      "/rest/v1/ai_power_popup?select=id,image_url,link_url,is_active,created_at&is_active=eq.true&order=created_at.desc&limit=1";

    return fetch(url, { headers: SB.headers() })
      .then(async (res) => {
        if (!res.ok) {
          let txt = "";
          try { txt = await res.text(); } catch (e) {}
          warn("ai-power-popup: fetch failed", res.status, txt);
          return [];
        }
        return res.json();
      })
      .then((rows) => (rows && rows[0]) || null)
      .catch((e) => {
        warn("ai-power-popup: fetch error", e);
        return null;
      });
  }

  function showPopup(ad) {
    // prevent double popup if script is included twice
    if (document.getElementById("aiPowerPopupOverlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "aiPowerPopupOverlay";
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.65);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      padding: 18px;
      box-sizing: border-box;
    `;

    const box = document.createElement("div");
    box.style.cssText = `
      width: 92%;
      max-width: 360px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    `;

    const img = document.createElement("img");
    img.src = ad.image_url;
    img.alt = "Announcement";
    img.referrerPolicy = "no-referrer";
    img.loading = "eager";
    img.style.cssText = `
      width: 100%;
      height: auto;
      border-radius: 14px;
      display: block;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
      background: #fff;
    `;

    if (ad.link_url) {
      img.style.cursor = "pointer";
      img.onclick = () => window.open(ad.link_url, "_blank");
    }

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "✕ Close";
    closeBtn.style.cssText = `
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.3);
      color: #fff;
      border-radius: 999px;
      padding: 8px 20px;
      font-size: 12px;
      cursor: pointer;
    `;

    closeBtn.onclick = () => overlay.remove();

    // allow close by tapping outside
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });

    box.appendChild(img);
    box.appendChild(closeBtn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  function boot() {
    fetchPopupAd().then(function (ad) {
      if (ad && ad.image_url) {
        log("ai-power-popup: showing ad id", ad.id);
        showPopup(ad);
      } else {
        warn("ai-power-popup: no active ad found");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();