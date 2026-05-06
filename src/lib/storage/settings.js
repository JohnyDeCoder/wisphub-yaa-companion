import { browserAPI } from "../../utils/browser.js";

const DEFAULT_SETTINGS = {
  notificationsEnabled: true,
  autoFormatEnabled: false,
  autoPriceCalcEnabled: false,
  autoFillTemplateEnabled: true,
  quickInfoEnabled: true,
  quickInfoDelay: 1000,
};

export async function loadSettings() {
  try {
    const result = await browserAPI.storage.local.get("userSettings");
    return { ...DEFAULT_SETTINGS, ...(result.userSettings || {}) };
  } catch (e) {
    console.error(`[WYC] Settings load error:`, e);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings) {
  try {
    await browserAPI.storage.local.set({ userSettings: settings });
  } catch (e) {
    console.error(`[WYC] Settings save error:`, e);
  }
}

export { DEFAULT_SETTINGS };
