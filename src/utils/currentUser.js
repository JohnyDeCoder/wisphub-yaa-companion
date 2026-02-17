const SIDEBAR_SELECTOR = ".user-sidebar .pull-left.info p";

export function getCurrentUserName() {
  const el = document.querySelector(SIDEBAR_SELECTOR);
  return el?.textContent?.trim() || "";
}
