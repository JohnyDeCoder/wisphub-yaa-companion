import { MESSAGE_TYPES } from '../config/messages.js';

const FEATURE_LABELS = {
  PriceCalc: 'Precios',
  Formatter: 'Formateador',
  Tickets: 'Tickets',
  Installs: 'Instalaciones',
  Clients: 'Clientes',
};

function buildPopupMessage(tag, popupMsg, consoleMsg) {
  const featureName = FEATURE_LABELS[tag] || tag || 'General';
  const baseMsg = String(popupMsg || consoleMsg || '').trim();

  if (!baseMsg) {
    return `[${featureName}]`;
  }

  if (/^\[[^\]]+\]\s*/.test(baseMsg)) {
    return baseMsg;
  }

  return `[${featureName}] ${baseMsg}`;
}

// consoleMsg: English (dev console), popupMsg: Spanish (popup logs)
export function sendLogToPopup(tag, level, consoleMsg, popupMsg) {
  console.log(`[${tag}][${level}]`, consoleMsg);
  window.postMessage(
    {
      type: MESSAGE_TYPES.LOG_ENTRY,
      level,
      message: buildPopupMessage(tag, popupMsg, consoleMsg),
    },
    '*',
  );
}
