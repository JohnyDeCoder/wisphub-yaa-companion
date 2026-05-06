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

const RESTORABLE_SESSION_COOKIE_RE = /(session|auth|jwt|remember|sid)/i;
const NON_SESSION_TOKEN_COOKIE_RE = /csrf/i;

function isRestorableSessionCookie(cookie) {
  const name = String(cookie?.name || "");
  return (
    Boolean(name) &&
    RESTORABLE_SESSION_COOKIE_RE.test(name) &&
    !NON_SESSION_TOKEN_COOKIE_RE.test(name)
  );
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

export function hasUsableSessionCookies(snapshot, nowSeconds = Date.now() / 1000) {
  const cookies = Array.isArray(snapshot?.cookies) ? snapshot.cookies : [];
  if (cookies.length === 0) {
    return false;
  }

  return cookies.some((cookie) => {
    const expiresAt = Number(cookie?.expirationDate);
    const isUnexpired =
      !Number.isFinite(expiresAt) || expiresAt <= 0 || expiresAt > nowSeconds;
    return isUnexpired && isRestorableSessionCookie(cookie);
  });
}
