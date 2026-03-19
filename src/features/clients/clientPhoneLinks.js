import { COPY_CONTROL_CLASS } from "../../config/constants.js";
import { sendLogToPopup } from "../../utils/logger.js";
import { applyHostTooltip } from "../../utils/hostTooltip.js";
import { copyToClipboard } from "../../utils/clipboard.js";
import { showCopySuccess } from "../../utils/copyFeedback.js";
import { addOrUpdateClientActionButtons } from "./clientActionButtons.js";
import {
  findColumnIndex,
  getDataTableCellText,
  normalizeText,
} from "../../utils/tableHelpers.js";
import {
  formatProvisioningName,
  loadNameCopySettings,
  normalizeClientName,
  resolveNameCopySettingsFromInputs,
  saveNameCopySettings,
} from "../../utils/clientNameProvisioning.js";
import {
  buildClientMapUrlFromServiceSlug,
  extractServiceIdFromServiceSlug,
  extractCoordinatesFromText,
  extractMapUrlFromText,
  getGoogleMapsDestination,
} from "../../utils/maps.js";
import {
  CLIENT_TEMPLATE_PLACEHOLDERS,
  CLIENT_TEMPLATE_TARGET_LABELS,
  buildMissingValuePlaceholder,
  extractCommentLines,
  extractEquipmentLineFromCommentLines,
  extractStageFromCommentLines,
} from "../../utils/clientProvisioningTemplate.js";
import { CLIENTS_UI_MESSAGES } from "../../config/messages.js";

const PROCESSED_PHONE = "data-wisphub-wa";
const PROCESSED_ACTIONS = "data-wisphub-actions";
const PROCESSED_COORDINATES = "data-wisphub-map";
const PROCESSED_CLIENT_NAME = "data-wisphub-client-name";
const MAP_ACTION_BOUND = "data-wisphub-map-bound";
const COUNTRY_CODE = "52";
const PHONE_RE = /^\+?\d[\d\s\-().]{6,}$/;
const IP_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const CLIENT_TEMPLATE_COPY_BUTTON_CLASS =
  "wisphub-yaa-client-template-copy-btn";
const CLIENT_TEMPLATE_COPY_VARIANT_CLASS =
  "wisphub-yaa-action-btn-copy-client-template";
const CLIENT_NAME_COPY_LINK_CLASS = "wisphub-yaa-client-name-copy-link";
const CLIENT_NAME_TEXT_HOST_CLASS = "wisphub-yaa-client-name-text-host";
const NAME_COPY_SETTINGS_KEY = "wisphub-yaa-client-name-copy-settings";
const CLIENT_NAME_KEYWORDS = ["nombre", "name", "cliente", "client"];
const CLIENT_SERVICE_KEYWORDS = ["servicio", "service", "id servicio"];
const CLIENT_SERVICE_PASSWORD_KEYWORDS = [
  "password hotspot",
  "password servicio",
  "password pppoe",
  "password",
  "contraseña hotspot",
  "contrasena hotspot",
];
const CLIENT_ROUTER_KEYWORDS = ["router"];
const CLIENT_LOCALITY_KEYWORDS = [
  "barrio/localidad",
  "localidad",
  "barrio",
  "colonia",
];
const CLIENT_IP_KEYWORDS = ["ip"];
const CLIENT_STATUS_KEYWORDS = ["estado", "status"];
const CLIENT_PLAN_KEYWORDS = ["plan internet", "plan", "paquete"];

const PHONE_KEYWORDS = [
  "telefono",
  "teléfono",
  "celular",
  "phone",
  "tel",
  "móvil",
  "movil",
];
const COORDINATE_KEYWORDS = [
  "coordenadas",
  "coordenada",
  "ubicación",
  "ubicacion",
  "gps",
  "latitud",
  "longitud",
];
const ADDRESS_KEYWORDS = [
  "direccion",
  "dirección",
  "domicilio",
  "ubicación",
  "ubicacion",
  "mapa",
  "maps",
];
const COMMENT_KEYWORDS = ["comentarios", "comentario", "comments", "comment"];
const MAP_DETAIL_KEYWORDS = [
  ...COORDINATE_KEYWORDS,
  ...ADDRESS_KEYWORDS,
  ...COMMENT_KEYWORDS,
];
const ACTION_KEYWORDS = ["acción", "accion", "acciones", "action"];
const SLUG_RE = /\/(?:cliente|clientes\/ver|facturas\/generar)\/([^/]+)/;
const INSTALLATION_LIST_PATH_RE = /^\/Instalaciones\/?$/i;
const PREINSTALLATION_LIST_PATH_RE = /^\/preinstalaciones\/?$/i;
const CLIENT_LIST_PATH_RE = /\/clientes(\/|$)/i;
const CLIENT_EXCLUDED_PATH_RE = /\/clientes\/(ver|editar|agregar|nuevo)\//i;
const CLIENT_MAP_DETAIL_KEYWORDS = [
  ...COORDINATE_KEYWORDS,
  ...ADDRESS_KEYWORDS,
];

let _notify = null;
let _debounceTimer = null;

function log(consoleMsg, popupMsg, level = "info") {
  sendLogToPopup("Clients", level, consoleMsg, popupMsg);
}

function cleanPhoneNumber(raw) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) {
    return null;
  }
  if (digits.length >= 12 && digits.startsWith(COUNTRY_CODE)) {
    return digits;
  }
  if (digits.length === 10) {
    return COUNTRY_CODE + digits;
  }
  return digits;
}

function looksLikeIP(text) {
  return IP_RE.test(text.trim());
}

function matchesKeywords(text, keywords) {
  const lower = normalizeText(text).toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function findDomColumnIndex(table, keywords, excludeIndices = []) {
  if (!table) {
    return -1;
  }

  const headers = Array.from(table.querySelectorAll("thead th")).map((th) =>
    normalizeText(th.textContent).toLowerCase(),
  );

  for (const kw of keywords) {
    const idx = headers.indexOf(kw);
    if (idx !== -1 && !excludeIndices.includes(idx)) {
      return idx;
    }
  }

  for (const kw of keywords) {
    for (let i = 0; i < headers.length; i++) {
      if (!excludeIndices.includes(i) && headers[i].includes(kw)) {
        return i;
      }
    }
  }

  return -1;
}

function createWaLink(phoneText, cleaned) {
  const link = document.createElement("a");
  link.href = `https://wa.me/${cleaned}`;
  link.target = "_blank";
  link.rel = "noopener";
  link.className = "wisphub-yaa-wa-link";
  applyHostTooltip(link, "Enviar mensaje por WhatsApp (Ctrl+Click = Copiar)", {
    placement: "top",
  });

  link.textContent = phoneText;

  link.addEventListener("click", (e) => {
    e.stopImmediatePropagation();
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      copyToClipboard(phoneText).then((ok) => {
        if (ok && _notify) {
          _notify(`Teléfono copiado: ${phoneText}`, "success", 2000);
          log(`Phone copied: ${phoneText}`, `Teléfono copiado: ${phoneText}`);
        }
      });
    }
  });

  return link;
}

function processPhoneElement(el) {
  if (el.hasAttribute(PROCESSED_PHONE)) {
    return false;
  }
  el.setAttribute(PROCESSED_PHONE, "1");

  const rawText = normalizeText(el.textContent);
  if (!rawText) {
    return false;
  }

  const parts = rawText
    .split(/[,;/]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const validPhones = [];
  for (const part of parts) {
    if (looksLikeIP(part)) {
      continue;
    }
    if (PHONE_RE.test(part)) {
      const cleaned = cleanPhoneNumber(part);
      if (cleaned) {
        validPhones.push({ raw: part, cleaned });
      }
    }
  }

  if (validPhones.length === 0) {
    return false;
  }

  el.textContent = "";

  validPhones.forEach((phone, idx) => {
    if (idx > 0) {
      const sep = document.createElement("span");
      sep.className = "wisphub-yaa-wa-separator";
      sep.textContent = "|";
      el.appendChild(sep);
    }
    el.appendChild(createWaLink(phone.raw, phone.cleaned));
  });

  return true;
}

function createMapLink(text, mapUrl) {
  const link = document.createElement("a");
  link.href = mapUrl;
  link.target = "_blank";
  link.rel = "noopener";
  link.className = "wisphub-yaa-wa-link wisphub-yaa-map-link";
  applyHostTooltip(
    link,
    "Abrir ubicación en Google Maps (Ctrl+Click = Copiar)",
    {
      placement: "top",
    },
  );
  link.textContent = text;

  link.addEventListener("click", (e) => {
    e.stopImmediatePropagation();
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      copyToClipboard(text).then((ok) => {
        if (ok && _notify) {
          _notify(`Coordenadas copiadas: ${text}`, "success", 2000);
        }
      });
    }
  });

  return link;
}

function createMapIconLink(mapUrl) {
  const icon = document.createElement("a");
  icon.href = mapUrl;
  icon.target = "_blank";
  icon.rel = "noopener";
  icon.className = "wisphub-yaa-view-client-link wisphub-yaa-map-link-icon";
  applyHostTooltip(icon, "Abrir en Google Maps", { placement: "top" });
  icon.addEventListener("click", (e) => e.stopImmediatePropagation());
  return icon;
}

function processCoordinateElement(el) {
  if (el.hasAttribute(PROCESSED_COORDINATES)) {
    return false;
  }
  el.setAttribute(PROCESSED_COORDINATES, "1");

  const rawText = normalizeText(el.textContent);
  if (!rawText) {
    return false;
  }

  const mapUrl = getGoogleMapsDestination(rawText);
  if (!mapUrl) {
    return false;
  }

  const coordinates = extractCoordinatesFromText(rawText);
  const label = coordinates || rawText;

  el.textContent = "";
  el.appendChild(createMapLink(label, mapUrl));
  el.appendChild(createMapIconLink(mapUrl));
  return true;
}

function resolveDataRowFromElement(element) {
  const row = element?.closest?.("tr");
  if (!row) {
    return null;
  }
  if (row.classList.contains("child")) {
    return row.previousElementSibling || null;
  }
  return row;
}

function getRawCellValueFromRow(table, row, colIndex) {
  if (!table || !row || colIndex === -1) {
    return "";
  }

  const tableSelector = getTableSelector(table);
  const $ = window.jQuery;
  if (tableSelector && $?.fn?.DataTable) {
    const tableEl = $(tableSelector);
    if (tableEl.length && $.fn.DataTable.isDataTable(tableEl)) {
      try {
        const dt = tableEl.DataTable();
        const raw = dt.cell(row, colIndex).data();
        if (raw !== null && raw !== undefined) {
          return String(raw);
        }
      } catch {
        // Fallback below.
      }

      try {
        const dt = tableEl.DataTable();
        const rowData = dt.row(row).data();
        if (Array.isArray(rowData) && rowData[colIndex] !== undefined) {
          return String(rowData[colIndex]);
        }
      } catch {
        // Fallback below.
      }
    }
  }

  const cells = row.querySelectorAll("td");
  const cell = cells[colIndex];
  return String(cell?.innerHTML || cell?.textContent || "");
}

function getColumnValueByKeywords(table, row, keywords, excludeIndices = []) {
  const colIndex = findColumnIndex(table, keywords, excludeIndices);
  if (colIndex === -1) {
    return { value: "", colIndex: -1 };
  }
  const value = getCellTextFromRow(table, row, colIndex);
  return { value, colIndex };
}

function buildCasingPromptText() {
  return [
    "Configurar formato del nombre para aprovisionamiento",
    "",
    "Escribe una opción:",
    "→ upper: TODO EN MAYÚSCULAS",
    "→ lower: todo en minúsculas",
    "→ title: Primera Letra Por Palabra",
    "",
    'Tip: escribe "reset" para volver a la configuración por defecto.',
  ].join("\n");
}

function buildSeparatorPromptText(currentSeparator) {
  return [
    "Configurar separador entre palabras",
    "",
    `Separador actual: ${JSON.stringify(currentSeparator)}`,
    "Ejemplos: _ - . / (vacío = espacio)",
    "",
    'Si lo dejas vacío, se usará un espacio: " "',
    'Tip: escribe "reset" para volver a la configuración por defecto.',
  ].join("\n");
}

function askNameCopySettings() {
  const current = loadNameCopySettings(NAME_COPY_SETTINGS_KEY);

  const casingInput = window.prompt(buildCasingPromptText(), current.casing);
  if (casingInput === null) {
    return null;
  }

  const firstDecision = resolveNameCopySettingsFromInputs(casingInput, null);
  if (firstDecision.reset) {
    const savedDefaults = saveNameCopySettings(
      NAME_COPY_SETTINGS_KEY,
      firstDecision.settings,
    );
    _notify?.(CLIENTS_UI_MESSAGES.NAME_SETTINGS_RESET, "success", 1800);
    return savedDefaults;
  }
  if (firstDecision.status === "invalid") {
    _notify?.(CLIENTS_UI_MESSAGES.NAME_SETTINGS_INVALID, "warning", 3500);
    return null;
  }

  const separatorInput = window.prompt(
    buildSeparatorPromptText(current.separator),
    current.separator,
  );
  const decision = resolveNameCopySettingsFromInputs(
    casingInput,
    separatorInput,
  );
  if (decision.status === "cancelled") {
    return null;
  }
  if (decision.status === "invalid" || !decision.settings) {
    _notify?.(CLIENTS_UI_MESSAGES.NAME_SETTINGS_INVALID, "warning", 3500);
    return null;
  }

  const saved = saveNameCopySettings(NAME_COPY_SETTINGS_KEY, decision.settings);
  _notify?.(
    decision.reset
      ? CLIENTS_UI_MESSAGES.NAME_SETTINGS_RESET
      : CLIENTS_UI_MESSAGES.NAME_SETTINGS_SAVED,
    "success",
    1800,
  );
  return saved;
}

function createClientTemplateCopyButton() {
  const button = document.createElement("a");
  button.href = "#";
  button.className = [
    "wisphub-yaa-action-btn",
    CLIENT_TEMPLATE_COPY_VARIANT_CLASS,
    CLIENT_TEMPLATE_COPY_BUTTON_CLASS,
    COPY_CONTROL_CLASS,
  ].join(" ");
  button.setAttribute("role", "button");
  button.setAttribute("aria-label", "Copiar plantilla de aprovisionamiento");
  applyHostTooltip(button, "Copiar plantilla de aprovisionamiento", {
    placement: "top",
  });

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const row = resolveDataRowFromElement(button);
    const table = row?.closest?.("table");
    const templateData = buildClientProvisionTemplateData(row, table);
    const payload = templateData.payload;
    if (!payload) {
      _notify?.(CLIENTS_UI_MESSAGES.TEMPLATE_BUILD_FAILED, "warning", 3500);
      return;
    }

    copyToClipboard(payload).then((ok) => {
      if (ok) {
        showCopySuccess(button);
        if (templateData.missingFields.length > 0) {
          _notify?.(
            CLIENTS_UI_MESSAGES.TEMPLATE_MISSING_FIELDS_WARNING(
              templateData.missingFields,
            ),
            "warning",
            5500,
          );
        }
        log(
          `Client provisioning template copied: ${payload}`,
          "Plantilla de aprovisionamiento copiada",
        );
        return;
      }
      _notify?.(CLIENTS_UI_MESSAGES.TEMPLATE_COPY_FAILED, "error", 4000);
    });
  });

  return button;
}

function createClientNameCopyLink(rawName) {
  const button = document.createElement("a");
  button.href = "#";
  button.className = [CLIENT_NAME_COPY_LINK_CLASS, COPY_CONTROL_CLASS].join(
    " ",
  );
  button.setAttribute("aria-label", "Copiar nombre para aprovisionamiento");
  button.setAttribute("data-client-name", normalizeText(rawName));
  applyHostTooltip(
    button,
    "Copiar nombre para aprovisionamiento (Ctrl+Click = Configurar)",
    { placement: "top" },
  );

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (event.ctrlKey || event.metaKey) {
      askNameCopySettings();
      return;
    }

    const rawClientName = normalizeText(
      button.getAttribute("data-client-name"),
    );
    const formatted = formatProvisioningName(
      rawClientName,
      loadNameCopySettings(NAME_COPY_SETTINGS_KEY),
    );
    if (!formatted) {
      _notify?.(CLIENTS_UI_MESSAGES.NAME_COPY_FAILED, "warning", 3500);
      return;
    }

    copyToClipboard(formatted).then((ok) => {
      if (ok) {
        showCopySuccess(button);
        log(`Client provisioning name copied: ${formatted}`, "Nombre copiado");
        return;
      }
      _notify?.(CLIENTS_UI_MESSAGES.NAME_COPY_FAILED, "error", 3500);
    });
  });

  return button;
}

function ensureClientNameCopyButton(cell, row, table) {
  if (!cell || !row || !table || !isClientListPage()) {
    return false;
  }
  if (
    cell.hasAttribute(PROCESSED_CLIENT_NAME) &&
    cell.querySelector(`.${CLIENT_NAME_COPY_LINK_CLASS}`)
  ) {
    return false;
  }

  const textHost = cell.querySelector(".txt-overflow");
  const nameValue = normalizeText(textHost?.textContent || cell.textContent);
  if (!nameValue) {
    return false;
  }

  if (textHost) {
    textHost.classList.add(CLIENT_NAME_TEXT_HOST_CLASS);
  }

  const copyLink = createClientNameCopyLink(nameValue);
  cell.setAttribute(PROCESSED_CLIENT_NAME, "1");
  cell.appendChild(document.createTextNode(" "));
  cell.appendChild(copyLink);
  return true;
}

function resolveServiceId(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "";
  }

  const fromSlug = extractServiceIdFromServiceSlug(normalized);
  if (fromSlug) {
    return fromSlug;
  }

  const idMatch = normalized.match(/\b0*(\d+)\b/);
  if (!idMatch) {
    return normalized;
  }

  const parsed = Number.parseInt(idMatch[1], 10);
  return Number.isFinite(parsed) ? String(parsed) : normalized;
}

function isTemplatePlaceholderValue(value) {
  return normalizeText(value).startsWith("{{POR LLENAR");
}

function collectMissingTemplateFields(fields) {
  const missing = [];
  const normalizedStagePlaceholder = normalizeText(
    CLIENT_TEMPLATE_PLACEHOLDERS.STAGE,
  );

  if (
    !fields.stage ||
    normalizeText(fields.stage) === normalizedStagePlaceholder
  ) {
    missing.push(CLIENT_TEMPLATE_TARGET_LABELS.STAGE);
  }
  if (!fields.name) {
    missing.push(CLIENT_TEMPLATE_TARGET_LABELS.NAME);
  }
  if (!fields.service) {
    missing.push(CLIENT_TEMPLATE_TARGET_LABELS.SERVICE);
  }
  if (
    !fields.servicePassword ||
    isTemplatePlaceholderValue(fields.servicePassword)
  ) {
    missing.push(CLIENT_TEMPLATE_TARGET_LABELS.SERVICE_PASSWORD);
  }
  if (!fields.router) {
    missing.push(CLIENT_TEMPLATE_TARGET_LABELS.ROUTER);
  }
  if (!fields.locality) {
    missing.push(CLIENT_TEMPLATE_TARGET_LABELS.LOCALITY);
  }
  if (!fields.ip) {
    missing.push(CLIENT_TEMPLATE_TARGET_LABELS.IP);
  }
  if (!fields.status) {
    missing.push(CLIENT_TEMPLATE_TARGET_LABELS.STATUS);
  }
  if (!fields.plan) {
    missing.push(CLIENT_TEMPLATE_TARGET_LABELS.PLAN);
  }
  if (!fields.equipment || isTemplatePlaceholderValue(fields.equipment)) {
    missing.push(CLIENT_TEMPLATE_TARGET_LABELS.EQUIPMENT);
  }

  return missing;
}

export function buildClientProvisionTemplateData(row, table) {
  if (!row || !table) {
    return { payload: "", missingFields: [] };
  }

  const nameData = getColumnValueByKeywords(table, row, CLIENT_NAME_KEYWORDS);
  const serviceData = getColumnValueByKeywords(
    table,
    row,
    CLIENT_SERVICE_KEYWORDS,
    [nameData.colIndex],
  );
  const passwordData = getColumnValueByKeywords(
    table,
    row,
    CLIENT_SERVICE_PASSWORD_KEYWORDS,
    [nameData.colIndex, serviceData.colIndex],
  );
  const routerData = getColumnValueByKeywords(
    table,
    row,
    CLIENT_ROUTER_KEYWORDS,
    [nameData.colIndex, serviceData.colIndex, passwordData.colIndex],
  );
  const localityData = getColumnValueByKeywords(
    table,
    row,
    CLIENT_LOCALITY_KEYWORDS,
    [
      nameData.colIndex,
      serviceData.colIndex,
      passwordData.colIndex,
      routerData.colIndex,
    ],
  );
  const ipData = getColumnValueByKeywords(table, row, CLIENT_IP_KEYWORDS, [
    nameData.colIndex,
    serviceData.colIndex,
    passwordData.colIndex,
    routerData.colIndex,
    localityData.colIndex,
  ]);
  const statusData = getColumnValueByKeywords(
    table,
    row,
    CLIENT_STATUS_KEYWORDS,
    [
      nameData.colIndex,
      serviceData.colIndex,
      passwordData.colIndex,
      routerData.colIndex,
      localityData.colIndex,
      ipData.colIndex,
    ],
  );
  const planData = getColumnValueByKeywords(table, row, CLIENT_PLAN_KEYWORDS, [
    nameData.colIndex,
    serviceData.colIndex,
    passwordData.colIndex,
    routerData.colIndex,
    localityData.colIndex,
    ipData.colIndex,
    statusData.colIndex,
  ]);
  const commentsCol = findColumnIndex(table, COMMENT_KEYWORDS, [
    nameData.colIndex,
    serviceData.colIndex,
    passwordData.colIndex,
    routerData.colIndex,
    localityData.colIndex,
    ipData.colIndex,
    statusData.colIndex,
    planData.colIndex,
  ]);

  const commentsRaw = getRawCellValueFromRow(table, row, commentsCol);
  const commentLines = extractCommentLines(commentsRaw);

  const stage = extractStageFromCommentLines(commentLines);
  const name = normalizeClientName(nameData.value);
  const service = resolveServiceId(serviceData.value);
  const servicePassword =
    normalizeText(passwordData.value) ||
    buildMissingValuePlaceholder(
      CLIENT_TEMPLATE_TARGET_LABELS.SERVICE_PASSWORD,
    );
  const router = normalizeText(routerData.value);
  const locality = normalizeText(localityData.value);
  const ip = normalizeText(ipData.value);
  const status = normalizeText(statusData.value);
  const plan = normalizeText(planData.value);
  const equipment =
    extractEquipmentLineFromCommentLines(commentLines) ||
    buildMissingValuePlaceholder(CLIENT_TEMPLATE_TARGET_LABELS.EQUIPMENT);

  const templateFields = {
    stage: stage || CLIENT_TEMPLATE_PLACEHOLDERS.STAGE,
    name,
    service,
    servicePassword,
    router,
    locality,
    ip,
    status,
    plan,
    equipment,
  };

  const rows = Object.values(templateFields);
  return {
    payload: rows.map((line) => normalizeText(line)).join("\n"),
    missingFields: collectMissingTemplateFields(templateFields),
  };
}

export function buildClientProvisionTemplate(row, table) {
  return buildClientProvisionTemplateData(row, table).payload;
}

function extractSlug(container) {
  const links = container.querySelectorAll("a[href]");
  for (const link of links) {
    const href = link.getAttribute("href") || "";
    const m = href.match(SLUG_RE);
    if (m) {
      return m[1];
    }
  }
  return null;
}

function buildClientMapUrlFromSlug(slug) {
  return buildClientMapUrlFromServiceSlug(normalizeText(slug));
}

function getTableSelector(table) {
  if (!table?.id) {
    return null;
  }
  const escaped = window.CSS?.escape ? window.CSS.escape(table.id) : table.id;
  return `#${escaped}`;
}

function getCellTextFromRow(table, row, colIndex) {
  if (!table || !row || colIndex === -1) {
    return "";
  }

  const tableSelector = getTableSelector(table);
  const $ = window.jQuery;
  if (tableSelector && $?.fn?.DataTable) {
    const tableEl = $(tableSelector);
    if (tableEl.length && $.fn.DataTable.isDataTable(tableEl)) {
      // Empty strings are valid DataTable values and must not trigger
      // a DOM-index fallback (hidden/reordered columns can desync indices).
      return getDataTableCellText(tableSelector, row, colIndex, "Clients");
    }
  }

  const cells = row.querySelectorAll("td");
  return normalizeText(cells[colIndex]?.textContent || "");
}

function hasExplicitCoordinateSignal(value) {
  const text = normalizeText(value);
  if (!text) {
    return false;
  }
  return (
    /-?\d{1,2}\.\d+\s*,\s*-?\d{1,3}\.\d+/.test(text) ||
    /-?\d{1,2}\s*,\s*-\d{1,3}\b/.test(text)
  );
}

function resolveMapFromText(value, options = {}) {
  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  const mapUrl = extractMapUrlFromText(text);
  if (mapUrl) {
    return mapUrl;
  }

  if (options.allowCoordinatePair || hasExplicitCoordinateSignal(text)) {
    return getGoogleMapsDestination(text);
  }

  return null;
}

function getMapUrlFromColumn(table, row, colIndex, options = {}) {
  if (!table || !row || colIndex === -1) {
    return null;
  }
  const value = getCellTextFromRow(table, row, colIndex);
  return resolveMapFromText(value, options);
}

function resolveMapFromChildRow(
  row,
  allowedTitleKeywords = MAP_DETAIL_KEYWORDS,
) {
  if (!row) {
    return null;
  }

  const child = row.nextElementSibling;
  if (!child?.classList.contains("child")) {
    return null;
  }

  const coordinateItems = child.querySelectorAll("li[data-dt-column]");
  for (const item of coordinateItems) {
    const title = item.querySelector(".dtr-title")?.textContent || "";
    if (!matchesKeywords(title, allowedTitleKeywords)) {
      continue;
    }
    const dataText = normalizeText(
      item.querySelector(".dtr-data")?.textContent || "",
    );
    const mapUrl = resolveMapFromText(dataText, {
      allowCoordinatePair: matchesKeywords(title, COORDINATE_KEYWORDS),
    });
    if (mapUrl) {
      return mapUrl;
    }
  }

  return null;
}

function resolveMapUrlFromRow(row, table, options = {}) {
  if (!row) {
    return null;
  }

  let coordinateCol = Number.isInteger(options.coordinateCol)
    ? options.coordinateCol
    : -1;
  let mapSourceCols = Array.isArray(options.mapSourceCols)
    ? options.mapSourceCols
    : [];

  if (mapSourceCols.length === 0 && table) {
    if (coordinateCol === -1) {
      coordinateCol = findColumnIndex(table, COORDINATE_KEYWORDS);
    }
    const addressCol = findColumnIndex(
      table,
      ADDRESS_KEYWORDS,
      coordinateCol === -1 ? [] : [coordinateCol],
    );
    const commentsCol = findColumnIndex(
      table,
      COMMENT_KEYWORDS,
      [coordinateCol, addressCol].filter((idx) => idx !== -1),
    );
    mapSourceCols = buildMapSourceColumns({
      coordinateCol,
      addressCol,
      commentsCol,
    });
  }

  for (const col of mapSourceCols) {
    const mapUrl = getMapUrlFromColumn(table, row, col, {
      allowCoordinatePair: col === coordinateCol,
    });
    if (mapUrl) {
      return mapUrl;
    }
  }

  return resolveMapFromChildRow(row, options.detailKeywords);
}

function resolveMapUrlFromContainer(container, options = {}) {
  const row = container.closest("tr");
  if (!row) {
    return resolveMapFromText(normalizeText(container.textContent));
  }

  const baseRow =
    row.classList.contains("child") && row.previousElementSibling
      ? row.previousElementSibling
      : row;
  const table = baseRow.closest("table");
  const fromRow = resolveMapUrlFromRow(baseRow, table, options);
  if (fromRow) {
    return fromRow;
  }

  return resolveMapFromText(normalizeText(container.textContent));
}

function addActionButtons(container, options = {}) {
  return addOrUpdateClientActionButtons({
    container,
    options,
    config: {
      processedActionsAttribute: PROCESSED_ACTIONS,
      mapActionBoundAttribute: MAP_ACTION_BOUND,
      templateButtonClass: CLIENT_TEMPLATE_COPY_BUTTON_CLASS,
      isClientListPage,
      createTemplateCopyButton: createClientTemplateCopyButton,
      extractSlug,
      buildFallbackMapUrl: buildClientMapUrlFromSlug,
      resolveMapUrl: resolveMapUrlFromContainer,
    },
  });
}

function findPhoneColumnByContent(table) {
  const rows = table.querySelectorAll("tbody tr:not(.child)");
  if (rows.length === 0) {
    return -1;
  }
  const sampleSize = Math.min(rows.length, 5);
  const colCount = rows[0]?.querySelectorAll("td").length || 0;
  const scores = new Array(colCount).fill(0);

  for (let r = 0; r < sampleSize; r++) {
    const cells = rows[r].querySelectorAll("td");
    for (let c = 0; c < cells.length; c++) {
      const text = normalizeText(cells[c].textContent);
      if (looksLikeIP(text)) {
        continue;
      }
      const phoneParts = text.split(/[,;/]+/);
      for (const part of phoneParts) {
        const trimmed = part.trim();
        if (looksLikeIP(trimmed)) {
          continue;
        }
        if (PHONE_RE.test(trimmed)) {
          const digits = trimmed.replace(/\D/g, "");
          if (digits.length >= 7 && digits.length <= 15) {
            scores[c]++;
            break;
          }
        }
      }
    }
  }

  let bestCol = -1;
  let bestScore = 0;
  for (let c = 0; c < scores.length; c++) {
    if (scores[c] > bestScore) {
      bestScore = scores[c];
      bestCol = c;
    }
  }
  return bestScore >= 2 ? bestCol : -1;
}

function processMainTable(table) {
  let phoneColDom = findDomColumnIndex(table, PHONE_KEYWORDS);
  if (phoneColDom === -1) {
    phoneColDom = findPhoneColumnByContent(table);
  }

  const nameColDom = isClientListPage()
    ? findDomColumnIndex(table, CLIENT_NAME_KEYWORDS)
    : -1;
  const coordinateColDom = findDomColumnIndex(table, COORDINATE_KEYWORDS);
  const actionColDom = findDomColumnIndex(table, ACTION_KEYWORDS);

  const coordinateColData = findColumnIndex(table, COORDINATE_KEYWORDS);
  const addressCol = findColumnIndex(
    table,
    ADDRESS_KEYWORDS,
    coordinateColData === -1 ? [] : [coordinateColData],
  );
  const commentsCol = findColumnIndex(
    table,
    COMMENT_KEYWORDS,
    [coordinateColData, addressCol].filter((idx) => idx !== -1),
  );
  const mapSourceCols = buildMapSourceColumns({
    coordinateCol: coordinateColData,
    addressCol,
    commentsCol,
  });
  const actionOpts = {
    skipViewClient: isInstallationOrPreInstallationListPage(),
    coordinateCol: coordinateColData,
    mapSourceCols,
    detailKeywords: getMapDetailKeywords(),
    forceClientMapFallback: isClientListPage(),
  };

  let phoneCount = 0;
  let nameCopyCount = 0;
  let coordinateCount = 0;
  let actionCount = 0;

  const rows = table.querySelectorAll("tbody tr:not(.child)");
  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    if (nameColDom !== -1 && cells[nameColDom]) {
      if (ensureClientNameCopyButton(cells[nameColDom], row, table)) {
        nameCopyCount++;
      }
    }

    if (phoneColDom !== -1 && cells[phoneColDom]) {
      if (processPhoneElement(cells[phoneColDom])) {
        phoneCount++;
      }
    }

    if (coordinateColDom !== -1 && cells[coordinateColDom]) {
      if (processCoordinateElement(cells[coordinateColDom])) {
        coordinateCount++;
      }
    }

    if (actionColDom !== -1 && cells[actionColDom]) {
      if (addActionButtons(cells[actionColDom], actionOpts)) {
        actionCount++;
      }
    }
  });

  return { phoneCount, nameCopyCount, coordinateCount, actionCount };
}

function processResponsiveRows() {
  let phoneCount = 0;
  let nameCopyCount = 0;
  let coordinateCount = 0;
  let actionCount = 0;
  const actionOpts = {
    skipViewClient: isInstallationOrPreInstallationListPage(),
    detailKeywords: getMapDetailKeywords(),
    forceClientMapFallback: isClientListPage(),
  };

  document
    .querySelectorAll("li[data-dt-column] .dtr-data")
    .forEach((dataSpan) => {
      const li = dataSpan.closest("li[data-dt-column]");
      const titleSpan = li?.querySelector(".dtr-title");
      if (!titleSpan) {
        return;
      }
      const title = titleSpan.textContent;

      if (matchesKeywords(title, PHONE_KEYWORDS)) {
        if (processPhoneElement(dataSpan)) {
          phoneCount++;
        }
      }

      if (isClientListPage() && matchesKeywords(title, CLIENT_NAME_KEYWORDS)) {
        const row = resolveDataRowFromElement(dataSpan);
        const table = row?.closest?.("table");
        if (ensureClientNameCopyButton(dataSpan, row, table)) {
          nameCopyCount++;
        }
      }

      if (matchesKeywords(title, COORDINATE_KEYWORDS)) {
        if (processCoordinateElement(dataSpan)) {
          coordinateCount++;
        }
      }

      if (matchesKeywords(title, ACTION_KEYWORDS)) {
        if (addActionButtons(dataSpan, actionOpts)) {
          actionCount++;
        }
      }
    });

  return { phoneCount, nameCopyCount, coordinateCount, actionCount };
}

function processAll() {
  let totalPhone = 0;
  let totalNameCopy = 0;
  let totalCoordinates = 0;
  let totalAction = 0;

  document.querySelectorAll("table").forEach((table) => {
    if (!table.querySelector("tbody tr td")) {
      return;
    }

    const results = processMainTable(table);
    totalPhone += results.phoneCount;
    totalNameCopy += results.nameCopyCount;
    totalCoordinates += results.coordinateCount;
    totalAction += results.actionCount;
  });

  const responsiveResults = processResponsiveRows();
  totalPhone += responsiveResults.phoneCount;
  totalNameCopy += responsiveResults.nameCopyCount;
  totalCoordinates += responsiveResults.coordinateCount;
  totalAction += responsiveResults.actionCount;

  return totalPhone + totalNameCopy + totalCoordinates + totalAction;
}

function debouncedProcess() {
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    processAll();
  }, 50);
}

function startObserver() {
  const target = document.querySelector("#content") || document.body;
  const observer = new MutationObserver(debouncedProcess);
  observer.observe(target, { childList: true, subtree: true });
}

function pollUntilFound(maxAttempts, interval) {
  let attempts = 0;
  const check = () => {
    attempts++;
    const found = processAll();
    if (found > 0) {
      log(
        `Client enhancements injected: ${found} elements`,
        `Mejoras de clientes inyectadas: ${found} elementos`,
      );
      startObserver();
      return;
    }
    if (attempts < maxAttempts) {
      setTimeout(check, interval);
    } else {
      startObserver();
    }
  };
  check();
}

function isInstallationListPage() {
  return INSTALLATION_LIST_PATH_RE.test(window.location.pathname);
}

function isPreInstallationListPage() {
  return PREINSTALLATION_LIST_PATH_RE.test(window.location.pathname);
}

function isInstallationOrPreInstallationListPage() {
  return isInstallationListPage() || isPreInstallationListPage();
}

function buildMapSourceColumns({ coordinateCol, addressCol, commentsCol }) {
  if (isInstallationOrPreInstallationListPage()) {
    return Array.from(
      new Set([addressCol, commentsCol].filter((idx) => idx !== -1)),
    );
  }

  if (isClientListPage()) {
    return Array.from(
      new Set([coordinateCol, addressCol].filter((idx) => idx !== -1)),
    );
  }

  return Array.from(
    new Set(
      [addressCol, commentsCol, coordinateCol].filter((idx) => idx !== -1),
    ),
  );
}

function getMapDetailKeywords() {
  if (isInstallationOrPreInstallationListPage()) {
    return MAP_DETAIL_KEYWORDS;
  }

  if (isClientListPage()) {
    return CLIENT_MAP_DETAIL_KEYWORDS;
  }

  return MAP_DETAIL_KEYWORDS;
}

function isClientListPage() {
  const path = window.location.pathname;
  return CLIENT_LIST_PATH_RE.test(path) && !CLIENT_EXCLUDED_PATH_RE.test(path);
}

function isSupportedPhonePage() {
  if (isClientListPage()) {
    return true;
  }
  if (isInstallationOrPreInstallationListPage()) {
    return true;
  }
  return false;
}

export function initClientPhoneLinks(notifyFn) {
  if (!isSupportedPhonePage()) {
    return;
  }

  _notify = notifyFn;
  log(
    "Phone and map link enhancements loaded",
    "Mejoras de enlaces telefónicos y mapas cargadas",
  );

  pollUntilFound(20, 1000);
}

export const __testables__ = {
  processMainTable,
  resolveMapUrlFromRow,
  resolveMapFromText,
  addActionButtons,
  buildClientProvisionTemplateData,
  buildClientProvisionTemplate,
  formatProvisioningName,
  resolveNameCopySettingsFromInputs,
  isSupportedPhonePage,
};
