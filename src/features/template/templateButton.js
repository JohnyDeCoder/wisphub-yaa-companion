import { COPY_CONTROL_CLASS, TEMPLATE_BUTTON_ID } from "../../config/constants.js";
import { NOTIFICATION_TYPES } from "../../config/messages.js";
import { createToolbarButton, injectIntoToolbar } from "../../utils/toolbar.js";
import { copyToClipboard } from "../../utils/clipboard.js";
import { generateTemplate } from "../../utils/template.js";

let _notify = () => {};
let _calcFn = null;

export function setTemplateCalcFn(fn) {
  _calcFn = fn;
}

export function initTemplateNotify(notifyFn) {
  _notify = notifyFn;
}

async function copyTemplate() {
  const text = generateTemplate(_calcFn);
  const ok = await copyToClipboard(text);
  if (ok) {
    _notify("Plantilla generada y copiada al portapapeles", NOTIFICATION_TYPES.SUCCESS);
  } else {
    _notify("Error al generar plantilla", NOTIFICATION_TYPES.ERROR);
  }
}

export function injectTemplateButton(editor) {
  const btn = createToolbarButton({
    id: TEMPLATE_BUTTON_ID,
    label: "Plantilla",
    title: "Generar y copiar plantilla",
    onClick: copyTemplate,
  });
  btn.classList.add(COPY_CONTROL_CLASS);

  return injectIntoToolbar(
    editor,
    TEMPLATE_BUTTON_ID,
    "wisphub-template-container",
    btn,
    ".wisphub-calc-container, .wisphub-formatter-container",
  );
}
