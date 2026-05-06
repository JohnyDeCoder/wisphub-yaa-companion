import { getDomainKey, isWispHubDomain } from "../config/domains.js";
import { CACHE_TTL } from "../config/constants.js";
import { ACTIONS } from "../config/messages.js";
import {
  hasUsableSessionCookies,
  shouldPersistSessionSnapshot,
} from "../utils/sessionSnapshot.js";
import { normalizeValue } from "../utils/string.js";
import { buildProfileSnapshotKey } from "../utils/sessionKey.js";

const ICON_ACTIVE = { 48: "assets/icons/icon48_st_on.png" };
const ICON_INACTIVE = { 48: "assets/icons/icon48_st_off.png" };
const SESSION_COOKIE_SNAPSHOTS_KEY = "wisphubYaaSessionCookieSnapshots";
const SESSION_COOKIE_SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const SESSION_COOKIE_SNAPSHOT_MAX_PROFILES = 4;
const SESSION_COOKIE_MAX_PER_PROFILE = 20;
const SESSION_COOKIE_NAME_HINT_RE = /(session|csrftoken|auth|token|jwt|remember|sid)/i;
const SESSION_COOKIE_IGNORED_NAME_RE = /^(_ga|_gid|_gat|_fbp|_gcl_au|_hj|amplitude|mixpanel)/i;
const SUPPORTED_SESSION_DOMAINS = ["wisphub.io", "wisphub.app"];
const QUICK_INFO_TICKETS_FETCH_LIMIT = 100;
const QUICK_INFO_TICKETS_DISPLAY_LIMIT = 5;

function updateIcon(tabId, url) {
  const icons = isWispHubDomain(url) ? ICON_ACTIVE : ICON_INACTIVE;
  chrome.action.setIcon({ tabId, path: icons }).catch(() => {});
}

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs
    .get(tabId)
    .then((tab) => updateIcon(tabId, tab.url))
    .catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    updateIcon(tabId, tab.url);
  }
});

const staffCache = {};

function isSupportedSessionDomain(domainKey) {
  return SUPPORTED_SESSION_DOMAINS.includes(normalizeValue(domainKey));
}

function isTrustedSessionSender(sender, requestedDomainKey) {
  const normalizedRequestedDomain = normalizeValue(requestedDomainKey);
  if (!isSupportedSessionDomain(normalizedRequestedDomain)) {
    return false;
  }

  const senderUrl = sender?.tab?.url || sender?.url || "";
  if (!senderUrl) {
    return true;
  }

  const senderDomainKey = getDomainKey(senderUrl);
  return senderDomainKey === normalizedRequestedDomain;
}

// Allows popup (no tab URL) and content scripts on WispHub pages; rejects all others.
function isWispHubSender(sender) {
  const url = sender?.tab?.url || sender?.url || "";
  return !url || isWispHubDomain(url);
}


function isCookieUnderDomain(cookie, domainKey) {
  const safeDomain = String(cookie?.domain || "").replace(/^\./, "").toLowerCase();
  const safeTarget = String(domainKey || "").trim().toLowerCase();
  if (!safeDomain || !safeTarget) {
    return false;
  }
  return safeDomain === safeTarget || safeDomain.endsWith(`.${safeTarget}`);
}

function buildCookieUrl(cookie, fallbackDomain) {
  const rawDomain = String(cookie?.domain || "").replace(/^\./, "").trim();
  const domain = rawDomain || String(fallbackDomain || "").trim();
  const path = String(cookie?.path || "/").trim() || "/";
  const scheme = cookie?.secure === false ? "http" : "https";
  return `${scheme}://${domain}${path}`;
}

function shouldIgnoreCookieName(name) {
  return SESSION_COOKIE_IGNORED_NAME_RE.test(String(name || ""));
}

function isLikelySessionCookie(cookie) {
  const cookieName = String(cookie?.name || "");
  if (!cookieName || shouldIgnoreCookieName(cookieName)) {
    return false;
  }

  return cookie?.httpOnly === true || SESSION_COOKIE_NAME_HINT_RE.test(cookieName);
}

function selectSessionCookiesForSnapshot(domainCookies) {
  const filteredDomainCookies = (domainCookies || []).filter(
    (cookie) => !shouldIgnoreCookieName(cookie?.name),
  );
  const preferredCookies = filteredDomainCookies.filter(isLikelySessionCookie);
  const fallbackCookies = filteredDomainCookies.filter((cookie) => cookie?.secure !== false);
  const sourceCookies = preferredCookies.length > 0 ? preferredCookies : fallbackCookies;
  return sourceCookies.slice(0, SESSION_COOKIE_MAX_PER_PROFILE);
}

function serializeCookie(cookie) {
  return {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    expirationDate: cookie.expirationDate,
    storeId: cookie.storeId,
  };
}

function buildCookieSetPayload(cookie, fallbackDomain) {
  const payload = {
    url: buildCookieUrl(cookie, fallbackDomain),
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path || "/",
    secure: cookie.secure !== false,
    httpOnly: cookie.httpOnly === true,
    storeId: cookie.storeId,
  };

  if (cookie.sameSite) {
    payload.sameSite = cookie.sameSite;
  }

  if (
    Number.isFinite(cookie.expirationDate) &&
    Number(cookie.expirationDate) > 0
  ) {
    payload.expirationDate = Number(cookie.expirationDate);
  }

  return payload;
}

async function readSessionCookieSnapshots() {
  const result = await chrome.storage.local.get(SESSION_COOKIE_SNAPSHOTS_KEY);
  return result[SESSION_COOKIE_SNAPSHOTS_KEY] || {};
}

async function writeSessionCookieSnapshots(snapshotMap) {
  await chrome.storage.local.set({
    [SESSION_COOKIE_SNAPSHOTS_KEY]: snapshotMap,
  });
}

function pruneSessionCookieSnapshots(snapshotMap) {
  const now = Date.now();
  const validEntries = Object.entries(snapshotMap || {}).filter(([, entry]) => {
    const capturedAt = Number(entry?.capturedAt);
    if (!Number.isFinite(capturedAt) || capturedAt <= 0) {
      return false;
    }
    return (
      now - capturedAt <= SESSION_COOKIE_SNAPSHOT_MAX_AGE_MS &&
      hasUsableSessionCookies(entry, now / 1000)
    );
  });

  validEntries.sort(
    (a, b) => Number(b?.[1]?.capturedAt || 0) - Number(a?.[1]?.capturedAt || 0),
  );

  return Object.fromEntries(
    validEntries
      .slice(0, SESSION_COOKIE_SNAPSHOT_MAX_PROFILES)
      .filter(([key]) => Boolean(key)),
  );
}


function createCookieNameSet(cookieNames) {
  return new Set(
    (cookieNames || [])
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean),
  );
}


async function captureSessionCookies({ domainKey, username }) {
  if (!isSupportedSessionDomain(domainKey)) {
    return { success: false, error: "Dominio no soportado para captura de sesión" };
  }

  const safeUsername = normalizeValue(username);
  if (!safeUsername) {
    return { success: false, error: "No se pudo detectar usuario para capturar sesión" };
  }

  const allCookies = await chrome.cookies.getAll({ domain: domainKey });
  const domainCookies = allCookies.filter((cookie) =>
    isCookieUnderDomain(cookie, domainKey),
  );
  const selectedCookies = selectSessionCookiesForSnapshot(domainCookies);

  if (selectedCookies.length === 0) {
    return {
      success: false,
      error: "No se encontraron cookies de sesión relevantes para este dominio",
    };
  }

  const rawSnapshots = await readSessionCookieSnapshots();
  const snapshots = pruneSessionCookieSnapshots(rawSnapshots);
  const snapshotsChangedByPrune =
    Object.keys(rawSnapshots || {}).length !== Object.keys(snapshots || {}).length;
  const snapshotKey = buildProfileSnapshotKey(domainKey, safeUsername);
  if (!snapshotKey) {
    return { success: false, error: "No se pudo construir clave de sesión" };
  }

  const serializedCookies = selectedCookies.map(serializeCookie);
  if (!hasUsableSessionCookies({ cookies: serializedCookies })) {
    return {
      success: false,
      error: "No se encontró una cookie de sesión restaurable para este perfil",
    };
  }

  const existingSnapshot = snapshots[snapshotKey];
  const shouldPersist =
    snapshotsChangedByPrune ||
    shouldPersistSessionSnapshot(existingSnapshot, serializedCookies, {
      refreshTimestamp: true,
    });

  snapshots[snapshotKey] = {
    domainKey,
    username: safeUsername,
    capturedAt: Date.now(),
    cookies: serializedCookies,
  };

  if (shouldPersist) {
    await writeSessionCookieSnapshots(snapshots);
  }

  return {
    success: true,
    snapshotKey,
    cookieCount: serializedCookies.length,
    updated: shouldPersist,
  };
}

async function hasSessionCookies({ domainKey, username }) {
  if (!isSupportedSessionDomain(domainKey)) {
    return { success: false, hasSnapshot: false, error: "Dominio no soportado" };
  }

  const safeUsername = normalizeValue(username);
  if (!safeUsername) {
    return { success: false, hasSnapshot: false, error: "Usuario inválido para verificar sesión" };
  }

  const snapshots = pruneSessionCookieSnapshots(await readSessionCookieSnapshots());
  const snapshotKey = buildProfileSnapshotKey(domainKey, safeUsername);
  const snapshot = snapshotKey ? snapshots[snapshotKey] : null;

  return {
    success: true,
    hasSnapshot: hasUsableSessionCookies(snapshot),
    cookieCount: Array.isArray(snapshot?.cookies) ? snapshot.cookies.length : 0,
    username: snapshot?.username || null,
  };
}

async function clearDomainCookies(domainKey, cookieNames = []) {
  const cookies = await chrome.cookies.getAll({ domain: domainKey });
  const cookieNameSet = createCookieNameSet(cookieNames);
  const toRemove = cookies.filter((cookie) => {
    if (!isCookieUnderDomain(cookie, domainKey)) {
      return false;
    }

    const lowerName = String(cookie?.name || "").trim().toLowerCase();
    if (!lowerName || shouldIgnoreCookieName(lowerName)) {
      return false;
    }

    if (cookieNameSet.size > 0) {
      return cookieNameSet.has(lowerName);
    }

    return isLikelySessionCookie(cookie);
  });

  await Promise.allSettled(
    toRemove.map((cookie) =>
      chrome.cookies.remove({
        url: buildCookieUrl(cookie, domainKey),
        name: cookie.name,
        storeId: cookie.storeId,
      }),
    ),
  );
}

async function switchSessionCookies({ domainKey, targetUsername }) {
  if (!isSupportedSessionDomain(domainKey)) {
    return { success: false, requiresLogin: true, error: "Dominio no soportado para cambio de sesión" };
  }

  const safeTargetUsername = normalizeValue(targetUsername);
  if (!safeTargetUsername) {
    return { success: false, requiresLogin: true, error: "Usuario destino inválido para cambio de sesión" };
  }

  const snapshots = pruneSessionCookieSnapshots(await readSessionCookieSnapshots());
  const snapshotKey = buildProfileSnapshotKey(domainKey, safeTargetUsername);
  const snapshot = snapshotKey ? snapshots[snapshotKey] : null;

  if (!snapshot || !Array.isArray(snapshot.cookies) || snapshot.cookies.length === 0) {
    return {
      success: false,
      requiresLogin: true,
      error: "No hay sesión guardada para el perfil destino. Se requiere iniciar sesión.",
    };
  }

  await clearDomainCookies(domainKey);

  const restoreResults = await Promise.allSettled(
    snapshot.cookies.map((cookie) =>
      chrome.cookies.set(buildCookieSetPayload(cookie, domainKey)),
    ),
  );

  const appliedCount = restoreResults.filter((result) => result.status === "fulfilled" && result.value).length;
  if (appliedCount === 0) {
    return {
      success: false,
      requiresLogin: true,
      error: "No se pudo restaurar la sesión guardada para el perfil destino",
    };
  }

  return {
    success: true,
    requiresLogin: false,
    appliedCount,
  };
}

async function fetchStaffFromApi(apiKey, apiBaseUrl) {
  const cached = staffCache[apiBaseUrl];
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const allStaff = [];
  let url = `${apiBaseUrl}staff/?limit=200`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Api-Key ${apiKey}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} — ${body || res.statusText}`);
    }
    const data = await res.json();
    if (data.results) {
      allStaff.push(...data.results);
    }
    url = data.next || null;
  }

  staffCache[apiBaseUrl] = { data: allStaff, ts: Date.now() };
  return allStaff;
}

async function fetchClientQuickInfo(apiKey, apiBaseUrl, idServicio) {
  const headers = { Authorization: `Api-Key ${apiKey}` };
  const [saldoResult, ticketsResult, clientResult, pendingTicketsResult] =
    await Promise.allSettled([
      fetch(`${apiBaseUrl}clientes/${idServicio}/saldo/`, { headers }),
      fetch(`${apiBaseUrl}tickets/?estado=2&limit=${QUICK_INFO_TICKETS_FETCH_LIMIT}`, { headers }),
      fetch(`${apiBaseUrl}clientes/${idServicio}/`, { headers }),
      fetch(`${apiBaseUrl}tickets/?estado=1&limit=${QUICK_INFO_TICKETS_FETCH_LIMIT}`, { headers }),
    ]);

  const authFailed = [saldoResult, ticketsResult, clientResult, pendingTicketsResult].some(
    (r) => r.status === "fulfilled" && r.value.status === 401,
  );
  if (authFailed) {
    throw new Error("API Key inválida o sin permisos — verifica la configuración en la extensión");
  }

  const saldoJson =
    saldoResult.status === "fulfilled" && saldoResult.value.ok
      ? await saldoResult.value.json().catch(() => null)
      : null;
  const saldo = saldoJson ? { saldo: saldoJson.saldo ?? null } : null;

  const ticketsJson =
    ticketsResult.status === "fulfilled" && ticketsResult.value.ok
      ? await ticketsResult.value.json().catch(() => null)
      : null;
  const ticketsRaw =
    ticketsJson?.results ?? (Array.isArray(ticketsJson) ? ticketsJson : null);
  // Single-page fetch is intentional: paginating a hover tooltip would be too slow.
  // Installations with >100 open tickets may show an incomplete list for some clients.
  const tickets =
    ticketsRaw === null
      ? null
      : ticketsRaw
        .filter((t) => String(t.servicio?.id_servicio) === String(idServicio))
        .slice(0, QUICK_INFO_TICKETS_DISPLAY_LIMIT);

  const clientJson =
    clientResult.status === "fulfilled" && clientResult.value.ok
      ? await clientResult.value.json().catch(() => null)
      : null;
  const plan = clientJson?.plan_internet ?? null;

  const pendingTicketsJson =
    pendingTicketsResult.status === "fulfilled" && pendingTicketsResult.value.ok
      ? await pendingTicketsResult.value.json().catch(() => null)
      : null;
  const pendingTicketsRaw =
    pendingTicketsJson?.results ?? (Array.isArray(pendingTicketsJson) ? pendingTicketsJson : null);
  const pendingTickets =
    pendingTicketsRaw === null
      ? null
      : pendingTicketsRaw
        .filter((t) => String(t.servicio?.id_servicio) === String(idServicio))
        .slice(0, QUICK_INFO_TICKETS_DISPLAY_LIMIT);

  return { saldo, tickets, plan, pendingTickets };
}

async function updateTicketStatus(apiKey, apiBaseUrl, ticketId, headers) {
  const url = `${apiBaseUrl}tickets/${ticketId}/`;

  // Attempt 1: simple status update
  const form1 = new FormData();
  form1.append("estado", "1");
  const res1 = await fetch(url, { method: "PUT", headers, body: form1 });

  if (res1.ok) {
    return;
  }

  // Attempt 2: include custom subject to satisfy API validation
  const getRes = await fetch(url, { headers });
  if (!getRes.ok) {
    const body = await getRes.text().catch(() => "");
    throw new Error(`GET ${getRes.status}: ${body || getRes.statusText}`);
  }

  const ticket = await getRes.json();
  const form2 = new FormData();
  form2.append("estado", "1");
  form2.append("asuntos_default", "Otro Asunto");
  form2.append("asunto", ticket.asunto);

  const res2 = await fetch(url, { method: "PUT", headers, body: form2 });

  if (!res2.ok) {
    const body = await res2.text().catch(() => "");
    throw new Error(`PUT attempt 2 ${res2.status}: ${body || res2.statusText}`);
  }
}


async function updateTicketsToNew(apiKey, apiBaseUrl, ticketIds) {
  let success = 0;
  let failed = 0;
  const updatedIds = [];
  const errors = [];
  const headers = { Authorization: `Api-Key ${apiKey}` };

  for (const id of ticketIds) {
    try {
      await updateTicketStatus(apiKey, apiBaseUrl, id, headers);
      success++;
      updatedIds.push(id);
    } catch (err) {
      console.warn("[WYC][Background] Ticket update failed:", err.message);
      failed++;
      errors.push({ id, error: err.message });
    }
  }

  return { success, failed, errors, updatedIds };
}

function runAuthorizedSessionAction({
  sender,
  domainKey,
  onAllowed,
  unauthorizedResult,
}) {
  if (!isTrustedSessionSender(sender, domainKey)) {
    return Promise.resolve(unauthorizedResult);
  }
  return onAllowed();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handlers = {
    [ACTIONS.FETCH_STAFF]: () => {
      if (!isWispHubSender(sender)) {
        sendResponse({ success: false, error: "Unauthorized sender" });
        return;
      }
      fetchStaffFromApi(message.apiKey, message.apiBaseUrl)
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
    },

    [ACTIONS.UPDATE_TICKETS]: () => {
      if (!isWispHubSender(sender)) {
        sendResponse({ success: false, error: "Unauthorized sender" });
        return;
      }
      updateTicketsToNew(message.apiKey, message.apiBaseUrl, message.ticketIds)
        .then((results) => sendResponse({ success: true, results }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
    },

    [ACTIONS.SESSION_CAPTURE_COOKIES]: () =>
      runAuthorizedSessionAction({
        sender,
        domainKey: message.domainKey,
        onAllowed: () =>
          captureSessionCookies({
            domainKey: message.domainKey,
            username: message.username,
          }),
        unauthorizedResult: {
          success: false,
          error: "Origen no autorizado para captura de sesión",
        },
      })
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ success: false, error: err.message })),

    [ACTIONS.SESSION_HAS_COOKIES]: () =>
      runAuthorizedSessionAction({
        sender,
        domainKey: message.domainKey,
        onAllowed: () =>
          hasSessionCookies({
            domainKey: message.domainKey,
            username: message.username,
          }),
        unauthorizedResult: {
          success: false,
          hasSnapshot: false,
          error: "Origen no autorizado para verificación de sesión",
        },
      })
        .then((result) => sendResponse(result))
        .catch((err) =>
          sendResponse({ success: false, hasSnapshot: false, error: err.message }),
        ),

    [ACTIONS.SESSION_SWITCH_COOKIES]: () =>
      runAuthorizedSessionAction({
        sender,
        domainKey: message.domainKey,
        onAllowed: () =>
          switchSessionCookies({
            domainKey: message.domainKey,
            targetUsername: message.targetUsername,
          }),
        unauthorizedResult: {
          success: false,
          requiresLogin: true,
          error: "Origen no autorizado para cambio de sesión",
        },
      })
        .then((result) => sendResponse(result))
        .catch((err) =>
          sendResponse({ success: false, requiresLogin: true, error: err.message }),
        ),

    [ACTIONS.CLIENT_QUICK_INFO]: () => {
      if (!isWispHubSender(sender)) {
        sendResponse({ success: false, data: { saldo: null, tickets: null }, error: "Unauthorized sender" });
        return;
      }
      fetchClientQuickInfo(
        message.apiKey,
        message.apiBaseUrl,
        message.idServicio,
      )
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) =>
          sendResponse({
            success: false,
            data: { saldo: null, tickets: null },
            error: err.message,
          }),
        );
    },
  };

  const handler = handlers[message.action];
  if (handler) {
    handler();
    return true;
  }
});

chrome.runtime.onUpdateAvailable.addListener((details) => {
  console.log(`[WYC][Background] Update available: ${details.version}`);
  chrome.action.setBadgeText({ text: "UP" });
  chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    chrome.tabs.create({ url: "pages/whats-new.html" });
  }
});
