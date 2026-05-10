import { TRICK_DEFS, DEFAULT_TRICK_ACCENT } from "../../config/tricks.js";

let _popupAccentStyle = null;
let _popupMatrixCanvas = null;
let _popupMatrixRafId = null;
let _popupMatrixRO = null;
let _popupStarsCanvas = null;
let _popupStarsRafId = null;
let _popupStarsRO = null;
let _popupRetroOverlay = null;

function startPopupMatrix(headerEl) {
  if (_popupMatrixCanvas) {
    return;
  }

  const popupBg = headerEl.querySelector(".popup-bg");
  if (popupBg) {
    popupBg.style.visibility = "hidden";
  }

  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:absolute;inset:0;z-index:0;pointer-events:none;opacity:0.35;";
  headerEl.appendChild(canvas);
  _popupMatrixCanvas = canvas;

  const ctx = canvas.getContext("2d");
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*+-/~".split(
      "",
    );
  const fontSize = 8;
  let columns = 0;
  let drops = [];

  function syncSize() {
    const w = headerEl.offsetWidth;
    const h = headerEl.offsetHeight;
    if (!w || !h || (canvas.width === w && canvas.height === h)) {
      return;
    }
    canvas.width = w;
    canvas.height = h;
    columns = Math.floor(w / fontSize);
    drops = Array.from({ length: columns }, () =>
      Math.floor(Math.random() * -20),
    );
  }

  syncSize();
  _popupMatrixRO = new ResizeObserver(syncSize);
  _popupMatrixRO.observe(headerEl);

  let lastTs = 0;
  const FRAME_MS = 40;

  function draw(ts) {
    _popupMatrixRafId = requestAnimationFrame(draw);
    if (ts - lastTs < FRAME_MS || !columns) {
      return;
    }
    lastTs = ts;
    ctx.fillStyle = "rgba(0,0,0,0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${fontSize}px monospace`;
    for (let i = 0; i < drops.length; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(char, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }

  _popupMatrixRafId = requestAnimationFrame(draw);
}

function stopPopupMatrix() {
  if (_popupMatrixRafId) {
    cancelAnimationFrame(_popupMatrixRafId);
    _popupMatrixRafId = null;
  }
  if (_popupMatrixRO) {
    _popupMatrixRO.disconnect();
    _popupMatrixRO = null;
  }
  if (_popupMatrixCanvas) {
    const header = _popupMatrixCanvas.parentElement;
    if (header) {
      const popupBg = header.querySelector(".popup-bg");
      if (popupBg) {
        popupBg.style.visibility = "";
      }
    }
    _popupMatrixCanvas.remove();
    _popupMatrixCanvas = null;
  }
}

function startPopupStars(headerEl) {
  if (_popupStarsCanvas) {
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:absolute;inset:0;z-index:0;pointer-events:none;opacity:0.55;";
  headerEl.appendChild(canvas);
  _popupStarsCanvas = canvas;

  const ctx = canvas.getContext("2d");
  let stars = [];

  function syncSize() {
    const w = headerEl.offsetWidth;
    const h = headerEl.offsetHeight;
    if (!w || !h || (canvas.width === w && canvas.height === h)) {
      return;
    }
    canvas.width = w;
    canvas.height = h;
    stars = Array.from({ length: 55 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.4 + 0.3,
      speed: Math.random() * 0.25 + 0.08,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  syncSize();
  _popupStarsRO = new ResizeObserver(syncSize);
  _popupStarsRO.observe(headerEl);

  let lastTs = 0;
  const FRAME_MS = 33;

  function draw(ts) {
    _popupStarsRafId = requestAnimationFrame(draw);
    if (ts - lastTs < FRAME_MS || !stars.length) {
      return;
    }
    lastTs = ts;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach((s) => {
      s.y -= s.speed;
      s.phase += 0.04;
      if (s.y < -s.r) {
        s.y = canvas.height + s.r;
        s.x = Math.random() * canvas.width;
      }
      const alpha = 0.45 + 0.45 * Math.sin(s.phase);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
      ctx.fill();
    });
  }

  _popupStarsRafId = requestAnimationFrame(draw);
}

function stopPopupStars() {
  if (_popupStarsRafId) {
    cancelAnimationFrame(_popupStarsRafId);
    _popupStarsRafId = null;
  }
  if (_popupStarsRO) {
    _popupStarsRO.disconnect();
    _popupStarsRO = null;
  }
  if (_popupStarsCanvas) {
    _popupStarsCanvas.remove();
    _popupStarsCanvas = null;
  }
}

function startPopupRetro() {
  if (_popupRetroOverlay) {
    return;
  }
  const overlay = document.createElement("div");
  overlay.className = "wyc-popup-retro-overlay";
  document.body.appendChild(overlay);
  _popupRetroOverlay = overlay;
}

function stopPopupRetro() {
  if (_popupRetroOverlay) {
    _popupRetroOverlay.remove();
    _popupRetroOverlay = null;
  }
}

export function applyPopupTricks(tricks) {
  const activeTricks = Array.isArray(tricks) ? tricks : [];
  const headerEl = document.querySelector(".dashboard-header");

  const activeThemeDef = activeTricks
    .filter((c) => c !== "MATRIX")
    .map((c) => TRICK_DEFS[c])
    .find((d) => d?.themeClass);
  const colors = activeThemeDef ?? DEFAULT_TRICK_ACCENT;

  const activeTrickCode = activeTricks.find((c) => TRICK_DEFS[c]?.themeClass);
  document.body.dataset.trick = activeTrickCode ?? "";

  if (!_popupAccentStyle) {
    _popupAccentStyle = document.createElement("style");
    _popupAccentStyle.id = "wyc-popup-accent";
    document.head.appendChild(_popupAccentStyle);
  }

  let styleContent =
    `:root { --color-primary: ${colors.accent};` +
    ` --color-primary-dark: ${colors.accentDark};` +
    ` --color-primary-rgb: ${colors.rgb}; }`;

  if (colors.darkText) {
    const headerTextColor = activeTrickCode === "KAWAII" ? "#4c1d95" : "#000";
    styleContent +=
      ` .btn-primary, .trick-send-btn:not(:disabled) { color: #000 !important; }` +
      ` .dashboard-header { color: ${headerTextColor} !important; }`;
  }

  _popupAccentStyle.textContent = styleContent;

  if (activeTricks.includes("MATRIX")) {
    if (headerEl) {
      startPopupMatrix(headerEl);
    }
  } else {
    stopPopupMatrix();
  }

  if (activeTricks.includes("STARS")) {
    if (headerEl) {
      startPopupStars(headerEl);
    }
  } else {
    stopPopupStars();
  }

  if (activeTricks.includes("LSD")) {
    headerEl?.classList.add("wyc-popup-lsd");
  } else {
    headerEl?.classList.remove("wyc-popup-lsd");
  }

  if (activeTricks.includes("RETRO")) {
    startPopupRetro();
  } else {
    stopPopupRetro();
  }
}
