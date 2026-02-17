import { BUTTON_ID } from "../../../config/constants.js";
import { createToolbarButton, injectIntoToolbar, addKeyboardShortcut } from "../../../utils/toolbar.js";
import { setIsFormatted, getIsFormatted } from "../stores/toggleState.js";

function createButton(onToggle) {
  const btn = createToolbarButton({
    id: BUTTON_ID,
    label: "Formatear",
    title: "Formatear texto (Ctrl+Shift+F)",
    onClick: () => {
      const nextState = !getIsFormatted();
      setIsFormatted(nextState);

      btn.classList.toggle("cke_button_on", nextState);
      btn.classList.toggle("cke_button_off", !nextState);
      btn.setAttribute("aria-pressed", String(nextState));

      onToggle(nextState);
    },
  });

  // Reflect current state (auto-format may have run before button was injected)
  const isActive = getIsFormatted();
  btn.classList.toggle("cke_button_on", isActive);
  btn.classList.toggle("cke_button_off", !isActive);
  btn.setAttribute("aria-pressed", String(isActive));
  return btn;
}

export function injectButtonIntoToolbar(editor, onToggle) {
  const btn = createButton(onToggle);
  const injected = injectIntoToolbar(editor, BUTTON_ID, "wisphub-formatter-container", btn);

  if (injected) {
    // Add separator before formatter button
    const wrapper = document.getElementById(`cke_${editor.name}`);
    const toolbox = wrapper?.querySelector(".cke_toolbox");
    const container = toolbox?.querySelector(".wisphub-formatter-container");
    if (toolbox && container) {
      const separator = document.createElement("span");
      separator.className = "cke_toolbar_separator";
      separator.setAttribute("role", "separator");
      container.after(separator);
    }

    addKeyboardShortcut({ ctrl: true, shift: true, key: "F" }, BUTTON_ID);
  }

  return injected;
}
