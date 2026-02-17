import { EXTENSION_NAME } from "../config/constants.js";

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
