import { BUTTON_ID, TIMING, EXTENSION_NAME } from '../../config/constants.js';
import { MESSAGE_TYPES, NOTIFICATION_TYPES, UI_MESSAGES } from '../../config/messages.js';
import {
  getEditorInstance,
  getEditorText,
  getEditorContent,
  setEditorContent,
  isEditorReady,
} from '../../lib/editor/ckeditor.js';
import { formatText } from './utils/textFormatter.js';
import { parseCommentData, removeDatosFiscalesSection } from './utils/commentParser.js';
import { completeCommentStructure } from './utils/commentCompleter.js';
import { autoFillFormFields } from './utils/formFiller.js';
import { injectButtonIntoToolbar } from './components/formatterButton.js';
import { showNotification, updateNotificationSettings } from './components/notification.js';
import {
  getOriginalContent,
  setOriginalContent,
  getIsFormatted,
  setIsFormatted,
  resetToggleState,
} from './stores/toggleState.js';

let autoFormatEnabled = false;
let autoFormatExecuted = false;
let autoFillTemplateEnabled = true;
let _onAutoFormatComplete = null;
let _templateFn = null;

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
      let plainText = getEditorText(editor);

      // If editor is empty and auto-fill is enabled, use the template as input
      if (!plainText?.trim()) {
        if (autoFillTemplateEnabled && typeof _templateFn === 'function') {
          plainText = _templateFn();
        } else {
          notify(UI_MESSAGES.EDITOR_EMPTY, NOTIFICATION_TYPES.WARNING);
          resetToggleState();
          return { success: false, error: UI_MESSAGES.EDITOR_EMPTY };
        }
      }

      setOriginalContent(getEditorContent(editor));

      let textToFormat = completeCommentStructure(plainText);
      const parsedData = parseCommentData(textToFormat);

      if (parsedData.canRemoveFiscalSection) {
        textToFormat = removeDatosFiscalesSection(textToFormat);
      }

      const formattedHtml = formatText(textToFormat);
      setEditorContent(editor, formattedHtml);
      autoFillFormFields(parsedData);

      notify(UI_MESSAGES.FORMAT_SUCCESS, NOTIFICATION_TYPES.SUCCESS);
      return { success: true };
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
  const result = handleToggle(true, { silent: !!options.silent });
  if (result.success) {
    setIsFormatted(true);
    const btn = document.getElementById(BUTTON_ID);
    if (btn) {
      btn.classList.add('cke_button_on');
      btn.classList.remove('cke_button_off');
      btn.setAttribute('aria-pressed', 'true');
    }
  }
  return result;
}

export function restoreFormatting() {
  if (!getIsFormatted()) {
    return { success: false, error: UI_MESSAGES.NO_FORMATTED_TEXT_TO_RESTORE };
  }
  const result = handleToggle(false);
  if (result.success) {
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
  // Allow empty editor if auto-fill template is enabled — handleToggle will insert the template
  if (!text?.trim() && !autoFillTemplateEnabled) {
    return;
  }

  autoFormatExecuted = true;

  setTimeout(() => {
    if (getIsFormatted()) {
      return;
    }

    setIsFormatted(true);
    const btn = document.getElementById(BUTTON_ID);
    if (btn) {
      btn.classList.add('cke_button_on');
      btn.classList.remove('cke_button_off');
      btn.setAttribute('aria-pressed', 'true');
    }

    // Silent: the combined notification is handled by the onAutoFormatComplete callback
    const result = handleToggle(true, { silent: true });

    if (typeof _onAutoFormatComplete === 'function') {
      _onAutoFormatComplete(result);
    } else if (result.success) {
      showNotification(UI_MESSAGES.AUTO_FORMAT_APPLIED, NOTIFICATION_TYPES.INFO);
    }
  }, 100);
}

export function updateSettings(settings) {
  if (!settings) {
    return;
  }

  updateNotificationSettings(settings);

  if (typeof settings.autoFormatEnabled === 'boolean') {
    autoFormatEnabled = settings.autoFormatEnabled;
    if (autoFormatEnabled) {
      tryAutoFormat();
    }
  }

  if (typeof settings.autoFillTemplateEnabled === 'boolean') {
    autoFillTemplateEnabled = settings.autoFillTemplateEnabled;
  }
}

export function initFormatter(editor) {
  const success = injectButtonIntoToolbar(editor, handleToggle);

  if (success) {
    console.log(`[${EXTENSION_NAME}] Formatter ready`);

    window.postMessage(
      {
        type: MESSAGE_TYPES.EDITOR_READY,
        editorName: editor.name,
      },
      '*',
    );

    setTimeout(tryAutoFormat, TIMING.CHECK_INTERVAL);
  }

  return success;
}
