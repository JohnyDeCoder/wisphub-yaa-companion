import { TIMING, EXTENSION_NAME } from "../config/constants.js";
import {
  MESSAGE_TYPES,
  NOTIFICATION_TYPES,
  UI_MESSAGES,
} from "../config/messages.js";
import { isWispHubDomain } from "../config/domains.js";
import {
  isCKEditorAvailable,
  getEditorInstance,
  getEditorText,
  isEditorReady,
} from "../lib/editor/ckeditor.js";
import { onDomReady } from "../utils/dom.js";
import {
  initFormatter,
  applyFormatting,
  restoreFormatting,
  updateSettings,
  setOnAutoFormatComplete,
  isAutoFormatEnabled,
  setFormatterTemplateFn,
  tryAutoFillTemplate,
} from "../features/formatter/formatter.js";
import { generateTemplate } from "../utils/template.js";
import {
  initPriceCalcNotify,
  calculatePrices,
  isAutoPriceCalcEnabled,
  updatePriceCalcSettings,
  watchDateField,
  hasPriceLine,
  setDateWatchSuppressed,
  tryCalculateForTemplate,
} from "../features/price-calculator/priceCalculator.js";
import { injectCalculatorButton } from "../features/price-calculator/components/calculatorButton.js";
import {
  showNotification,
  updateNotificationSettings,
} from "../features/formatter/components/notification.js";
import {
  initTicketNotify,
  initTicketActions,
} from "../features/tickets/ticketActions.js";
import {
  initTemplateNotify,
  injectTemplateButton,
  setTemplateCalcFn,
} from "../features/template/templateButton.js";
import {
  initInstallNotify,
  initInstallationActions,
} from "../features/installations/installationActions.js";
import { initClientPhoneLinks } from "../features/clients/clientPhoneLinks.js";
import { initClientUploadButton } from "../features/clients/clientUploadButton.js";
import { initScrollTopButton } from "../features/navigation/scrollTopButton.js";
import { initSpecialTickets } from "../features/tickets/specialTickets.js";
import { initFormGuards } from "../features/formatter/utils/formGuards.js";
import {
  initTicketAutoFill,
  initTicketAutoFillNotify,
  updateTicketAutoFillSettings,
} from "../features/tickets/ticketAutoFill.js";

if (window.__WISPHUB_TOOLS_LOADED__) {
  throw new Error(`[${EXTENSION_NAME}] Already loaded — skipping duplicate.`);
}
window.__WISPHUB_TOOLS_LOADED__ = true;

initPriceCalcNotify(showNotification);
initTicketNotify(showNotification);
initInstallNotify(showNotification);
initTemplateNotify(showNotification);
initTicketAutoFillNotify(showNotification);
setTemplateCalcFn(tryCalculateForTemplate);
setFormatterTemplateFn(() => generateTemplate(tryCalculateForTemplate));

const PAGE_RULES = [
  {
    match: /\/tickets\/(editar|agregar)/i,
    features: { formatter: false, priceCalc: false, template: false },
  },
  {
    match: /\/clientes\/editar\/servicio/i,
    features: { formatter: false, priceCalc: false, template: false },
  },
  {
    match: /\/clientes\/editar/i,
    features: { formatter: true, priceCalc: false, template: false },
  },
  {
    match:
      /\/(instalaciones\/(editar|agregar|nuevo)|preinstalacion\/(activar|editar)|solicitar-instalacion)/i,
    features: { formatter: true, priceCalc: true, template: true },
  },
  {
    match: /\/clientes\/agregar/i,
    features: { formatter: true, priceCalc: false, template: true },
  },
];
const DEFAULT_FEATURES = { formatter: true, priceCalc: false, template: false };

function getPageFeatures() {
  const currentPath = window.location.pathname;
  const rule = PAGE_RULES.find((r) => r.match.test(currentPath));
  return rule ? rule.features : DEFAULT_FEATURES;
}

const pageFeatures = getPageFeatures();
let autoPriceCalcDone = false;

setOnAutoFormatComplete((formatResult) => {
  if (formatResult?.success && !formatResult.templateFilled) {
    showNotification(UI_MESSAGES.AUTO_FORMAT_APPLIED, NOTIFICATION_TYPES.INFO);
  }

  if (
    pageFeatures.priceCalc &&
    isAutoPriceCalcEnabled() &&
    !autoPriceCalcDone
  ) {
    autoPriceCalcDone = true;
    setDateWatchSuppressed(true);

    setTimeout(() => {
      calculatePrices({ silent: false });
      setTimeout(() => setDateWatchSuppressed(false), 400);
    }, 50);
  }
});

function tryAutoPriceCalc() {
  if (
    autoPriceCalcDone ||
    !pageFeatures.priceCalc ||
    !isAutoPriceCalcEnabled()
  ) {
    return;
  }

  if (isAutoFormatEnabled()) {
    return;
  }

  const editor = getEditorInstance();
  if (!editor || !isEditorReady(editor)) {
    return;
  }

  const text = getEditorText(editor);
  if (!text?.trim() || !hasPriceLine(text)) {
    return;
  }

  autoPriceCalcDone = true;
  calculatePrices({ silent: false });
}

function setupMessageListener() {
  window.addEventListener("message", (event) => {
    if (event.source !== window) {
      return;
    }

    const { type, settings } = event.data || {};

    if (
      type === MESSAGE_TYPES.SETTINGS_UPDATE ||
      (settings && type === MESSAGE_TYPES.FORMAT_REQUEST)
    ) {
      updateNotificationSettings(settings);
      if (pageFeatures.formatter) {
        updateSettings(settings);
      }
      updatePriceCalcSettings(settings);
      updateTicketAutoFillSettings(settings);
      setTimeout(tryAutoPriceCalc, 300);
    }

    if (type === MESSAGE_TYPES.FORMAT_REQUEST && pageFeatures.formatter) {
      const result = applyFormatting({
        silent: !!event.data.fromPopup,
        fillFields: !!event.data.fromPopup,
      });
      window.postMessage({ type: MESSAGE_TYPES.FORMAT_RESPONSE, result }, "*");
    }

    if (type === MESSAGE_TYPES.RESTORE_REQUEST && pageFeatures.formatter) {
      const result = restoreFormatting();
      window.postMessage({ type: MESSAGE_TYPES.RESTORE_RESPONSE, result }, "*");
    }

    if (type === MESSAGE_TYPES.PING_REQUEST) {
      const editor = getEditorInstance();
      window.postMessage(
        {
          type: MESSAGE_TYPES.PING_RESPONSE,
          editorReady: isEditorReady(editor),
          isWispHub: isWispHubDomain(window.location.href),
          formatterEnabled: pageFeatures.formatter,
        },
        "*",
      );
    }
  });
}

function waitForEditor() {
  if (!pageFeatures.formatter) {
    return;
  }

  let attempts = 0;
  let hasError = false;

  const checkAndInject = () => {
    attempts++;

    if (attempts > TIMING.MAX_ATTEMPTS) {
      console.log(`[${EXTENSION_NAME}] Editor search timeout`);
      return;
    }

    if (!isCKEditorAvailable()) {
      setTimeout(checkAndInject, TIMING.CHECK_INTERVAL);
      return;
    }

    const editor = getEditorInstance();

    if (isEditorReady(editor)) {
      const success = initFormatter(editor);

      if (success) {
        if (pageFeatures.priceCalc) {
          injectCalculatorButton(editor);
          watchDateField();
        }

        if (pageFeatures.template) {
          injectTemplateButton(editor);
          tryAutoFillTemplate();
        }

        setTimeout(tryAutoPriceCalc, 300);
      }

      if (!success && !hasError) {
        hasError = true;
        setTimeout(() => {
          hasError = false;
          setTimeout(checkAndInject, TIMING.RETRY_DELAY);
        }, TIMING.ERROR_DISPLAY_TIME);
      }
    } else {
      setTimeout(checkAndInject, TIMING.CHECK_INTERVAL);
    }
  };

  checkAndInject();
}

function init() {
  if (!isWispHubDomain(window.location.href)) {
    console.log(`[${EXTENSION_NAME}] Domain not allowed`);
    return;
  }

  console.log(`[${EXTENSION_NAME}] Page script loaded`);
  setupMessageListener();
  waitForEditor();
  initTicketActions();
  initInstallationActions();
  initClientPhoneLinks(showNotification);
  initClientUploadButton();
  initScrollTopButton();
  initSpecialTickets();
  initTicketAutoFill();
  initFormGuards();
}

onDomReady(init);
