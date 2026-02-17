import { TIMING, EXTENSION_NAME } from '../config/constants.js';
import { MESSAGE_TYPES, NOTIFICATION_TYPES, UI_MESSAGES } from '../config/messages.js';
import { isWispHubDomain } from '../config/domains.js';
import { isCKEditorAvailable, getEditorInstance, getEditorText, isEditorReady } from '../lib/editor/ckeditor.js';
import { onDomReady } from '../utils/dom.js';
import {
  initFormatter,
  applyFormatting,
  restoreFormatting,
  updateSettings,
  setOnAutoFormatComplete,
  isAutoFormatEnabled,
  setFormatterTemplateFn,
} from '../features/formatter/formatter.js';
import { generateTemplate } from '../utils/template.js';
import {
  initPriceCalcNotify,
  calculatePrices,
  isAutoPriceCalcEnabled,
  updatePriceCalcSettings,
  watchDateField,
  hasPriceLine,
  setDateWatchSuppressed,
  tryCalculateForTemplate,
} from '../features/price-calculator/priceCalculator.js';
import { injectCalculatorButton } from '../features/price-calculator/components/calculatorButton.js';
import { showNotification } from '../features/formatter/components/notification.js';
import { initTicketNotify, initTicketActions } from '../features/tickets/ticketActions.js';
import { initTemplateNotify, injectTemplateButton, setTemplateCalcFn } from '../features/template/templateButton.js';
import { initInstallNotify, initInstallationActions } from '../features/installations/installationActions.js';
import { initClientPhoneLinks } from '../features/clients/clientPhoneLinks.js';
import { initClientUploadButton } from '../features/clients/clientUploadButton.js';
import { initScrollTopButton } from '../features/navigation/scrollTopButton.js';

if (window.__WISPHUB_TOOLS_LOADED__) {
  throw new Error(`[${EXTENSION_NAME}] Already loaded — skipping duplicate.`);
}
window.__WISPHUB_TOOLS_LOADED__ = true;

initPriceCalcNotify(showNotification);
initTicketNotify(showNotification);
initInstallNotify(showNotification);
initTemplateNotify(showNotification);
setTemplateCalcFn(tryCalculateForTemplate);
setFormatterTemplateFn(() => generateTemplate(tryCalculateForTemplate));

function getPageFeatures() {
  const p = window.location.pathname;
  if (/\/tickets\/editar\//i.test(p)) {
    return { formatter: false, priceCalc: false, template: false };
  }
  if (/\/clientes\/editar\//i.test(p)) {
    return { formatter: true, priceCalc: false, template: false };
  }
  // Installation edit / activate / add / new
  if (/\/instalaciones\/(editar|agregar|nuevo)\//i.test(p)) {
    return { formatter: true, priceCalc: true, template: true };
  }
  if (/\/preinstalacion\/(activar|editar)\//i.test(p)) {
    return { formatter: true, priceCalc: true, template: true };
  }
  // Request installation page
  if (/\/solicitar-instalacion\//i.test(p)) {
    return { formatter: true, priceCalc: true, template: true };
  }
  // Add client page (has CKEditor + date field + plan selector)
  if (/\/clientes\/agregar\//i.test(p)) {
    return { formatter: true, priceCalc: true, template: true };
  }
  return { formatter: true, priceCalc: false, template: false };
}

const pageFeatures = getPageFeatures();
let autoPriceCalcDone = false;

// Chained path: auto-format completed → notification → price calc (date watcher suppressed)
setOnAutoFormatComplete((formatResult) => {
  if (formatResult?.success) {
    showNotification(UI_MESSAGES.AUTO_FORMAT_APPLIED, NOTIFICATION_TYPES.INFO);
  }

  // Chain price calc after format (whether format succeeded or not)
  if (pageFeatures.priceCalc && isAutoPriceCalcEnabled() && !autoPriceCalcDone) {
    autoPriceCalcDone = true;
    // Suppress date watcher — autoFillFormFields changes the date field during format
    setDateWatchSuppressed(true);
    setTimeout(() => {
      calculatePrices({ silent: false });
      // Resume after the debounce window (300ms) to ignore stale date-change events
      setTimeout(() => setDateWatchSuppressed(false), 400);
    }, 50);
  }
});

// Independent path: only when auto-format is OFF
function tryAutoPriceCalc() {
  if (autoPriceCalcDone || !pageFeatures.priceCalc || !isAutoPriceCalcEnabled()) {
    return;
  }
  // If auto-format is enabled, the format chain will handle price calc
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
  window.addEventListener('message', (event) => {
    if (event.source !== window) {
      return;
    }

    const { type, settings } = event.data || {};

    if (type === MESSAGE_TYPES.SETTINGS_UPDATE || (settings && type === MESSAGE_TYPES.FORMAT_REQUEST)) {
      updateSettings(settings);
      updatePriceCalcSettings(settings);
      // Delayed: let auto-format chain fire first (100ms) if both are enabled
      setTimeout(tryAutoPriceCalc, 300);
    }

    if (type === MESSAGE_TYPES.FORMAT_REQUEST) {
      const result = applyFormatting({
        silent: !!event.data.fromPopup,
      });
      window.postMessage({ type: MESSAGE_TYPES.FORMAT_RESPONSE, result }, '*');
    }

    if (type === MESSAGE_TYPES.RESTORE_REQUEST) {
      const result = restoreFormatting();
      window.postMessage({ type: MESSAGE_TYPES.RESTORE_RESPONSE, result }, '*');
    }

    if (type === MESSAGE_TYPES.PING_REQUEST) {
      const editor = getEditorInstance();
      const payload = {
        type: MESSAGE_TYPES.PING_RESPONSE,
        editorReady: isEditorReady(editor),
        isWispHub: isWispHubDomain(window.location.href),
      };
      window.postMessage(payload, '*');
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
        }
        // Try independent auto-price-calc after auto-format window passes (100ms + margin)
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
}

onDomReady(init);
