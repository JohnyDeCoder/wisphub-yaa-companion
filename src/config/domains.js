export const ALLOWED_DOMAINS = ["wisphub.io", "wisphub.app"];

export function isWispHubDomain(url) {
  if (!url) {
    return false;
  }
  try {
    const hostname = new URL(url).hostname;
    return ALLOWED_DOMAINS.some((domain) => hostname.includes(domain));
  } catch {
    return false;
  }
}

export function getDomainKey(hostname) {
  if (!hostname) {
    return null;
  }
  for (const domain of ALLOWED_DOMAINS) {
    if (hostname.includes(domain)) {
      return domain;
    }
  }
  return null;
}

export function getApiBaseUrl(domainKey) {
  return `https://api.${domainKey}/api/`;
}
