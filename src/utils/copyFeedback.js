const COPIED_CLASS = "wisphub-yaa-action-btn-copied";
const FEEDBACK_DURATION_MS = 2000;

/**
 * Show a checkmark icon on a copy button for a few seconds, then restore it.
 * @param {HTMLElement} button - The action button element
 */
export function showCopySuccess(button) {
  if (!button || button.classList.contains(COPIED_CLASS)) {
    return;
  }

  button.classList.add(COPIED_CLASS);
  button.setAttribute("data-original-title-bak", button.title || "");
  button.title = "Copiado";

  setTimeout(() => {
    button.classList.remove(COPIED_CLASS);
    const original = button.getAttribute("data-original-title-bak") || "";
    button.title = original;
    button.removeAttribute("data-original-title-bak");
  }, FEEDBACK_DURATION_MS);
}
