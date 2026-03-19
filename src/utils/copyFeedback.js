const COPIED_CLASS = "wisphub-yaa-action-btn-copied";
const FEEDBACK_DURATION_MS = 2000;
const DISABLED_ARIA_ATTR = "aria-disabled";
const DISABLED_DATA_ATTR = "data-disabled";
const PREVIOUS_ARIA_ATTR = "data-wisphub-prev-aria-disabled";
const PREVIOUS_DATA_ATTR = "data-wisphub-prev-data-disabled";
const MISSING_ATTR_VALUE = "__wisphub-missing__";

function stashDisabledAttributes(button) {
  const previousAria = button.getAttribute(DISABLED_ARIA_ATTR);
  const previousData = button.getAttribute(DISABLED_DATA_ATTR);
  button.setAttribute(
    PREVIOUS_ARIA_ATTR,
    previousAria === null ? MISSING_ATTR_VALUE : previousAria,
  );
  button.setAttribute(
    PREVIOUS_DATA_ATTR,
    previousData === null ? MISSING_ATTR_VALUE : previousData,
  );
}

function restoreDisabledAttributes(button) {
  const previousAria = button.getAttribute(PREVIOUS_ARIA_ATTR);
  const previousData = button.getAttribute(PREVIOUS_DATA_ATTR);

  if (previousAria === null || previousAria === MISSING_ATTR_VALUE) {
    button.removeAttribute(DISABLED_ARIA_ATTR);
  } else {
    button.setAttribute(DISABLED_ARIA_ATTR, previousAria);
  }

  if (previousData === null || previousData === MISSING_ATTR_VALUE) {
    button.removeAttribute(DISABLED_DATA_ATTR);
  } else {
    button.setAttribute(DISABLED_DATA_ATTR, previousData);
  }

  button.removeAttribute(PREVIOUS_ARIA_ATTR);
  button.removeAttribute(PREVIOUS_DATA_ATTR);
}

/**
 * Show a checkmark icon on a copy button for a few seconds, then restore it.
 * @param {HTMLElement} button - The action button element
 */
export function showCopySuccess(button) {
  if (!button || button.classList.contains(COPIED_CLASS)) {
    return;
  }

  button.classList.add(COPIED_CLASS);
  stashDisabledAttributes(button);
  button.setAttribute(DISABLED_ARIA_ATTR, "true");
  button.setAttribute(DISABLED_DATA_ATTR, "true");
  button.setAttribute("data-original-title-bak", button.title || "");
  button.title = "Copiado";

  setTimeout(() => {
    button.classList.remove(COPIED_CLASS);
    restoreDisabledAttributes(button);
    const original = button.getAttribute("data-original-title-bak") || "";
    button.title = original;
    button.removeAttribute("data-original-title-bak");
  }, FEEDBACK_DURATION_MS);
}
