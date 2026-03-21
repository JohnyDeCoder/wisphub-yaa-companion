import { normalizeText } from "../../../utils/tableHelpers.js";

export const PING_HEALTH = Object.freeze({
  UNKNOWN: "unknown",
  HEALTHY: "healthy",
  DEGRADED: "degraded",
  DOWN: "down",
});

export function parsePacketLossPercentage(value) {
  const raw = normalizeText(value);
  if (!raw) {
    return Number.NaN;
  }

  const normalized = raw.replace("%", "").replace(",", ".").trim();
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function resolvePingHealth(packetLossValue) {
  if (!Number.isFinite(packetLossValue)) {
    return PING_HEALTH.UNKNOWN;
  }

  if (packetLossValue >= 100) {
    return PING_HEALTH.DOWN;
  }

  if (packetLossValue > 0) {
    return PING_HEALTH.DEGRADED;
  }

  return PING_HEALTH.HEALTHY;
}
