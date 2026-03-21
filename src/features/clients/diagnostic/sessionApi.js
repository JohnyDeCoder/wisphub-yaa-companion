import {
  extractCoordinatesFromText,
  extractMapUrlFromText,
} from "../../../utils/maps.js";
import { normalizeText } from "../../../utils/tableHelpers.js";
import {
  hasTorchTraffic,
  selectBetterTorchSnapshot,
} from "./torchSnapshotQuality.js";

const DEFAULT_POLL_TIMEOUT_MS = 20000;
const DEFAULT_POLL_INTERVAL_MS = 800;
const DEFAULT_FETCH_INIT = Object.freeze({
  method: "GET",
  credentials: "same-origin",
});

const TASK_SUCCESS_STATES = new Set(["SUCCESS", "COMPLETED", "DONE"]);
const TASK_FAILURE_STATES = new Set([
  "FAILURE",
  "ERROR",
  "REVOKED",
  "CANCELLED",
]);
const TASK_PENDING_STATES = new Set([
  "PENDING",
  "STARTED",
  "RETRY",
  "PROGRESS",
  "RUNNING",
  "QUEUED",
]);
const TORCH_INTERFACE_GUESSES = Object.freeze([
  "ether1",
  "ether2",
  "sfp1",
  "bridge",
  "bridge1",
]);
const DEFAULT_TORCH_SAMPLES_PER_ATTEMPT = 3;
const DEFAULT_TORCH_SAMPLE_DELAY_MS = 700;
const MAX_PING_SAMPLES = 8;
const DEFAULT_PING_SAMPLE_DELAY_MS = 220;

const IPV4_RE = /\b(?:(?:\d{1,3}\.){3}\d{1,3})\b/;
const TASK_URL_RE = /\/task\/([^/\s"'<>]+)\/status\//i;
const TASK_ID_ASSIGN_RE =
  /task[_-]?id(?:["'\]\s:=]|&quot;)+(?:["'])?([a-z0-9-]{6,})/i;
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/;

const REQUEST_URL_REGEXES = Object.freeze({
  "/get/ping/":
    /(?:https?:\/\/[^\s"'<>]+)?(\/get\/ping\/?(?:\?[^"'<>]+)?)/i,
  "/get/torch/":
    /(?:https?:\/\/[^\s"'<>]+)?(\/get\/torch\/?(?:\?[^"'<>]+)?)/i,
});

const PING_CONTEXT_SELECTORS = Object.freeze({
  id_router: ["#id_router", 'input[name="id_router"]', "[data-id-router]"],
  empresa_id: ["#empresa_id", 'input[name="empresa_id"]', "[data-empresa-id]"],
  ip: ["#ip", "#id_ip", 'input[name="ip"]', '[data-field="ip"]'],
  arp_ping: [
    "#arp_ping",
    "#id_arp_ping",
    'input[name="arp_ping"]',
    'input[name="arp_ping"]:checked',
    'input[name="tipo_ping"]:checked',
  ],
  interface: [
    "#interface",
    "#id_interface",
    "#id_interfaces",
    'input[name="interface"]',
    'input[name="interfaces"]',
    'select[name="interface"]',
    'select[name="interfaces"]',
  ],
  username: ["#username", 'input[name="username"]', '[data-field="username"]'],
  count: ["#count", "#id_count", "#id_packets", 'input[name="count"]'],
});

const TORCH_CONTEXT_SELECTORS = Object.freeze({
  id_router: ["#id_router", 'input[name="id_router"]', "[data-id-router]"],
  empresa_id: ["#empresa_id", 'input[name="empresa_id"]', "[data-empresa-id]"],
  interface: [
    "#interface",
    "#id_interface",
    "#id_interfaces",
    'input[name="interface"]',
    'input[name="interfaces"]',
    'select[name="interface"]',
    'select[name="interfaces"]',
  ],
  src_address: [
    "#src_address",
    "#id_src_address",
    'input[name="src_address"]',
    'input[name="src-address"]',
    '[data-field="src_address"]',
  ],
  dst_address: [
    "#dst_address",
    "#id_dst_address",
    'input[name="dst_address"]',
    'input[name="dst-address"]',
    '[data-field="dst_address"]',
  ],
  username: ["#username", 'input[name="username"]', '[data-field="username"]'],
});

const MAP_ADDRESS_SELECTORS = [
  "#direccion",
  ".direccion",
  '[data-field="direccion"]',
  '[name="direccion"]',
];
const MAP_COORDINATE_SELECTORS = [
  "#coordenadas",
  ".coordenadas",
  '[data-field="coordenadas"]',
  '[name="coordenadas"]',
];
const MAP_IP_SELECTORS = ["#ip", ".ip", '[data-field="ip"]', '[name="ip"]'];
const MAP_PHONE_SELECTORS = [
  'a[href^="tel:"]',
  "#telefono",
  ".telefono",
  '[data-field="telefono"]',
];
const MAP_ADDRESS_LABEL_RE = new RegExp(
  [
    "direcci[oó]n\\s*[:-]\\s*(.+?)",
    "(?=\\s+(?:tel[eé]fono|c[oó]mo\\s+llegar|coordenadas|",
    "ip(?:\\s+en\\s+mapa)?|enlaces\\s+r[aá]pidos|copyright)\\b|$)",
  ].join(""),
  "i",
);

function resolveFetchImpl(options = {}) {
  return options.fetchImpl || fetch;
}

function buildFetchInit(init = {}) {
  const mergedInit = {
    ...DEFAULT_FETCH_INIT,
    ...init,
  };

  if (init?.signal) {
    mergedInit.signal = init.signal;
  }

  return mergedInit;
}

function isObject(value) {
  return typeof value === "object" && value !== null;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createAbortError() {
  const error = new Error("[SessionApi] Diagnostic request aborted");
  error.name = "AbortError";
  return error;
}

function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

function sleepWithAbort(ms, signal) {
  throwIfAborted(signal);

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      if (signal) {
        signal.removeEventListener("abort", abortListener);
      }
      resolve();
    }, ms);

    function abortListener() {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", abortListener);
      reject(createAbortError());
    }

    if (signal) {
      signal.addEventListener("abort", abortListener, { once: true });
    }
  });
}

function resolveNow(options = {}) {
  return options.nowFn || Date.now;
}

function resolveSleepFn(options = {}) {
  return options.sleepFn || sleep;
}

function getSafeWindowOrigin() {
  if (typeof window === "undefined" || !window.location?.origin) {
    return "https://wisphub.local";
  }
  return window.location.origin;
}

function buildHttpError(url, response) {
  const status = Number.isFinite(response?.status) ? response.status : 0;
  const statusText = normalizeText(response?.statusText) || "Unknown Error";
  return new Error(
    `[SessionApi] Request failed (${status} ${statusText}) for ${url}`,
  );
}

async function fetchText(url, options = {}) {
  throwIfAborted(options.signal);
  const fetchImpl = resolveFetchImpl(options);
  const response = await fetchImpl(
    url,
    buildFetchInit({
      ...options.requestInit,
      signal: options.signal,
    }),
  );
  if (!response?.ok) {
    throw buildHttpError(url, response);
  }
  return response.text();
}

async function fetchJson(url, options = {}) {
  throwIfAborted(options.signal);
  const fetchImpl = resolveFetchImpl(options);
  const response = await fetchImpl(
    url,
    buildFetchInit({
      ...options.requestInit,
      signal: options.signal,
    }),
  );
  if (!response?.ok) {
    throw buildHttpError(url, response);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error(
      `[SessionApi] Invalid JSON response for ${url}: ${error?.message || "parse failed"}`,
      { cause: error },
    );
  }
}

function parseHtmlDocument(html) {
  const parser = new DOMParser();
  return parser.parseFromString(String(html || ""), "text/html");
}

function getNodeText(node) {
  if (!node) {
    return "";
  }

  if (node instanceof HTMLInputElement) {
    const inputType = normalizeText(node.type).toLowerCase();
    if (inputType === "checkbox" || inputType === "radio") {
      return node.checked ? "true" : "false";
    }
  }

  if (node instanceof HTMLSelectElement) {
    return normalizeText(node.value);
  }

  const candidate = normalizeText(node.value || node.getAttribute?.("value"));
  if (candidate) {
    return candidate;
  }

  return normalizeText(node.textContent);
}

function getFirstTextFromSelectors(doc, selectors = []) {
  for (const selector of selectors) {
    const node = doc.querySelector(selector);
    const value = getNodeText(node);
    if (value) {
      return value;
    }
  }

  return "";
}

function removeEmptyValues(params) {
  return Object.entries(params).reduce((accumulator, [key, value]) => {
    const normalized = normalizeText(value);
    if (normalized) {
      accumulator[key] = normalized;
    }
    return accumulator;
  }, {});
}

function parseQueryParamsFromUrl(url) {
  if (!url) {
    return {};
  }

  const origin = getSafeWindowOrigin();
  const parsed = new URL(url, origin);
  const output = {};
  parsed.searchParams.forEach((value, key) => {
    output[key] = normalizeText(value);
  });
  return removeEmptyValues(output);
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeInlineScriptHtml(html) {
  return String(html || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");
}

function normalizePrimitiveInlineValue(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "";
  }

  if (/^(?:true|false)$/i.test(normalized)) {
    return normalized.toLowerCase();
  }

  if (/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    return normalized;
  }

  return "";
}

function extractInlineDataLiteral(html, requestPath) {
  const source = decodeInlineScriptHtml(html);
  const normalizedPath = String(requestPath || "").replace(/\/$/, "");
  if (!normalizedPath) {
    return "";
  }

  const urlRegex = new RegExp(
    `url\\s*:\\s*["']${escapeRegExp(normalizedPath)}\\/?["']`,
    "ig",
  );
  let match = urlRegex.exec(source);

  while (match) {
    const tail = source.slice(match.index, match.index + 6000);
    const dataMatch =
      tail.match(/data\s*:\s*\{([\s\S]*?)\}\s*,/i) ||
      tail.match(/data\s*:\s*\{([\s\S]*?)\}/i);
    if (dataMatch?.[1]) {
      return dataMatch[1];
    }
    match = urlRegex.exec(source);
  }

  return "";
}

function extractInlineDataParams(html, requestPath) {
  const literal = extractInlineDataLiteral(html, requestPath);
  if (!literal) {
    return {};
  }

  const output = {};
  const pairRegex =
    /["']?([a-z0-9_-]+)["']?\s*:\s*(?:"([^"]*)"|'([^']*)'|([a-z0-9_.@-]+))/gi;
  let match = pairRegex.exec(literal);

  while (match) {
    const key = normalizeText(match[1]);
    const doubleQuoted = normalizeText(match[2]);
    const singleQuoted = normalizeText(match[3]);
    const rawLiteral = normalizeText(match[4]);
    const quotedValue = doubleQuoted || singleQuoted;
    const primitiveValue = normalizePrimitiveInlineValue(rawLiteral);
    const value = quotedValue || primitiveValue;

    if (key && value) {
      output[key] = value;
    }

    match = pairRegex.exec(literal);
  }

  return removeEmptyValues(output);
}

function buildRequestUrl(requestPath, params) {
  const search = new URLSearchParams(params);
  const query = search.toString();
  if (!query) {
    return requestPath;
  }
  return `${requestPath}?${query}`;
}

function extractInlineRequestUrl(html, requestPath) {
  const regex = REQUEST_URL_REGEXES[requestPath];
  if (!regex) {
    return "";
  }

  const normalizedHtml = decodeInlineScriptHtml(html);
  const match = normalizedHtml.match(regex);
  if (!match?.[1]) {
    return "";
  }

  const origin = getSafeWindowOrigin();
  const parsed = new URL(match[1], origin);
  return `${parsed.pathname}${parsed.search}`;
}

function parseContextFromHtml({
  html,
  requestPath,
  selectorsByField,
  requiredFields,
}) {
  const doc = parseHtmlDocument(html);
  const inlineUrl = extractInlineRequestUrl(html, requestPath);
  const inlineParams = parseQueryParamsFromUrl(inlineUrl);
  const inlineDataParams = extractInlineDataParams(html, requestPath);
  const fallbackParams = {};

  Object.entries(selectorsByField).forEach(([field, selectors]) => {
    fallbackParams[field] = getFirstTextFromSelectors(doc, selectors);
  });

  const params = removeEmptyValues({
    ...fallbackParams,
    ...inlineDataParams,
    ...inlineParams,
  });

  const missingFields = requiredFields.filter((field) => !params[field]);
  if (missingFields.length > 0) {
    throw new Error(
      `[SessionApi] Missing ${requestPath} context fields: ${missingFields.join(", ")}`,
    );
  }

  return {
    requestPath,
    requestUrl: buildRequestUrl(requestPath, params),
    params,
  };
}

function sanitizeInterfaceValue(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "";
  }

  const lower = normalized.toLowerCase();
  if (
    /^-+$/.test(normalized) ||
    /^seleccion/i.test(lower) ||
    lower === "none" ||
    lower === "null" ||
    lower === "undefined"
  ) {
    return "";
  }

  const compactToken = normalized.match(/^[a-z0-9_.:-]+/i)?.[0] || "";
  if (compactToken && compactToken !== normalized) {
    return compactToken;
  }

  return normalized.trim();
}

function extractInterfaceCandidatesFromDocument(
  doc,
  selectors = TORCH_CONTEXT_SELECTORS.interface,
) {
  if (!doc) {
    return [];
  }

  const candidates = [];
  const seen = new Set();

  const pushCandidate = (value) => {
    const sanitized = sanitizeInterfaceValue(value);
    if (!sanitized || seen.has(sanitized)) {
      return;
    }
    seen.add(sanitized);
    candidates.push(sanitized);
  };

  selectors.forEach((selector) => {
    doc.querySelectorAll(selector).forEach((node) => {
      if (node instanceof HTMLSelectElement) {
        const selectedOption = node.options[node.selectedIndex];
        pushCandidate(selectedOption?.value || selectedOption?.textContent);
        Array.from(node.options).forEach((option) => {
          pushCandidate(option.value || option.textContent);
        });
        return;
      }

      pushCandidate(getNodeText(node));
    });
  });

  return candidates;
}

function isInternalServerError(error) {
  return /Request failed \(500/i.test(normalizeText(error?.message));
}

function isTorchInterfaceErrorMessage(value) {
  const message = normalizeText(value).toLowerCase();
  if (!message) {
    return false;
  }

  return (
    message.includes("interface") &&
    (message.includes("ambiguous") ||
      message.includes("does not match any value") ||
      message.includes("more than one possible value"))
  );
}

function pushTorchAttempt(attempts, seen, label, params) {
  const requestUrl = buildRequestUrl("/get/torch/", params);
  if (seen.has(requestUrl)) {
    return;
  }
  seen.add(requestUrl);
  attempts.push({ label, params });
}

function buildTorchAttempts(baseParams, interfaceCandidates = []) {
  const attempts = [];
  const seen = new Set();
  const normalizedBase = { ...baseParams };
  delete normalizedBase.interface;

  const validCandidates = interfaceCandidates
    .map((candidate) => sanitizeInterfaceValue(candidate))
    .filter(Boolean);

  validCandidates.forEach((candidate) => {
    pushTorchAttempt(attempts, seen, `candidate:${candidate}`, {
      ...normalizedBase,
      interface: candidate,
    });
  });
  TORCH_INTERFACE_GUESSES.forEach((candidate) => {
    pushTorchAttempt(attempts, seen, `guess:${candidate}`, {
      ...normalizedBase,
      interface: candidate,
    });
  });

  return attempts;
}

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}

function normalizeBooleanValue(value, fallback = "false") {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "on") {
    return "true";
  }
  if (normalized === "false" || normalized === "0" || normalized === "off") {
    return "false";
  }
  return fallback;
}

function normalizeCountValue(value, fallback = "4") {
  const parsed = Number.parseInt(normalizeText(value), 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return String(parsed);
  }
  return fallback;
}

function attachRequestUrl(context) {
  return {
    ...context,
    requestUrl: buildRequestUrl(context.requestPath, context.params),
  };
}

export function parsePingPageContextFromHtml(html) {
  const context = parseContextFromHtml({
    html,
    requestPath: "/get/ping/",
    selectorsByField: PING_CONTEXT_SELECTORS,
    requiredFields: ["id_router", "empresa_id", "ip"],
  });

  const params = {
    ...context.params,
    interface: sanitizeInterfaceValue(context.params.interface),
    arp_ping: normalizeBooleanValue(context.params.arp_ping, "false"),
    count: normalizeCountValue(context.params.count, "4"),
  };

  return attachRequestUrl({
    ...context,
    params,
  });
}

export function parseTorchPageContextFromHtml(html) {
  const doc = parseHtmlDocument(html);
  const context = parseContextFromHtml({
    html,
    requestPath: "/get/torch/",
    selectorsByField: TORCH_CONTEXT_SELECTORS,
    requiredFields: ["id_router", "empresa_id"],
  });

  const interfaceCandidates = extractInterfaceCandidatesFromDocument(doc);
  const sanitizedInterface =
    sanitizeInterfaceValue(context.params.interface) || interfaceCandidates[0] || "";
  const params = {
    ...context.params,
  };
  if (sanitizedInterface) {
    params.interface = sanitizedInterface;
  } else {
    delete params.interface;
  }

  return attachRequestUrl({
    ...context,
    params,
    interfaceCandidates,
  });
}

function extractTaskIdFromTaskStartPayload(payload) {
  if (!isObject(payload)) {
    return "";
  }

  const direct = normalizeText(payload.task_id || payload.taskId || payload.id);
  if (direct) {
    return direct;
  }

  if (isObject(payload.task)) {
    return normalizeText(payload.task.id || payload.task.task_id);
  }

  return "";
}

function normalizeTaskState(payload) {
  if (Array.isArray(payload)) {
    return "SUCCESS";
  }

  if (typeof payload === "string") {
    const normalized = normalizeText(payload).toUpperCase();
    return normalized || "PENDING";
  }

  if (!isObject(payload)) {
    return "PENDING";
  }

  const envelope = isObject(payload.task) ? payload.task : payload;
  const normalizedStatus = normalizeText(
    envelope.status ||
      envelope.state ||
      envelope.task_status ||
      envelope.taskState ||
      envelope.result_status,
  ).toUpperCase();

  if (normalizedStatus) {
    return normalizedStatus;
  }

  if (
    envelope.success === true ||
    envelope.ready === true ||
    envelope.complete
  ) {
    return "SUCCESS";
  }

  if (
    envelope.success === false ||
    envelope.error ||
    envelope.traceback ||
    envelope.failed
  ) {
    return "FAILURE";
  }

  if ("result" in envelope || "data" in envelope || "payload" in envelope) {
    return "SUCCESS";
  }

  return "PENDING";
}

function extractTaskPayloadData(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isObject(payload)) {
    return payload ?? null;
  }

  const envelope = isObject(payload.task) ? payload.task : payload;

  if (envelope.result !== undefined) {
    return envelope.result;
  }
  if (envelope.data !== undefined) {
    return envelope.data;
  }
  if (envelope.payload !== undefined) {
    return envelope.payload;
  }

  return envelope;
}

function extractTaskErrorMessage(payload) {
  if (!isObject(payload)) {
    return "";
  }

  const envelope = isObject(payload.task) ? payload.task : payload;
  const candidates = [
    envelope.error,
    envelope.message,
    envelope.detail,
    envelope.traceback,
    typeof envelope.result === "string" ? envelope.result : "",
  ];

  for (const candidate of candidates) {
    const text = normalizeText(candidate);
    if (text) {
      return text;
    }
  }

  if (Array.isArray(envelope.messages)) {
    return envelope.messages
      .map((message) => normalizeText(message))
      .join(" | ");
  }

  return "";
}

export function normalizeInternalTaskStatus(payload) {
  const status = normalizeTaskState(payload);
  const isSuccess = TASK_SUCCESS_STATES.has(status);
  const isFailure = TASK_FAILURE_STATES.has(status);
  const isPending = TASK_PENDING_STATES.has(status);

  return {
    status,
    isSuccess,
    isFailure,
    isFinal: isSuccess || isFailure || !isPending,
    data: isSuccess ? extractTaskPayloadData(payload) : null,
    errorMessage: isFailure ? extractTaskErrorMessage(payload) : "",
  };
}

function resolvePollTimeout(timeoutMs) {
  if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
    return timeoutMs;
  }
  return DEFAULT_POLL_TIMEOUT_MS;
}

function resolvePollInterval(intervalMs) {
  if (Number.isFinite(intervalMs) && intervalMs > 0) {
    return intervalMs;
  }
  return DEFAULT_POLL_INTERVAL_MS;
}

function buildTaskStatusUrl(taskId) {
  return `/task/${encodeURIComponent(taskId)}/status/`;
}

export async function pollInternalTask(
  taskId,
  timeoutMs = DEFAULT_POLL_TIMEOUT_MS,
  intervalMs = DEFAULT_POLL_INTERVAL_MS,
  options = {},
) {
  const normalizedTaskId = normalizeText(taskId);
  if (!normalizedTaskId) {
    throw new Error("[SessionApi] taskId is required for polling");
  }

  const nowFn = resolveNow(options);
  const sleepFn = resolveSleepFn(options);
  const timeout = resolvePollTimeout(timeoutMs);
  const interval = resolvePollInterval(intervalMs);
  const deadline = nowFn() + timeout;
  const statusUrl = buildTaskStatusUrl(normalizedTaskId);
  const signal = options.signal;

  while (nowFn() <= deadline) {
    throwIfAborted(signal);
    const payload = await fetchJson(statusUrl, options);
    const normalized = normalizeInternalTaskStatus(payload);

    if (normalized.isSuccess) {
      return normalized.data;
    }

    if (normalized.isFailure) {
      const message = normalized.errorMessage || normalized.status;
      throw new Error(
        `[SessionApi] Task ${normalizedTaskId} failed: ${message}`,
      );
    }

    if (sleepFn === sleep) {
      await sleepWithAbort(interval, signal);
    } else {
      await sleepFn(interval);
      throwIfAborted(signal);
    }
  }

  throw new Error(
    `[SessionApi] Task ${normalizedTaskId} timed out after ${timeout}ms`,
  );
}

function normalizeTaskIdFromHtml(doc, html) {
  const fromElement = getFirstTextFromSelectors(doc, [
    "#task-id",
    'input[name="task_id"]',
    'input[name="task-id"]',
    "[data-task-id]",
  ]);
  if (fromElement) {
    return fromElement;
  }

  const fromTaskUrl = String(html || "").match(TASK_URL_RE);
  if (fromTaskUrl?.[1]) {
    return normalizeText(fromTaskUrl[1]);
  }

  const fromAssign = String(html || "").match(TASK_ID_ASSIGN_RE);
  if (fromAssign?.[1]) {
    return normalizeText(fromAssign[1]);
  }

  return "";
}

function resolveRequestUrlFromContext(context, attempts) {
  if (!isObject(context)) {
    throw new Error("[SessionApi] Invalid diagnostic context");
  }

  const requestPath = normalizeText(context.requestPath);
  const params = new URLSearchParams(context.params || {});
  const parsedAttempts = Number.parseInt(String(attempts), 10);

  if (Number.isFinite(parsedAttempts) && parsedAttempts > 0) {
    const attemptsKey = ["count", "cantidad", "attempts", "intentos"].find(
      (key) => params.has(key),
    );
    if (attemptsKey) {
      params.set(attemptsKey, String(parsedAttempts));
    }
  }

  if (requestPath) {
    const query = params.toString();
    return query ? `${requestPath}?${query}` : requestPath;
  }

  const requestUrl = normalizeText(context.requestUrl);
  if (!requestUrl) {
    throw new Error("[SessionApi] Missing internal request URL");
  }

  const origin = getSafeWindowOrigin();
  const parsed = new URL(requestUrl, origin);
  const query = params.toString() || parsed.search.slice(1);
  return query ? `${parsed.pathname}?${query}` : parsed.pathname;
}

async function startInternalTask(requestUrl, options = {}) {
  const payload = await fetchJson(requestUrl, options);
  const taskId = extractTaskIdFromTaskStartPayload(payload);
  if (!taskId) {
    throw new Error(
      `[SessionApi] Task start did not return task_id (${requestUrl})`,
    );
  }
  return taskId;
}

function normalizePingSamples(rawResult) {
  if (Array.isArray(rawResult)) {
    return rawResult;
  }
  if (Array.isArray(rawResult?.result)) {
    return rawResult.result;
  }
  if (Array.isArray(rawResult?.ping_result)) {
    return rawResult.ping_result;
  }
  if (isObject(rawResult)) {
    return [rawResult];
  }
  return [];
}

function normalizePingMetrics(samples) {
  const first = samples[0] || {};
  return {
    host: normalizeText(first.host || first.address),
    packetLoss: normalizeText(
      first["packet-loss"] || first.packet_loss || first.packetLoss,
    ),
    minRtt: normalizeText(first["min-rtt"] || first.min_rtt || first.minRtt),
    avgRtt: normalizeText(first["avg-rtt"] || first.avg_rtt || first.avgRtt),
    maxRtt: normalizeText(first["max-rtt"] || first.max_rtt || first.maxRtt),
    ttl: normalizeText(first.ttl),
    size: normalizeText(first.size),
    time: normalizeText(first.time),
  };
}

function capPingSampleTarget(value, fallback = 1) {
  const resolved = toPositiveInteger(value, fallback);
  return Math.min(MAX_PING_SAMPLES, resolved);
}

function appendPingSamples(existing, incoming, maxSamples) {
  const output = Array.isArray(existing) ? [...existing] : [];
  const source = Array.isArray(incoming) ? incoming : [];

  for (let index = 0; index < source.length; index += 1) {
    if (output.length >= maxSamples) {
      break;
    }
    output.push(source[index]);
  }

  return output;
}

async function collectAdditionalPingSamples(
  context,
  currentSamples,
  targetSamples,
  options = {},
) {
  const baseParams = isObject(context?.params) ? context.params : {};
  const fallbackContext = {
    ...context,
    params: {
      ...baseParams,
      count: "1",
    },
  };
  const delayMs = toPositiveInteger(
    options.pingSampleDelayMs,
    DEFAULT_PING_SAMPLE_DELAY_MS,
  );
  let samples = Array.isArray(currentSamples) ? [...currentSamples] : [];

  while (samples.length < targetSamples) {
    throwIfAborted(options.signal);
    const probeRequestUrl = resolveRequestUrlFromContext(fallbackContext, 1);
    const probeTaskId = await startInternalTask(probeRequestUrl, options);
    const probeRawResult = await pollInternalTask(
      probeTaskId,
      options.timeoutMs,
      options.intervalMs,
      options,
    );
    const probeError = normalizeTaskResultError(probeRawResult);
    if (probeError) {
      break;
    }
    const probeSamples = normalizePingSamples(probeRawResult);
    samples = appendPingSamples(samples, probeSamples, targetSamples);
    if (samples.length >= targetSamples) {
      break;
    }
    await sleepWithAbort(delayMs, options.signal);
  }

  return samples;
}

function normalizeTorchFlows(rawResult) {
  if (Array.isArray(rawResult)) {
    return rawResult;
  }
  if (Array.isArray(rawResult?.result?.torch_ip_result)) {
    return rawResult.result.torch_ip_result;
  }
  if (Array.isArray(rawResult?.torch_ip_result)) {
    return rawResult.torch_ip_result;
  }
  return [];
}

function normalizeTorchTotals(rawResult) {
  const total = isObject(rawResult?.total)
    ? rawResult.total
    : isObject(rawResult?.result?.total)
      ? rawResult.result.total
      : {};
  return {
    tx: normalizeText(total.tx),
    rx: normalizeText(total.rx),
    txPackets: normalizeText(total.tx_packets || total["tx-packets"]),
    rxPackets: normalizeText(total.rx_packets || total["rx-packets"]),
  };
}

function normalizeTaskResultError(rawResult) {
  if (typeof rawResult === "string") {
    const errorText = normalizeText(rawResult);
    if (!errorText) {
      return "";
    }
    return /error|fail|invalid|timeout|no such|unable/i.test(errorText)
      ? errorText
      : "";
  }

  if (!isObject(rawResult)) {
    return "";
  }

  const candidates = [
    rawResult.error,
    rawResult.message,
    rawResult.detail,
    rawResult.traceback,
    typeof rawResult.result === "string" ? rawResult.result : "",
  ];
  for (const candidate of candidates) {
    const text = normalizeText(candidate);
    if (text) {
      return text;
    }
  }

  return "";
}

function normalizeWeeklyTrafficRows(rawResult) {
  if (Array.isArray(rawResult)) {
    return rawResult;
  }
  if (Array.isArray(rawResult?.rows)) {
    return rawResult.rows;
  }
  if (Array.isArray(rawResult?.table)) {
    return rawResult.table;
  }
  if (Array.isArray(rawResult?.result)) {
    return rawResult.result;
  }
  return [];
}

function buildClientScopedPath(basePath, serviceSlug, serviceId) {
  const slug = normalizeText(serviceSlug);
  const id = normalizeText(serviceId);
  if (!slug || !id) {
    throw new Error(
      `[SessionApi] Invalid service context for ${basePath}: slug/id required`,
    );
  }
  return `${basePath}${slug}/${id}/`;
}

function extractMapDirectionsUrl(doc) {
  const links = Array.from(doc.querySelectorAll("a[href]"));
  for (const link of links) {
    const href = normalizeText(link.getAttribute("href"));
    const fromHref = extractMapUrlFromText(href);
    if (fromHref) {
      return fromHref;
    }

    const text = normalizeText(link.textContent);
    const fromText = extractMapUrlFromText(text);
    if (fromText) {
      return fromText;
    }
  }
  return "";
}

function getCleanBodyText(doc) {
  const body = doc?.body;
  if (!body) {
    return "";
  }

  const clone = body.cloneNode(true);
  clone
    .querySelectorAll("script, style, noscript, template")
    .forEach((node) => node.remove());
  return String(clone.textContent || "")
    .replace(/\u00a0/g, " ")
    .trim();
}

function isValidIpv4(value) {
  const parts = String(value || "").split(".");
  if (parts.length !== 4) {
    return false;
  }
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) {
      return false;
    }
    const numeric = Number.parseInt(part, 10);
    return numeric >= 0 && numeric <= 255;
  });
}

function extractMapIp(doc) {
  const fromSelectors = getFirstTextFromSelectors(doc, MAP_IP_SELECTORS);
  const selectorMatch = fromSelectors.match(IPV4_RE);
  if (selectorMatch?.[0] && isValidIpv4(selectorMatch[0])) {
    return selectorMatch[0];
  }

  const cleanText = getCleanBodyText(doc);
  const labeledMatch = cleanText.match(
    /\bip(?:\s+en\s+mapa)?\s*[:-]\s*((?:\d{1,3}\.){3}\d{1,3})\b/i,
  );
  if (labeledMatch?.[1] && isValidIpv4(labeledMatch[1])) {
    return labeledMatch[1];
  }

  return "";
}

function extractMapPhone(doc) {
  const phoneNode = doc.querySelector('a[href^="tel:"]');
  if (phoneNode) {
    const text = normalizeText(phoneNode.textContent);
    if (text) {
      return text;
    }
    const href = normalizeText(phoneNode.getAttribute("href"));
    return href.replace(/^tel:/i, "");
  }

  const fromSelectors = getFirstTextFromSelectors(doc, MAP_PHONE_SELECTORS);
  const selectorMatch = fromSelectors.match(PHONE_RE);
  if (selectorMatch?.[0]) {
    return normalizeText(selectorMatch[0]);
  }

  const cleanText = getCleanBodyText(doc);
  const labeledMatch = cleanText.match(
    /\btel[eé]fono\s*[:-]\s*([+()\d][\d\s().-]{7,}\d)/i,
  );
  if (labeledMatch?.[1]) {
    return normalizeText(labeledMatch[1]);
  }

  return "";
}

function extractMapAddress(doc) {
  const fromSelectors = getFirstTextFromSelectors(doc, MAP_ADDRESS_SELECTORS);
  if (fromSelectors) {
    return fromSelectors;
  }

  const cleanText = getCleanBodyText(doc);
  const labeledMatch = cleanText.match(MAP_ADDRESS_LABEL_RE);
  if (labeledMatch?.[1]) {
    return normalizeText(labeledMatch[1]);
  }

  return "";
}

function extractMapCoordinates(doc) {
  const fromSelectors = getFirstTextFromSelectors(
    doc,
    MAP_COORDINATE_SELECTORS,
  );
  const parsedFromSelectors = extractCoordinatesFromText(fromSelectors);
  if (parsedFromSelectors) {
    return parsedFromSelectors;
  }

  return extractCoordinatesFromText(getCleanBodyText(doc)) || "";
}

export function parseMapSnapshotFromHtml(html) {
  const doc = parseHtmlDocument(html);
  return {
    address: extractMapAddress(doc),
    phone: extractMapPhone(doc),
    coordinates: extractMapCoordinates(doc),
    directionsUrl: extractMapDirectionsUrl(doc),
    ip: extractMapIp(doc),
  };
}

export async function fetchPingPageContext(
  serviceSlug,
  serviceId,
  options = {},
) {
  const pageUrl = buildClientScopedPath(
    "/clientes/ping/",
    serviceSlug,
    serviceId,
  );
  const html = await fetchText(pageUrl, options);
  const context = parsePingPageContextFromHtml(html);
  return {
    ...context,
    pageUrl,
  };
}

export async function fetchTorchPageContext(
  serviceSlug,
  serviceId,
  options = {},
) {
  const pageUrl = buildClientScopedPath(
    "/clientes/torch/",
    serviceSlug,
    serviceId,
  );
  const html = await fetchText(pageUrl, options);
  const context = parseTorchPageContextFromHtml(html);
  return {
    ...context,
    pageUrl,
  };
}

export async function runPingSample(context, attempts = 0, options = {}) {
  const requestUrl = resolveRequestUrlFromContext(context, attempts);
  const taskId = await startInternalTask(requestUrl, options);
  const rawResult = await pollInternalTask(
    taskId,
    options.timeoutMs,
    options.intervalMs,
    options,
  );
  let samples = normalizePingSamples(rawResult);
  const error = normalizeTaskResultError(rawResult);
  const expandSamples = options.pingExpandSamples === true;
  const targetSamples = capPingSampleTarget(
    options.pingSampleTarget,
    attempts > 0 ? attempts : 1,
  );

  if (!error && expandSamples && samples.length > 0 && samples.length < targetSamples) {
    samples = await collectAdditionalPingSamples(
      context,
      samples,
      targetSamples,
      options,
    );
  }

  return {
    taskId,
    samples,
    metrics: normalizePingMetrics(samples),
    error,
    raw: rawResult,
  };
}

export async function runTorchSnapshot(context, options = {}) {
  const contextParams = {
    ...(context?.params || {}),
  };
  const interfaceCandidates = Array.isArray(context?.interfaceCandidates)
    ? context.interfaceCandidates
      .map((candidate) => sanitizeInterfaceValue(candidate))
      .filter(Boolean)
    : [];
  const normalizedInterface = sanitizeInterfaceValue(contextParams.interface);
  const mergedCandidates = normalizedInterface
    ? [normalizedInterface, ...interfaceCandidates]
    : interfaceCandidates;

  const attempts = buildTorchAttempts(contextParams, mergedCandidates);
  const buildContext = (params) => ({
    ...context,
    params,
  });
  const samplesPerAttempt = toPositiveInteger(
    options.torchSamplesPerAttempt,
    DEFAULT_TORCH_SAMPLES_PER_ATTEMPT,
  );
  const shouldSearchForBetterSnapshot = samplesPerAttempt > 1;
  const sampleDelayMs = toPositiveInteger(
    options.torchSampleDelayMs,
    DEFAULT_TORCH_SAMPLE_DELAY_MS,
  );
  let lastStartError = null;
  let bestSnapshot = null;

  for (let index = 0; index < attempts.length; index += 1) {
    const attempt = attempts[index];
    const isLastAttempt = index === attempts.length - 1;

    for (
      let sampleIndex = 0;
      sampleIndex < samplesPerAttempt;
      sampleIndex += 1
    ) {
      const isLastSample = sampleIndex === samplesPerAttempt - 1;
      const requestContext = buildContext(attempt.params);
      const requestUrl = resolveRequestUrlFromContext(requestContext);

      try {
        const taskId = await startInternalTask(requestUrl, options);
        const rawResult = await pollInternalTask(
          taskId,
          options.timeoutMs,
          options.intervalMs,
          options,
        );
        const errorText = normalizeTaskResultError(rawResult);
        const snapshot = {
          taskId,
          flows: normalizeTorchFlows(rawResult),
          totals: normalizeTorchTotals(rawResult),
          error: errorText,
          raw: rawResult,
        };

        if (isTorchInterfaceErrorMessage(errorText)) {
          bestSnapshot = selectBetterTorchSnapshot(bestSnapshot, snapshot);
          if (!isLastAttempt) {
            break;
          }
          continue;
        }

        if (!shouldSearchForBetterSnapshot) {
          return snapshot;
        }

        bestSnapshot = selectBetterTorchSnapshot(bestSnapshot, snapshot);
        if (hasTorchTraffic(snapshot)) {
          return snapshot;
        }

        if (!isLastSample) {
          await sleepWithAbort(sampleDelayMs, options.signal);
        }
      } catch (error) {
        lastStartError = error;
        const isInterfaceError = isTorchInterfaceErrorMessage(error?.message);
        const isServerError = isInternalServerError(error);

        if ((isInterfaceError || isServerError) && !isLastSample) {
          await sleepWithAbort(sampleDelayMs, options.signal);
          continue;
        }

        if ((isInterfaceError || isServerError) && !isLastAttempt) {
          break;
        }

        throw error;
      }
    }
  }

  if (bestSnapshot) {
    return bestSnapshot;
  }

  throw lastStartError || new Error("[SessionApi] Torch snapshot failed");
}

export async function fetchWeeklyTraffic(serviceSlug, serviceId, options = {}) {
  const pageUrl = buildClientScopedPath(
    "/trafico/semana/servicio/",
    serviceSlug,
    serviceId,
  );
  const html = await fetchText(pageUrl, options);
  const doc = parseHtmlDocument(html);
  const taskId = normalizeTaskIdFromHtml(doc, html);

  if (!taskId) {
    throw new Error("[SessionApi] Weekly traffic page did not provide task_id");
  }

  const rawResult = await pollInternalTask(
    taskId,
    options.timeoutMs,
    options.intervalMs,
    options,
  );

  return {
    taskId,
    rows: normalizeWeeklyTrafficRows(rawResult),
    raw: rawResult,
    pageUrl,
  };
}

export async function fetchMapSnapshot(serviceSlug, serviceId, options = {}) {
  const pageUrl = buildClientScopedPath(
    "/clientes-mapa/",
    serviceSlug,
    serviceId,
  );
  const html = await fetchText(pageUrl, options);
  return {
    pageUrl,
    ...parseMapSnapshotFromHtml(html),
  };
}

export const __testables__ = {
  parsePingPageContextFromHtml,
  parseTorchPageContextFromHtml,
  parseMapSnapshotFromHtml,
  normalizeInternalTaskStatus,
};
