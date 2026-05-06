import { getDomainKey, getApiBaseUrl } from "../../config/domains.js";
import { getApiKeyForDomain, fetchAllStaff } from "./staffApi.js";
import { loadCachedStaffIds, saveStaffIdsToCache } from "./staffCache.js";
import { sendLogToPopup } from "../../utils/logger.js";

const COL_CLASS = "wisphub-id-col";
const CELL_CLASS = "wisphub-id-cell";

function log(consoleMsg, popupMsg, level = "info") {
  sendLogToPopup("Staff", level, consoleMsg, popupMsg);
}

function addHeaderCells(table) {
  table.querySelectorAll("thead tr").forEach((row, i) => {
    if (row.querySelector(`.${COL_CLASS}`)) {
      return;
    }
    const th = document.createElement("th");
    th.classList.add(COL_CLASS);
    if (i === 0) {
      th.textContent = "ID";
    }
    row.insertBefore(th, row.firstChild);
  });
  table.querySelectorAll("tfoot tr").forEach((row) => {
    if (row.querySelector(`.${COL_CLASS}`)) {
      return;
    }
    const th = document.createElement("th");
    th.classList.add(COL_CLASS);
    row.insertBefore(th, row.firstChild);
  });
}

function injectRowIds(table, usernameToId) {
  table.querySelectorAll("tbody tr").forEach((row) => {
    if (row.querySelector(`.${CELL_CLASS}`)) {
      return;
    }
    const cells = row.querySelectorAll(`td:not(.${CELL_CLASS})`);
    let foundId = null;
    for (const cell of cells) {
      const text = cell.textContent?.trim();
      if (text && usernameToId.has(text)) {
        foundId = usernameToId.get(text);
        break;
      }
    }
    const td = document.createElement("td");
    td.classList.add(CELL_CLASS);
    td.textContent = foundId ?? "—";
    td.style.fontWeight = "600";
    td.style.textAlign = "center";
    row.insertBefore(td, row.firstChild);
  });
}

async function resolveStaffIds(domainKey) {
  const cached = await loadCachedStaffIds(domainKey);
  if (cached) {
    log(`Staff IDs loaded from cache (${cached.size} entries)`);
    return cached;
  }

  const apiKey = await getApiKeyForDomain(domainKey);
  if (!apiKey) {
    log(`No API key for ${domainKey}`);
    return null;
  }

  const allStaff = await fetchAllStaff(apiKey, getApiBaseUrl(domainKey));
  const usernameToId = new Map();
  allStaff.forEach((s) => usernameToId.set(s.username, s.id));

  await saveStaffIdsToCache(domainKey, usernameToId);
  log(`Staff IDs fetched and cached (${allStaff.length} entries)`);
  return usernameToId;
}

export async function injectStaffIds() {
  if (!/^\/staff\/?$/.test(window.location.pathname)) {
    return;
  }

  const table = document.querySelector("table");
  if (!table) {
    return;
  }

  const domainKey = getDomainKey(window.location.hostname);
  if (!domainKey) {
    return;
  }

  try {
    const usernameToId = await resolveStaffIds(domainKey);
    if (!usernameToId) {
      return;
    }

    addHeaderCells(table);
    injectRowIds(table, usernameToId);

    const tbody = table.querySelector("tbody");
    if (tbody) {
      new MutationObserver(() => injectRowIds(table, usernameToId)).observe(
        tbody,
        {
          childList: true,
        },
      );
    }

    log(`Staff IDs ready (${usernameToId.size} loaded)`);
  } catch (e) {
    log(`Staff ID injection failed: ${e?.message || e}`, undefined, "error");
  }
}
