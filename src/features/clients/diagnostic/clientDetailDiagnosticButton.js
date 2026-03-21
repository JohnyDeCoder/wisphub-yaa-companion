import { applyHostTooltip } from "../../../utils/hostTooltip.js";
import { CLIENTS_UI_MESSAGES } from "../../../config/messages.js";
import { extractActiveClientContextFromPage } from "./clientContext.js";
import {
  isDiagnosticFlowRunning,
  runDiagnosticFlowForContext,
} from "./diagnosticFlow.js";

const CLIENT_DETAIL_PATH_RE = /^\/clientes\/ver\/[^/]+\/?$/i;
const BUTTON_CLASS = "wisphub-yaa-diagnostic-header-btn";
const BUTTON_ICON_CLASS = "wisphub-yaa-diagnostic-header-btn-icon";
const BUTTON_LABEL_CLASS = "wisphub-yaa-diagnostic-header-btn-label";
const BUTTON_BETA_CLASS = "wisphub-yaa-beta-badge wisphub-yaa-beta-badge-inline";
const BUTTON_SLOT_CLASS = "wisphub-yaa-diagnostic-header-slot";
const ACTIONS_CLASS = "wisphub-yaa-diagnostic-header-actions";
const SHORTCUTS_CLASS = "wisphub-yaa-diagnostic-header-shortcuts";
const SHORTCUT_BUTTON_CLASS = "wisphub-yaa-diagnostic-header-shortcut-btn";
const TITLE_LAYOUT_CLASS = "wisphub-yaa-diagnostic-header-layout";
const TITLE_LEFT_CLASS = "wisphub-yaa-diagnostic-header-left";
const BUTTON_RUNNING_ATTRIBUTE = "data-wisphub-diagnostic-running";
const DIAGNOSTIC_RUNNING_EVENT = "wisphub-yaa:diagnostic-running";
let headerButtonObserver = null;
let runningEventBound = false;

function isClientDetailPage(pathname = window.location.pathname) {
  return CLIENT_DETAIL_PATH_RE.test(String(pathname || ""));
}

function isRunning(button) {
  return button?.getAttribute(BUTTON_RUNNING_ATTRIBUTE) === "1";
}

function setRunning(button, running) {
  if (!button) {
    return;
  }

  if (running) {
    button.setAttribute(BUTTON_RUNNING_ATTRIBUTE, "1");
    button.setAttribute("disabled", "true");
    button.setAttribute("aria-disabled", "true");
    button.classList.add("is-running");
    return;
  }

  button.removeAttribute(BUTTON_RUNNING_ATTRIBUTE);
  button.removeAttribute("disabled");
  button.removeAttribute("aria-disabled");
  button.classList.remove("is-running");
}

async function runDiagnosticFromHeader(button) {
  if (isRunning(button)) {
    return;
  }

  const clientContext = extractActiveClientContextFromPage();
  setRunning(button, true);

  try {
    await runDiagnosticFlowForContext(clientContext, {
      pingAttempts: 4,
    });
  } catch {
    // Diagnostic flow handles modal errors.
  } finally {
    setRunning(button, false);
  }
}

function createHeaderButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = BUTTON_CLASS;

  const icon = document.createElement("span");
  icon.className = BUTTON_ICON_CLASS;
  icon.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.className = BUTTON_LABEL_CLASS;
  label.textContent = "Ejecutar diagnóstico express";

  const beta = document.createElement("span");
  beta.className = BUTTON_BETA_CLASS;
  beta.textContent = "BETA";
  beta.setAttribute("aria-label", "Función beta");

  button.append(icon, label, beta);
  applyHostTooltip(button, "Ejecutar Diagnóstico Express", {
    placement: "top",
  });
  button.addEventListener("click", () => runDiagnosticFromHeader(button));
  return button;
}

function createShortcutLinkButton({
  href,
  tooltip,
  iconClass,
  ariaLabel,
}) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.className = [
    "wisphub-yaa-action-btn",
    SHORTCUT_BUTTON_CLASS,
    iconClass,
  ].join(" ");
  anchor.setAttribute("aria-label", ariaLabel || tooltip);
  applyHostTooltip(anchor, tooltip, {
    placement: "top",
  });
  anchor.addEventListener("click", (event) => event.stopImmediatePropagation());
  return anchor;
}

function buildShortcutUrl(path) {
  const origin = window.location?.origin || "https://wisphub.io";
  return `${origin}${path}`;
}

function createHeaderShortcutButtons(clientContext) {
  const slug = normalizeServiceSlug(clientContext?.serviceSlug);
  const serviceId = normalizeServiceId(clientContext?.serviceId);

  if (!slug || !serviceId) {
    return [];
  }

  const pingPath = `/clientes/ping/${slug}/${serviceId}/`;
  const torchPath = `/clientes/torch/${slug}/${serviceId}/`;
  const trafficPath = `/trafico/semana/servicio/${slug}/${serviceId}/`;

  return [
    createShortcutLinkButton({
      href: buildShortcutUrl(pingPath),
      tooltip: CLIENTS_UI_MESSAGES.DIAGNOSTIC_OPEN_PING_TOOLTIP,
      iconClass: "wisphub-yaa-action-btn-diagnostic-ping",
      ariaLabel: "Ir a Ping",
    }),
    createShortcutLinkButton({
      href: buildShortcutUrl(torchPath),
      tooltip: CLIENTS_UI_MESSAGES.DIAGNOSTIC_OPEN_TORCH_TOOLTIP,
      iconClass: "wisphub-yaa-action-btn-diagnostic-torch",
      ariaLabel: "Ir a Torch",
    }),
    createShortcutLinkButton({
      href: buildShortcutUrl(trafficPath),
      tooltip: CLIENTS_UI_MESSAGES.DIAGNOSTIC_OPEN_TRAFFIC_TOOLTIP,
      iconClass: "wisphub-yaa-action-btn-diagnostic-traffic",
      ariaLabel: "Ir a Tráfico semanal",
    }),
  ];
}

function normalizeServiceSlug(value) {
  const normalized = String(value || "").trim();
  return normalized;
}

function normalizeServiceId(value) {
  const normalized = String(value || "").trim();
  return normalized;
}

function resolveHeaderTitleElement() {
  if (typeof document === "undefined") {
    return null;
  }

  return (
    document.querySelector(".page-header h1.pull-left") ||
    document.querySelector(".page-header h1") ||
    null
  );
}

function ensureHeaderLayout(title) {
  if (!title) {
    return null;
  }

  title.classList.add(TITLE_LAYOUT_CLASS);
  let leftGroup = title.querySelector(`.${TITLE_LEFT_CLASS}`);
  if (!leftGroup) {
    leftGroup = document.createElement("span");
    leftGroup.className = TITLE_LEFT_CLASS;
    const movableNodes = Array.from(title.childNodes).filter((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return Boolean(node.textContent?.trim());
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return false;
      }
      return !node.classList.contains(BUTTON_SLOT_CLASS);
    });
    movableNodes.forEach((node) => leftGroup.append(node));
    title.prepend(leftGroup);
  }

  return leftGroup;
}

function ensureHeaderButton() {
  const title = resolveHeaderTitleElement();
  if (!title) {
    return false;
  }

  ensureHeaderLayout(title);

  const existingSlot = title.querySelector(`.${BUTTON_SLOT_CLASS}`);
  if (existingSlot) {
    const shortcutsRoot = existingSlot.querySelector(`.${SHORTCUTS_CLASS}`);
    if (!shortcutsRoot) {
      return false;
    }

    const clientContext = extractActiveClientContextFromPage();
    const nextHrefs = createHeaderShortcutButtons(clientContext).map((shortcut) =>
      shortcut.getAttribute("href"),
    );
    const currentHrefs = Array.from(shortcutsRoot.querySelectorAll("a")).map((link) =>
      link.getAttribute("href"),
    );

    if (nextHrefs.join("|") === currentHrefs.join("|")) {
      return false;
    }

    shortcutsRoot.replaceChildren();
    createHeaderShortcutButtons(clientContext).forEach((shortcut) =>
      shortcutsRoot.append(shortcut),
    );
    return true;
  }

  const slot = document.createElement("span");
  slot.className = BUTTON_SLOT_CLASS;

  const actions = document.createElement("span");
  actions.className = ACTIONS_CLASS;

  const button = createHeaderButton();
  setRunning(button, isDiagnosticFlowRunning());

  const shortcuts = document.createElement("span");
  shortcuts.className = SHORTCUTS_CLASS;
  createHeaderShortcutButtons(extractActiveClientContextFromPage()).forEach(
    (shortcut) => shortcuts.append(shortcut),
  );

  actions.append(button, shortcuts);
  slot.append(actions);
  title.append(slot);
  return true;
}

function syncHeaderButtonsRunningState(running) {
  document.querySelectorAll(`.${BUTTON_CLASS}`).forEach((button) => {
    setRunning(button, running);
  });
}

export function initClientDetailDiagnosticButton() {
  if (!isClientDetailPage()) {
    return;
  }

  if (headerButtonObserver) {
    headerButtonObserver.disconnect();
    headerButtonObserver = null;
  }

  ensureHeaderButton();

  if (!runningEventBound) {
    window.addEventListener(DIAGNOSTIC_RUNNING_EVENT, (event) => {
      const running = event?.detail?.running === true;
      syncHeaderButtonsRunningState(running);
    });
    runningEventBound = true;
  }

  headerButtonObserver = new MutationObserver(() => {
    if (typeof document === "undefined") {
      return;
    }
    ensureHeaderButton();
  });

  headerButtonObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
