import { browserAPI } from "../../../utils/browser.js";
import { isWispHubDomain } from "../../../config/domains.js";
import { needsEditorPath } from "../../../config/pagePatterns.js";
import { CONNECTION_UI_MESSAGES } from "../../../config/messages.js";
import { POPUP_CONFIG } from "../config.js";

let retryTimeout = null;
let retryCount = 0;
const MAX_RETRIES = 3;
const CONN_CACHE_KEY = "wisphubConnCache";
const CACHE_MAX_AGE = 30 * 1000;
const CLIENT_CONTEXT_PATH_RE = /^\/clientes(\/|$)/i;

function getPathname(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}

function needsEditor(pathname) {
  return needsEditorPath(pathname);
}

function isClientContextPath(pathname) {
  return CLIENT_CONTEXT_PATH_RE.test(String(pathname || ""));
}

function getDisabledToolState() {
  return {
    formatter: false,
    diagnostic: false,
    upcoming: false,
  };
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
    updateStatus(
      elements,
      "disconnected",
      CONNECTION_UI_MESSAGES.DISCONNECTED_GENERIC,
    );
    updateToolCards(getDisabledToolState());
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
    const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      updateStatus(elements, "disconnected", CONNECTION_UI_MESSAGES.NO_ACTIVE_TAB);
      updateToolCards(getDisabledToolState());
      return;
    }

    if (!isWispHubDomain(tab.url)) {
      updateStatus(elements, "disconnected", CONNECTION_UI_MESSAGES.NOT_IN_WISPHUB);
      updateToolCards(getDisabledToolState());
      return;
    }

    const pathname = getPathname(tab.url);
    const editorExpected = needsEditor(pathname);
    const cached = await loadConnCache();

    const hasFreshCache =
      cached && cached.url === tab.url && Date.now() - cached.ts < CACHE_MAX_AGE;
    const clientSensitive = isClientContextPath(pathname);
    const canUseCachedState =
      hasFreshCache &&
      !clientSensitive &&
      !(editorExpected && !cached.state?.editorReady);

    if (canUseCachedState) {
      applyConnState(elements, cached.state, editorExpected, pathname, log, true);
      return;
    }

    try {
      const response = await browserAPI.tabs.sendMessage(tab.id, { action: "PING" });

      if (response?.status === "OK") {
        retryCount = 0;
        const state = {
          ok: true,
          editorReady: !!response.editorReady,
          formatterEnabled: !!response.formatterEnabled,
          diagnosticReady: !!response.diagnosticReady,
          diagnosticContext: response.diagnosticContext || null,
        };
        saveConnCache(tab.url, state);
        applyConnState(elements, state, editorExpected, pathname, log, false);
      } else {
        updateStatus(elements, "checking", CONNECTION_UI_MESSAGES.CHECKING);
        updateToolCards(getDisabledToolState());
        scheduleRetry(elements, onLog);
      }
    } catch {
      updateStatus(elements, "checking", CONNECTION_UI_MESSAGES.CHECKING);
      updateToolCards(getDisabledToolState());
      scheduleRetry(elements, onLog);
    }
  } catch {
    updateStatus(elements, "error", CONNECTION_UI_MESSAGES.CONNECTION_ERROR);
    updateToolCards(getDisabledToolState());
  }
}

function applyConnState(elements, state, editorExpected, pathname, log, fromCache) {
  const tools = {
    formatter: false,
    diagnostic: !!state.diagnosticReady,
    upcoming: false,
  };

  if (editorExpected && state.editorReady) {
    updateStatus(elements, "connected", CONNECTION_UI_MESSAGES.READY);
    tools.formatter = !!state.formatterEnabled;
    updateToolCards(tools);
    if (!fromCache) {
      log("success", `Página con editor detectada: ${pathname}`);
    }
  } else if (editorExpected && !state.editorReady) {
    updateStatus(elements, "partial", CONNECTION_UI_MESSAGES.PARTIAL);
    updateToolCards(tools);
  } else {
    updateStatus(elements, "connected", CONNECTION_UI_MESSAGES.READY);
    updateToolCards(tools);
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
