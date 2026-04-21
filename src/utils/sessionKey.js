import { normalizeValue } from "./string.js";

export function buildProfileSnapshotKey(domainKey, username) {
  const normalizedDomain = normalizeValue(domainKey);
  const raw = String(username || "");
  const atIdx = raw.indexOf("@");
  const accountDomain = atIdx >= 0 ? normalizeValue(raw.slice(atIdx + 1)) : "";
  if (!normalizedDomain || !accountDomain) {
    return "";
  }
  return `${normalizedDomain}::${accountDomain}`;
}
