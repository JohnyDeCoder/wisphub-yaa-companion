export const ALLOWED_DOMAINS = ["wisphub.io", "wisphub.app"];

function normalizeHostname(input) {
  if (!input) {
    return "";
  }

  const raw = String(input).trim().toLowerCase();
  if (!raw) {
    return "";
  }

  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return raw.replace(/^\.+|\.+$/g, "");
  }
}

function matchesAllowedDomain(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function isWispHubDomain(hostOrUrl) {
  const hostname = normalizeHostname(hostOrUrl);
  if (!hostname) {
    return false;
  }

  return ALLOWED_DOMAINS.some((domain) => matchesAllowedDomain(hostname, domain));
}

export function getDomainKey(hostOrUrl) {
  const hostname = normalizeHostname(hostOrUrl);
  if (!hostname) {
    return null;
  }

  for (const domain of ALLOWED_DOMAINS) {
    if (matchesAllowedDomain(hostname, domain)) {
      return domain;
    }
  }

  return null;
}

export function getApiBaseUrl(domainKey) {
  if (!domainKey) {
    return "";
  }

  return `https://api.${domainKey}/api/`;
}
