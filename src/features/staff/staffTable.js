import { EXTENSION_NAME } from "../../config/constants.js";
import { getDomainKey, getApiBaseUrl } from "../../config/domains.js";
import { getApiKeyForDomain, fetchAllStaff } from "./staffApi.js";
import { loadCachedStaffIds, saveStaffIdsToCache } from "./staffCache.js";

const COL_CLASS = "wisphub-id-col";
const CELL_CLASS = "wisphub-id-cell";

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
    console.log(
      `[${EXTENSION_NAME}] Staff IDs loaded from cache (${cached.size} entries)`,
    );
    return cached;
  }

  const apiKey = await getApiKeyForDomain(domainKey);
  if (!apiKey) {
    console.log(`[${EXTENSION_NAME}] No API key for ${domainKey}`);
    return null;
  }

  const allStaff = await fetchAllStaff(apiKey, getApiBaseUrl(domainKey));
  const usernameToId = new Map();
  allStaff.forEach((s) => usernameToId.set(s.username, s.id));

  await saveStaffIdsToCache(domainKey, usernameToId);
  console.log(
    `[${EXTENSION_NAME}] Staff IDs fetched and cached (${allStaff.length} entries)`,
  );
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

    console.log(
      `[${EXTENSION_NAME}] Staff IDs ready (${usernameToId.size} loaded)`,
    );
  } catch (e) {
    console.error(`[${EXTENSION_NAME}] Staff ID injection failed:`, e);
  }
}
