// Shared log storage constants and helpers used by bridge.js (content script) and logs.js (popup).
export const LOG_STORAGE_KEY = "wisphubYaaLogs";
export const MAX_LOG_ENTRIES = 50;
export const LOG_TTL = 24 * 60 * 60 * 1000;

export function pruneExpiredLogs(logs) {
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();
  return logs.filter(
    (entry) =>
      entry?.ts &&
      now - entry.ts < LOG_TTL &&
      entry.ts >= todayStartMs,
  );
}
