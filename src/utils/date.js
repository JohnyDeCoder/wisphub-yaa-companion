import { MONTH_NAMES } from "../config/constants.js";

export function getMexicoDate() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }),
  );
}

export function getMexicoMonthName() {
  return MONTH_NAMES[getMexicoDate().getMonth()];
}

export function getMexicoDateFormatted() {
  const date = getMexicoDate();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getMexicoDateTime() {
  const date = getMexicoDate();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function getTodayISO() {
  const d = getMexicoDate();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
