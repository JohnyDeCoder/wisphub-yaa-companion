export function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

export function removeAccents(str) {
  return String(str || "").normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
