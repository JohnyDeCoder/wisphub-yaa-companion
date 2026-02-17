import { EXTENSION_GITHUB } from '../../config/constants.js';
import { ALLOWED_DOMAINS } from '../../config/domains.js';

export const POPUP_CONFIG = {
  GITHUB_URL: EXTENSION_GITHUB, // External URL opened by "Código fuente" button in popup
  DOMAINS: ALLOWED_DOMAINS, // Allowed hostnames shown/validated in popup connection checks
  RETRY_DELAY: 5000, // Delay before retrying connection check in ms (default: 5000)
  TOAST_DURATION: 3000, // How long popup toasts stay visible in ms (default: 3000)
};
