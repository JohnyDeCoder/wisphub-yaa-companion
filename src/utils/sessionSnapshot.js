function normalizeCookieFingerprint(cookie) {
  const safeName = String(cookie?.name || "").toLowerCase();
  const safeDomain = String(cookie?.domain || "").toLowerCase();
  const safePath = String(cookie?.path || "/");
  const safeSecure = cookie?.secure === true ? "1" : "0";
  const safeHttpOnly = cookie?.httpOnly === true ? "1" : "0";
  const safeSameSite = String(cookie?.sameSite || "");
  const safeExpiration = Number.isFinite(cookie?.expirationDate)
    ? String(Number(cookie.expirationDate))
    : "session";
  return [
    safeName,
    safeDomain,
    safePath,
    safeSecure,
    safeHttpOnly,
    safeSameSite,
    safeExpiration,
    cookie?.value || "",
  ].join("|");
}

export function buildSnapshotFingerprint(cookies) {
  return (cookies || [])
    .map((cookie) => normalizeCookieFingerprint(cookie))
    .sort()
    .join("||");
}

export function shouldPersistSessionSnapshot(existingSnapshot, nextCookies, options = {}) {
  if (!existingSnapshot || !Array.isArray(existingSnapshot.cookies)) {
    return true;
  }

  const existingFingerprint = buildSnapshotFingerprint(existingSnapshot.cookies);
  const nextFingerprint = buildSnapshotFingerprint(nextCookies);
  if (existingFingerprint !== nextFingerprint) {
    return true;
  }

  return options.refreshTimestamp === true;
}

