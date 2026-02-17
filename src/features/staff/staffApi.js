import { browserAPI } from '../../utils/browser.js';

const STORAGE_KEY = 'wisphubYaaApiKeys'; // chrome.storage key for API keys per domain

export async function getAllApiKeys() {
  try {
    const result = await browserAPI.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || {};
  } catch (err) {
    console.warn('[StaffApi] Storage read failed:', err?.message);
    return {};
  }
}

export async function getApiKeyForDomain(domainKey) {
  const keys = await getAllApiKeys();
  return keys[domainKey] || '';
}

export async function saveAllApiKeys(keys) {
  await browserAPI.storage.local.set({ [STORAGE_KEY]: keys });
}

export async function fetchAllStaff(apiKey, apiBaseUrl) {
  if (!apiKey || !apiBaseUrl) {
    return [];
  }

  const response = await browserAPI.runtime.sendMessage({
    action: 'FETCH_STAFF',
    apiKey,
    apiBaseUrl,
  });

  if (response?.success) {
    return response.data;
  }
  throw new Error(response?.error || 'Staff fetch failed');
}
