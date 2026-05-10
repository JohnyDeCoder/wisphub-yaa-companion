import { TRICK_DEFS, DEFAULT_TRICK_ACCENT } from "../../config/tricks.js";
import { createStarsCanvas } from "./canvasEffects.js";
import { waitForElement } from "../../utils/polling.js";
import { buildTrickCss } from "./trickCss.js";

const ALL_WYC_THEME_CLASSES = Object.values(TRICK_DEFS)
  .filter((t) => t.themeClass)
  .map((t) => t.themeClass);
let _savedContrastClass = null;
let _matrixCanvas = null;
let _matrixRafId = null;
let _matrixResizeFn = null;
let _sidebarStarsHandle = null;
let _navbarStarsHandle = null;
const KAWAII_FACE_ID = "wyc-kawaii-face";

function startMatrixCanvas() {
  if (_matrixCanvas) {
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.id = "wyc-matrix-canvas";
  canvas.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;pointer-events:none;";
  document.body.appendChild(canvas);
  _matrixCanvas = canvas;

  const ctx = canvas.getContext("2d");
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*+-/~{[|`]}".split(
      "",
    );
  const FONT_SIZE = 13;
  const FADE = 0.8;
  const HIGH_ALPHA = 0.9;
  const LOW_ALPHA = 0.12;

  let columns = 0;
  let drops = [];
  let trails = [];
  let sidebarW = 251;
  let navbarH = 50;
  let boundsFrame = 0;

  function updateZoneBounds() {
    const navbarEl = document.querySelector(".menu-top");
    const sidebarEl =
      document.querySelector("#main-nav-bg") ??
      document.querySelector("#main-nav");
    navbarH = navbarEl
      ? Math.max(0, navbarEl.getBoundingClientRect().bottom)
      : 50;
    sidebarW = sidebarEl
      ? Math.max(0, sidebarEl.getBoundingClientRect().right)
      : 251;
  }

  function resizeMatrix() {
    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;
    columns = Math.floor(canvas.width / FONT_SIZE);
    drops = Array.from({ length: columns }, () =>
      Math.floor(Math.random() * -50),
    );
    trails = Array.from({ length: columns }, () => []);
    updateZoneBounds();
  }

  resizeMatrix();
  _matrixResizeFn = resizeMatrix;
  window.addEventListener("resize", _matrixResizeFn);

  let lastTs = 0;
  const FRAME_MS = 40;

  function drawMatrix(ts) {
    _matrixRafId = requestAnimationFrame(drawMatrix);
    if (ts - lastTs < FRAME_MS) {
      return;
    }
    lastTs = ts;
    boundsFrame = (boundsFrame + 1) % 6;
    if (boundsFrame === 0) {
      updateZoneBounds();
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${FONT_SIZE}px monospace`;

    for (let i = 0; i < columns; i++) {
      const x = i * FONT_SIZE;
      const inSidebar = x < sidebarW;
      const col = trails[i];

      for (let j = col.length - 1; j >= 0; j--) {
        const t = col[j];
        t.alpha *= FADE;
        if (t.alpha < 0.01) {
          col.splice(j, 1);
          continue;
        }
        const y = t.row * FONT_SIZE;
        const zone = inSidebar || y < navbarH ? HIGH_ALPHA : LOW_ALPHA;
        const a = t.alpha * zone;
        if (a < 0.005) {
          continue;
        }
        ctx.fillStyle = `rgba(0,255,65,${a.toFixed(3)})`;
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x, y);
      }

      if (drops[i] >= 0) {
        const y = drops[i] * FONT_SIZE;
        const zone = inSidebar || y < navbarH ? HIGH_ALPHA : LOW_ALPHA;
        ctx.fillStyle = `rgba(180,255,180,${zone.toFixed(3)})`;
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x, y);
        col.push({ row: drops[i], alpha: 1.0 });
      }

      drops[i]++;
      if (drops[i] * FONT_SIZE > canvas.height && Math.random() > 0.975) {
        drops[i] = Math.floor(Math.random() * -50);
        trails[i] = [];
      }
    }
  }

  _matrixRafId = requestAnimationFrame(drawMatrix);
}

function stopMatrixCanvas() {
  if (_matrixRafId) {
    cancelAnimationFrame(_matrixRafId);
    _matrixRafId = null;
  }
  if (_matrixResizeFn) {
    window.removeEventListener("resize", _matrixResizeFn);
    _matrixResizeFn = null;
  }
  if (_matrixCanvas) {
    _matrixCanvas.remove();
    _matrixCanvas = null;
  }
}

function startSidebarStars() {
  if (_sidebarStarsHandle) {
    return;
  }
  const el = document.querySelector("#main-nav-bg");
  if (!el) {
    return;
  }
  _sidebarStarsHandle = createStarsCanvas(el, 50, 0.55);
}

function stopSidebarStars() {
  if (_sidebarStarsHandle) {
    _sidebarStarsHandle.stop();
    _sidebarStarsHandle = null;
  }
}

function startNavbarStars() {
  if (_navbarStarsHandle) {
    return;
  }
  const el = document.querySelector(".menu-top .navbar");
  if (!el) {
    return;
  }
  _navbarStarsHandle = createStarsCanvas(el, 25, 0.35);
}

function stopNavbarStars() {
  if (_navbarStarsHandle) {
    _navbarStarsHandle.stop();
    _navbarStarsHandle = null;
  }
}

function injectKawaiiPageFace() {
  if (document.getElementById(KAWAII_FACE_ID)) {
    return;
  }
  waitForElement(".page-header").then((header) => {
    if (!header || document.getElementById(KAWAII_FACE_ID)) {
      return;
    }
    const face = document.createElement("div");
    face.id = KAWAII_FACE_ID;
    header.appendChild(face);
  });
}

function removeKawaiiPageFace() {
  document.getElementById(KAWAII_FACE_ID)?.remove();
}

export function applyTricks(activeTricks) {
  const tricks = Array.isArray(activeTricks) ? activeTricks : [];

  ALL_WYC_THEME_CLASSES.forEach((cls) => document.body.classList.remove(cls));

  const activeThemeDef = tricks
    .map((c) => TRICK_DEFS[c])
    .find((d) => d?.themeClass);
  if (activeThemeDef) {
    if (!_savedContrastClass) {
      _savedContrastClass =
        [...document.body.classList].find(
          (c) =>
            c.startsWith("contrast-") && !ALL_WYC_THEME_CLASSES.includes(c),
        ) || null;
    }
    if (_savedContrastClass) {
      document.body.classList.remove(_savedContrastClass);
    }
    document.body.classList.add(activeThemeDef.themeClass);
  } else if (_savedContrastClass) {
    document.body.classList.add(_savedContrastClass);
    _savedContrastClass = null;
  }

  if (tricks.includes("MATRIX")) {
    startMatrixCanvas();
  } else {
    stopMatrixCanvas();
  }

  if (tricks.includes("STARS")) {
    startSidebarStars();
    startNavbarStars();
  } else {
    stopSidebarStars();
    stopNavbarStars();
  }

  const colors = activeThemeDef ?? DEFAULT_TRICK_ACCENT;

  let style = document.getElementById("wyc-tricks-style");
  if (!style) {
    style = document.createElement("style");
    style.id = "wyc-tricks-style";
    document.head.appendChild(style);
  }
  style.textContent = buildTrickCss(tricks, colors, !!activeThemeDef);

  let retroEl = document.getElementById("wyc-retro");
  if (tricks.includes("RETRO") && !retroEl) {
    retroEl = document.createElement("div");
    retroEl.id = "wyc-retro";
    document.body.appendChild(retroEl);
  } else if (!tricks.includes("RETRO") && retroEl) {
    retroEl.remove();
  }

  document.body.classList.toggle("wyc-crt", tricks.includes("RETRO"));

  if (tricks.includes("KAWAII")) {
    injectKawaiiPageFace();
  } else {
    removeKawaiiPageFace();
  }
}
