import { browserAPI } from "../../../utils/browser.js";

const STORAGE_KEY = "wisphubYaaLogs"; // chrome.storage key for popup log entries
const MAX_ENTRIES = 50; // Max stored popup log entries before pruning oldest records (default: 50)
const LOG_TTL = 24 * 60 * 60 * 1000; // Log entry lifetime in ms (default: 24h)

function pruneExpiredLogs(logs) {
  const now = Date.now();
  return logs.filter((entry) => entry?.ts && now - entry.ts < LOG_TTL);
}

export async function getLogs() {
  try {
    const result = await browserAPI.storage.local.get(STORAGE_KEY);
    const rawLogs = result[STORAGE_KEY] || [];
    const validLogs = pruneExpiredLogs(rawLogs);

    if (validLogs.length !== rawLogs.length) {
      await browserAPI.storage.local.set({ [STORAGE_KEY]: validLogs });
    }

    return validLogs;
  } catch {
    return [];
  }
}

export async function addLog(level, message) {
  const logs = await getLogs();
  const now = new Date();
  const ts = Date.now();
  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  logs.push({ time, level, message, ts });
  if (logs.length > MAX_ENTRIES) {
    logs.splice(0, logs.length - MAX_ENTRIES);
  }
  await browserAPI.storage.local.set({ [STORAGE_KEY]: logs });
}

export async function clearLogs() {
  await browserAPI.storage.local.set({ [STORAGE_KEY]: [] });
}

export function renderLogs(container, logs) {
  container.replaceChildren();
  logs.forEach((entry) => {
    const el = document.createElement("div");
    el.className = "log-entry";

    const time = document.createElement("span");
    time.className = "log-time";
    time.textContent = entry.time;

    const dot = document.createElement("span");
    dot.className = `log-dot ${entry.level}`;

    const msg = document.createElement("span");
    msg.className = "log-msg";
    msg.textContent = entry.message;

    el.append(time, dot, msg);
    container.appendChild(el);
  });
  container.scrollTop = container.scrollHeight;
}
