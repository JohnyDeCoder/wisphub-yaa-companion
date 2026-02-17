import { ALLOWED_DOMAINS } from '../config/domains.js';
import { CACHE_TTL } from '../config/constants.js';

const ICON_ACTIVE = { 48: 'assets/icons/icon48_st_on.png' };
const ICON_INACTIVE = { 48: 'assets/icons/icon48_st_off.png' };

function isWispHubUrl(url) {
  if (!url) {
    return false;
  }
  try {
    const hostname = new URL(url).hostname;
    return ALLOWED_DOMAINS.some((d) => hostname.includes(d));
  } catch {
    return false;
  }
}

function updateIcon(tabId, url) {
  const icons = isWispHubUrl(url) ? ICON_ACTIVE : ICON_INACTIVE;
  chrome.action.setIcon({ tabId, path: icons }).catch(() => {});
}

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs
    .get(tabId)
    .then((tab) => updateIcon(tabId, tab.url))
    .catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    updateIcon(tabId, tab.url);
  }
});

// Staff cache (in-memory, per service worker lifetime)
const staffCache = {};

async function fetchStaffFromApi(apiKey, apiBaseUrl) {
  const cached = staffCache[apiBaseUrl];
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    console.log('[Background] Staff cache hit for', apiBaseUrl);
    return cached.data;
  }

  const allStaff = [];
  let url = `${apiBaseUrl}staff/?limit=200`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Api-Key ${apiKey}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} — ${body || res.statusText}`);
    }
    const data = await res.json();
    if (data.results) {
      allStaff.push(...data.results);
    }
    url = data.next || null;
  }

  staffCache[apiBaseUrl] = { data: allStaff, ts: Date.now() };
  console.log(`[Background] Staff fetched: ${allStaff.length} records from ${apiBaseUrl}`);
  return allStaff;
}

async function updateTicketStatus(apiKey, apiBaseUrl, ticketId, headers) {
  const url = `${apiBaseUrl}tickets/${ticketId}/`;

  // Attempt 1: simple status update
  const form1 = new FormData();
  form1.append('estado', '1');
  console.log(`[Background] PUT #${ticketId} attempt 1 (standard subject)`);
  const res1 = await fetch(url, { method: 'PUT', headers, body: form1 });

  if (res1.ok) {
    console.log(`[Background] PUT #${ticketId} attempt 1 → OK`);
    return;
  }

  // Attempt 2: include custom subject to satisfy API validation
  console.log(`[Background] PUT #${ticketId} attempt 1 failed (${res1.status}), trying attempt 2`);
  const getRes = await fetch(url, { headers });
  if (!getRes.ok) {
    const body = await getRes.text().catch(() => '');
    throw new Error(`GET ${getRes.status}: ${body || getRes.statusText}`);
  }

  const ticket = await getRes.json();
  const form2 = new FormData();
  form2.append('estado', '1');
  form2.append('asuntos_default', 'Otro Asunto');
  form2.append('asunto', ticket.asunto);

  console.log(`[Background] PUT #${ticketId} attempt 2 (custom subject: "${ticket.asunto}")`);
  const res2 = await fetch(url, { method: 'PUT', headers, body: form2 });

  if (!res2.ok) {
    const body = await res2.text().catch(() => '');
    throw new Error(`PUT attempt 2 ${res2.status}: ${body || res2.statusText}`);
  }
  console.log(`[Background] PUT #${ticketId} attempt 2 → OK`);
}

async function updateTicketsToNew(apiKey, apiBaseUrl, ticketIds) {
  let success = 0;
  let failed = 0;
  const errors = [];
  const headers = { Authorization: `Api-Key ${apiKey}` };

  for (const id of ticketIds) {
    try {
      await updateTicketStatus(apiKey, apiBaseUrl, id, headers);
      success++;
    } catch (err) {
      console.warn(`[Background] Ticket #${id} update failed:`, err.message);
      failed++;
      errors.push({ id, error: err.message });
    }
  }

  return { success, failed, errors };
}

// Message router for content script / popup requests
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handlers = {
    FETCH_STAFF: () =>
      fetchStaffFromApi(message.apiKey, message.apiBaseUrl)
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) => sendResponse({ success: false, error: err.message })),

    UPDATE_TICKETS: () =>
      updateTicketsToNew(message.apiKey, message.apiBaseUrl, message.ticketIds)
        .then((results) => sendResponse({ success: true, results }))
        .catch((err) => sendResponse({ success: false, error: err.message })),
  };

  const handler = handlers[message.action];
  if (handler) {
    handler();
    return true;
  }
});
