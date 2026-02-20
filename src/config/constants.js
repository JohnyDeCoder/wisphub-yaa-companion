export const EXTENSION_NAME = "Wisphub Yaa Companion"; // Display name shown in logs and UI
export const EXTENSION_VERSION = "1.1.0"; // Synced with manifest.json and package.json
export const EXTENSION_AUTHOR = "JohnyDeCoder"; // Author metadata shown in extension manifests/docs
export const EXTENSION_GITHUB = "https://github.com/JohnyDeCoder/wisphub-yaa-companion"; // Repo link used in popup

export const BUTTON_ID = "wisphub-formatter-btn"; // CKEditor toolbar button ID for formatter
export const CALC_BUTTON_ID = "wisphub-calc-btn"; // CKEditor toolbar button ID for price calculator
export const TEMPLATE_BUTTON_ID = "wisphub-template-btn"; // CKEditor toolbar button ID for templates
export const INSTALL_BUTTON_ID = "wisphub-mark-new-installs"; // Button ID for mark-as-new installations
export const NOTIFICATION_ID = "wisphub-notification"; // Base ID prefix for stacked notifications

export const TIMING = {
  CHECK_INTERVAL: 500, // Polling interval in ms (default: 500)
  MAX_ATTEMPTS: 60, // Max polling retries before giving up (default: 60)
  NOTIFICATION_DURATION: 3000, // How long a notification stays visible in ms (default: 3000)
  ERROR_DISPLAY_TIME: 5000, // How long error notifications stay visible in ms (default: 5000)
  RETRY_DELAY: 3000, // Delay before retrying a failed action in ms (default: 3000)
};

export const CACHE_TTL = 24 * 60 * 60 * 1000; // Staff info cache lifetime in ms (default: 24h)

export const MONTH_NAMES = [
  // Spanish month names used in price calculator formatting
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
];
