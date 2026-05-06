import { API_KEYS_STORAGE_KEY } from "../../config/constants.js";
import { ACTIONS } from "../../config/messages.js";
import { browserAPI } from "../../utils/browser.js";

export async function getAllApiKeys() {
  try {
    const result = await browserAPI.storage.local.get(API_KEYS_STORAGE_KEY);
    return result[API_KEYS_STORAGE_KEY] || {};
  } catch {
    return {};
  }
}

export async function getApiKeyForDomain(domainKey) {
  const keys = await getAllApiKeys();
  return keys[domainKey] || "";
}

export async function saveAllApiKeys(keys) {
  await browserAPI.storage.local.set({ [API_KEYS_STORAGE_KEY]: keys });
}

export async function fetchAllStaff(apiKey, apiBaseUrl) {
  if (!apiKey || !apiBaseUrl) {
    return [];
  }

  const response = await browserAPI.runtime.sendMessage({
    action: ACTIONS.FETCH_STAFF,
    apiKey,
    apiBaseUrl,
  });

  if (response?.success) {
    return response.data;
  }
  throw new Error(response?.error || "Staff fetch failed");
}
