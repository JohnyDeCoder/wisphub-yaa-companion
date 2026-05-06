import { normalizeText } from "./tableHelpers.js";
import { removeAccents } from "./string.js";

const TRAILING_SERVICE_COUNT_RE = /\s*-\s*\d+\s*$/;
const NAME_CASING_OPTIONS = new Set(["upper", "lower", "title"]);
const SPACE_SEPARATOR_ALIASES = new Set(["vacio", "espacio"]);
const RESET_SETTINGS_KEYWORD = "reset";

export const DEFAULT_NAME_COPY_SETTINGS = Object.freeze({
  casing: "upper",
  separator: "_",
});

export function normalizeClientName(rawName, options = {}) {
  const { stripServiceCount = true } = options;
  const normalized = normalizeText(rawName);
  if (!normalized) {
    return "";
  }

  if (!stripServiceCount) {
    return normalized;
  }

  return normalized.replace(TRAILING_SERVICE_COUNT_RE, "").trim();
}

function normalizeSeparatorAliasToken(value) {
  return removeAccents(normalizeText(value)).toLowerCase();
}

function unwrapQuotedValue(rawValue) {
  const value = String(rawValue || "");
  const trimmed = value.trim();
  const quotedMatch = trimmed.match(/^(['"])([\s\S]*)\1$/);
  if (quotedMatch) {
    return quotedMatch[2];
  }
  return value;
}

function normalizeSeparatorValue(rawSeparator, fallback) {
  const fallbackValue = fallback || DEFAULT_NAME_COPY_SETTINGS.separator;
  const source = String(rawSeparator ?? fallbackValue).replace(/\r?\n/g, "");
  const unwrapped = unwrapQuotedValue(source);

  if (/^\s*$/.test(unwrapped)) {
    return " ";
  }

  const aliasToken = normalizeSeparatorAliasToken(unwrapped);
  if (SPACE_SEPARATOR_ALIASES.has(aliasToken)) {
    return " ";
  }

  return unwrapped;
}

function normalizeNameSeparator(rawSeparator) {
  const normalized = normalizeSeparatorValue(
    rawSeparator,
    DEFAULT_NAME_COPY_SETTINGS.separator,
  );
  if (!normalized) {
    return DEFAULT_NAME_COPY_SETTINGS.separator;
  }
  return normalized.slice(0, 20);
}

function sanitizeNameCopySettings(rawSettings) {
  const candidate = rawSettings || {};
  const rawCasing = normalizeText(candidate.casing).toLowerCase();
  const casing = NAME_CASING_OPTIONS.has(rawCasing)
    ? rawCasing
    : DEFAULT_NAME_COPY_SETTINGS.casing;

  return {
    casing,
    separator: normalizeNameSeparator(candidate.separator),
  };
}

function isResetKeyword(value) {
  return normalizeText(value).toLowerCase() === RESET_SETTINGS_KEYWORD;
}

export function resolveNameCopySettingsFromInputs(casingInput, separatorInput) {
  if (casingInput === null) {
    return { status: "cancelled", settings: null, reset: false };
  }

  if (isResetKeyword(casingInput)) {
    return {
      status: "saved",
      settings: { ...DEFAULT_NAME_COPY_SETTINGS },
      reset: true,
    };
  }

  const nextCasing = normalizeText(casingInput).toLowerCase();
  if (!NAME_CASING_OPTIONS.has(nextCasing)) {
    return { status: "invalid", settings: null, reset: false };
  }

  if (separatorInput === null) {
    return { status: "cancelled", settings: null, reset: false };
  }

  if (isResetKeyword(separatorInput)) {
    return {
      status: "saved",
      settings: { ...DEFAULT_NAME_COPY_SETTINGS },
      reset: true,
    };
  }

  const normalizedSeparator = normalizeSeparatorValue(separatorInput, " ");

  return {
    status: "saved",
    settings: sanitizeNameCopySettings({
      casing: nextCasing,
      separator: normalizedSeparator,
    }),
    reset: false,
  };
}

export function loadNameCopySettings(storageKey) {
  try {
    const rawValue = window.localStorage?.getItem(storageKey);
    if (!rawValue) {
      return { ...DEFAULT_NAME_COPY_SETTINGS };
    }

    const parsed = JSON.parse(rawValue);
    return sanitizeNameCopySettings(parsed);
  } catch {
    return { ...DEFAULT_NAME_COPY_SETTINGS };
  }
}

export function saveNameCopySettings(storageKey, settings) {
  try {
    const safeSettings = sanitizeNameCopySettings(settings);
    window.localStorage?.setItem(storageKey, JSON.stringify(safeSettings));
    return safeSettings;
  } catch {
    return sanitizeNameCopySettings(settings);
  }
}

function applyNameCasing(token, casing) {
  if (!token) {
    return "";
  }

  if (casing === "lower") {
    return token.toLowerCase();
  }
  if (casing === "title") {
    return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
  }
  return token.toUpperCase();
}

export function formatProvisioningName(rawName, options = {}) {
  const normalizedName = normalizeClientName(rawName, {
    stripServiceCount: false,
  });
  if (!normalizedName) {
    return "";
  }

  const { casing, separator } = sanitizeNameCopySettings(options);
  const deaccented = normalizedName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const tokens = deaccented
    .replace(/[^A-Za-z0-9\s]+/g, " ")
    .split(/\s+/)
    .map((token) => normalizeText(token))
    .filter(Boolean);

  if (tokens.length === 0) {
    return "";
  }

  return tokens.map((token) => applyNameCasing(token, casing)).join(separator);
}
