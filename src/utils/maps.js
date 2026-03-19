const URL_RE = /https?:\/\/[^\s<>"')]+/gi;
const COORDINATE_PAIR_RE = /(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/g;
const MAPS_COORD_EMBED_RE = /!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/i;
const MAPS_URL_HINT_RE =
  /(?:maps\.app\.goo\.gl|(?:www\.)?maps\.google\.|(?:www\.)?google\.[^/\s]+\/maps)/i;
const MAPS_URL_TOKEN_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:maps\.app\.goo\.gl|maps\.google\.[^/\s]+|google\.[^/\s]+\/maps)[^\s<>"')]*/i;

function toFiniteNumber(value) {
  const num = Number.parseFloat(String(value || "").trim());
  return Number.isFinite(num) ? num : null;
}

export function isValidCoordinatePair(lat, lng) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function normalizeCoordinateNumber(value) {
  return String(value).replace(/(?:\.0+|(\.\d+?)0+)$/, "$1");
}

function normalizeCoordinatePair(lat, lng) {
  return `${normalizeCoordinateNumber(lat)},${normalizeCoordinateNumber(lng)}`;
}

function hasDecimalSeparator(value) {
  return String(value || "").includes(".");
}

function hasExplicitSign(value) {
  return /^[+-]/.test(String(value || "").trim());
}

function isLikelyCoordinateCandidate(rawLat, rawLng) {
  const latText = String(rawLat || "").trim();
  const lngText = String(rawLng || "").trim();
  if (!latText || !lngText) {
    return false;
  }

  // Avoid false positives such as "$1,020" or address fragments like "19, 120".
  // Accept plain integer pairs only when at least one side carries an explicit sign.
  if (
    !hasDecimalSeparator(latText) &&
    !hasDecimalSeparator(lngText) &&
    !hasExplicitSign(latText) &&
    !hasExplicitSign(lngText)
  ) {
    return false;
  }

  return true;
}

function decodeSafe(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function extractCoordinatesFromText(value) {
  const text = decodeSafe(String(value || "").trim());
  if (!text) {
    return null;
  }

  for (const match of text.matchAll(COORDINATE_PAIR_RE)) {
    const rawLat = match[1];
    const rawLng = match[2];
    if (!isLikelyCoordinateCandidate(rawLat, rawLng)) {
      continue;
    }

    const lat = toFiniteNumber(rawLat);
    const lng = toFiniteNumber(rawLng);
    if (lat === null || lng === null) {
      continue;
    }
    if (isValidCoordinatePair(lat, lng)) {
      return normalizeCoordinatePair(lat, lng);
    }
  }

  const embeddedMatch = text.match(MAPS_COORD_EMBED_RE);
  if (embeddedMatch) {
    const lat = toFiniteNumber(embeddedMatch[1]);
    const lng = toFiniteNumber(embeddedMatch[2]);
    if (lat !== null && lng !== null && isValidCoordinatePair(lat, lng)) {
      return normalizeCoordinatePair(lat, lng);
    }
  }

  return null;
}

export function normalizeCoordinatesValue(value) {
  return extractCoordinatesFromText(value);
}

function extractMapsUrl(value) {
  const text = String(value || "").trim();
  if (!text) {
    return null;
  }

  const standaloneMatch = text.match(MAPS_URL_TOKEN_RE);
  if (standaloneMatch && standaloneMatch[0] === text) {
    return normalizeMapUrl(text);
  }

  const urls = text.match(URL_RE) || [];
  const matchedHttpUrl = urls.find((url) => MAPS_URL_HINT_RE.test(url));
  if (matchedHttpUrl) {
    return normalizeMapUrl(matchedHttpUrl);
  }

  const tokenMatch = text.match(MAPS_URL_TOKEN_RE);
  if (tokenMatch?.[0]) {
    return normalizeMapUrl(tokenMatch[0]);
  }

  return null;
}

export function extractMapUrlFromText(value) {
  return extractMapsUrl(value);
}

function normalizeMapUrl(url) {
  const value = String(url || "").trim();
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `https://${value.replace(/^\/+/, "")}`;
}

export function buildGoogleMapsUrl(coords) {
  return `https://www.google.com/maps?q=${encodeURIComponent(coords)}`;
}

export function getGoogleMapsDestination(value) {
  const coords = extractCoordinatesFromText(value);
  if (coords) {
    return buildGoogleMapsUrl(coords);
  }

  const mapUrl = extractMapsUrl(value);
  if (mapUrl) {
    return mapUrl;
  }

  return null;
}

export function extractServiceIdFromServiceSlug(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }

  const match = normalized.match(/^0*(\d+)(?:@|$)/i);
  if (!match) {
    return "";
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? String(parsed) : "";
}

export function buildClientMapUrlFromServiceSlug(value, origin) {
  const normalized = String(value || "").trim();
  const baseOrigin =
    String(origin || (typeof window !== "undefined" ? window.location.origin : "")).trim();
  const serviceId = extractServiceIdFromServiceSlug(normalized);

  if (!normalized || !baseOrigin || !serviceId) {
    return "";
  }

  return `${baseOrigin}/clientes-mapa/${normalized}/${serviceId}/`;
}
