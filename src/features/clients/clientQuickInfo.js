import { MESSAGE_TYPES } from "../../config/messages.js";
import { postBridgeMessage } from "../../utils/pageBridge.js";

const CACHE_TTL = 30_000;
const POPUP_CLASS = "wisphub-yaa-quick-info-popup";
const DEFAULT_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 6_000;

const quickInfoCache = new Map();
const pendingRequests = new Map();

let hoverTimer = null;
let activePopup = null;
let leaveTimer = null;
let isInitialized = false;
let activeTbody = null;
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
  const nameCell = row.querySelector("td:nth-child(3)");
  const nombre = nameCell?.textContent?.trim() || username || idServicio;
  const ipCell = row.querySelector("td.ip");
  const ip = ipCell?.textContent?.trim() || "";
  return { idServicio, username, nombre, ip };
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
      resolve({ saldo: null, tickets: null });
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
  const safeResult = result || { saldo: null, tickets: null };
  quickInfoCache.set(idServicio, { data: safeResult, ts: Date.now() });
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

function buildPopupEl(rowData, data, sourceRow) {
  const { nombre, idServicio, ip, username } = rowData;
  const { saldo, tickets } = data;

  const popup = document.createElement("div");
  popup.className = POPUP_CLASS;

  const header = document.createElement("div");
  header.className = "yaa-qi-header";

  const titleEl = document.createElement("div");
  titleEl.className = "yaa-qi-title";
  titleEl.textContent = nombre;
  header.appendChild(titleEl);

  const subtitleEl = document.createElement("div");
  subtitleEl.className = "yaa-qi-subtitle";
  subtitleEl.textContent = `ID: ${idServicio}`;
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

  const saldoInfo = formatSaldo(saldo);
  const payEl = document.createElement("span");
  if (saldoInfo) {
    payEl.className = `yaa-qi-meta-item yaa-qi-meta-item--${saldoInfo.type}`;
    payEl.textContent = saldoInfo.text;
  } else {
    payEl.className = "yaa-qi-meta-item yaa-qi-meta-item--unknown";
    payEl.textContent = "Saldo no disponible";
  }
  meta.appendChild(payEl);
  if (username) {
    const extLink = document.createElement("a");
    extLink.href = `${window.location.origin}/clientes/ver/${username}/#retab3`;
    extLink.target = "_blank";
    extLink.rel = "noopener noreferrer";
    extLink.className = "wisphub-yaa-view-client-link";
    extLink.setAttribute("aria-label", "Ver cliente");
    extLink.addEventListener("click", () => selectRow(sourceRow));
    meta.appendChild(extLink);
  }

  popup.appendChild(meta);

  const ticketSection = document.createElement("div");
  ticketSection.className = "yaa-qi-section";

  const ticketHeader = document.createElement("div");
  ticketHeader.className = "yaa-qi-section-header";
  ticketHeader.textContent = "Tickets en progreso";
  ticketSection.appendChild(ticketHeader);

  const ticketList = Array.isArray(tickets) ? tickets : [];
  if (tickets === null) {
    const empty = document.createElement("p");
    empty.className = "yaa-qi-empty";
    empty.textContent = "Sin datos de tickets";
    ticketSection.appendChild(empty);
  } else if (ticketList.length === 0) {
    const empty = document.createElement("p");
    empty.className = "yaa-qi-empty";
    empty.textContent = "Sin tickets activos";
    ticketSection.appendChild(empty);
  } else {
    ticketList.forEach((ticket) => {
      const link = document.createElement("a");
      link.href = `${window.location.origin}/tickets/ver/${ticket.id_ticket}/#retab3`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "yaa-qi-ticket-link";
      link.textContent = `#${ticket.id_ticket} \u2014 ${ticket.asunto || "Sin asunto"}`;
      link.addEventListener("click", () => selectRow(sourceRow));
      ticketSection.appendChild(link);
    });
  }

  popup.appendChild(ticketSection);

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
    const data = await requestQuickInfo(rowData.idServicio);
    if (activePopup !== placeholder) {
      return;
    }
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
  } catch {
    removeActivePopup();
  }
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

    const rowData = parseRowData(row);
    if (!rowData?.idServicio) {
      return;
    }

    hoverTimer = setTimeout(() => {
      showPopup(rowData, row, lastCursorX, lastCursorY);
    }, quickInfoDelay);
  });

  tbody.addEventListener("mouseleave", () => {
    lastRow = null;
    clearTimeout(hoverTimer);
    leaveTimer = setTimeout(removeActivePopup, 300);
  });
}

export function updateClientQuickInfoSettings(settings) {
  updateQuickInfoState(settings || {});
  if (!quickInfoEnabled && activeTbody) {
    activeTbody.dispatchEvent(new Event("mouseleave"));
  }
}

export const __testables__ = {
  normalizeQuickInfoDelay,
  parseRowData,
  formatSaldo,
};
