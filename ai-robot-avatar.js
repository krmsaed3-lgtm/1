> yazan:
(function () {
  const img = document.getElementById("account-avatar");
  if (!img) return;

  const avatar = img.closest(".avatar");
  const wrapper = img.closest(".avatar-wrapper");

  if (!avatar || !wrapper) return;

  // Make containers ready for overlays
  avatar.style.position = "relative";
  avatar.style.overflow = "hidden";

  // Smooth subtle pulse on the image (pro look)
  img.style.transformOrigin = "50% 50%";
  img.style.willChange = "transform, filter";
  img.style.transition = "filter 220ms ease";

  // Glow ring overlay
  const ring = document.createElement("div");
  ring.style.position = "absolute";
  ring.style.inset = "0";
  ring.style.borderRadius = "50%";
  ring.style.boxShadow = "0 0 0 1px rgba(0,209,255,0.35), 0 0 18px rgba(0,209,255,0.18)";
  ring.style.pointerEvents = "none";
  ring.style.opacity = "0.9";
  avatar.appendChild(ring);

  // Waving hand overlay
  const hand = document.createElement("div");
  hand.textContent = "👋";
  hand.style.position = "absolute";
  hand.style.right = "-6px";
  hand.style.top = "-8px";
  hand.style.width = "28px";
  hand.style.height = "28px";
  hand.style.display = "flex";
  hand.style.alignItems = "center";
  hand.style.justifyContent = "center";
  hand.style.fontSize = "18px";
  hand.style.filter = "drop-shadow(0 6px 10px rgba(0,0,0,0.35))";
  hand.style.transformOrigin = "40% 70%";
  hand.style.opacity = "0";
  hand.style.pointerEvents = "none";
  avatar.appendChild(hand);

  // Welcome bubble
  function showBubble(text) {
    wrapper.style.position = wrapper.style.position || "relative";

    const bubble = document.createElement("div");
    bubble.textContent = text;

    bubble.style.position = "absolute";
    bubble.style.right = "52px";
    bubble.style.top = "50%";
    bubble.style.transform = "translateY(-50%) translateX(6px)";
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

    requestAnimationFrame(() => {
      bubble.style.opacity = "1";
      bubble.style.transform = "translateY(-50%) translateX(0px)";
    });

    setTimeout(() => {
      bubble.style.opacity = "0";
      bubble.style.transform = "translateY(-50%) translateX(6px)";
      setTimeout(() => bubble.remove(), 260);
    }, 2200);
  }

  // Pulse loop (very subtle)
  let t = 0;
  function pulse() {
    t++;
    const s = 1 + Math.sin(t * 0.06) * 0.012; // subtle scale
    img.style.transform = scale(${s});
    ring.style.boxShadow =
      0 0 0 1px rgba(0,209,255,0.35), 0 0 ${14 + Math.abs(Math.sin(t * 0.05)) * 10}px rgba(0,209,255,0.18);
    requestAnimationFrame(pulse);
  }
  pulse();

  // Wave animation (one-shot)
  function waveOnce() {
    hand.style.opacity = "1";
    let i = 0;
    const frames = 90; // ~1.5s
    function step() {
      i++;
      const wobble = Math.sin(i * 0.4) * 22; // degrees
      hand.style.transform = rotate(${wobble}deg);
      if (i < frames) requestAnimationFrame(step);
      else {
        hand.style.opacity = "0";
        hand.style.

> yazan:
transform = "rotate(0deg)";
      }
    }
    step();
  }

  // Trigger welcome + wave after load
  setTimeout(() => {
    waveOnce();
    showBubble("Welcome 👋 Your account is ready.");
  }, 400);

})();
