import { POPUP_CONFIG } from '../config.js';

export function showToast(toastEl, message, type = 'success') {
  if (!toastEl) {
    return;
  }

  toastEl.textContent = message;
  toastEl.className = `toast ${type} show`;

  setTimeout(() => {
    toastEl.classList.remove('show');
  }, POPUP_CONFIG.TOAST_DURATION);
}
