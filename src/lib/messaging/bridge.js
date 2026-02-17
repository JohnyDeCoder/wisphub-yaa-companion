import { EXTENSION_NAME } from '../../config/constants.js';
import { getDomainKey, getApiBaseUrl } from '../../config/domains.js';
import { MESSAGE_TYPES, ACTIONS } from '../../config/messages.js';
import { browserAPI } from '../../utils/browser.js';

const LOG_STORAGE_KEY = 'wisphubYaaLogs'; // chrome.storage key for popup log entries
const API_KEY_STORAGE_KEY = 'wisphubYaaApiKeys'; // chrome.storage key for API keys per domain
const MAX_LOG_ENTRIES = 50; // Max stored log entries before oldest are pruned (default: 50)
const LOG_TTL = 24 * 60 * 60 * 1000; // Log entry lifetime in ms (default: 24h)

let editorReady = false;
let userSettings = { notificationsEnabled: true, autoFormatEnabled: false, autoPriceCalcEnabled: false };

function pruneExpiredLogs(logs) {
  const now = Date.now();
  return logs.filter((entry) => entry?.ts && now - entry.ts < LOG_TTL);
}

function persistLogEntry(data) {
  try {
    browserAPI.storage.local
      .get(LOG_STORAGE_KEY)
      .then((res) => {
        const logs = pruneExpiredLogs(res[LOG_STORAGE_KEY] || []);
        const ts = Date.now();
        const time = new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
        logs.push({ time, level: data.level || 'info', message: data.message || '', ts });
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
  const result = await browserAPI.storage.local.get(API_KEY_STORAGE_KEY);
  const keys = result[API_KEY_STORAGE_KEY] || {};
  return { domainKey, apiKey: keys[domainKey] || null };
}

export function listenToPageMessages() {
  window.addEventListener('message', (event) => {
    if (event.source !== window) {
      return;
    }

    const { type, editorReady: isReady, result } = event.data || {};

    if (type === MESSAGE_TYPES.EDITOR_READY) {
      editorReady = true;
    }

    if (type === MESSAGE_TYPES.PING_RESPONSE) {
      editorReady = isReady;
    }

    if (type === MESSAGE_TYPES.FORMAT_RESPONSE) {
      window.__WISPHUB_LAST_FORMAT_RESULT__ = result;
    }

    if (type === MESSAGE_TYPES.RESTORE_RESPONSE) {
      window.__WISPHUB_LAST_RESTORE_RESULT__ = result;
    }

    if (type === MESSAGE_TYPES.LOG_ENTRY) {
      persistLogEntry(event.data);
    }

    if (type === MESSAGE_TYPES.UPDATE_TICKETS_REQUEST) {
      relayTicketUpdate(event.data.ticketIds || []);
    }
  });
}

async function relayTicketUpdate(ticketIds) {
  const sendResult = (results) => window.postMessage({ type: MESSAGE_TYPES.UPDATE_TICKETS_RESPONSE, results }, '*');

  const failAll = (msg) => sendResult({ success: 0, failed: ticketIds.length, errors: [{ id: 'all', error: msg }] });

  try {
    const { domainKey, apiKey } = await getApiKeyForCurrentDomain();

    if (!domainKey) {
      return failAll('Dominio no soportado');
    }
    if (!apiKey) {
      return failAll('API Key no configurada. Configura tu API Key en el popup.');
    }

    const response = await browserAPI.runtime.sendMessage({
      action: ACTIONS.UPDATE_TICKETS,
      apiKey,
      apiBaseUrl: getApiBaseUrl(domainKey),
      ticketIds,
    });

    sendResult(
      response?.results || {
        success: 0,
        failed: ticketIds.length,
        errors: [{ id: 'all', error: response?.error || 'Unknown error' }],
      },
    );
  } catch (err) {
    failAll(err.message);
  }
}

export function listenToExtensionMessages() {
  browserAPI.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const { action } = message;

    if (action === ACTIONS.PING) {
      window.postMessage({ type: MESSAGE_TYPES.PING_REQUEST }, '*');
      setTimeout(() => sendResponse({ status: 'OK', editorReady }), 100);
      return true;
    }

    if (action === ACTIONS.FORMAT_COMMENTS) {
      if (message.settings) {
        userSettings = { ...userSettings, ...message.settings };
      }
      window.__WISPHUB_LAST_FORMAT_RESULT__ = null;
      window.postMessage(
        {
          type: MESSAGE_TYPES.FORMAT_REQUEST,
          settings: userSettings,
          fromPopup: !!message.fromPopup,
        },
        '*',
      );
      setTimeout(() => {
        sendResponse(window.__WISPHUB_LAST_FORMAT_RESULT__ || { success: false, error: 'No editor response' });
      }, 200);
      return true;
    }

    if (action === ACTIONS.RESTORE_COMMENTS) {
      window.__WISPHUB_LAST_RESTORE_RESULT__ = null;
      window.postMessage({ type: MESSAGE_TYPES.RESTORE_REQUEST }, '*');
      setTimeout(() => {
        sendResponse(window.__WISPHUB_LAST_RESTORE_RESULT__ || { success: false, error: 'No editor response' });
      }, 200);
      return true;
    }

    if (action === ACTIONS.GET_STAFF_INFO) {
      handleGetStaffInfo(sendResponse);
      return true;
    }

    if (action === ACTIONS.UPDATE_SETTINGS) {
      if (message.settings) {
        userSettings = { ...userSettings, ...message.settings };
        window.postMessage({ type: MESSAGE_TYPES.SETTINGS_UPDATE, settings: userSettings }, '*');
      }
      sendResponse({ success: true });
      return true;
    }

    sendResponse({ success: false, error: 'Unknown action' });
    return true;
  });
}

async function handleGetStaffInfo(sendResponse) {
  try {
    const usernameEl = document.querySelector('.user-menu .user-name');
    const username = usernameEl?.textContent?.trim();
    if (!username) {
      sendResponse({ staff: null, error: 'Username not found in DOM' });
      return;
    }

    const { domainKey, apiKey } = await getApiKeyForCurrentDomain();
    if (!domainKey) {
      sendResponse({ staff: null, error: 'Unknown domain', username });
      return;
    }
    if (!apiKey) {
      sendResponse({ staff: null, error: `No API key for ${domainKey}`, username });
      return;
    }

    const fetchResult = await browserAPI.runtime.sendMessage({
      action: 'FETCH_STAFF',
      apiKey,
      apiBaseUrl: getApiBaseUrl(domainKey),
    });

    if (!fetchResult?.success) {
      sendResponse({ staff: null, error: fetchResult?.error || 'API error', username });
      return;
    }

    const needle = username.toLowerCase();
    const match = (fetchResult.data || []).find(
      (s) => (s.username || '').toLowerCase() === needle || (s.nombre || '').toLowerCase() === needle,
    );

    if (match) {
      sendResponse({ staff: { id: match.id, nombre: match.nombre, username: match.username } });
    } else {
      sendResponse({ staff: null, error: 'Staff not found', username });
    }
  } catch (e) {
    sendResponse({ staff: null, error: e.message });
  }
}

export async function loadAndSyncSettings() {
  try {
    const result = await browserAPI.storage.local.get('userSettings');
    if (result.userSettings) {
      userSettings = { ...userSettings, ...result.userSettings };
      window.postMessage({ type: MESSAGE_TYPES.SETTINGS_UPDATE, settings: userSettings }, '*');
    }
  } catch (e) {
    console.error(`[${EXTENSION_NAME}] Settings load error:`, e);
  }
}
