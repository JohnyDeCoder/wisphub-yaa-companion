import { listenToPageMessages, listenToExtensionMessages, loadAndSyncSettings } from "../lib/messaging/bridge.js";
import { injectStaffIds } from "../features/staff/staffTable.js";
import { initDefaultAvatarReplacement } from "../features/navigation/defaultAvatarReplacement.js";
import { onDomReady } from "../utils/dom.js";

function init() {
  console.log(`[WYC] Content script initialized`);
  listenToPageMessages();
  listenToExtensionMessages();
  loadAndSyncSettings();
  injectStaffIds();
  initDefaultAvatarReplacement();
}

onDomReady(init);
