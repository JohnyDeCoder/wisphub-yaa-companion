export function createStarsCanvas(targetEl, starCount, opacity) {
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:absolute;top:0;left:0;width:100%;height:100%;" +
    `pointer-events:none;opacity:${opacity};`;
  targetEl.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  let stars = [];
  let rafId = null;
  let lastTs = 0;
  const FRAME_MS = 33;

  function resize() {
    canvas.width = targetEl.offsetWidth;
    canvas.height = targetEl.offsetHeight;
    stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      speed: Math.random() * 0.2 + 0.06,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  function draw(ts) {
    rafId = requestAnimationFrame(draw);
    if (ts - lastTs < FRAME_MS) {
      return;
    }
    lastTs = ts;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach((s) => {
      s.y -= s.speed;
      s.phase += 0.03;
      if (s.y < -s.r) {
        s.y = canvas.height + s.r;
        s.x = Math.random() * canvas.width;
      }
      const alpha = 0.4 + 0.4 * Math.sin(s.phase);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,210,255,${alpha.toFixed(2)})`;
      ctx.fill();
    });
  }

  resize();
  window.addEventListener("resize", resize);
  rafId = requestAnimationFrame(draw);

  return {
    stop() {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      canvas.remove();
    },
  };
}
