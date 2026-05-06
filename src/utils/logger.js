import { MESSAGE_TYPES } from "../config/messages.js";
import { postBridgeMessage } from "./pageBridge.js";

const FEATURE_LABELS = {
  PriceCalc: "Precios",
  Formatter: "Formateador",
  Tickets: "Tickets",
  Installs: "Instalaciones",
  Clients: "Clientes",
  Coordinates: "Coordenadas",
  FormGuards: "Guardias",
  Session: "Sesión",
  TicketAutoFill: "Auto-rellenado",
  SpecialTickets: "Tickets especiales",
};

function sanitizeLogMetaValue(value) {
  return String(value || "").trim();
}

// consoleMsg: English (dev console), popupMsg: Spanish (popup logs).
// Pass popupMsg=null to log to console only (no popup entry).
export function sendLogToPopup(tag, level, consoleMsg, popupMsg, details = {}) {
  const feature = FEATURE_LABELS[tag] || tag || "General";
  console.log(`[WYC][${tag}][${level}]`, consoleMsg);
  if (popupMsg == null) {
    return;
  }
  postBridgeMessage(
    MESSAGE_TYPES.LOG_ENTRY,
    {
      level,
      message: String(popupMsg || "").trim(),
      feature,
      action: sanitizeLogMetaValue(details.action),
      pagePath: sanitizeLogMetaValue(details.pagePath),
      before: sanitizeLogMetaValue(details.before),
      after: sanitizeLogMetaValue(details.after),
      kind: sanitizeLogMetaValue(details.kind),
      pageUrl: sanitizeLogMetaValue(details.pageUrl),
      stateColor: sanitizeLogMetaValue(details.stateColor),
      tags: Array.isArray(details.tags) ? details.tags : [],
    },
    { requireToken: false },
  );
}
