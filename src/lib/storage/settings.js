import { EXTENSION_NAME } from '../../config/constants.js';
import { browserAPI } from '../../utils/browser.js';

const DEFAULT_SETTINGS = {
  notificationsEnabled: true, // Show in-page notifications (default: true)
  autoFormatEnabled: false, // Auto-format comments on page load (default: false)
  autoPriceCalcEnabled: false, // Auto-calculate prices on page load (default: false)
  autoFillTemplateEnabled: true, // Auto-fill empty editor with template on format (default: true)
};

export async function loadSettings() {
  try {
    const result = await browserAPI.storage.local.get('userSettings');
    return { ...DEFAULT_SETTINGS, ...(result.userSettings || {}) };
  } catch (e) {
    console.error(`[${EXTENSION_NAME}] Settings load error:`, e);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings) {
  try {
    await browserAPI.storage.local.set({ userSettings: settings });
  } catch (e) {
    console.error(`[${EXTENSION_NAME}] Settings save error:`, e);
  }
}

export { DEFAULT_SETTINGS };
