// KaC category order — matches keepachangelog.com/es-ES/1.1.0/
const CATEGORY_ORDER = [
  "Agregado",
  "Cambiado",
  "Obsoleto",
  "Eliminado",
  "Corregido",
  "Seguridad",
];

const TRICK_ACCENTS = {
  MATRIX: { accent: "#00ff41", accentDark: "#00cc33", darkText: true },
  OCEAN: { accent: "#00acec", accentDark: "#0090d0", darkText: false },
  FIRE: { accent: "#f34541", accentDark: "#d42d2a", darkText: false },
  KAWAII: { accent: "#ddb4fe", accentDark: "#c084fc", darkText: true },
};

function startWhatsNewMatrix() {
  const canvas = document.createElement("canvas");
  canvas.id = "wyc-wn-matrix";
  canvas.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*+-/~{[|`]}".split(
      "",
    );
  const FONT_SIZE = 13;
  const FADE = 0.8;
  const ALPHA = 0.85;
  let columns = 0;
  let drops = [];
  let trails = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Math.floor(canvas.width / FONT_SIZE);
    drops = Array.from({ length: columns }, () =>
      Math.floor(Math.random() * -50),
    );
    trails = Array.from({ length: columns }, () => []);
  }

  resize();
  window.addEventListener("resize", resize);

  let lastTs = 0;
  const FRAME_MS = 40;

  function draw(ts) {
    requestAnimationFrame(draw);
    if (ts - lastTs < FRAME_MS) {
      return;
    }
    lastTs = ts;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${FONT_SIZE}px monospace`;
    for (let i = 0; i < columns; i++) {
      const x = i * FONT_SIZE;
      const col = trails[i];
      for (let j = col.length - 1; j >= 0; j--) {
        const t = col[j];
        t.alpha *= FADE;
        if (t.alpha < 0.01) {
          col.splice(j, 1);
          continue;
        }
        const a = t.alpha * ALPHA;
        if (a < 0.005) {
          continue;
        }
        ctx.fillStyle = `rgba(0,255,65,${a.toFixed(3)})`;
        ctx.fillText(
          chars[Math.floor(Math.random() * chars.length)],
          x,
          t.row * FONT_SIZE,
        );
      }
      if (drops[i] >= 0) {
        ctx.fillStyle = `rgba(180,255,180,${ALPHA.toFixed(3)})`;
        ctx.fillText(
          chars[Math.floor(Math.random() * chars.length)],
          x,
          drops[i] * FONT_SIZE,
        );
        col.push({ row: drops[i], alpha: 1.0 });
      }
      drops[i]++;
      if (drops[i] * FONT_SIZE > canvas.height && Math.random() > 0.975) {
        drops[i] = Math.floor(Math.random() * -50);
        trails[i] = [];
      }
    }
  }

  requestAnimationFrame(draw);
}

async function applyTrickTheme() {
  let storageResult;
  try {
    storageResult = await chrome.storage.local.get("userSettings");
  } catch {
    return;
  }
  const tricks = storageResult?.userSettings?.activeTricks ?? [];
  const activeTrick = tricks.find((t) => t in TRICK_ACCENTS);
  if (!activeTrick) {
    return;
  }

  const def = TRICK_ACCENTS[activeTrick];
  document.body.dataset.trick = activeTrick;

  const styleEl = document.createElement("style");
  styleEl.id = "wyc-wn-theme";
  styleEl.textContent =
    `:root { --wt-primary: ${def.accent}; --wt-primary-hover: ${def.accentDark};` +
    ` --wt-primary-dark: ${def.accentDark}; }` +
    (def.darkText ? " .btn-primary { color: #000 !important; }" : "");
  document.head.appendChild(styleEl);

  if (activeTrick === "MATRIX") {
    startWhatsNewMatrix();
  }
}

async function loadChangelog() {
  try {
    const response = await fetch("../popup/changelog.json");
    if (!response.ok) {
      throw new Error("Changelog not found");
    }
    const data = await response.json();
    const latest = data[0];
    if (!latest) {
      return;
    }

    document.getElementById("versionBadge").textContent = `v${latest.version}`;

    const list = document.getElementById("changesList");
    list.textContent = "";

    CATEGORY_ORDER.forEach((cat) => {
      const items = latest.categories?.[cat];
      if (!Array.isArray(items) || items.length === 0) {
        return;
      }

      const labelLi = document.createElement("li");
      labelLi.className = "modal-category-label";
      labelLi.textContent = cat;
      list.appendChild(labelLi);

      for (const change of items) {
        const li = document.createElement("li");
        li.textContent = change;
        list.appendChild(li);
      }
    });
  } catch {
    document.getElementById("versionBadge").textContent = "v--";
  }
}

function openModal() {
  document.getElementById("modalOverlay").classList.add("visible");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("visible");
}

document.getElementById("btnChangelog").addEventListener("click", openModal);
document.getElementById("btnClose").addEventListener("click", closeModal);
document
  .getElementById("btnGotIt")
  .addEventListener("click", () => window.close());
document
  .getElementById("btnDismiss")
  .addEventListener("click", () => window.close());

document.getElementById("modalOverlay").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) {
    closeModal();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  loadChangelog();
  applyTrickTheme();
});
