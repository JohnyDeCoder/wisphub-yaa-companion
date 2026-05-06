import { TICKETS_EDITOR_PATH_RE } from "../../config/pagePatterns.js";
import { COPY_CONTROL_CLASS, EXTENSION_NAME } from "../../config/constants.js";
import { MESSAGE_TYPES, TICKETS_UI_MESSAGES } from "../../config/messages.js";
import { sendLogToPopup } from "../../utils/logger.js";
import { applyHostTooltip } from "../../utils/hostTooltip.js";
import { waitForElement } from "../../utils/polling.js";
import { copyToClipboard } from "../../utils/clipboard.js";
import { showCopySuccess } from "../../utils/copyFeedback.js";
import {
  getBridgeToken,
  isBridgeMessage,
  isMessageTokenValid,
  postBridgeMessage,
} from "../../utils/pageBridge.js";
import {
  normalizeText,
  findColumnIndex,
  getDataTableCellText,
  getJQueryDataTable,
  matchesKeywords,
} from "../../utils/tableHelpers.js";
import {
  buildClientMapUrlFromServiceSlug,
  extractServiceIdFromServiceSlug,
  getGoogleMapsDestination,
} from "../../utils/maps.js";

const CUSTOM_ACTION = "new_selected_wisphub";
const OPTION_LABEL = `Marcar Tickets Como Nuevos — ${EXTENSION_NAME}`;
const TICKETS_PATH_RE = /\/tickets\/\d*\/?$/;
const TABLE_SELECTOR = "#data-table-tickets";
const COPY_BUTTON_CLASS = "wisphub-yaa-ticket-copy-btn";
const COPY_BUTTON_VARIANT_CLASS = "wisphub-yaa-action-btn-copy-ticket";
const MAP_BUTTON_CLASS = "wisphub-yaa-ticket-map-btn";
const VIEW_CLIENT_LINK_CLASS = "wisphub-yaa-view-client-link";
const USER_KEYWORDS = ["usuario", "user"];
const ADDRESS_KEYWORDS = [
  "dirección",
  "direccion",
  "domicilio",
  "address",
  "ubicación",
  "ubicacion",
  "mapa",
  "maps",
];
const LOCALITY_KEYWORDS = [
  "barrio/localidad",
  "barrio",
  "localidad",
  "neighborhood",
];
const CLIENT_KEYWORDS = ["cliente", "client", "usuario", "user"];
const SUBJECT_KEYWORDS = ["asunto", "subject"];
const DESCRIPTION_KEYWORDS = ["descripción", "descripcion", "description"];
const MAINTENANCE_CLIENTS = [
  "mantenimiento publicas",
  "mantenimiento ap publicas",
];
const TICKET_UPDATE_TIMEOUT_MS = 120000;
let _copyObserver = null;
let _copyDebounceTimer = 0;
let _copyClickBound = false;

let _notify = () => () => {};

export function initTicketNotify(notifyFn) {
  _notify = notifyFn;
}

function log(consoleMsg, popupMsg, level = "info", details = {}) {
  sendLogToPopup("Tickets", level, consoleMsg, popupMsg, details);
}

function getSelectedTicketIds() {
  return Array.from(
    document.querySelectorAll("input.editor-active:checked"),
  ).map((cb) => cb.value);
}

function getCellTextBySelectors(row, selector) {
  if (!row) {
    return "";
  }
  return normalizeText(row.querySelector(selector)?.textContent || "");
}

function getDataTableRowIndex(row) {
  const dtResult = getJQueryDataTable(TABLE_SELECTOR);
  if (!dtResult) {
    return null;
  }
  const index = dtResult.dt.row(row).index();
  return Number.isFinite(index) ? index : null;
}

function getLocalityFromResponsiveContainer(container, keywords) {
  if (!container) {
    return "";
  }

  const searchKeywords = keywords || LOCALITY_KEYWORDS;
  const items = container.querySelectorAll("li");
  for (const item of items) {
    const title = item.querySelector(".dtr-title")?.textContent || "";
    if (!matchesKeywords(title, searchKeywords)) {
      continue;
    }

    const value = normalizeText(
      item.querySelector(".dtr-data")?.textContent || "",
    );
    if (value) {
      return value;
    }
  }

  return "";
}

// Search responsive child rows / detached <li> nodes for a value matching given keywords.
function getValueFromResponsiveRows(row, rowIndex, keywords) {
  // DataTables responsive mode may move columns into child rows or detached <li> nodes.
  const nextRow = row?.nextElementSibling;
  if (nextRow?.classList.contains("child")) {
    const nextValue = getLocalityFromResponsiveContainer(nextRow, keywords);
    if (nextValue) {
      return nextValue;
    }
  }

  if (rowIndex === null || rowIndex === undefined) {
    return "";
  }

  const candidates = document.querySelectorAll(`li[data-dt-row="${rowIndex}"]`);
  for (const item of candidates) {
    const title = item.querySelector(".dtr-title")?.textContent || "";
    if (!matchesKeywords(title, keywords)) {
      continue;
    }

    const value = normalizeText(
      item.querySelector(".dtr-data")?.textContent || "",
    );
    if (value) {
      return value;
    }
  }

  return "";
}

function trimIssueText(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "";
  }

  const [base] = normalized.split(/\s*-\s*/, 2);
  return normalizeText(base || normalized);
}

function buildTicketCopyText(row, table) {
  if (!row || !table) {
    log("buildTicketCopyText: missing row or table reference", undefined, "warn");
    return "";
  }

  const localityCol = findColumnIndex(table, LOCALITY_KEYWORDS, [], "Tickets");
  const clientCol = findColumnIndex(
    table,
    CLIENT_KEYWORDS,
    [localityCol],
    "Tickets",
  );
  const subjectCol = findColumnIndex(
    table,
    SUBJECT_KEYWORDS,
    [localityCol, clientCol],
    "Tickets",
  );
  const rowIndex = getDataTableRowIndex(row);

  log(
    `Column indices → locality: ${localityCol} | client: ${clientCol} | subject: ${subjectCol} | rowIndex: ${rowIndex}`,
  );

  // Priority: 1) DataTables API (logical index, always correct)
  //           2) CSS class selectors on <td>
  //           3) Responsive child rows / detached <li>
  // NOTE: getCellTextByIndex (DOM-based) is NOT used because hidden columns
  // shift DOM <td> indices and would return wrong data.
  const locality =
    getDataTableCellText(TABLE_SELECTOR, row, localityCol, "Tickets") ||
    getCellTextBySelectors(
      row,
      'td.localidad, td.barrio, td[class*="localidad"], td[class*="barrio"]',
    ) ||
    getValueFromResponsiveRows(row, rowIndex, LOCALITY_KEYWORDS);

  const client =
    getDataTableCellText(TABLE_SELECTOR, row, clientCol, "Tickets") ||
    getCellTextBySelectors(
      row,
      'td.cliente, td.usuario, td[class*="cliente"], td[class*="usuario"]',
    ) ||
    getValueFromResponsiveRows(row, rowIndex, CLIENT_KEYWORDS);

  const issueRaw =
    getDataTableCellText(TABLE_SELECTOR, row, subjectCol, "Tickets") ||
    getCellTextBySelectors(row, 'td.asunto, td[class*="asunto"]') ||
    getValueFromResponsiveRows(row, rowIndex, SUBJECT_KEYWORDS);
  const issue = trimIssueText(issueRaw);

  const logMsg = `Extracted → locality: ${JSON.stringify(locality)} | ` +
    `client: ${JSON.stringify(client)} | issue: ${JSON.stringify(issue)}`;
  log(logMsg);

  // Require at least client and issue; locality is optional
  if (!client || !issue) {
    const missing = [];
    if (!locality) {
      missing.push("barrio/localidad");
    }
    if (!client) {
      missing.push("cliente/usuario");
    }
    if (!issue) {
      missing.push("asunto");
    }
    log(
      `Cannot build ticket text — missing: ${missing.join(", ")}`,
      `No se pudo construir el texto — faltan: ${missing.join(", ")}`,
      "warning",
    );
    return "";
  }

  // Special handling for Mantenimiento clients
  const isMaintenanceClient = MAINTENANCE_CLIENTS.some((mc) =>
    client.toLowerCase().includes(mc),
  );
  if (isMaintenanceClient) {
    const descCol = findColumnIndex(
      table,
      DESCRIPTION_KEYWORDS,
      [localityCol, clientCol, subjectCol],
      "Tickets",
    );
    let descFirstLine = "";
    const descRaw =
      getDataTableCellText(TABLE_SELECTOR, row, descCol, "Tickets") ||
      getCellTextBySelectors(row, 'td.descripcion, td[class*="descripcion"]') ||
      getValueFromResponsiveRows(row, rowIndex, DESCRIPTION_KEYWORDS);
    if (descRaw) {
      const lines = descRaw
        .split(/\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      descFirstLine = lines[0] || "";
    }
    log(
      `Maintenance client detected, first desc line: ${JSON.stringify(descFirstLine)}`,
    );
    return [client, descFirstLine, issue].filter(Boolean).join(" - ");
  }

  if (!locality) {
    log("Locality is empty, building text without it");
  }

  return [locality, client, issue].filter(Boolean).join(" - ");
}

function createCopyActionButton() {
  const button = document.createElement("a");
  button.href = "#";
  button.className = [
    "wisphub-yaa-action-btn",
    COPY_BUTTON_VARIANT_CLASS,
    COPY_BUTTON_CLASS,
    COPY_CONTROL_CLASS,
  ].join(" ");
  button.setAttribute("role", "button");
  button.setAttribute("aria-label", "Copiar localidad, cliente y asunto");
  applyHostTooltip(button, "Copiar localidad, cliente y asunto", {
    placement: "top",
  });
  return button;
}

function createMapActionButton(mapUrl) {
  const button = document.createElement("a");
  button.href = mapUrl;
  button.className = `wisphub-yaa-action-btn wisphub-yaa-action-btn-map ${MAP_BUTTON_CLASS}`;
  button.setAttribute("role", "button");
  button.setAttribute("aria-label", "Ver ubicación en Google Maps");
  applyHostTooltip(button, "Ver ubicación en Google Maps", {
    placement: "top",
  });
  button.addEventListener("click", (event) => event.stopImmediatePropagation());
  return button;
}

function extractUsernameFromRow(row) {
  const userCell = row.querySelector("td.usuario");
  if (userCell) {
    const username = normalizeText(userCell.textContent);
    if (username) {
      return username;
    }
  }

  const rowIndex = getDataTableRowIndex(row);
  const responsiveUsername = getValueFromResponsiveRows(
    row,
    rowIndex,
    USER_KEYWORDS,
  );
  if (responsiveUsername) {
    return responsiveUsername;
  }

  const printLink = row.querySelector("a[href*='/tickets/imprimir/']");
  if (printLink) {
    const segments = printLink.getAttribute("href").split("/").filter(Boolean);
    const printIndex = segments.indexOf("imprimir");
    if (printIndex >= 0 && segments[printIndex + 1]) {
      return segments[printIndex + 1];
    }
  }

  return "";
}

function extractServiceIdFromUsername(username) {
  return extractServiceIdFromServiceSlug(normalizeText(username));
}

function buildClientMapUrlFromUsername(username) {
  const normalized = normalizeText(username);
  const serviceId = extractServiceIdFromUsername(normalized);
  if (!normalized || !serviceId) {
    return "";
  }
  return buildClientMapUrlFromServiceSlug(normalized);
}

function resolveTicketMapUrl(row, table) {
  if (!row || !table) {
    return "";
  }

  const rowIndex = getDataTableRowIndex(row);
  const addressCol = findColumnIndex(table, ADDRESS_KEYWORDS, [], "Tickets");
  const descriptionCol = findColumnIndex(
    table,
    DESCRIPTION_KEYWORDS,
    [addressCol].filter((idx) => idx !== -1),
    "Tickets",
  );

  const addressText =
    getDataTableCellText(TABLE_SELECTOR, row, addressCol, "Tickets") ||
    getCellTextBySelectors(
      row,
      'td.cliente__perfilusuario__direccion, td.direccion, td[class*="direccion"], td[class*="dirección"]',
    ) ||
    getValueFromResponsiveRows(row, rowIndex, ADDRESS_KEYWORDS);
  const fromAddress = getGoogleMapsDestination(addressText);
  if (fromAddress) {
    return fromAddress;
  }

  const descriptionText =
    getDataTableCellText(TABLE_SELECTOR, row, descriptionCol, "Tickets") ||
    getCellTextBySelectors(row, 'td.descripcion, td[class*="descripcion"]') ||
    getValueFromResponsiveRows(row, rowIndex, DESCRIPTION_KEYWORDS);
  const fromDescription = getGoogleMapsDestination(descriptionText);
  if (fromDescription) {
    return fromDescription;
  }

  const username = extractUsernameFromRow(row);
  return buildClientMapUrlFromUsername(username);
}

function buildClientViewUrl(username) {
  if (!username) {
    return "";
  }
  return `/clientes/ver/${username}/`;
}

function createClientViewLink(clientUrl) {
  const link = document.createElement("a");
  link.href = clientUrl;
  link.target = "_blank";
  link.rel = "noopener";
  link.className = VIEW_CLIENT_LINK_CLASS;
  link.setAttribute("aria-label", "Ver información del cliente");
  applyHostTooltip(link, "Ver información del cliente", { placement: "top" });
  return link;
}

function findClientCellInRow(row) {
  const directCell = row.querySelector("td.cliente");
  if (directCell) {
    return directCell;
  }

  const clientColIndex = findColumnIndex(
    document.querySelector(TABLE_SELECTOR),
    ["cliente", "client"],
    ["ticket"],
    "ViewClient",
  );
  if (clientColIndex < 0) {
    return null;
  }

  const cells = row.querySelectorAll("td");
  return cells[clientColIndex] || null;
}

function injectClientViewLinks() {
  const table = document.querySelector(TABLE_SELECTOR);
  if (!table) {
    return 0;
  }

  let injected = 0;
  const rows = table.querySelectorAll("tbody tr:not(.child)");

  rows.forEach((row) => {
    // Inject into the hidden td.cliente cell
    if (!row.querySelector(`.${VIEW_CLIENT_LINK_CLASS}`)) {
      const clientCell = findClientCellInRow(row);
      if (clientCell) {
        const username = extractUsernameFromRow(row);
        const clientUrl = buildClientViewUrl(username);
        if (clientUrl) {
          clientCell.appendChild(createClientViewLink(clientUrl));
          injected++;
        }
      }
    }

    // Inject into the responsive child row if it exists
    const childRow = row.nextElementSibling;
    if (!childRow || !childRow.classList.contains("child")) {
      return;
    }
    if (childRow.querySelector(`.${VIEW_CLIENT_LINK_CLASS}`)) {
      return;
    }

    // Find the "Cliente" data span in the child row
    const items = childRow.querySelectorAll(".dtr-details li");
    for (const li of items) {
      const title = li.querySelector(".dtr-title");
      if (!title || !/^cliente$/i.test(title.textContent.trim())) {
        continue;
      }
      const dataSpan = li.querySelector(".dtr-data");
      if (!dataSpan || dataSpan.querySelector(`.${VIEW_CLIENT_LINK_CLASS}`)) {
        break;
      }
      const username = extractUsernameFromRow(row);
      const clientUrl = buildClientViewUrl(username);
      if (clientUrl) {
        dataSpan.appendChild(document.createTextNode(" "));
        dataSpan.appendChild(createClientViewLink(clientUrl));
        injected++;
      }
      break;
    }
  });

  return injected;
}

function injectTicketCopyButtons() {
  const table = document.querySelector(TABLE_SELECTOR);
  if (!table) {
    return { copyCount: 0, mapCount: 0 };
  }

  let copyCount = 0;
  let mapCount = 0;
  const actionCells = table.querySelectorAll(
    "tbody tr:not(.child) td.accion, tbody tr:not(.child) td.acciones",
  );

  actionCells.forEach((cell) => {
    const row = cell.closest("tr");
    if (!row) {
      return;
    }

    if (cell.querySelector(`.${COPY_BUTTON_CLASS}`)) {
      // Continue: map button may still be missing.
    } else {
      cell.append(" ", createCopyActionButton());
      copyCount++;
    }

    if (cell.querySelector(`.${MAP_BUTTON_CLASS}`)) {
      return;
    }

    const mapUrl = resolveTicketMapUrl(row, table);
    if (!mapUrl) {
      return;
    }

    const mapButton = createMapActionButton(mapUrl);
    const copyButton = cell.querySelector(`.${COPY_BUTTON_CLASS}`);
    if (copyButton) {
      copyButton.after(" ", mapButton);
    } else {
      cell.append(" ", mapButton);
    }
    mapCount++;
  });

  return { copyCount, mapCount };
}

function scheduleTicketButtonsInjection() {
  clearTimeout(_copyDebounceTimer);
  _copyDebounceTimer = setTimeout(() => {
    injectTicketCopyButtons();
    injectClientViewLinks();
  }, 120);
}

function bindTicketCopyClickHandler(table) {
  if (!table || _copyClickBound) {
    return;
  }

  table.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest(`.${COPY_BUTTON_CLASS}`);
      if (!button) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const row = button.closest("tr");
      const payload = buildTicketCopyText(row, table);
      if (!payload) {
        _notify(TICKETS_UI_MESSAGES.COPY_TEXT_BUILD_FAILED, "warning", 3000);
        return;
      }

      copyToClipboard(payload).then((ok) => {
        if (ok) {
          showCopySuccess(button);
          log(`Ticket text copied: ${payload}`, `Texto copiado: ${payload}`);
          return;
        }
        _notify(TICKETS_UI_MESSAGES.COPY_TEXT_FAILED, "error", 4000);
      });
    },
    true,
  );

  _copyClickBound = true;
}

function startTicketButtonsObserver(table) {
  if (!table || _copyObserver) {
    return;
  }

  _copyObserver = new MutationObserver(() => {
    scheduleTicketButtonsInjection();
  });

  _copyObserver.observe(table, { childList: true, subtree: true });
}

function initTicketActionButtons() {
  waitForElement(TABLE_SELECTOR).then((table) => {
    if (!table) {
      return;
    }

    const { copyCount, mapCount } = injectTicketCopyButtons();
    if (copyCount > 0) {
      log(`Copy button added to ${copyCount} ticket(s)`);
    }
    if (mapCount > 0) {
      log(`Map button added to ${mapCount} ticket(s)`);
    }

    const linkCount = injectClientViewLinks();
    if (linkCount > 0) {
      log(`Client view link added to ${linkCount} ticket(s)`);
    }

    bindTicketCopyClickHandler(table);
    startTicketButtonsObserver(table);
  });
}

function injectOption(select) {
  if (select.querySelector(`option[value="${CUSTOM_ACTION}"]`)) {
    return;
  }
  const option = document.createElement("option");
  option.value = CUSTOM_ACTION;
  option.textContent = OPTION_LABEL;
  select.insertBefore(option, select.options[1] || null);
}

function interceptSubmit() {
  const btn = document.querySelector('button[name="form-acciones"]');
  if (!btn) {
    return;
  }
  btn.addEventListener(
    "click",
    (e) => {
      const select = document.getElementById("id_accion_select");
      if (select?.value === CUSTOM_ACTION) {
        e.preventDefault();
        e.stopImmediatePropagation();
        handleMarkAsNew();
      }
    },
    true,
  );
}

function handleMarkAsNew() {
  const ticketIds = getSelectedTicketIds();
  const bridgeToken = getBridgeToken();

  if (ticketIds.length === 0) {
    _notify(TICKETS_UI_MESSAGES.SELECT_AT_LEAST_ONE, "warning");
    return;
  }
  if (!bridgeToken) {
    _notify(TICKETS_UI_MESSAGES.CHANNEL_NOT_READY, "warning");
    return;
  }

  if (!confirm(TICKETS_UI_MESSAGES.CONFIRM_MARK_AS_NEW(ticketIds.length))) {
    return;
  }

  log(
    `Marking ${ticketIds.length} ticket(s) as New...`,
    `Marcando ${ticketIds.length} ticket(s) como Nuevos...`,
  );
  log(`Selected IDs: ${ticketIds.join(", ")}`);

  const dismissLoading = _notify(
    TICKETS_UI_MESSAGES.PROCESSING(ticketIds.length),
    "loading",
    120000,
  );
  let timeoutId = 0;

  const cleanup = () => {
    window.removeEventListener("message", handler);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = 0;
    }
    if (typeof dismissLoading === "function") {
      dismissLoading();
    }
  };

  const handler = (event) => {
    if (event.source !== window) {
      return;
    }

    const data = event.data || {};
    if (!isBridgeMessage(data)) {
      return;
    }
    if (
      data.type !== MESSAGE_TYPES.UPDATE_TICKETS_RESPONSE ||
      !isMessageTokenValid(data, bridgeToken)
    ) {
      return;
    }

    cleanup();
    processResults(data.results, ticketIds);
  };

  window.addEventListener("message", handler);
  timeoutId = window.setTimeout(() => {
    cleanup();
    _notify(TICKETS_UI_MESSAGES.UPDATE_TIMEOUT, "error", 7000);
    log(
      "Ticket mass update timed out waiting for response",
      "Tiempo de espera agotado en actualización masiva de tickets",
      "error",
    );
  }, TICKET_UPDATE_TIMEOUT_MS);

  const posted = postBridgeMessage(
    MESSAGE_TYPES.UPDATE_TICKETS_REQUEST,
    { ticketIds },
    { requireToken: true },
  );

  if (!posted) {
    cleanup();
    _notify(TICKETS_UI_MESSAGES.UPDATE_SEND_FAILED, "error");
  }
}

function processResults(results, ticketIds) {
  if (!results) {
    _notify(TICKETS_UI_MESSAGES.NO_SERVER_RESPONSE, "error");
    log("No server response", "Sin respuesta del servidor", "error");
    return;
  }

  const { success, failed, errors } = results;
  log(`API result: ${JSON.stringify(results)}`);

  if (failed === 0) {
    _notify(TICKETS_UI_MESSAGES.SUCCESS_MARKED(success), "success", 5000);
    log(
      `${success} of ${ticketIds.length} ticket(s) marked as New`,
      `${success} de ${ticketIds.length} ticket(s) marcados como Nuevos`,
      "success",
      {
        kind: "audit",
        action: "Marcados como Nuevos",
        pagePath: window.location.pathname,
        pageUrl: window.location.href,
        stateColor: "success",
      },
    );
  } else if (success > 0) {
    _notify(TICKETS_UI_MESSAGES.PARTIAL_SUCCESS(success, failed), "warning", 7000);
    log(
      `${success} succeeded, ${failed} failed`,
      `${success} exitosos, ${failed} con error`,
      "warning",
    );
  } else {
    _notify(TICKETS_UI_MESSAGES.TOTAL_FAILURE(failed), "error", 7000);
    log(
      `${failed} ticket(s) failed to update`,
      `${failed} ticket(s) fallaron al actualizar`,
      "error",
    );
  }

  if (errors?.length) {
    errors.forEach((err) =>
      log(
        `Ticket #${err.id}: ${err.error}`,
        `Ticket #${err.id}: ${err.error}`,
        "error",
      ),
    );
  }

  if (success > 0) {
    const successfulIds = resolveSuccessfulTicketIds(ticketIds, results);
    if (successfulIds.length > 0) {
      removeTicketRows(successfulIds);
    }
  }
}

function resolveSuccessfulTicketIds(requestedIds, results) {
  const requested = (requestedIds || []).map((id) => String(id));
  if (requested.length === 0) {
    return [];
  }

  const updatedIds = Array.isArray(results?.updatedIds)
    ? results.updatedIds.map((id) => String(id))
    : [];
  if (updatedIds.length > 0) {
    const requestedSet = new Set(requested);
    return updatedIds.filter((id) => requestedSet.has(id));
  }

  const failedSet = new Set(
    (results?.errors || [])
      .map((entry) => String(entry?.id || ""))
      .filter((id) => id && id !== "all"),
  );

  return requested.filter((id) => !failedSet.has(id));
}

function removeTicketRows(successfulIds) {
  try {
    const dtResult = getJQueryDataTable(TABLE_SELECTOR);

    successfulIds.forEach((id) => {
      const cb = document.querySelector(`input.editor-active[value="${id}"]`);
      const tr = cb?.closest("tr");
      if (!tr) {
        return;
      }
      if (dtResult) {
        dtResult.dt.row(tr).remove();
      } else {
        tr.remove();
      }
    });

    if (dtResult) {
      dtResult.dt.draw(false);
    }

    const select = document.getElementById("id_accion_select");
    if (select) {
      select.selectedIndex = 0;
    }

    log(
      `${successfulIds.length} row(s) removed from table`,
      `${successfulIds.length} fila(s) eliminadas de la tabla`,
    );
  } catch (err) {
    log(`Row removal failed: ${err?.message || err}`, undefined, "error");
    window.location.reload();
  }
}

export function initTicketActions() {
  if (!TICKETS_PATH_RE.test(window.location.pathname)) {
    return;
  }

  log("Tickets page detected");
  log("Tickets module loaded");
  initTicketActionButtons();

  waitForElement("#id_accion_select").then((select) => {
    if (!select) {
      return;
    }
    injectOption(select);
    interceptSubmit();
    log('"Mark as New" option added');
  });
}

export function initTicketEditorActions() {
  if (!TICKETS_EDITOR_PATH_RE.test(window.location.pathname)) {
    return;
  }

  const form = document.querySelector("form");
  if (!form) {
    return;
  }

  form.addEventListener("submit", () => {
    sendLogToPopup(
      "Tickets",
      "success",
      "Ticket form submitted",
      "Ticket guardado",
      {
        kind: "audit",
        action: "Ticket guardado",
        pagePath: window.location.pathname,
        pageUrl: window.location.href,
        stateColor: "info",
      },
    );
  });
}

export const __testables__ = {
  buildClientMapUrlFromUsername,
  resolveTicketMapUrl,
  injectTicketCopyButtons,
};
