import { applyHostTooltip } from "../../utils/hostTooltip.js";
import { sendLogToPopup } from "../../utils/logger.js";
import {
  getGoogleMapsDestination,
  normalizeCoordinatesValue,
} from "../../utils/maps.js";

const COORDINATE_FIELD_ID = "id_cliente-coordenadas";
const MAP_BUTTON_ID = "wisphub-yaa-open-coordinates-map-btn";
const COORDINATE_INLINE_CLASS = "wisphub-yaa-coordinates-inline";

let _notify = null;
let _observer = null;
let _debounceTimer = 0;

function log(consoleMsg, popupMsg, level = "info") {
  sendLogToPopup("Coordinates", level, consoleMsg, popupMsg);
}

function triggerChange(element) {
  element.dispatchEvent(new Event("change", { bubbles: true }));
  if (window.jQuery) {
    window.jQuery(element).trigger("change");
  }
}

function normalizeCoordinateField(input) {
  const raw = input?.value?.trim() || "";
  if (!raw) {
    return null;
  }

  const normalized = normalizeCoordinatesValue(raw);
  if (!normalized) {
    return null;
  }

  if (normalized !== raw) {
    input.value = normalized;
    triggerChange(input);
  }

  return normalized;
}

function resolveDestination(input) {
  const normalized = normalizeCoordinateField(input);
  if (normalized) {
    return getGoogleMapsDestination(normalized);
  }

  const raw = input?.value?.trim() || "";
  return getGoogleMapsDestination(raw);
}

function ensureCoordinateInlineContainer(input) {
  if (!input || !input.parentElement) {
    return null;
  }

  const existingContainer = input.closest(`.${COORDINATE_INLINE_CLASS}`);
  if (existingContainer) {
    return existingContainer;
  }

  const container = document.createElement("div");
  container.className = COORDINATE_INLINE_CLASS;
  input.before(container);
  container.appendChild(input);
  return container;
}

function showMissingCoordinateMessage() {
  if (typeof _notify === "function") {
    _notify(
      "No se detectaron coordenadas válidas o enlace de Google Maps",
      "warning",
      3500,
    );
  }
}

function createOpenMapButton(input) {
  const button = document.createElement("button");
  button.type = "button";
  button.id = MAP_BUTTON_ID;
  button.className =
    "wisphub-yaa-action-btn wisphub-yaa-action-btn-map wisphub-yaa-coordinates-open-btn";
  button.setAttribute("aria-label", "Abrir ubicación en Google Maps");
  applyHostTooltip(button, "Abrir ubicación en Google Maps", {
    placement: "top",
  });

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    const destination = resolveDestination(input);
    if (!destination) {
      showMissingCoordinateMessage();
      return;
    }

    window.open(destination, "_blank", "noopener");
  });

  return button;
}

function ensureCoordinateButton() {
  const input = document.getElementById(COORDINATE_FIELD_ID);
  if (!input) {
    return false;
  }

  const inlineContainer = ensureCoordinateInlineContainer(input);
  if (!inlineContainer) {
    return false;
  }

  if (!inlineContainer.querySelector(`#${MAP_BUTTON_ID}`)) {
    inlineContainer.appendChild(createOpenMapButton(input));
    log("Coordinates map button injected", "Botón de coordenadas inyectado");
  }

  return true;
}

function debouncedEnsureCoordinateButton() {
  clearTimeout(_debounceTimer);
  _debounceTimer = window.setTimeout(() => {
    ensureCoordinateButton();
  }, 80);
}

function startObserver() {
  if (_observer) {
    return;
  }

  _observer = new MutationObserver(debouncedEnsureCoordinateButton);
  _observer.observe(document.body, { childList: true, subtree: true });
}

export function initCoordinateMapButton(notifyFn) {
  _notify = notifyFn;
  ensureCoordinateButton();
  startObserver();
}

export const __testables__ = {
  ensureCoordinateInlineContainer,
  ensureCoordinateButton,
};
