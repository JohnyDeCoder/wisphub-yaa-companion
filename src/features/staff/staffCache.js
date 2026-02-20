import { browserAPI } from "../../utils/browser.js";
import { CACHE_TTL } from "../../config/constants.js";

const STORAGE_KEY = "wisphubStaffIdCache";

export async function loadCachedStaffIds(domainKey) {
  try {
    const result = await browserAPI.storage.local.get(STORAGE_KEY);
    const entry = (result[STORAGE_KEY] || {})[domainKey];
    if (!entry) {
      return null;
    }

    const isExpired = Date.now() - entry.ts > CACHE_TTL;
    if (isExpired) {
      return null;
    }

    return new Map(entry.ids);
  } catch {
    return null;
  }
}

export async function saveStaffIdsToCache(domainKey, usernameToId) {
  try {
    const result = await browserAPI.storage.local.get(STORAGE_KEY);
    const cache = result[STORAGE_KEY] || {};
    cache[domainKey] = {
      ids: Array.from(usernameToId.entries()),
      ts: Date.now(),
    };
    await browserAPI.storage.local.set({ [STORAGE_KEY]: cache });
  } catch {
    // Cache write failed silently
  }
}
