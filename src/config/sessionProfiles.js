export const SESSION_PROFILE_VARIANTS = Object.freeze({
  "wisphub.io": Object.freeze([
    Object.freeze({
      key: "colima",
      label: "Colima",
      accountDomain: "yaa-internet-by-vw",
    }),
    Object.freeze({
      key: "michoacan",
      label: "Michoacán",
      accountDomain: "vwinternetnetworks",
    }),
  ]),
  "wisphub.app": Object.freeze([
    Object.freeze({
      key: "colima",
      label: "Colima",
      accountDomain: "yaa-connect",
    }),
    Object.freeze({
      key: "michoacan",
      label: "Michoacán",
      accountDomain: "vwinm",
    }),
  ]),
});

export const PROFILE_SWITCH_STORAGE_KEY = "wisphubYaaProfileSwitchPending";
export const PROFILE_SWITCH_MAX_AGE_MS = 60 * 60 * 1000;

const CLIENTS_SECTION_PATH_RE = /^\/clientes(?:\/|$)/i;
const TICKETS_SECTION_PATH_RE = /^\/tickets(?:\/|$)/i;
const INSTALLATIONS_SECTION_PATH_RE = /^\/instalaciones(?:\/|$)/i;
const LOGIN_PATH_RE = /^\/accounts\/login\/?$/i;
const LOGOUT_PATH_RE = /^\/accounts\/logout\/?$/i;

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

export function splitUsername(username) {
  const raw = String(username || "").trim();
  if (!raw) {
    return { localPart: "", accountDomain: "" };
  }

  const atIndex = raw.indexOf("@");
  if (atIndex === -1) {
    return { localPart: raw, accountDomain: "" };
  }

  const localPart = raw.slice(0, atIndex);
  const accountDomain = raw.slice(atIndex + 1);
  return { localPart, accountDomain };
}

export function getSessionProfileVariants(domainKey) {
  return SESSION_PROFILE_VARIANTS[domainKey] || [];
}

export function buildSessionProfilesForDomain(domainKey, currentUsername) {
  const variants = getSessionProfileVariants(domainKey);
  if (variants.length === 0) {
    return [];
  }

  const { localPart, accountDomain } = splitUsername(currentUsername);
  if (!localPart) {
    return [];
  }

  const currentDomain = normalizeValue(accountDomain);
  return variants.map((variant) => {
    const username = `${localPart}@${variant.accountDomain}`;
    return {
      ...variant,
      username,
      isCurrent: currentDomain === normalizeValue(variant.accountDomain),
    };
  });
}

export function resolveSessionProfileLabel(domainKey, username) {
  const { accountDomain } = splitUsername(username);
  const normalizedDomain = normalizeValue(accountDomain);
  const match = getSessionProfileVariants(domainKey).find(
    (variant) => normalizeValue(variant.accountDomain) === normalizedDomain,
  );
  return match?.label || "Perfil";
}

export function isLoginPath(pathname) {
  return LOGIN_PATH_RE.test(String(pathname || "").trim());
}

export function isLogoutPath(pathname) {
  return LOGOUT_PATH_RE.test(String(pathname || "").trim());
}

export function resolveSectionBasePath(pathname) {
  const safePath = String(pathname || "").trim();
  const segmentMatch = safePath.match(/^\/([^/?#]+)(?:\/|$)/);
  const matchedSegment = segmentMatch?.[1] || "";
  const normalizedSegment = normalizeValue(matchedSegment);

  if (CLIENTS_SECTION_PATH_RE.test(safePath) && normalizedSegment === "clientes") {
    return `/${matchedSegment}/`;
  }
  if (TICKETS_SECTION_PATH_RE.test(safePath) && normalizedSegment === "tickets") {
    return `/${matchedSegment}/`;
  }
  if (
    INSTALLATIONS_SECTION_PATH_RE.test(safePath) &&
    normalizedSegment === "instalaciones"
  ) {
    return `/${matchedSegment}/`;
  }
  if (normalizedSegment === "panel") {
    return `/${matchedSegment}/`;
  }
  return "/panel/";
}

export function buildLogoutRedirectUrl(basePath) {
  const targetPath = String(basePath || "/panel/").trim() || "/panel/";
  const loginPath = `/accounts/login/?next=${encodeURIComponent(targetPath)}`;
  return `/accounts/logout/?next=${encodeURIComponent(loginPath)}`;
}
