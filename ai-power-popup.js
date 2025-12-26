;(function () {
  "use strict";

  // Safety: do nothing if Supabase config is missing
  if (!window.SB_CONFIG) return;

  const SB = window.SB_CONFIG;

  function fetchPopupAd() {
    const url =
      SB.url +
      "/rest/v1/ai_power_popup?is_active=eq.true&order=created_at.desc&limit=1";

    return fetch(url, {
      headers: SB.headers(),
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => (rows && rows[0]) || null);
  }

  function showPopup(ad) {
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.65);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;

    const box = document.createElement("div");
    box.style.cssText = `
      width: 90%;
      max-width: 360px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    `;

    const img = document.createElement("img");
    img.src = ad.image_url;
    img.style.cssText = `
      width: 100%;
      border-radius: 14px;
      display: block;
    `;

    if (ad.link_url) {
      img.style.cursor = "pointer";
      img.onclick = () => window.open(ad.link_url, "_blank");
    }

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕ Close";
    closeBtn.style.cssText = `
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.3);
      color: #fff;
      border-radius: 999px;
      padding: 6px 18px;
      font-size: 12px;
    `;

    closeBtn.onclick = () => overlay.remove();

    box.appendChild(img);
    box.appendChild(closeBtn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  document.addEventListener("DOMContentLoaded", function () {
    fetchPopupAd().then(function (ad) {
      if (ad && ad.image_url) {
        showPopup(ad);
      }
    });
  });
})();
