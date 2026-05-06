import { TIMING } from "../../config/constants.js";
import {
  MESSAGE_TYPES,
  NOTIFICATION_TYPES,
  UI_MESSAGES,
} from "../../config/messages.js";
import {
  getEditorInstance,
  getEditorText,
  getEditorContent,
  setEditorContent,
  isEditorReady,
} from "../../lib/editor/ckeditor.js";
import { formatText } from "./utils/textFormatter.js";
import {
  parseCommentData,
  removeDatosFiscalesSection,
} from "./utils/commentParser.js";
import { completeCommentStructure } from "./utils/commentCompleter.js";
import {
  autoFillFormFields,
  clearAllFieldIndicators,
  initNameFieldWatchers,
} from "./utils/formFiller.js";
import { injectButtonIntoToolbar } from "./components/formatterButton.js";
import {
  showNotification,
  updateNotificationSettings,
} from "./components/notification.js";
import {
  getOriginalContent,
  setOriginalContent,
  getIsFormatted,
  setIsFormatted,
  resetToggleState,
  updateButtonVisual,
} from "./stores/toggleState.js";
import { postBridgeMessage } from "../../utils/pageBridge.js";
import { sendLogToPopup } from "../../utils/logger.js";
import {
  isInstallationFlowPath,
  isFormatterScopePath,
} from "../../config/pagePatterns.js";

let autoFormatEnabled = false;
let autoFormatExecuted = false;
let autoFillTemplateEnabled = true;
let _onAutoFormatComplete = null;
let _templateFn = null;

function resolvePageSectionTag() {
  const path = window.location.pathname;
  if (isInstallationFlowPath(path)) {
    return "Installs";
  }
  if (isFormatterScopePath(path)) {
    return "Clients";
  }
  return "Formatter";
}

function normalizeComparableText(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

function extractTextFromHtml(html) {
  const source = String(html || "");
  if (!source.trim()) {
    return "";
  }

  const normalizedHtml = source
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<\/div>\s*<div>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "");

  const doc = new DOMParser().parseFromString(normalizedHtml, "text/html");
  const text = doc.body.textContent || "";
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function buildFieldChangeSnapshot(changes = [], side) {
  return changes
    .map((change) => {
      const label = String(change?.label || change?.fieldId || "Campo").trim();
      const value =
        side === "before"
          ? String(change?.before || "").trim()
          : String(change?.after || "").trim();
      return `${label}: ${value || "Vacío"}`;
    })
    .filter(Boolean)
    .join("\n");
}

export function setFormatterTemplateFn(fn) {
  _templateFn = fn;
}

export function isAutoFormatEnabled() {
  return autoFormatEnabled;
}

export function setOnAutoFormatComplete(cb) {
  _onAutoFormatComplete = cb;
}

export function handleToggle(shouldFormat, options = {}) {
  const { silent = false } = options;
  const notify = silent ? () => {} : showNotification;
  const editor = getEditorInstance();

  if (!editor) {
    notify(UI_MESSAGES.EDITOR_NOT_FOUND, NOTIFICATION_TYPES.ERROR);
    resetToggleState();
    return { success: false, error: UI_MESSAGES.EDITOR_NOT_FOUND };
  }

  try {
    if (shouldFormat) {
      const originalContent = getEditorContent(editor);
      const plainText = getEditorText(editor);

      if (!plainText?.trim()) {
        notify(UI_MESSAGES.EDITOR_EMPTY, NOTIFICATION_TYPES.WARNING);
        resetToggleState();
        return { success: false, error: UI_MESSAGES.EDITOR_EMPTY };
      }

      let textToFormat = completeCommentStructure(plainText);
      const parsedData = parseCommentData(textToFormat);

      if (parsedData.canRemoveFiscalSection) {
        textToFormat = removeDatosFiscalesSection(textToFormat);
      }

      const formattedHtml = formatText(textToFormat);
      const formattedText = extractTextFromHtml(formattedHtml);
      const contentChanged =
        normalizeComparableText(plainText) !==
        normalizeComparableText(formattedText);

      let fieldFillResult = { changed: false, changedCount: 0 };
      if (options.fillFields !== false) {
        fieldFillResult = autoFillFormFields(parsedData, {
          autoFillEnabled: autoFillTemplateEnabled,
        }) || { changed: false, changedCount: 0 };
      }

      const fieldsChanged = fieldFillResult.changed === true;

      if (!contentChanged && !fieldsChanged) {
        resetToggleState();
        return {
          success: true,
          changed: false,
          noOp: true,
          contentChanged: false,
          fieldsChanged: false,
        };
      }

      setOriginalContent(originalContent);

      if (contentChanged) {
        setEditorContent(editor, formattedHtml);
      }

      const auditBefore = [
        contentChanged ? `Comentarios:\n${plainText}` : null,
        fieldsChanged ? buildFieldChangeSnapshot(fieldFillResult.changes, "before") : null,
      ]
        .filter(Boolean)
        .join("\n\n");
      const auditAfter = [
        contentChanged ? `Comentarios:\n${formattedText}` : null,
        fieldsChanged ? buildFieldChangeSnapshot(fieldFillResult.changes, "after") : null,
      ]
        .filter(Boolean)
        .join("\n\n");

      sendLogToPopup(
        resolvePageSectionTag(),
        "success",
        "Formatting applied",
        contentChanged
          ? `Comentario actualizado${fieldsChanged ? ` y ${fieldFillResult.changedCount} campo(s)` : ""}`
          : `Campos actualizados: ${fieldFillResult.changedCount}`,
        {
          kind: "audit",
          action: contentChanged ? "Formateo aplicado" : "Campos autoformateados",
          pagePath: window.location.pathname,
          pageUrl: window.location.href,
          stateColor: "info",
          before: auditBefore,
          after: auditAfter,
        },
      );

      notify(UI_MESSAGES.FORMAT_SUCCESS, NOTIFICATION_TYPES.SUCCESS);
      return {
        success: true,
        changed: true,
        noOp: false,
        contentChanged,
        fieldsChanged,
        changedFieldCount: Number(fieldFillResult.changedCount || 0),
      };
    }

    const original = getOriginalContent();
    if (original !== null) {
      setEditorContent(editor, original);
      notify(UI_MESSAGES.TEXT_RESTORED, NOTIFICATION_TYPES.INFO);
    }
    setOriginalContent(null);
    return { success: true };
  } catch (error) {
    notify(UI_MESSAGES.FORMAT_ERROR, NOTIFICATION_TYPES.ERROR);
    resetToggleState();
    return { success: false, error: error.message };
  }
}

export function applyFormatting(options = {}) {
  if (getIsFormatted()) {
    return { success: false, error: UI_MESSAGES.ALREADY_FORMATTED };
  }
  const result = handleToggle(true, {
    silent: !!options.silent,
    fillFields: options.fillFields,
  });
  if (result.success && result.changed) {
    setIsFormatted(true);
    updateButtonVisual(true);
  }
  return result;
}

export function restoreFormatting() {
  if (!getIsFormatted()) {
    return { success: false, error: UI_MESSAGES.NO_FORMATTED_TEXT_TO_RESTORE };
  }
  const result = handleToggle(false);
  if (result.success) {
    clearAllFieldIndicators();
    resetToggleState();
  }
  return result;
}

function tryAutoFormat() {
  if (!autoFormatEnabled || autoFormatExecuted) {
    return;
  }

  const editor = getEditorInstance();
  if (!editor || !isEditorReady(editor)) {
    return;
  }

  const text = getEditorText(editor);
  if (!text?.trim()) {
    return;
  }

  autoFormatExecuted = true;

  setTimeout(() => {
    if (getIsFormatted()) {
      return;
    }

    const result = handleToggle(true, { silent: true, fillFields: true });
    if (result.success && result.changed) {
      setIsFormatted(true);
      updateButtonVisual(true);
    }

    if (typeof _onAutoFormatComplete === "function") {
      _onAutoFormatComplete(result);
    } else if (result.success && result.changed) {
      showNotification(
        UI_MESSAGES.AUTO_FORMAT_APPLIED,
        NOTIFICATION_TYPES.INFO,
      );
    }
  }, 100);
}

export function updateSettings(settings) {
  if (!settings) {
    return;
  }

  updateNotificationSettings(settings);

  if (typeof settings.autoFormatEnabled === "boolean") {
    autoFormatEnabled = settings.autoFormatEnabled;
    if (autoFormatEnabled) {
      tryAutoFormat();
    }
  }

  if (typeof settings.autoFillTemplateEnabled === "boolean") {
    autoFillTemplateEnabled = settings.autoFillTemplateEnabled;
  }
}

export function initFormatter(editor) {
  const success = injectButtonIntoToolbar(editor, handleToggle);

  if (success) {
    sendLogToPopup("Formatter", "info", "Formatter ready");

    postBridgeMessage(
      MESSAGE_TYPES.EDITOR_READY,
      {
        editorName: editor.name,
      },
      { requireToken: false },
    );

    setTimeout(tryAutoFormat, TIMING.CHECK_INTERVAL);

    initNameFieldWatchers(isAutoFormatEnabled);
  }

  return success;
}

export function tryAutoFillTemplate() {
  if (!autoFillTemplateEnabled || typeof _templateFn !== "function") {
    return false;
  }

  const editor = getEditorInstance();
  if (!editor || !isEditorReady(editor)) {
    return false;
  }

  const text = getEditorText(editor);
  if (text && text.trim().length > 0) {
    return false;
  }

  const templateText = _templateFn();
  if (templateText) {
    const formattedHtml = formatText(templateText);
    setEditorContent(editor, formattedHtml);

    autoFormatExecuted = true;

    showNotification(
      "Plantilla insertada automáticamente",
      NOTIFICATION_TYPES.SUCCESS,
    );

    if (typeof _onAutoFormatComplete === "function") {
      _onAutoFormatComplete({ success: true, templateFilled: true });
    }

    return true;
  }

  return false;
}
