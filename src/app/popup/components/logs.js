import { browserAPI } from "../../../utils/browser.js";
import {
  LOG_STORAGE_KEY as STORAGE_KEY,
  MAX_LOG_ENTRIES as MAX_ENTRIES,
  pruneExpiredLogs,
} from "../../../utils/logStorage.js";

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

function sanitizeLogText(value) {
  return String(value || "").trim();
}

function buildLogEntry(level, message, details = {}) {
  const now = new Date();
  const ts = Date.now();
  return {
    time: now.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }),
    level,
    message: sanitizeLogText(message),
    ts,
    feature: sanitizeLogText(details.feature),
    action: sanitizeLogText(details.action),
    pagePath: sanitizeLogText(details.pagePath),
    before: sanitizeLogText(details.before),
    after: sanitizeLogText(details.after),
    kind: sanitizeLogText(details.kind),
    pageUrl: sanitizeLogText(details.pageUrl),
    stateColor: sanitizeLogText(details.stateColor),
    tags: Array.isArray(details.tags)
      ? details.tags.map(sanitizeLogText).filter(Boolean)
      : [],
  };
}

function createLineBreakText(container, firstLine, secondLine) {
  container.append(document.createTextNode(firstLine), document.createElement("br"));
  container.appendChild(document.createTextNode(secondLine));
}

function appendOptionalTextRow(container, label, value, className) {
  const safeValue = sanitizeLogText(value);
  if (!safeValue) {
    return;
  }

  const block = document.createElement("div");
  block.className = className;

  const title = document.createElement("span");
  title.className = "log-state-label";
  title.textContent = label;

  const text = document.createElement("pre");
  text.className = "log-state-text";
  text.textContent = safeValue;

  block.append(title, text);
  container.appendChild(block);
}

function buildAfterStateBlock(value, stateColor) {
  const safeValue = sanitizeLogText(value);
  if (!safeValue) {
    return null;
  }

  const block = document.createElement("div");
  block.className = "log-state log-state--after";
  if (stateColor) {
    block.dataset.color = stateColor;
  }

  const title = document.createElement("span");
  title.className = "log-state-label";
  title.textContent = "Después";

  const text = document.createElement("pre");
  text.className = "log-state-text";
  text.textContent = safeValue;

  block.append(title, text);
  return block;
}

function renderLogEntry(container, entry) {
  const el = document.createElement("article");
  el.className = "log-entry";

  const time = document.createElement("span");
  time.className = "log-time";
  time.textContent = entry.time;

  const dot = document.createElement("span");
  dot.className = `log-dot ${entry.level}`;

  const body = document.createElement("div");
  body.className = "log-body";

  const meta = document.createElement("div");
  meta.className = "log-meta";

  if (entry.feature) {
    const feature = document.createElement("span");
    feature.className = "log-feature";
    feature.textContent = entry.feature;
    meta.appendChild(feature);
  }

  if (entry.tags?.length) {
    entry.tags.forEach((tag) => {
      const el = document.createElement("span");
      el.className = "log-feature";
      el.textContent = tag;
      meta.appendChild(el);
    });
  }

  if (entry.action) {
    const action = document.createElement("span");
    action.className = "log-action";
    action.textContent = entry.action;
    meta.appendChild(action);
  }

  if (meta.childNodes.length > 0) {
    body.appendChild(meta);
  }

  const msg = document.createElement("p");
  msg.className = "log-msg";
  if (entry.pageUrl && entry.pagePath) {
    msg.appendChild(document.createTextNode(`${entry.message} en `));
    const link = document.createElement("a");
    link.href = entry.pageUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.className = "log-msg-link";
    link.textContent = entry.pagePath;
    msg.appendChild(link);
  } else {
    msg.textContent = entry.message;
  }
  body.appendChild(msg);

  if (entry.before || entry.after) {
    const states = document.createElement("div");
    states.className = "log-states";
    appendOptionalTextRow(states, "Antes", entry.before, "log-state");
    const afterBlock = buildAfterStateBlock(entry.after, entry.stateColor);
    if (afterBlock) {
      states.appendChild(afterBlock);
    }
    body.appendChild(states);
  }

  el.append(time, dot, body);
  container.appendChild(el);
}

export async function addLog(level, message, details = {}) {
  const logs = await getLogs();
  logs.push(buildLogEntry(level, message, details));
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
  container.classList.toggle("logs-list--empty", logs.length === 0);

  if (logs.length === 0) {
    const empty = document.createElement("p");
    empty.className = "logs-empty";
    createLineBreakText(
      empty,
      "Sin actividad registrada hoy.",
      "Las acciones que realices aparecerán aquí.",
    );
    container.appendChild(empty);
    return;
  }

  [...logs].reverse().forEach((entry) => {
    renderLogEntry(container, entry);
  });
}
