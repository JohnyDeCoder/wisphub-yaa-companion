import { API_KEYS_STORAGE_KEY } from "../../config/constants.js";
import { getDomainKey, getApiBaseUrl } from "../../config/domains.js";
import { MESSAGE_TYPES, ACTIONS } from "../../config/messages.js";
import { browserAPI } from "../../utils/browser.js";
import {
  LOG_STORAGE_KEY,
  MAX_LOG_ENTRIES,
  pruneExpiredLogs,
} from "../../utils/logStorage.js";
import {
  generateBridgeToken,
  isBridgeMessage,
  isMessageTokenValid,
  postBridgeMessage,
} from "../../utils/pageBridge.js";

let editorReady = false;
let formatterEnabled = false;
let diagnosticReady = false;
let diagnosticContext = null;
let bridgeToken = "";
const DIAGNOSTIC_ACK_TIMEOUT_MS = 1200;
const DIAGNOSTIC_ACK_POLL_INTERVAL_MS = 40;
const PROFILE_SWITCH_ACK_TIMEOUT_MS = 120000;
const PROFILE_SWITCH_ACK_POLL_INTERVAL_MS = 40;
let userSettings = {
  notificationsEnabled: true,
  autoFormatEnabled: false,
  autoPriceCalcEnabled: false,
  autoFillTemplateEnabled: true,
  quickInfoEnabled: true,
  quickInfoDelay: 1000,
};

function ensureBridgeToken() {
  if (!bridgeToken) {
    bridgeToken = generateBridgeToken();
  }
  return bridgeToken;
}

function postToPage(type, payload = {}, options = {}) {
  return postBridgeMessage(type, payload, {
    token: ensureBridgeToken(),
    includeToken: options.includeToken !== false,
    requireToken: options.requireToken === true,
  });
}

function waitForDiagnosticStartAck(timeoutMs = DIAGNOSTIC_ACK_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const startedAt = Date.now();

    const poll = () => {
      const ack = window.__WISPHUB_LAST_DIAGNOSTIC_ACK__;
      if (ack && typeof ack === "object") {
        resolve({
          success: ack.success !== false,
          started: ack.started !== false,
          error: ack.error || "",
        });
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        resolve({
          success: false,
          started: false,
          error: "No se recibió confirmación de inicio del diagnóstico en la página activa",
        });
        return;
      }

      setTimeout(poll, DIAGNOSTIC_ACK_POLL_INTERVAL_MS);
    };

    poll();
  });
}

function waitForProfileSwitchAck(timeoutMs = PROFILE_SWITCH_ACK_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const startedAt = Date.now();

    const poll = () => {
      const ack = window.__WISPHUB_LAST_PROFILE_SWITCH_ACK__;
      if (ack && typeof ack === "object") {
        resolve({
          success: ack.success !== false,
          started: ack.started === true,
          cancelled: ack.cancelled === true,
          info: ack.info || "",
          error: ack.error || "",
          switchStrategy: ack.switchStrategy || "",
          redirectUrl: ack.redirectUrl || "",
          fallbackRedirectUrl: ack.fallbackRedirectUrl || "",
          requiresLogin: ack.requiresLogin === true,
        });
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        resolve({
          success: false,
          started: false,
          cancelled: false,
          info: "",
          error: "No se recibió confirmación para el cambio de perfil en la página activa",
          switchStrategy: "",
          redirectUrl: "",
          fallbackRedirectUrl: "",
          requiresLogin: false,
        });
        return;
      }

      setTimeout(poll, PROFILE_SWITCH_ACK_POLL_INTERVAL_MS);
    };

    poll();
  });
}

function buildProfileSwitchStartFailure(error) {
  return {
    success: false,
    started: false,
    cancelled: false,
    info: "",
    error: error || "No se pudo guardar la sesión actual antes de cambiar de perfil",
    switchStrategy: "",
    redirectUrl: "",
    fallbackRedirectUrl: "",
    requiresLogin: false,
  };
}

function getCurrentUsernameFromDom() {
  const usernameEl = document.querySelector(
    ".user-menu .user-name, .navbar .user-name, .dropdown .user-name",
  );
  return usernameEl?.textContent?.trim() || "";
}


async function captureSessionCookiesSnapshot(domainKey, username) {
  if (!domainKey || !username) {
    return { success: false };
  }

  try {
    return await browserAPI.runtime.sendMessage({
      action: ACTIONS.SESSION_CAPTURE_COOKIES,
      domainKey,
      username,
    });
  } catch {
    return { success: false };
  }
}

async function hasSessionCookiesSnapshot(domainKey, username) {
  if (!domainKey || !username) {
    return { hasSnapshot: false, storedUsername: null };
  }

  try {
    const response = await browserAPI.runtime.sendMessage({
      action: ACTIONS.SESSION_HAS_COOKIES,
      domainKey,
      username,
    });
    return {
      hasSnapshot: response?.success === true && response?.hasSnapshot === true,
      storedUsername: response?.username || null,
    };
  } catch {
    return { hasSnapshot: false, storedUsername: null };
  }
}

async function switchSessionCookies(domainKey, targetUsername) {
  if (!domainKey || !targetUsername) {
    return {
      success: false,
      requiresLogin: true,
      error: "Falta información para cambiar cookies de sesión",
    };
  }

  try {
    return await browserAPI.runtime.sendMessage({
      action: ACTIONS.SESSION_SWITCH_COOKIES,
      domainKey,
      targetUsername,
    });
  } catch {
    return {
      success: false,
      requiresLogin: true,
      error: "No se pudo cambiar la sesión por cookies",
    };
  }
}

function persistLogEntry(data) {
  try {
    browserAPI.storage.local
      .get(LOG_STORAGE_KEY)
      .then((res) => {
        const logs = pruneExpiredLogs(res[LOG_STORAGE_KEY] || []);
        logs.push({
          time: new Date().toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          }),
          level: data.level || "info",
          message: data.message || "",
          ts: Date.now(),
          feature: String(data.feature || "").trim(),
          action: String(data.action || "").trim(),
          pagePath: String(data.pagePath || "").trim(),
          before: String(data.before || "").trim(),
          after: String(data.after || "").trim(),
          kind: String(data.kind || "").trim(),
          pageUrl: String(data.pageUrl || "").trim(),
          stateColor: String(data.stateColor || "").trim(),
          tags: Array.isArray(data.tags)
            ? data.tags.map((t) => String(t || "").trim()).filter(Boolean)
            : [],
        });
        if (logs.length > MAX_LOG_ENTRIES) {
          logs.splice(0, logs.length - MAX_LOG_ENTRIES);
        }
        browserAPI.storage.local.set({ [LOG_STORAGE_KEY]: logs });
      })
      .catch(() => {
        // Extension context invalidated (reload/update while page is open) — safe to ignore
      });
  } catch {
    // Extension context invalidated — safe to ignore
  }
}

async function getApiKeyForCurrentDomain() {
  const domainKey = getDomainKey(window.location.hostname);
  if (!domainKey) {
    return { domainKey: null, apiKey: null };
  }

  const result = await browserAPI.storage.local.get(API_KEYS_STORAGE_KEY);
  const keys = result[API_KEYS_STORAGE_KEY] || {};
  return { domainKey, apiKey: keys[domainKey] || null };
}

function shouldSkipTokenValidation(type) {
  return type === MESSAGE_TYPES.CHANNEL_HELLO || type === MESSAGE_TYPES.LOG_ENTRY;
}

export function listenToPageMessages() {
  ensureBridgeToken();

  window.addEventListener("message", (event) => {
    if (event.source !== window) {
      return;
    }

    const data = event.data || {};
    if (!isBridgeMessage(data)) {
      return;
    }

    const { type, editorReady: isReady, result } = data;

    if (type === MESSAGE_TYPES.CHANNEL_HELLO) {
      postToPage(MESSAGE_TYPES.CHANNEL_INIT, {}, { includeToken: true });
      // Ensure page world receives current settings after each handshake.
      postToPage(MESSAGE_TYPES.SETTINGS_UPDATE, { settings: userSettings });

      const username = getCurrentUsernameFromDom();
      const domainKey = getDomainKey(window.location.hostname);
      if (domainKey && username) {
        captureSessionCookiesSnapshot(domainKey, username);
      } else if (domainKey) {
        setTimeout(() => {
          const delayedUsername = getCurrentUsernameFromDom();
          if (delayedUsername) {
            captureSessionCookiesSnapshot(domainKey, delayedUsername);
          }
        }, 1200);
      }
      return;
    }

    if (!shouldSkipTokenValidation(type) && !isMessageTokenValid(data, ensureBridgeToken())) {
      return;
    }

    if (type === MESSAGE_TYPES.EDITOR_READY) {
      editorReady = true;
      formatterEnabled = true;
      return;
    }

    if (type === MESSAGE_TYPES.PING_RESPONSE) {
      editorReady = isReady;
      formatterEnabled = !!data.formatterEnabled;
      diagnosticReady = !!data.diagnosticReady;
      diagnosticContext = data.diagnosticContext || null;
      return;
    }

    if (type === MESSAGE_TYPES.FORMAT_RESPONSE) {
      window.__WISPHUB_LAST_FORMAT_RESULT__ = result;
      return;
    }

    if (type === MESSAGE_TYPES.RESTORE_RESPONSE) {
      window.__WISPHUB_LAST_RESTORE_RESULT__ = result;
      return;
    }

    if (type === MESSAGE_TYPES.DIAGNOSTIC_RUN_RESPONSE) {
      window.__WISPHUB_LAST_DIAGNOSTIC_RESULT__ = result;
      return;
    }

    if (type === MESSAGE_TYPES.DIAGNOSTIC_RUN_ACK) {
      window.__WISPHUB_LAST_DIAGNOSTIC_ACK__ = result;
      return;
    }

    if (type === MESSAGE_TYPES.PROFILE_SWITCH_ACK) {
      window.__WISPHUB_LAST_PROFILE_SWITCH_ACK__ = result;
      return;
    }

    if (type === MESSAGE_TYPES.SESSION_CAPTURE_REQUEST) {
      const username = getCurrentUsernameFromDom();
      const domainKey = getDomainKey(window.location.hostname);
      if (domainKey && username) {
        captureSessionCookiesSnapshot(domainKey, username, { force: true });
      }
      return;
    }

    if (type === MESSAGE_TYPES.LOG_ENTRY) {
      persistLogEntry(data);
      return;
    }

    if (type === MESSAGE_TYPES.UPDATE_TICKETS_REQUEST) {
      relayTicketUpdate(data.ticketIds || []);
      return;
    }

    if (type === MESSAGE_TYPES.CLIENT_QUICK_INFO_REQUEST) {
      relayClientQuickInfo(data.idServicio);
      return;
    }

  });
}

async function relayTicketUpdate(ticketIds) {
  const safeIds = Array.isArray(ticketIds) ? ticketIds : [];

  const sendResult = (results) => {
    postToPage(MESSAGE_TYPES.UPDATE_TICKETS_RESPONSE, { results });
  };

  const failAll = (msg) =>
    sendResult({
      success: 0,
      failed: safeIds.length,
      errors: [{ id: "all", error: msg }],
      updatedIds: [],
    });

  try {
    const { domainKey, apiKey } = await getApiKeyForCurrentDomain();

    if (!domainKey) {
      return failAll("Dominio no soportado");
    }
    if (!apiKey) {
      return failAll("API Key no configurada. Configura tu API Key en el popup.");
    }

    const response = await browserAPI.runtime.sendMessage({
      action: ACTIONS.UPDATE_TICKETS,
      apiKey,
      apiBaseUrl: getApiBaseUrl(domainKey),
      ticketIds: safeIds,
    });

    sendResult(
      response?.results || {
        success: 0,
        failed: safeIds.length,
        errors: [{ id: "all", error: response?.error || "Unknown error" }],
        updatedIds: [],
      },
    );
  } catch (err) {
    failAll(err.message);
  }
}

async function relayClientQuickInfo(idServicio) {
  const empty = { saldo: null, tickets: null, plan: null, pendingTickets: null };
  const sendResult = (result) =>
    postToPage(MESSAGE_TYPES.CLIENT_QUICK_INFO_RESPONSE, { idServicio, result });

  try {
    const { domainKey, apiKey } = await getApiKeyForCurrentDomain();
    if (!domainKey) {
      return sendResult(empty);
    }
    if (!apiKey) {
      return sendResult({ ...empty, noApiKey: true });
    }
    const response = await browserAPI.runtime.sendMessage({
      action: ACTIONS.CLIENT_QUICK_INFO,
      apiKey,
      apiBaseUrl: getApiBaseUrl(domainKey),
      idServicio,
    });
    if (response?.success === false && response?.error) {
      return sendResult({ ...empty, apiError: response.error });
    }
    sendResult(response?.data || empty);
  } catch (err) {
    sendResult({ ...empty, apiError: err.message });
  }
}

export function listenToExtensionMessages(options = {}) {
  const navigationLocation =
    options?.locationObj && typeof options.locationObj.assign === "function"
      ? options.locationObj
      : window.location;

  browserAPI.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const { action } = message;

    if (action === ACTIONS.PING) {
      postToPage(MESSAGE_TYPES.PING_REQUEST);
      setTimeout(
        () =>
          sendResponse({
            status: "OK",
            editorReady,
            formatterEnabled,
            diagnosticReady,
            diagnosticContext,
          }),
        100,
      );
      return true;
    }

    if (action === ACTIONS.FORMAT_COMMENTS) {
      if (message.settings) {
        userSettings = { ...userSettings, ...message.settings };
      }
      window.__WISPHUB_LAST_FORMAT_RESULT__ = null;

      postToPage(MESSAGE_TYPES.FORMAT_REQUEST, {
        settings: userSettings,
        fromPopup: !!message.fromPopup,
      });

      setTimeout(() => {
        sendResponse(
          window.__WISPHUB_LAST_FORMAT_RESULT__ || {
            success: false,
            error: "No editor response",
          },
        );
      }, 200);
      return true;
    }

    if (action === ACTIONS.RESTORE_COMMENTS) {
      window.__WISPHUB_LAST_RESTORE_RESULT__ = null;
      postToPage(MESSAGE_TYPES.RESTORE_REQUEST);
      setTimeout(() => {
        sendResponse(
          window.__WISPHUB_LAST_RESTORE_RESULT__ || {
            success: false,
            error: "No editor response",
          },
        );
      }, 200);
      return true;
    }

    if (action === ACTIONS.GET_STAFF_INFO) {
      handleGetStaffInfo(sendResponse);
      return true;
    }

    if (action === ACTIONS.GET_SESSION_CONTEXT) {
      const username = getCurrentUsernameFromDom();
      const domainKey = getDomainKey(window.location.hostname);
      if (domainKey && username) {
        captureSessionCookiesSnapshot(domainKey, username);
      }
      sendResponse({
        success: true,
        context: {
          domainKey,
          pathname: window.location.pathname,
          loggedIn: Boolean(username),
          username,
        },
      });
      return true;
    }

    if (action === ACTIONS.UPDATE_SETTINGS) {
      if (message.settings) {
        userSettings = { ...userSettings, ...message.settings };
        postToPage(MESSAGE_TYPES.SETTINGS_UPDATE, { settings: userSettings });
      }
      sendResponse({ success: true });
      return true;
    }

    if (action === ACTIONS.RUN_CLIENT_DIAGNOSTIC) {
      window.__WISPHUB_LAST_DIAGNOSTIC_ACK__ = null;
      postToPage(MESSAGE_TYPES.DIAGNOSTIC_RUN_REQUEST, {
        clientContext: message.clientContext || null,
        fromPopup: !!message.fromPopup,
      });
      waitForDiagnosticStartAck().then((ack) => {
        sendResponse(ack);
      });
      return true;
    }

    if (action === ACTIONS.START_PROFILE_SWITCH) {
      (async () => {
        try {
          const domainKey = getDomainKey(window.location.hostname);
          const currentUsername = getCurrentUsernameFromDom();
          const targetUsername = String(message.targetUsername || "").trim();

          if (domainKey && currentUsername) {
            const captureResult = await captureSessionCookiesSnapshot(
              domainKey,
              currentUsername,
            );
            if (captureResult?.success !== true) {
              sendResponse(buildProfileSwitchStartFailure(captureResult?.error));
              return;
            }
          }

          const snapshotResult = await hasSessionCookiesSnapshot(domainKey, targetUsername);
          const canUseCookieSwitch = snapshotResult.hasSnapshot;
          const resolvedTargetUsername = snapshotResult.storedUsername || targetUsername;

          window.__WISPHUB_LAST_PROFILE_SWITCH_ACK__ = null;
          postToPage(MESSAGE_TYPES.PROFILE_SWITCH_REQUEST, {
            targetUsername: resolvedTargetUsername,
            targetLabel: message.targetLabel || "",
            targetProfileKey: message.targetProfileKey || "",
            preferCookieSwitch: canUseCookieSwitch,
          });

          const ack = await waitForProfileSwitchAck();
          if (!ack.success || !ack.started || ack.cancelled) {
            sendResponse(ack);
            return;
          }

          if (ack.switchStrategy === "cookie-swap") {
            const cookieSwitchResult = await switchSessionCookies(
              domainKey,
              resolvedTargetUsername,
            );

            if (cookieSwitchResult?.success) {
              if (ack.redirectUrl) {
                navigationLocation.assign(ack.redirectUrl);
              }
              sendResponse({
                ...ack,
                requiresLogin: false,
              });
              return;
            }

            if (ack.fallbackRedirectUrl) {
              navigationLocation.assign(ack.fallbackRedirectUrl);
            }
            sendResponse({
              ...ack,
              switchStrategy: "login-assist",
              requiresLogin: true,
              info:
                cookieSwitchResult?.error ||
                "No se encontró sesión guardada. Continúa con login asistido.",
              error: "",
            });
            return;
          }

          sendResponse(ack);
        } catch (error) {
          sendResponse({
            success: false,
            started: false,
            cancelled: false,
            info: "",
            error: error?.message || "No se pudo iniciar el cambio de perfil",
            switchStrategy: "",
            redirectUrl: "",
            fallbackRedirectUrl: "",
            requiresLogin: false,
          });
        }
      })();
      return true;
    }

    sendResponse({ success: false, error: "Unknown action" });
    return true;
  });
}

async function handleGetStaffInfo(sendResponse) {
  try {
    const username = getCurrentUsernameFromDom();
    if (!username) {
      sendResponse({ staff: null, error: "Username not found in DOM" });
      return;
    }

    const { domainKey, apiKey } = await getApiKeyForCurrentDomain();
    if (!domainKey) {
      sendResponse({ staff: null, error: "Unknown domain", username });
      return;
    }
    if (!apiKey) {
      sendResponse({
        staff: null,
        error: `No API key for ${domainKey}`,
        username,
      });
      return;
    }

    const fetchResult = await browserAPI.runtime.sendMessage({
      action: ACTIONS.FETCH_STAFF,
      apiKey,
      apiBaseUrl: getApiBaseUrl(domainKey),
    });

    if (!fetchResult?.success) {
      sendResponse({
        staff: null,
        error: fetchResult?.error || "API error",
        username,
      });
      return;
    }

    const needle = username.toLowerCase();
    const match = (fetchResult.data || []).find(
      (staff) =>
        (staff.username || "").toLowerCase() === needle ||
        (staff.nombre || "").toLowerCase() === needle,
    );

    if (match) {
      sendResponse({
        staff: { id: match.id, nombre: match.nombre, username: match.username },
      });
    } else {
      sendResponse({ staff: null, error: "Staff not found", username });
    }
  } catch (error) {
    sendResponse({ staff: null, error: error.message });
  }
}

export async function loadAndSyncSettings() {
  try {
    const result = await browserAPI.storage.local.get("userSettings");
    if (result.userSettings) {
      userSettings = { ...userSettings, ...result.userSettings };
      postToPage(MESSAGE_TYPES.SETTINGS_UPDATE, { settings: userSettings });
    }
  } catch (error) {
    console.error(`[WYC] Settings load error:`, error);
  }
}
