import { BUTTON_ID } from "../../../config/constants.js";

let originalContent = null;
let isFormatted = false;

export function getOriginalContent() {
  return originalContent;
}

export function setOriginalContent(content) {
  originalContent = content;
}

export function getIsFormatted() {
  return isFormatted;
}

export function setIsFormatted(value) {
  isFormatted = value;
}

export function resetToggleState() {
  isFormatted = false;
  originalContent = null;

  const btn = document.getElementById(BUTTON_ID);
  if (btn) {
    btn.classList.remove("cke_button_on");
    btn.classList.add("cke_button_off");
    btn.setAttribute("aria-pressed", "false");
  }
}
