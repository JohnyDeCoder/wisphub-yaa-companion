import { TIMING, EXTENSION_NAME } from "../config/constants.js";
import {
  MESSAGE_TYPES,
  NOTIFICATION_TYPES,
  UI_MESSAGES,
} from "../config/messages.js";
import { isWispHubDomain } from "../config/domains.js";
import {
  CLIENT_ADD_PATH_RE,
  CLIENT_EDIT_PATH_RE,
  CLIENT_SERVICE_EDIT_PATH_RE,
  INSTALLATION_FLOW_PATH_RE,
  TICKETS_EDITOR_PATH_RE,
} from "../config/pagePatterns.js";
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
import {
  extractActiveClientContextFromPage,
  hasClientServiceContext,
  sanitizeClientContext,
} from "../features/clients/diagnostic/clientContext.js";
import { initClientDetailDiagnosticButton } from "../features/clients/diagnostic/clientDetailDiagnosticButton.js";
import { runDiagnosticFlowForContext } from "../features/clients/diagnostic/diagnosticFlow.js";
import { normalizeDiagnosticErrorMessage } from "../features/clients/diagnostic/diagnosticRunner.js";
import { probeDiagnosticStart } from "../features/clients/diagnostic/startProbe.js";
import { initClientUploadButton } from "../features/clients/clientUploadButton.js";
import { initCoordinateMapButton } from "../features/coordinates/coordinateMapButton.js";
import { initScrollTopButton } from "../features/navigation/scrollTopButton.js";
import { initSpecialTickets } from "../features/tickets/specialTickets.js";
import { initFormGuards } from "../features/formatter/utils/formGuards.js";
import {
  resumeProfileSwitchFlow,
  startProfileSwitchFlow,
} from "../features/session-switcher/profileSwitch.js";
import {
  initTicketAutoFill,
  initTicketAutoFillNotify,
  updateTicketAutoFillSettings,
} from "../features/tickets/ticketAutoFill.js";
import {
  BRIDGE_META,
  clearBridgeToken,
  getBridgeToken,
  isBridgeMessage,
  isMessageTokenValid,
  postBridgeMessage,
  setBridgeToken,
} from "../utils/pageBridge.js";

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
    match: TICKETS_EDITOR_PATH_RE,
    features: { formatter: false, priceCalc: false, template: false },
  },
  {
    match: CLIENT_SERVICE_EDIT_PATH_RE,
    features: { formatter: false, priceCalc: false, template: false },
  },
  {
    match: CLIENT_EDIT_PATH_RE,
    features: { formatter: true, priceCalc: false, template: false },
  },
  {
    match: INSTALLATION_FLOW_PATH_RE,
    features: { formatter: true, priceCalc: true, template: true },
  },
  {
    match: CLIENT_ADD_PATH_RE,
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

function requestBridgeInit() {
  if (getBridgeToken()) {
    return;
  }
  postBridgeMessage(MESSAGE_TYPES.CHANNEL_HELLO, {}, { includeToken: false });
}

function postToBridge(type, payload = {}) {
  return postBridgeMessage(type, payload, { requireToken: true });
}

setOnAutoFormatComplete((formatResult) => {
  if (formatResult?.success && formatResult?.changed && !formatResult.templateFilled) {
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

    const data = event.data || {};
    if (!isBridgeMessage(data)) {
      return;
    }

    const { type, settings } = data;

    if (type === MESSAGE_TYPES.CHANNEL_INIT) {
      if (setBridgeToken(data[BRIDGE_META.TOKEN_FIELD])) {
        return;
      }
      clearBridgeToken();
      return;
    }

    const token = getBridgeToken();
    if (!token || !isMessageTokenValid(data, token)) {
      return;
    }

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
        silent: !!data.fromPopup,
        fillFields: !!data.fromPopup,
      });
      postToBridge(MESSAGE_TYPES.FORMAT_RESPONSE, { result });
    }

    if (type === MESSAGE_TYPES.RESTORE_REQUEST && pageFeatures.formatter) {
      const result = restoreFormatting();
      postToBridge(MESSAGE_TYPES.RESTORE_RESPONSE, { result });
    }

    if (type === MESSAGE_TYPES.PING_REQUEST) {
      const activeClientContext = extractActiveClientContextFromPage();
      const diagnosticReady = hasClientServiceContext(activeClientContext);
      const editor = getEditorInstance();
      postToBridge(
        MESSAGE_TYPES.PING_RESPONSE,
        {
          editorReady: isEditorReady(editor),
          isWispHub: isWispHubDomain(window.location.href),
          formatterEnabled: pageFeatures.formatter,
          diagnosticReady,
          diagnosticContext: diagnosticReady ? activeClientContext : null,
        },
      );
      return;
    }

    if (type === MESSAGE_TYPES.DIAGNOSTIC_RUN_REQUEST) {
      (async () => {
        const externalContext = sanitizeClientContext(data.clientContext);
        const activeClientContext = extractActiveClientContextFromPage();
        const targetContext = hasClientServiceContext(externalContext)
          ? externalContext
          : activeClientContext;

        let execution;
        try {
          execution = runDiagnosticFlowForContext(targetContext, {
            pingAttempts: 4,
          });
        } catch (error) {
          const errorMessage = normalizeDiagnosticErrorMessage(error);
          postToBridge(MESSAGE_TYPES.DIAGNOSTIC_RUN_ACK, {
            result: {
              success: false,
              started: false,
              error: errorMessage,
            },
          });
          postToBridge(MESSAGE_TYPES.DIAGNOSTIC_RUN_RESPONSE, {
            result: {
              success: false,
              error: errorMessage,
            },
          });
          return;
        }

        const startProbe = await probeDiagnosticStart(execution);
        if (!startProbe.started) {
          const errorMessage = normalizeDiagnosticErrorMessage(startProbe.error);
          postToBridge(MESSAGE_TYPES.DIAGNOSTIC_RUN_ACK, {
            result: {
              success: false,
              started: false,
              error: errorMessage,
            },
          });
          postToBridge(MESSAGE_TYPES.DIAGNOSTIC_RUN_RESPONSE, {
            result: {
              success: false,
              error: errorMessage,
            },
          });
          return;
        }

        postToBridge(MESSAGE_TYPES.DIAGNOSTIC_RUN_ACK, {
          result: {
            success: true,
            started: true,
          },
        });

        try {
          const result = await execution;
          postToBridge(MESSAGE_TYPES.DIAGNOSTIC_RUN_RESPONSE, {
            result: {
              success: true,
              overallStatus: result.overallStatus,
              summary: result.summary,
              clientContext: result.clientContext,
            },
          });
        } catch (error) {
          postToBridge(MESSAGE_TYPES.DIAGNOSTIC_RUN_RESPONSE, {
            result: {
              success: false,
              error: normalizeDiagnosticErrorMessage(error),
            },
          });
        }
      })();
      return;
    }

    if (type === MESSAGE_TYPES.PROFILE_SWITCH_REQUEST) {
      const result = startProfileSwitchFlow(
        {
          targetUsername: data.targetUsername,
          targetLabel: data.targetLabel,
          targetProfileKey: data.targetProfileKey,
          preferCookieSwitch: data.preferCookieSwitch === true,
        },
        {
          notify: showNotification,
          navigateImmediately: false,
        },
      );
      postToBridge(MESSAGE_TYPES.PROFILE_SWITCH_ACK, { result });
      if (
        result?.started &&
        result.redirectUrl &&
        result.switchStrategy !== "cookie-swap"
      ) {
        setTimeout(() => {
          window.location.assign(result.redirectUrl);
        }, 80);
      }
      return;
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
  clearBridgeToken();
  setupMessageListener();
  requestBridgeInit();
  setTimeout(requestBridgeInit, TIMING.CHECK_INTERVAL);
  setTimeout(requestBridgeInit, TIMING.RETRY_DELAY);
  waitForEditor();
  initTicketActions();
  initInstallationActions();
  initClientPhoneLinks(showNotification);
  initClientDetailDiagnosticButton();
  initClientUploadButton();
  initCoordinateMapButton(showNotification);
  initScrollTopButton();
  initSpecialTickets();
  initTicketAutoFill();
  initFormGuards();
  resumeProfileSwitchFlow({ notify: showNotification });
}

onDomReady(init);
