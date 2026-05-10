import { MESSAGE_TYPES, CLIENTS_UI_MESSAGES } from "../../config/messages.js";
import { postBridgeMessage } from "../../utils/pageBridge.js";

const CACHE_TTL = 180_000; // 3 minutes
const POPUP_CLASS = "wisphub-yaa-quick-info-popup";
const DEFAULT_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 6_000; // 6 seconds

const quickInfoCache = new Map();
const pendingRequests = new Map();
const quickLogCache = new Map();
const LOG_CACHE_TTL = 300_000; // 5 minutes
const LOG_REQUEST_TIMEOUT_MS = 20_000; // 20 seconds

let activeLogController = null;

const MICHOACAN_DOMAINS = ["vwinternetnetworks", "vwinm"];

let hoverTimer = null;
let activePopup = null;
let leaveTimer = null;
let isInitialized = false;
let activeTbody = null;
let isTicketInitialized = false;
let ticketActiveTbody = null;
let quickInfoEnabled = false;
let quickInfoDelay = DEFAULT_DELAY_MS;
let lastCursorX = 0;
let lastCursorY = 0;
let selectedRow = null;

function normalizeQuickInfoDelay(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_DELAY_MS;
  }
  return Math.round(Math.min(10_000, Math.max(0, parsed)));
}

function updateQuickInfoState(settings = {}) {
  if (typeof settings.quickInfoEnabled === "boolean") {
    quickInfoEnabled = settings.quickInfoEnabled;
  }

  if (settings.quickInfoDelay !== undefined) {
    quickInfoDelay = normalizeQuickInfoDelay(settings.quickInfoDelay);
  }

  if (!quickInfoEnabled) {
    clearTimeout(hoverTimer);
    clearTimeout(leaveTimer);
    removeActivePopup();
  }
}

function parseRowData(row) {
  const checkbox = row.querySelector('input[name="id_servicio_username"]');
  if (!checkbox) {
    return null;
  }
  const val = String(checkbox.value || "");
  const sepIdx = val.indexOf("#");
  const idServicio = sepIdx >= 0 ? val.slice(0, sepIdx) : val;
  const username = sepIdx >= 0 ? val.slice(sepIdx + 1) : "";
  const nameCell = row.querySelector("td.user");
  const clientNameEl = nameCell?.querySelector("[data-client-name]");
  const nombre =
    clientNameEl?.getAttribute("data-client-name")?.trim() ||
    nameCell?.textContent?.trim() ||
    username ||
    idServicio;
  const ipCell = row.querySelector("td.ip");
  const ip = ipCell?.textContent?.trim() || "";
  const comentariosCell = row.querySelector("td.comentarios");
  const comentariosText = comentariosCell?.textContent?.trim() || "";
  return { idServicio, username, nombre, ip, comentariosText };
}

function detectEquipmentType(rawText) {
  if (!rawText) {
    return null;
  }
  const fullNorm = String(rawText)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  const isMigration = /\bmigraci?on\b/.test(fullNorm);
  // Scan line-by-line: return the FIRST equipment type found from top
  let equipType = null;
  for (const line of String(rawText).split(/\r?\n/)) {
    const norm = line
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();
    if (!norm) {
      continue;
    }
    if (/\bcomodato\b/.test(norm) || /\bcomo[\s-]*dato\b/.test(norm)) {
      equipType = "Comodato";
      break;
    }
    if (/\bprestado(s)?\b/.test(norm)) {
      equipType = "Prestado";
      break;
    }
    if (/\bcomprado(s)?\b/.test(norm)) {
      equipType = "Comprado";
      break;
    }
    if (/\bpropio(s)?\b/.test(norm)) {
      equipType = "Propio";
      break;
    }
  }
  if (!equipType && !isMigration) {
    return null;
  }
  if (isMigration && equipType) {
    return `Migración · ${equipType}`;
  }
  if (isMigration) {
    return "Migración";
  }
  return equipType;
}

function getCached(idServicio) {
  const entry = quickInfoCache.get(idServicio);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.ts > CACHE_TTL) {
    quickInfoCache.delete(idServicio);
    return null;
  }
  return entry.data;
}

function requestQuickInfo(idServicio) {
  const cached = getCached(idServicio);
  if (cached) {
    return Promise.resolve(cached);
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingRequests.delete(idServicio);
      resolve({ saldo: null, tickets: null, plan: null, pendingTickets: null, fechaInstalacion: null });
    }, REQUEST_TIMEOUT_MS);
    pendingRequests.set(idServicio, { resolve, timer });
    postBridgeMessage(
      MESSAGE_TYPES.CLIENT_QUICK_INFO_REQUEST,
      { idServicio },
      { requireToken: true },
    );
  });
}

function handleQuickInfoResponse(event) {
  if (event.source !== window) {
    return;
  }
  const data = event.data || {};
  if (data.type !== MESSAGE_TYPES.CLIENT_QUICK_INFO_RESPONSE) {
    return;
  }
  const { idServicio, result } = data;
  const pending = pendingRequests.get(idServicio);
  if (!pending) {
    return;
  }
  clearTimeout(pending.timer);
  pendingRequests.delete(idServicio);
  const safeResult = result || {
    saldo: null,
    tickets: null,
    plan: null,
    pendingTickets: null,
    fechaInstalacion: null,
  };
  // Don't cache transient states so the popup retries after the user configures the API key.
  if (!safeResult.noApiKey && !safeResult.apiError) {
    quickInfoCache.set(idServicio, { data: safeResult, ts: Date.now() });
  }
  pending.resolve(safeResult);
}

window.addEventListener("message", handleQuickInfoResponse);

function formatSaldo(saldo) {
  if (saldo == null || saldo.saldo == null) {
    return null;
  }
  const amount = parseFloat(saldo.saldo);
  if (!Number.isFinite(amount)) {
    return null;
  }
  if (amount > 0) {
    return { text: `Deuda: $${amount.toFixed(2)}`, type: "debt" };
  }
  return { text: "Al corriente", type: "ok" };
}

function formatLogDate(d) {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

async function fetchClientLog(username, idServicio) {
  const now = new Date();
  const cacheKey = `${idServicio}-${now.getFullYear()}-${now.getMonth()}`;
  const cached = quickLogCache.get(cacheKey);
  if (cached && Date.now() - cached.ts <= LOG_CACHE_TTL) {
    return cached.data;
  }
  quickLogCache.delete(cacheKey);

  const atIdx = username.indexOf("@");
  if (atIdx < 0) {
    return null;
  }
  const empresa = username.slice(atIdx + 1);
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const query = `desde=${formatLogDate(firstOfMonth)}&hasta=${formatLogDate(firstOfNextMonth)}&servicio=${idServicio}`;

  if (activeLogController) {
    activeLogController.abort();
  }
  const controller = new AbortController();
  activeLogController = controller;
  const timeout = setTimeout(() => controller.abort(), LOG_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(
      `${window.location.origin}/clientes/json-clientes-log/v3/${empresa}/?${query}`,
      {
        credentials: "same-origin",
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest",
        },
        signal: controller.signal,
      },
    );
    if (!res.ok) {
      return null;
    }
    const json = await res.json();
    const idStr = String(idServicio);
    const result = Array.isArray(json?.data)
      ? (json.data.find((e) => String(e.servicio) === idStr) ?? null)
      : null;
    quickLogCache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    if (activeLogController === controller) {
      activeLogController = null;
    }
  }
}

function buildLogContent(log) {
  const frag = document.createDocumentFragment();
  if (log === undefined) {
    const el = document.createElement("p");
    el.className = "yaa-qi-empty";
    el.textContent = "Cargando...";
    frag.appendChild(el);
  } else if (log === null) {
    const el = document.createElement("p");
    el.className = "yaa-qi-empty";
    el.textContent = "Sin actividad este mes";
    frag.appendChild(el);
  } else {
    const created = log.created || "";
    const spaceIdx = created.indexOf(" ");
    const rawDate = spaceIdx >= 0 ? created.slice(0, spaceIdx) : created;
    const timePart = spaceIdx >= 0 ? created.slice(spaceIdx + 1) : "";
    const dp = rawDate.split("-");
    const datePart = dp.length === 3 ? `${dp[2]}/${dp[1]}/${dp[0]}` : rawDate;
    const staffAt = (log.staff || "").indexOf("@");
    const staff = staffAt >= 0 ? log.staff.slice(0, staffAt) : log.staff;
    frag.appendChild(buildLogRow("Acción", log.accion));
    frag.appendChild(buildLogRow("Estado", log.estado));
    frag.appendChild(buildLogRow("Realizado por", staff));
    frag.appendChild(buildLogRow("Fecha", datePart));
    frag.appendChild(buildLogRow("Hora", timePart));
  }
  return frag;
}

function buildSectionExtLink(href, sourceRow) {
  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.className = "wisphub-yaa-view-client-link";
  link.addEventListener("click", () => selectRow(sourceRow));
  return link;
}

function buildDivider() {
  const hr = document.createElement("hr");
  hr.className = "yaa-qi-divider";
  return hr;
}

function buildLogRow(label, value) {
  const row = document.createElement("div");
  row.className = "yaa-qi-log-row";
  const labelEl = document.createElement("span");
  labelEl.className = "yaa-qi-log-label";
  labelEl.textContent = label;
  const valueEl = document.createElement("span");
  valueEl.className = "yaa-qi-log-value";
  valueEl.textContent = value || "—";
  row.appendChild(labelEl);
  row.appendChild(valueEl);
  return row;
}

function buildApiInfoMessage(noApiKey, apiError) {
  if (noApiKey) {
    return CLIENTS_UI_MESSAGES.QUICK_INFO_NO_API_KEY;
  }
  if (apiError) {
    return CLIENTS_UI_MESSAGES.QUICK_INFO_API_ERROR(apiError);
  }
  return null;
}

function buildSectionHeader(titleText, extUrl, sourceRow) {
  const header = document.createElement("div");
  header.className = "yaa-qi-section-header";
  const titleSpan = document.createElement("span");
  titleSpan.textContent = titleText;
  header.appendChild(titleSpan);
  if (extUrl) {
    header.appendChild(buildSectionExtLink(extUrl, sourceRow));
  }
  return header;
}

function buildTicketSectionEl(title, tickets, emptyText, sourceRow, extUrl, apiMsg = null) {
  const section = document.createElement("div");
  section.className = "yaa-qi-section";
  section.appendChild(buildSectionHeader(title, extUrl, sourceRow));

  const list = Array.isArray(tickets) ? tickets : [];
  const emptyEl = document.createElement("p");
  emptyEl.className = "yaa-qi-empty";

  if (apiMsg) {
    emptyEl.textContent = apiMsg;
    section.appendChild(emptyEl);
  } else if (tickets === null) {
    emptyEl.textContent = "Sin datos de tickets";
    section.appendChild(emptyEl);
  } else if (list.length === 0) {
    emptyEl.textContent = emptyText;
    section.appendChild(emptyEl);
  } else {
    list.forEach((ticket) => {
      const link = document.createElement("a");
      link.href = `${window.location.origin}/tickets/ver/${ticket.id_ticket}/#retab3`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "yaa-qi-ticket-link";
      link.textContent = `#${ticket.id_ticket} \u2014 ${ticket.asunto || "Sin asunto"}`;
      link.addEventListener("click", () => selectRow(sourceRow));
      section.appendChild(link);
    });
  }

  return section;
}

function formatInstallDate(rawDate) {
  const s = String(rawDate || "").trim();
  if (!s) {
    return null;
  }
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  return s;
}

function buildInstallDateSection(fechaInstalacion, apiMsg, username, idServicio, sourceRow) {
  const section = document.createElement("div");
  section.className = "yaa-qi-section";

  const extUrl = username && idServicio
    ? `${window.location.origin}/clientes/editar/servicio/${username}/${idServicio}/#id_cliente-fecha_instalacion`
    : null;
  section.appendChild(buildSectionHeader("Fecha de instalación", extUrl, sourceRow));

  const contentEl = document.createElement("p");
  if (apiMsg) {
    contentEl.className = "yaa-qi-empty";
    contentEl.textContent = apiMsg;
  } else {
    const formatted = formatInstallDate(fechaInstalacion);
    contentEl.className = formatted ? "yaa-qi-date-value" : "yaa-qi-empty";
    contentEl.textContent = formatted ?? "Sin fecha de instalación";
  }
  section.appendChild(contentEl);

  return section;
}

function buildPopupEl(rowData, data, sourceRow) {
  const { nombre, idServicio, ip, username, comentariosText } = rowData;
  const { saldo, tickets, plan, pendingTickets, log, fechaInstalacion, noApiKey, apiError } = data;
  const apiMsg = buildApiInfoMessage(noApiKey, apiError);

  const popup = document.createElement("div");
  popup.className = POPUP_CLASS;

  const header = document.createElement("div");
  header.className = "yaa-qi-header";

  const titleEl = username
    ? document.createElement("a")
    : document.createElement("div");
  titleEl.className = "yaa-qi-title";
  if (username) {
    titleEl.href = `${window.location.origin}/clientes/ver/${username}/`;
    titleEl.target = "_blank";
    titleEl.rel = "noopener noreferrer";
    titleEl.addEventListener("click", () => selectRow(sourceRow));
  }
  titleEl.textContent = nombre;
  header.appendChild(titleEl);

  const subtitleEl = document.createElement("div");
  subtitleEl.className = "yaa-qi-subtitle";
  subtitleEl.textContent = plan?.nombre
    ? `ID: ${idServicio} | ${plan.nombre}`
    : `ID: ${idServicio}`;
  header.appendChild(subtitleEl);

  popup.appendChild(header);

  const meta = document.createElement("div");
  meta.className = "yaa-qi-meta";

  if (ip) {
    const ipEl = document.createElement("span");
    ipEl.className = "yaa-qi-meta-item";
    ipEl.textContent = `IP: ${ip}`;
    meta.appendChild(ipEl);
  }

  const equipmentLabel = detectEquipmentType(comentariosText);
  if (equipmentLabel) {
    const equipEl = document.createElement("span");
    equipEl.className = "yaa-qi-meta-item yaa-qi-meta-item--equipment";
    equipEl.textContent = equipmentLabel;
    if (username && idServicio) {
      const equipLink = document.createElement("a");
      const equipEditBase = `/clientes/editar/servicio/${username}/${idServicio}/`;
      equipLink.href = `${window.location.origin}${equipEditBase}#id_cliente-comentarios`;
      equipLink.target = "_blank";
      equipLink.rel = "noopener noreferrer";
      equipLink.className = "yaa-qi-equip-link";
      equipLink.addEventListener("click", () => selectRow(sourceRow));
      equipLink.appendChild(equipEl);
      meta.appendChild(equipLink);
    } else {
      meta.appendChild(equipEl);
    }
  }

  const saldoInfo = formatSaldo(saldo);
  const payEl = document.createElement("span");
  if (saldoInfo) {
    payEl.className = `yaa-qi-meta-item yaa-qi-meta-item--${saldoInfo.type}`;
    payEl.textContent = saldoInfo.text;
  } else {
    payEl.className = "yaa-qi-meta-item yaa-qi-meta-item--unknown";
    payEl.textContent = "Saldo no disponible";
  }
  if (username) {
    const payLink = document.createElement("a");
    payLink.href = `${window.location.origin}/clientes/ver/${username}/#retab3`;
    payLink.target = "_blank";
    payLink.rel = "noopener noreferrer";
    payLink.className = "yaa-qi-pay-link";
    payLink.addEventListener("click", () => selectRow(sourceRow));
    payLink.appendChild(payEl);
    meta.appendChild(payLink);
  } else {
    meta.appendChild(payEl);
  }

  popup.appendChild(buildDivider());
  popup.appendChild(meta);

  const ticketsExtUrl = username
    ? `${window.location.origin}/clientes/ver/${username}/#retab4`
    : null;

  popup.appendChild(buildDivider());
  popup.appendChild(
    buildTicketSectionEl(
      "Tickets en progreso",
      tickets,
      "Sin tickets activos",
      sourceRow,
      ticketsExtUrl,
      apiMsg,
    ),
  );
  popup.appendChild(buildDivider());
  popup.appendChild(
    buildTicketSectionEl(
      "Tickets pendientes",
      pendingTickets,
      "Sin tickets pendientes",
      sourceRow,
      ticketsExtUrl,
      apiMsg,
    ),
  );
  popup.appendChild(buildDivider());
  popup.appendChild(buildInstallDateSection(fechaInstalacion, apiMsg, username, idServicio, sourceRow));
  popup.appendChild(buildDivider());

  const logSection = document.createElement("div");
  logSection.className = "yaa-qi-section";
  const logExtUrl = username
    ? `${window.location.origin}/clientes/ver/${username}/#retab7`
    : null;
  logSection.appendChild(buildSectionHeader("Último log del mes", logExtUrl, sourceRow));

  const logContentEl = document.createElement("div");
  logContentEl.className = "yaa-qi-log-content";
  logContentEl.appendChild(buildLogContent(log));
  logSection.appendChild(logContentEl);

  popup.appendChild(logSection);

  const footer = document.createElement("p");
  footer.className = "yaa-qi-footer";
  footer.textContent = "Wisphub Yaa Companion";
  popup.appendChild(footer);

  return popup;
}

function positionPopup(popup, cursorX, cursorY) {
  document.documentElement.appendChild(popup);
  const rect = popup.getBoundingClientRect();
  const margin = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = cursorX + 16;
  let arrowClass = "yaa-qi--arrow-left";

  if (left + rect.width > vw - margin) {
    left = cursorX - rect.width - 16;
    arrowClass = "yaa-qi--arrow-right";
  }

  let top = cursorY - 20;
  if (top + rect.height > vh - margin) {
    top = vh - rect.height - margin;
  }
  top = Math.max(margin, top);
  left = Math.max(margin, left);

  popup.classList.add(arrowClass);
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

function removeActivePopup() {
  if (activeLogController) {
    activeLogController.abort();
    activeLogController = null;
  }
  if (activePopup) {
    activePopup.remove();
    activePopup = null;
  }
}

function selectRow(row) {
  if (row === selectedRow) {
    return;
  }
  if (selectedRow) {
    selectedRow.classList.remove("selected");
  }
  selectedRow = row;
  row.classList.add("selected");
}

function attachPopupHoverListeners(popup) {
  popup.addEventListener("mouseenter", () => clearTimeout(leaveTimer));
  popup.addEventListener("mouseleave", () => {
    leaveTimer = setTimeout(removeActivePopup, 200);
  });
}

async function showPopup(rowData, sourceRow, cursorX, cursorY) {
  removeActivePopup();

  const placeholder = document.createElement("div");
  placeholder.className = POPUP_CLASS;

  const loadingText = document.createElement("span");
  loadingText.className = "yaa-qi-empty";
  loadingText.textContent = "Cargando...";
  placeholder.appendChild(loadingText);

  positionPopup(placeholder, cursorX, cursorY);
  attachPopupHoverListeners(placeholder);
  activePopup = placeholder;

  try {
    const quickInfo = await requestQuickInfo(rowData.idServicio);
    if (activePopup !== placeholder) {
      return;
    }
    const data = { ...quickInfo, log: undefined };
    const full = buildPopupEl(rowData, data, sourceRow);
    full.style.left = placeholder.style.left;
    full.style.top = placeholder.style.top;
    const arrowClass = placeholder.classList.contains("yaa-qi--arrow-right")
      ? "yaa-qi--arrow-right"
      : "yaa-qi--arrow-left";
    full.classList.add(arrowClass);
    attachPopupHoverListeners(full);
    placeholder.replaceWith(full);
    activePopup = full;

    const logContentEl = full.querySelector(".yaa-qi-log-content");
    fetchClientLog(rowData.username, rowData.idServicio).then((log) => {
      if (activePopup !== full || !logContentEl) {
        return;
      }
      logContentEl.replaceChildren(buildLogContent(log));
    });
  } catch {
    removeActivePopup();
  }
}

function parseTicketRowData(row) {
  const userCell = row.querySelector("td.usuario");
  const serviceSlug = (userCell?.textContent || "").trim().replace(/\s+/g, "");
  if (!serviceSlug) {
    return null;
  }

  const atIdx = serviceSlug.indexOf("@");
  const idServicio = atIdx >= 0 ? serviceSlug.slice(0, atIdx) : serviceSlug;
  const domain = atIdx >= 0 ? serviceSlug.slice(atIdx + 1).toLowerCase() : "";

  if (!idServicio || !/^\d+$/.test(idServicio)) {
    return null;
  }

  const clientCell = row.querySelector("td.cliente");
  const nombre = (clientCell?.textContent || "").trim() || serviceSlug;

  return { idServicio, username: serviceSlug, nombre, domain };
}

function buildMichoacanPopupEl(rowData) {
  const popup = document.createElement("div");
  popup.className = POPUP_CLASS;

  const header = document.createElement("div");
  header.className = "yaa-qi-header";

  const titleEl = document.createElement("div");
  titleEl.className = "yaa-qi-title";
  titleEl.textContent = rowData.nombre;
  header.appendChild(titleEl);

  const subtitleEl = document.createElement("div");
  subtitleEl.className = "yaa-qi-subtitle";
  subtitleEl.textContent = `ID: ${rowData.idServicio}`;
  header.appendChild(subtitleEl);

  popup.appendChild(header);
  popup.appendChild(buildDivider());

  const msgSection = document.createElement("div");
  msgSection.className = "yaa-qi-section";
  const msgEl = document.createElement("p");
  msgEl.className = "yaa-qi-empty";
  msgEl.textContent = "Vista rápida no disponible para cuentas de Michoacán";
  msgSection.appendChild(msgEl);
  popup.appendChild(msgSection);

  const footer = document.createElement("p");
  footer.className = "yaa-qi-footer";
  footer.textContent = "Wisphub Yaa Companion";
  popup.appendChild(footer);

  return popup;
}

async function showTicketPopup(rowData, sourceRow, cursorX, cursorY) {
  if (MICHOACAN_DOMAINS.includes(rowData.domain)) {
    removeActivePopup();
    const popup = buildMichoacanPopupEl(rowData);
    positionPopup(popup, cursorX, cursorY);
    attachPopupHoverListeners(popup);
    activePopup = popup;
    return;
  }
  await showPopup(rowData, sourceRow, cursorX, cursorY);
}

function attachTbodyHover(tbody, parseFn, showFn) {
  let lastRow = null;

  tbody.addEventListener("mousemove", (event) => {
    lastCursorX = event.clientX;
    lastCursorY = event.clientY;
  });

  tbody.addEventListener("mouseover", (event) => {
    if (!quickInfoEnabled) {
      return;
    }
    const row = event.target.closest("tr");
    if (!row || row === lastRow) {
      return;
    }
    lastRow = row;
    clearTimeout(hoverTimer);

    const rowData = parseFn(row);
    if (!rowData?.idServicio) {
      return;
    }

    hoverTimer = setTimeout(() => {
      showFn(rowData, row, lastCursorX, lastCursorY);
    }, quickInfoDelay);
  });

  tbody.addEventListener("mouseleave", () => {
    lastRow = null;
    clearTimeout(hoverTimer);
    leaveTimer = setTimeout(removeActivePopup, 300);
  });
}

export function initClientQuickInfo(settings) {
  updateQuickInfoState(settings || {});
  if (isInitialized) {
    return;
  }
  const tbody = document.querySelector("#lista-clientes tbody");
  if (!tbody) {
    return;
  }
  isInitialized = true;
  activeTbody = tbody;
  window.addEventListener("scroll", removeActivePopup, { passive: true, capture: true });
  attachTbodyHover(tbody, parseRowData, showPopup);
}

export function updateClientQuickInfoSettings(settings) {
  updateQuickInfoState(settings || {});
  if (!quickInfoEnabled && activeTbody) {
    activeTbody.dispatchEvent(new Event("mouseleave"));
  }
}

export function initTicketQuickInfo(settings) {
  updateQuickInfoState(settings || {});
  if (isTicketInitialized) {
    return;
  }
  const tbody = document.querySelector("#data-table-tickets tbody");
  if (!tbody) {
    return;
  }
  isTicketInitialized = true;
  ticketActiveTbody = tbody;
  window.addEventListener("scroll", removeActivePopup, { passive: true, capture: true });
  attachTbodyHover(tbody, parseTicketRowData, showTicketPopup);
}

export function updateTicketQuickInfoSettings(settings) {
  updateQuickInfoState(settings || {});
  if (!quickInfoEnabled && ticketActiveTbody) {
    ticketActiveTbody.dispatchEvent(new Event("mouseleave"));
  }
}

export const __testables__ = {
  normalizeQuickInfoDelay,
  parseRowData,
  formatSaldo,
  detectEquipmentType,
};
