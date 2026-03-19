const BRIDGE_CHANNEL = "WISPHUB_YAA_BRIDGE_V1";
const BRIDGE_CHANNEL_FIELD = "__wyacChannel";
const BRIDGE_TOKEN_FIELD = "__wyacToken";
const BRIDGE_TOKEN_KEY = "__WISPHUB_YAA_BRIDGE_TOKEN__";

function getPostTargetOrigin() {
  const origin = window?.location?.origin || "";
  if (!origin || origin === "null") {
    return "*";
  }
  return origin;
}

export function isBridgeMessage(data) {
  return !!data && typeof data === "object" && data[BRIDGE_CHANNEL_FIELD] === BRIDGE_CHANNEL;
}

export function getBridgeToken() {
  const token = window[BRIDGE_TOKEN_KEY];
  return typeof token === "string" ? token : "";
}

export function setBridgeToken(token) {
  if (typeof token !== "string" || token.length < 16) {
    return false;
  }

  window[BRIDGE_TOKEN_KEY] = token;
  return true;
}

export function clearBridgeToken() {
  delete window[BRIDGE_TOKEN_KEY];
}

export function buildBridgeMessage(type, payload = {}, options = {}) {
  const includeToken = options.includeToken !== false;
  const token = options.token || getBridgeToken();

  const message = {
    ...payload,
    type,
    [BRIDGE_CHANNEL_FIELD]: BRIDGE_CHANNEL,
  };

  if (includeToken && token) {
    message[BRIDGE_TOKEN_FIELD] = token;
  }

  return message;
}

export function postBridgeMessage(type, payload = {}, options = {}) {
  const message = buildBridgeMessage(type, payload, options);
  if (options.requireToken && !message[BRIDGE_TOKEN_FIELD]) {
    return false;
  }

  window.postMessage(message, getPostTargetOrigin());
  return true;
}

export function isMessageTokenValid(data, expectedToken) {
  if (!isBridgeMessage(data)) {
    return false;
  }

  if (typeof expectedToken !== "string" || expectedToken.length < 16) {
    return false;
  }

  return data[BRIDGE_TOKEN_FIELD] === expectedToken;
}

export function generateBridgeToken() {
  const cryptoAPI = globalThis?.crypto;
  if (cryptoAPI?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoAPI.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  }

  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
}

export const BRIDGE_META = {
  CHANNEL_FIELD: BRIDGE_CHANNEL_FIELD,
  TOKEN_FIELD: BRIDGE_TOKEN_FIELD,
};

