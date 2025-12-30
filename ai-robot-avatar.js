> yazan:
(function () {
  const avatarImg = document.getElementById("account-avatar");
  if (!avatarImg) return;

  // ===== Replace <img> with canvas =====
  const canvas = document.createElement("canvas");
  const size = 80;
  canvas.width = size;
  canvas.height = size;
  canvas.style.width = "40px";
  canvas.style.height = "40px";
  canvas.style.display = "block";

  // Keep the same avatar container styling (border-radius, overflow, etc.)
  const parent = avatarImg.parentElement;
  avatarImg.replaceWith(canvas);

  const ctx = canvas.getContext("2d");
  let t = 0;

  // ===== Greeting bubble (welcome message) =====
  function showWelcomeBubble(text) {
    // Find a good anchor: the wrapper that contains avatar + chevron
    const wrapper =
      (parent && parent.closest(".avatar-wrapper")) ||
      (canvas && canvas.closest(".avatar-wrapper")) ||
      parent;

    if (!wrapper) return;

    // Make wrapper a positioning context
    wrapper.style.position = wrapper.style.position || "relative";

    const bubble = document.createElement("div");
    bubble.textContent = text;

    // Inline styles to avoid touching your CSS files
    bubble.style.position = "absolute";
    bubble.style.right = "52px";
    bubble.style.top = "50%";
    bubble.style.transform = "translateY(-50%)";
    bubble.style.padding = "8px 10px";
    bubble.style.borderRadius = "12px";
    bubble.style.fontSize = "12px";
    bubble.style.lineHeight = "1.2";
    bubble.style.whiteSpace = "nowrap";
    bubble.style.maxWidth = "220px";
    bubble.style.overflow = "hidden";
    bubble.style.textOverflow = "ellipsis";
    bubble.style.color = "#fff";
    bubble.style.background = "rgba(0,0,0,0.78)";
    bubble.style.border = "1px solid rgba(0,209,255,0.28)";
    bubble.style.boxShadow = "0 10px 26px rgba(0,0,0,0.35)";
    bubble.style.opacity = "0";
    bubble.style.pointerEvents = "none";
    bubble.style.transition = "opacity 220ms ease, transform 220ms ease";

    // Little tail
    const tail = document.createElement("div");
    tail.style.position = "absolute";
    tail.style.right = "-6px";
    tail.style.top = "50%";
    tail.style.transform = "translateY(-50%) rotate(45deg)";
    tail.style.width = "10px";
    tail.style.height = "10px";
    tail.style.background = "rgba(0,0,0,0.78)";
    tail.style.borderRight = "1px solid rgba(0,209,255,0.28)";
    tail.style.borderTop = "1px solid rgba(0,209,255,0.28)";
    bubble.appendChild(tail);

    wrapper.appendChild(bubble);

    // Animate in
    requestAnimationFrame(() => {
      bubble.style.opacity = "1";
      bubble.style.transform = "translateY(-50%) translateX(-2px)";
    });

    // Auto-hide
    setTimeout(() => {
      bubble.style.opacity = "0";
      bubble.style.transform = "translateY(-50%) translateX(0px)";
      setTimeout(() => bubble.remove(), 260);
    }, 2200);
  }

  // ===== Wave animation state =====
  const waveDurationFrames = 140; // ~2.3s at 60fps
  let waveFrame = 0;

  // ===== Draw AI face + wave =====
  function drawFace() {
    ctx.clearRect(0, 0, size, size);

    // Base circle background
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = "#0b1322";
    ctx.fill();

    // Subtle breathing glow
    const glow = 0.35 + 0.25 * Math.sin(t * 0.05);
    ctx.strokeStyle = rgba(0,209,255,${glow});
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner vignette
    const grad = ctx.createRadialGradient(40, 36, 8, 40, 40, 40);
    grad.addColorStop(0, "rgba(0,209,255,0.08)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.fill();

    // Blink logic
    const blink = Math.abs(Math.sin(t * 0.08)) < 0.09;

    // Eyes
    ctx.fillStyle = "#00d1ff";
    if (!blink) {
      ctx.beginPath();
      ctx.arc(30, 34, 3, 0, Math.PI * 2);
      ctx.arc(50, 34, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(27, 34, 6, 1);
      ctx.fillRect(47, 34, 6, 1);
    }

    // Mouth (slight smile)
    ctx.

> yazan:
strokeStyle = "rgba(0,209,255,0.95)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(40, 46, 6, 0, Math.PI);
    ctx.stroke();

    // ===== Wave hand (appears for a short time) =====
    if (waveFrame < waveDurationFrames) {
      // Wave easing + angle
      const p = waveFrame / waveDurationFrames;
      const fade = p < 0.2 ? p / 0.2 : p > 0.85 ? (1 - p) / 0.15 : 1;
      const wobble = Math.sin(waveFrame * 0.35) * 0.55; // waving motion
      const angle = -0.4 + wobble;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, fade));

      // Position hand near top-right of face
      ctx.translate(57, 34);
      ctx.rotate(angle);

      // Arm
      ctx.strokeStyle = "rgba(0,209,255,0.85)";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-6, 10);
      ctx.lineTo(6, 2);
      ctx.stroke();

      // Hand (simple rounded shape)
      ctx.fillStyle = "rgba(0,209,255,0.9)";
      ctx.beginPath();
      ctx.arc(10, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // Fingers hint
      ctx.strokeStyle = "rgba(11,19,34,0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(10, -4);
      ctx.lineTo(10, 4);
      ctx.stroke();

      ctx.restore();

      waveFrame++;
    }
  }

  function animate() {
    t++;
    drawFace();
    requestAnimationFrame(animate);
  }

  // Start
  animate();

  // Welcome + wave trigger (once)
  setTimeout(() => {
    waveFrame = 0; // restart wave
    showWelcomeBubble("Welcome 👋 Your account details are ready.");
  }, 350);
})();
