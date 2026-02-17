import { browserAPI } from "../../../utils/browser.js";

import { isWispHubDomain } from "../../../config/domains.js";

import { POPUP_CONFIG } from "../config.js";

let retryTimeout = null;

let retryCount = 0;

const MAX_RETRIES = 3; // Max reconnection attempts before marking popup as disconnected (default: 3)

const CONN_CACHE_KEY = "wisphubConnCache"; // chrome.storage key for popup connection cache

const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // Connection cache lifetime in ms (default: 24h)

const EDITOR_PATHS = [
  /^\/(instalaciones|clientes)\/(editar|agregar|nuevo)/i,
  /^\/preinstalacion\/(activar|editar)/i,
  /^\/solicitar-instalacion/i,
];

function getPathname(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}

function needsEditor(pathname) {
  return EDITOR_PATHS.some((re) => re.test(pathname));
}

function clearRetryTimeout() {
  if (retryTimeout) {
    clearTimeout(retryTimeout);

    retryTimeout = null;
  }
}

function updateStatus(elements, status, message) {
  if (elements.statusIndicator) {
    elements.statusIndicator.className = `status-indicator ${status}`;
  }

  if (elements.statusLabel) {
    elements.statusLabel.textContent = message;
  }
}

function updateToolCards(toolStates) {
  const cards = document.querySelectorAll(".flip-card[data-tool]");

  cards.forEach((card) => {
    const tool = card.dataset.tool;

    const enabled = toolStates[tool] || false;

    card.classList.toggle("disabled", !enabled);

    const btn = card.querySelector("button");

    if (btn) {
      btn.disabled = !enabled;
    }
  });
}

function scheduleRetry(elements, onLog) {
  retryCount++;

  if (retryCount > MAX_RETRIES) {
    updateStatus(elements, "disconnected", "No se pudo conectar");

    updateToolCards({ formatter: false });

    return;
  }

  retryTimeout = setTimeout(() => {
    checkConnection(elements, onLog);
  }, POPUP_CONFIG.RETRY_DELAY);
}

export async function checkConnection(elements, onLog) {
  clearRetryTimeout();

  const log = onLog || (() => {});

  try {
    const [tab] = await browserAPI.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab) {
      updateStatus(elements, "disconnected", "Sin pestaña activa");

      updateToolCards({ formatter: false });

      return;
    }

    if (!isWispHubDomain(tab.url)) {
      updateStatus(elements, "disconnected", "Navega a WispHub");

      updateToolCards({ formatter: false });

      return;
    }

    const pathname = getPathname(tab.url);

    const editorExpected = needsEditor(pathname);

    const cached = await loadConnCache();

    if (
      cached &&
      cached.url === tab.url &&
      Date.now() - cached.ts < CACHE_MAX_AGE
    ) {
      applyConnState(
        elements,
        cached.state,
        editorExpected,
        pathname,
        log,
        true,
      );

      return;
    }

    try {
      const response = await browserAPI.tabs.sendMessage(tab.id, {
        action: "PING",
      });

      if (response?.status === "OK") {
        retryCount = 0;

        const state = { ok: true, editorReady: !!response.editorReady };

        saveConnCache(tab.url, state);

        applyConnState(elements, state, editorExpected, pathname, log, false);
      } else {
        updateStatus(elements, "checking", "Verificando...");

        updateToolCards({ formatter: false });

        scheduleRetry(elements, onLog);
      }
    } catch {
      updateStatus(elements, "checking", "Verificando...");

      updateToolCards({ formatter: false });

      scheduleRetry(elements, onLog);
    }
  } catch {
    updateStatus(elements, "error", "Error de conexión");

    updateToolCards({ formatter: false });
  }
}

function applyConnState(
  elements,
  state,
  editorExpected,
  pathname,
  log,
  fromCache,
) {
  if (editorExpected && state.editorReady) {
    updateStatus(elements, "connected", "Todo listo");

    updateToolCards({ formatter: true });

    if (!fromCache) {
      log("success", `Página con editor detectada: ${pathname}`);
    }
  } else if (editorExpected && !state.editorReady) {
    updateStatus(elements, "partial", "Cargado parcialmente");

    updateToolCards({ formatter: false });
  } else {
    updateStatus(elements, "connected", "Todo listo");

    updateToolCards({ formatter: false });

    if (!fromCache) {
      log("success", `Página de WispHub: ${pathname}`);
    }
  }
}

async function loadConnCache() {
  try {
    const r = await browserAPI.storage.local.get(CONN_CACHE_KEY);

    return r[CONN_CACHE_KEY] || null;
  } catch {
    return null;
  }
}

function saveConnCache(url, state) {
  browserAPI.storage.local
    .set({ [CONN_CACHE_KEY]: { url, state, ts: Date.now() } })
    .catch(() => {});
}
