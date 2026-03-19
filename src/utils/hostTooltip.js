import { EXTENSION_NAME } from "../config/constants.js";

const TOOLTIP_DISMISS_BOUND_ATTR = "data-wisphub-tooltip-dismiss-bound";

export function formatBrandedTitle(baseText) {
  const normalized = String(baseText || "").trim();
  if (!normalized) {
    return EXTENSION_NAME;
  }

  if (normalized.includes(EXTENSION_NAME)) {
    return normalized;
  }

  return `${normalized} — ${EXTENSION_NAME}`;
}

function hideTooltip(element) {
  const $ = window.jQuery;
  if (!$ || !$.fn || typeof $.fn.tooltip !== "function") {
    return;
  }

  try {
    $(element).tooltip("hide");
  } catch {
    // Ignore hide failures to avoid breaking interactions.
  }
}

function bindTooltipDismissHandlers(element) {
  if (element.getAttribute(TOOLTIP_DISMISS_BOUND_ATTR) === "1") {
    return;
  }

  const dismiss = () => {
    hideTooltip(element);
  };

  const dismissAndBlur = () => {
    hideTooltip(element);
    if (typeof element.blur === "function") {
      element.blur();
    }
  };

  element.addEventListener("click", dismissAndBlur);
  element.addEventListener("mouseleave", dismiss);
  element.addEventListener("blur", dismiss);
  element.addEventListener("touchend", dismiss, { passive: true });
  element.setAttribute(TOOLTIP_DISMISS_BOUND_ATTR, "1");
}

export function applyHostTooltip(element, baseText, options = {}) {
  if (!element) {
    return;
  }

  const placement = options.placement || "top";
  const brandedTitle = formatBrandedTitle(baseText);

  element.title = brandedTitle;
  element.setAttribute("data-original-title", brandedTitle);
  element.setAttribute("data-toggle", "tooltip");
  element.setAttribute("data-placement", placement);
  element.setAttribute("data-container", "body");
  bindTooltipDismissHandlers(element);

  const $ = window.jQuery;
  if (!$ || !$.fn || typeof $.fn.tooltip !== "function") {
    return;
  }

  try {
    const $element = $(element);
    if ($element.data("bs.tooltip")) {
      $element.tooltip("destroy");
    }

    $element.tooltip({
      container: "body",
      placement,
      trigger: "hover focus",
    });
  } catch {
    // Ignore tooltip init issues and keep native title fallback.
  }
}
