(function () {
  const avatarImg = document.getElementById("account-avatar");
  if (!avatarImg) return;

  // Create AI avatar canvas
  const canvas = document.createElement("canvas");
  const size = 80;
  canvas.width = size;
  canvas.height = size;
  canvas.style.width = "40px";
  canvas.style.height = "40px";

  avatarImg.replaceWith(canvas);

  const ctx = canvas.getContext("2d");
  let t = 0;

  function drawFace() {
    ctx.clearRect(0, 0, size, size);

    // Background
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = "#0b1322";
    ctx.fill();

    // Glow ring
    ctx.strokeStyle = "rgba(0,209,255,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Eyes
    const blink = Math.abs(Math.sin(t * 0.08)) < 0.1;
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

    // Mouth
    ctx.strokeStyle = "#00d1ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(40, 46, 6, 0, Math.PI);
    ctx.stroke();
  }

  function animate() {
    t++;
    drawFace();
    requestAnimationFrame(animate);
  }

  animate();
})();