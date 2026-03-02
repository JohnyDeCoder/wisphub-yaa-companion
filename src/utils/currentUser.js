const SIDEBAR_SELECTOR = ".user-sidebar .pull-left.info p";
const ADMIN_NAMES = ["admin", "administrador"];

export function getCurrentUserName() {
  const el = document.querySelector(SIDEBAR_SELECTOR);
  return el?.textContent?.trim() || "";
}

export function isAdminUser(name) {
  const lower = (name || "").trim().toLowerCase();
  return ADMIN_NAMES.includes(lower);
}
