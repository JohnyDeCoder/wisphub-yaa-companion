import { browserAPI } from "../../utils/browser.js";
import { getDomainKey, isWispHubDomain } from "../../config/domains.js";
import { ACTIONS, POPUP_UI_MESSAGES } from "../../config/messages.js";
import {
  buildSessionProfilesForDomain,
  resolveSessionProfileLabel,
} from "../../config/sessionProfiles.js";
import { getTodayISO } from "../../utils/date.js";
import { formatPrice } from "../../utils/formatting.js";
import { calculateProration } from "../../features/price-calculator/priceCalculator.js";
import { loadSettings, saveSettings } from "../../lib/storage/settings.js";
import {
  getAllApiKeys,
  saveAllApiKeys,
} from "../../features/staff/staffApi.js";
import { POPUP_CONFIG } from "./config.js";
import { showToast } from "./components/toast.js";
import { checkConnection } from "./components/connection.js";
import { renderChangelog } from "./components/changelog.js";
import { addLog, getLogs, clearLogs, renderLogs } from "./components/logs.js";

const STAFF_CACHE_KEY = "wisphubStaffInfoCache";
const STAFF_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const SVG_NS = "http://www.w3.org/2000/svg";
const WARNING_ICON_PATH = [
  "M2.725 21q-.275 0-.5-.137t-.35-.363t-.137-.488t.137-.512l9.25-16",
  "q.15-.25.388-.375T12 3t.488.125t.387.375l9.25 16q.15.25.138.513",
  "t-.138.487t-.35.363t-.5.137zm9.988-3.287Q13 17.425 13 17t-.288-.712",
  "T12 16t-.712.288T11 17t.288.713T12 18t.713-.288m0-3Q13 14.425 13 14v-3",
  "q0-.425-.288-.712T12 10t-.712.288T11 11v3q0 .425.288.713T12 15t.713-.288",
].join(" ");

let userSettings = {};
let elements = {};
let isFormatted = false;
let currentStaffId = null;
let activeSessionContext = null;
let activeDomainProfiles = [];
let hasAnyApiKey = false;
let activeTabId = null;
let isStaffIdWarningMode = false;

function withLogPrefix(feature, message) {
  const text = String(message || "").trim();
  if (!text) {
    return "";
  }
  if (/^\[[^\]]+\]\s*/.test(text)) {
    return text;
  }
  return `[${feature}] ${text}`;
}

function initElements() {
  const $ = (id) => document.getElementById(id);
  elements = {
    dashboard: document.querySelector(".dashboard"),
    statusIndicator: $("statusIndicator"),
    statusLabel: $("statusLabel"),
    staffInfo: $("staffInfo"),
    staffUsername: $("staffUsername"),
    staffIdBadge: $("staffIdBadge"),
    btnProfileSwitch: $("btnProfileSwitch"),
    advancedSettings: $("advancedSettings"),
    btnFormatComment: $("btnFormatComment"),
    btnSourceCode: $("btnSourceCode"),
    toast: $("toast"),
    settingsNotifications: $("settingsNotifications"),
    settingsAutoFormat: $("settingsAutoFormat"),
    settingsAutoPriceCalc: $("settingsAutoPriceCalc"),
    settingsAutoFillTemplate: $("settingsAutoFillTemplate"),
    settingsApiKeyIo: $("settingsApiKeyIo"),
    settingsApiKeyApp: $("settingsApiKeyApp"),
    btnSaveApiKeys: $("btnSaveApiKeys"),
    changelogList: $("changelogList"),
    btnLogs: $("btnLogs"),
    logsOverlay: $("logsOverlay"),
    logsList: $("logsList"),
    btnLogsClear: $("btnLogsClear"),
    btnLogsClose: $("btnLogsClose"),
    btnOpenCalc: $("btnOpenCalc"),
    btnRunDiagnostic: $("btnRunDiagnostic"),
    btnUpcoming: $("btnUpcoming"),
    calcOverlay: $("calcOverlay"),
    btnCalcClose: $("btnCalcClose"),
    calcInstallPrice: $("calcInstallPrice"),
    calcPackagePrice: $("calcPackagePrice"),
    calcDate: $("calcDate"),
    btnCalcRun: $("btnCalcRun"),
    btnCalcClear: $("btnCalcClear"),
    calcResult: $("calcResult"),
    calcResultLine: $("calcResultLine"),
    btnCalcCopy: $("btnCalcCopy"),
  };
}

function applySettingsToUI() {
  if (elements.settingsNotifications) {
    elements.settingsNotifications.checked = userSettings.notificationsEnabled;
  }
  if (elements.settingsAutoFormat) {
    elements.settingsAutoFormat.checked = userSettings.autoFormatEnabled;
  }
  if (elements.settingsAutoPriceCalc) {
    elements.settingsAutoPriceCalc.checked = userSettings.autoPriceCalcEnabled;
  }
  if (elements.settingsAutoFillTemplate) {
    elements.settingsAutoFillTemplate.checked =
      userSettings.autoFillTemplateEnabled;
  }
}

function showStaffInfo(username, staffId) {
  if (!elements.staffInfo) {
    return;
  }
  currentStaffId = staffId ? String(staffId) : null;
  elements.staffUsername.textContent = username;
  if (staffId) {
    elements.staffIdBadge.textContent = `ID: ${staffId}`;
  }
  elements.staffInfo.classList.remove("hidden");
}

function createWarningBadgeIcon() {
  const iconWrap = document.createElement("span");
  iconWrap.className = "header-badge-warning-icon";
  iconWrap.setAttribute("aria-hidden", "true");

  const icon = document.createElementNS(SVG_NS, "svg");
  icon.setAttribute("xmlns", SVG_NS);
  icon.setAttribute("width", "12");
  icon.setAttribute("height", "12");
  icon.setAttribute("viewBox", "0 0 24 24");

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute("d", WARNING_ICON_PATH);
  icon.append(path);

  iconWrap.append(icon);
  return iconWrap;
}

function showStaffIdWarningState() {
  if (!elements.staffIdBadge) {
    return;
  }

  isStaffIdWarningMode = true;
  currentStaffId = null;
  elements.staffIdBadge.classList.remove("copied");
  elements.staffIdBadge.classList.add("header-badge-warning");
  elements.staffIdBadge.title = POPUP_UI_MESSAGES.SESSION_SWITCH_API_KEYS_MISSING;
  elements.staffIdBadge.replaceChildren("ID: ", createWarningBadgeIcon());
}

function showStaffIdValue(staffId) {
  if (!elements.staffIdBadge) {
    return;
  }

  isStaffIdWarningMode = false;
  currentStaffId = staffId ? String(staffId) : null;
  elements.staffIdBadge.classList.remove("header-badge-warning");
  elements.staffIdBadge.classList.remove("copied");
  elements.staffIdBadge.textContent = currentStaffId ? `ID: ${currentStaffId}` : "ID: —";
  elements.staffIdBadge.title = currentStaffId ? "Click para copiar" : "ID no disponible";
}

function openAdvancedSettings() {
  if (!elements.advancedSettings) {
    return;
  }
  if (!elements.advancedSettings.open) {
    elements.advancedSettings.open = true;
  }
  elements.advancedSettings.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
  });
}

function resolveAutoTargetProfile() {
  if (!activeSessionContext?.loggedIn || activeDomainProfiles.length <= 1) {
    return null;
  }

  const currentUsername = String(activeSessionContext.username || "").trim().toLowerCase();
  const currentProfile = activeDomainProfiles.find((profile) => {
    const candidate = String(profile.username || "").trim().toLowerCase();
    return profile.isCurrent || (candidate && candidate === currentUsername);
  });

  if (currentProfile) {
    const target = activeDomainProfiles.find((profile) => profile.key !== currentProfile.key);
    return target || null;
  }

  return activeDomainProfiles.find((profile) => {
    const candidate = String(profile.username || "").trim().toLowerCase();
    return candidate && candidate !== currentUsername;
  }) || activeDomainProfiles[0] || null;
}

function syncProfileSwitchButtonState() {
  if (!elements.btnProfileSwitch) {
    return;
  }

  const targetProfile = resolveAutoTargetProfile();
  if (!targetProfile) {
    elements.btnProfileSwitch.disabled = true;
    elements.btnProfileSwitch.title = POPUP_UI_MESSAGES.SESSION_SWITCH_UNAVAILABLE;
    return;
  }

  const currentLabel = resolveSessionProfileLabel(
    activeSessionContext?.domainKey,
    activeSessionContext?.username,
  );
  elements.btnProfileSwitch.disabled = false;
  elements.btnProfileSwitch.title =
    `Perfil actual: ${currentLabel}. Cambiar a ${targetProfile.label}`;
}

async function writeLog(level, message, feature = "Popup") {
  await addLog(level, withLogPrefix(feature, message));
  if (elements.logsOverlay?.classList.contains("visible")) {
    renderLogs(elements.logsList, await getLogs());
  }
}

async function openLogsViewer() {
  renderLogs(elements.logsList, await getLogs());
  elements.logsOverlay?.classList.add("visible");
}

function closeLogsViewer() {
  elements.logsOverlay?.classList.remove("visible");
}

async function getActiveTab() {
  const [tab] = await browserAPI.tabs.query({
    active: true,
    currentWindow: true,
  });
  return tab || null;
}

async function fetchSessionContext(tabId) {
  if (!tabId) {
    return null;
  }

  try {
    const response = await browserAPI.tabs.sendMessage(tabId, {
      action: ACTIONS.GET_SESSION_CONTEXT,
    });
    return response?.context || null;
  } catch {
    return null;
  }
}

async function syncSettingsToContentScript() {
  try {
    const tabs = await browserAPI.tabs.query({});
    const wisphubTabs = tabs.filter(
      (tab) => tab?.id && isWispHubDomain(tab.url),
    );

    await Promise.allSettled(
      wisphubTabs.map((tab) =>
        browserAPI.tabs.sendMessage(tab.id, {
          action: "UPDATE_SETTINGS",
          settings: userSettings,
        }),
      ),
    );

    if (wisphubTabs.length > 0) {
      await writeLog(
        "info",
        `Ajustes sincronizados en ${wisphubTabs.length} pestaña(s)`,
        "Ajustes",
      );
    }
  } catch {
    // Content script may not be ready
  }
}

async function handleSettingChange(key, value) {
  userSettings[key] = value;
  await saveSettings(userSettings);
  await syncSettingsToContentScript();
}

async function formatComment() {
  try {
    const [tab] = await browserAPI.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab) {
      showToast(elements.toast, POPUP_UI_MESSAGES.NO_ACTIVE_TAB, "error");
      return;
    }

    const action = isFormatted ? "RESTORE_COMMENTS" : "FORMAT_COMMENTS";
    const response = await browserAPI.tabs.sendMessage(tab.id, {
      action,
      settings: userSettings,
      fromPopup: true,
    });

    if (response?.success && response?.changed !== false) {
      isFormatted = !isFormatted;
      elements.btnFormatComment.textContent = isFormatted
        ? POPUP_UI_MESSAGES.FORMAT_BUTTON_RESTORE
        : POPUP_UI_MESSAGES.FORMAT_BUTTON_USE;
      showToast(
        elements.toast,
        isFormatted
          ? POPUP_UI_MESSAGES.FORMAT_SUCCESS
          : POPUP_UI_MESSAGES.RESTORE_SUCCESS,
        isFormatted ? "success" : "info",
      );
      writeLog(
        "success",
        isFormatted
          ? "Formateador aplicado desde popup"
          : "Texto restaurado desde popup",
      );
    } else if (response?.success && response?.changed === false) {
      await writeLog(
        "info",
        "Formateador sin cambios: no se modificó texto ni campos",
      );
    } else if (response?.error) {
      showToast(elements.toast, response.error, "error");
      writeLog("error", `Formateador: ${response.error}`);
    } else {
      showToast(elements.toast, POPUP_UI_MESSAGES.USE_EDITOR_BUTTON, "warning");
    }
  } catch {
    showToast(elements.toast, POPUP_UI_MESSAGES.OPEN_EDITOR_PAGE, "warning");
  }
}

async function runDiagnosticFromPopup() {
  let tab;
  try {
    [tab] = await browserAPI.tabs.query({
      active: true,
      currentWindow: true,
    });
  } catch {
    showToast(elements.toast, POPUP_UI_MESSAGES.NO_ACTIVE_TAB, "error");
    return;
  }

  if (!tab) {
    showToast(elements.toast, POPUP_UI_MESSAGES.NO_ACTIVE_TAB, "error");
    return;
  }

  if (!isWispHubDomain(tab.url)) {
    showToast(elements.toast, POPUP_UI_MESSAGES.DIAGNOSTIC_UNAVAILABLE, "warning");
    return;
  }

  let pingResponse;
  try {
    pingResponse = await browserAPI.tabs.sendMessage(tab.id, {
      action: ACTIONS.PING,
    });
  } catch {
    showToast(elements.toast, POPUP_UI_MESSAGES.DIAGNOSTIC_START_FAILED, "error");
    return;
  }

  if (!pingResponse?.diagnosticReady) {
    showToast(elements.toast, POPUP_UI_MESSAGES.DIAGNOSTIC_UNAVAILABLE, "warning");
    return;
  }

  const runButton = elements.btnRunDiagnostic;
  if (runButton) {
    runButton.disabled = true;
  }

  try {
    showToast(elements.toast, POPUP_UI_MESSAGES.DIAGNOSTIC_STARTING, "info");
    const runResponse = await browserAPI.tabs.sendMessage(tab.id, {
      action: ACTIONS.RUN_CLIENT_DIAGNOSTIC,
      fromPopup: true,
      clientContext: pingResponse.diagnosticContext || null,
    });
    if (!runResponse || runResponse.success === false || runResponse.started === false) {
      showToast(elements.toast, POPUP_UI_MESSAGES.DIAGNOSTIC_START_FAILED, "error");
      await writeLog(
        "warn",
        `No se pudo iniciar Diagnóstico Express: ${runResponse?.error || "sin respuesta válida"}`,
      );
      return;
    }
    showToast(elements.toast, POPUP_UI_MESSAGES.DIAGNOSTIC_STARTED, "success");
    await writeLog("info", "Diagnóstico Express iniciado desde popup");
    window.close();
  } catch {
    showToast(elements.toast, POPUP_UI_MESSAGES.DIAGNOSTIC_START_FAILED, "error");
  } finally {
    if (runButton) {
      runButton.disabled = false;
    }
  }
}

async function runProfileSwitch(targetProfile) {
  if (!targetProfile || !activeTabId) {
    showToast(elements.toast, POPUP_UI_MESSAGES.SESSION_SWITCH_UNAVAILABLE, "warning");
    return;
  }

  elements.btnProfileSwitch.disabled = true;

  try {
    showToast(elements.toast, POPUP_UI_MESSAGES.SESSION_SWITCH_STARTING, "info");
    const response = await browserAPI.tabs.sendMessage(activeTabId, {
      action: ACTIONS.START_PROFILE_SWITCH,
      targetUsername: targetProfile.username,
      targetLabel: targetProfile.label,
      targetProfileKey: targetProfile.key,
    });

    if (response?.cancelled) {
      showToast(elements.toast, POPUP_UI_MESSAGES.SESSION_SWITCH_CANCELLED, "info");
      return;
    }

    if (!response || response.success === false) {
      showToast(
        elements.toast,
        response?.error || POPUP_UI_MESSAGES.SESSION_SWITCH_FAILED,
        "error",
      );
      return;
    }

    if (response.started) {
      showToast(elements.toast, POPUP_UI_MESSAGES.SESSION_SWITCH_STARTED, "success");
      await writeLog(
        "info",
        `Cambio de perfil iniciado a ${targetProfile.label} (${targetProfile.username})`,
        "Sesión",
      );
      window.close();
      return;
    }

    showToast(
      elements.toast,
      response.info || POPUP_UI_MESSAGES.SESSION_SWITCH_CANCELLED,
      "info",
    );
  } catch {
    showToast(elements.toast, POPUP_UI_MESSAGES.SESSION_SWITCH_FAILED, "error");
  } finally {
    elements.btnProfileSwitch.disabled = false;
    syncProfileSwitchButtonState();
  }
}

function openUpcomingToolNotice() {
  showToast(elements.toast, POPUP_UI_MESSAGES.UPCOMING_TOOL, "info");
}

function setupEventListeners() {
  elements.btnFormatComment?.addEventListener("click", formatComment);

  elements.btnSourceCode?.addEventListener("click", () => {
    window.open(POPUP_CONFIG.GITHUB_URL, "_blank");
  });

  elements.settingsNotifications?.addEventListener("change", (e) => {
    handleSettingChange("notificationsEnabled", e.target.checked);
  });

  elements.settingsAutoFormat?.addEventListener("change", (e) => {
    handleSettingChange("autoFormatEnabled", e.target.checked);
  });

  elements.settingsAutoPriceCalc?.addEventListener("change", (e) => {
    handleSettingChange("autoPriceCalcEnabled", e.target.checked);
  });

  elements.settingsAutoFillTemplate?.addEventListener("change", (e) => {
    handleSettingChange("autoFillTemplateEnabled", e.target.checked);
  });

  elements.btnSaveApiKeys?.addEventListener("click", async () => {
    const keyIo = elements.settingsApiKeyIo?.value?.trim() || "";
    const keyApp = elements.settingsApiKeyApp?.value?.trim() || "";
    hasAnyApiKey = !!(keyIo || keyApp);

    await saveAllApiKeys({ "wisphub.io": keyIo, "wisphub.app": keyApp });
    if (hasAnyApiKey) {
      const domainCache = await loadCachedStaffInfo(
        activeSessionContext?.domainKey,
        activeSessionContext?.username,
      );
      if (!domainCache) {
        fetchStaffInfo();
      }
    } else {
      showStaffIdWarningState();
    }

    if (hasAnyApiKey) {
      showToast(
        elements.toast,
        POPUP_UI_MESSAGES.API_KEYS_SAVED,
        "success",
      );
      writeLog("success", "API Keys actualizadas");
      return;
    }

    showToast(elements.toast, POPUP_UI_MESSAGES.API_KEYS_REMOVED, "info");
    writeLog("info", "API Keys eliminadas");
  });

  elements.staffIdBadge?.addEventListener("click", () => {
    if (isStaffIdWarningMode) {
      openAdvancedSettings();
      return;
    }

    if (!currentStaffId || !navigator.clipboard) {
      return;
    }

    navigator.clipboard.writeText(currentStaffId);
    elements.staffIdBadge.classList.add("copied");
    elements.staffIdBadge.textContent = POPUP_UI_MESSAGES.STAFF_ID_COPIED;
    setTimeout(() => {
      showStaffIdValue(currentStaffId);
    }, 1500);
  });

  elements.btnProfileSwitch?.addEventListener("click", () => {
    const targetProfile = resolveAutoTargetProfile();
    runProfileSwitch(targetProfile);
  });

  elements.btnLogs?.addEventListener("click", openLogsViewer);
  elements.btnLogsClose?.addEventListener("click", closeLogsViewer);
  elements.btnLogsClear?.addEventListener("click", async () => {
    await clearLogs();
    renderLogs(elements.logsList, []);
  });

  elements.btnOpenCalc?.addEventListener("click", openCalculator);
  elements.btnRunDiagnostic?.addEventListener("click", runDiagnosticFromPopup);
  elements.btnUpcoming?.addEventListener("click", openUpcomingToolNotice);
  elements.btnCalcClose?.addEventListener("click", closeCalculator);
  elements.btnCalcRun?.addEventListener("click", runCalculator);
  elements.btnCalcClear?.addEventListener("click", clearCalculator);
  elements.btnCalcCopy?.addEventListener("click", copyCalcResult);
  elements.calcInstallPrice?.addEventListener("input", saveCalcState);
  elements.calcPackagePrice?.addEventListener("input", saveCalcState);
  elements.calcDate?.addEventListener("change", saveCalcState);

}

const CALC_STORAGE_KEY = "wisphubCalcState";

async function saveCalcState() {
  const state = {
    installPrice: elements.calcInstallPrice?.value || "",
    packagePrice: elements.calcPackagePrice?.value || "",
    date: elements.calcDate?.value || "",
    result: elements.calcResultLine?.textContent || "",
    resultVisible: !elements.calcResult?.classList.contains("hidden"),
    overlayOpen: elements.calcOverlay?.classList.contains("visible") || false,
  };
  try {
    await browserAPI.storage.local.set({ [CALC_STORAGE_KEY]: state });
  } catch {
    // Storage write failed silently
  }
}

async function loadCalcState() {
  try {
    const r = await browserAPI.storage.local.get(CALC_STORAGE_KEY);
    return r[CALC_STORAGE_KEY] || null;
  } catch {
    return null;
  }
}

async function openCalculator() {
  const saved = await loadCalcState();
  if (saved) {
    if (elements.calcInstallPrice) {
      elements.calcInstallPrice.value = saved.installPrice || "";
    }
    if (elements.calcPackagePrice) {
      elements.calcPackagePrice.value = saved.packagePrice || "";
    }
    if (elements.calcDate) {
      elements.calcDate.value = saved.date || getTodayISO();
    }
    if (saved.result && elements.calcResultLine) {
      elements.calcResultLine.textContent = saved.result;
    }
    if (saved.resultVisible) {
      elements.calcResult?.classList.remove("hidden");
    } else {
      elements.calcResult?.classList.add("hidden");
    }
  } else if (elements.calcDate && !elements.calcDate.value) {
    elements.calcDate.value = getTodayISO();
  }
  elements.calcOverlay?.classList.add("visible");
  saveCalcState();
}

function closeCalculator() {
  elements.calcOverlay?.classList.remove("visible");
  saveCalcState();
}

function clearCalculator() {
  if (elements.calcInstallPrice) {
    elements.calcInstallPrice.value = "";
  }
  if (elements.calcPackagePrice) {
    elements.calcPackagePrice.value = "";
  }
  if (elements.calcDate) {
    elements.calcDate.value = getTodayISO();
  }
  elements.calcResult?.classList.add("hidden");
  if (elements.calcResultLine) {
    elements.calcResultLine.textContent = "";
  }
  saveCalcState();
}

function runCalculator() {
  const installPrice = parseInt(elements.calcInstallPrice?.value, 10) || 0;
  const packagePrice = parseInt(elements.calcPackagePrice?.value, 10) || 0;

  if (packagePrice <= 0) {
    showToast(elements.toast, POPUP_UI_MESSAGES.PACKAGE_PRICE_REQUIRED, "warning");
    return;
  }

  const dateStr = elements.calcDate?.value;
  if (!dateStr) {
    showToast(elements.toast, POPUP_UI_MESSAGES.INSTALL_DATE_REQUIRED, "warning");
    return;
  }

  const [y, m, d] = dateStr.split("-").map(Number);
  const installDate = new Date(y, m - 1, d);
  const proration = calculateProration(packagePrice, installDate);

  const total = installPrice + proration.price;

  const installPart =
    installPrice > 0
      ? `COMODATO ${formatPrice(installPrice)}`
      : "COMODATO CORTESÍA";
  const line = `${installPart} + ${proration.label} ${formatPrice(proration.price)} = ${formatPrice(total)} MXN`;

  if (elements.calcResultLine) {
    elements.calcResultLine.textContent = line;
  }
  elements.calcResult?.classList.remove("hidden");
  saveCalcState();
}

function copyCalcResult() {
  const text = elements.calcResultLine?.textContent;
  if (!text) {
    return;
  }
  navigator.clipboard
    .writeText(text)
    .then(() => {
      showToast(elements.toast, POPUP_UI_MESSAGES.RESULT_LINE_COPIED, "success");
    })
    .catch(() => {
      showToast(elements.toast, POPUP_UI_MESSAGES.COPY_ERROR, "error");
    });
}

async function loadApiKeysToUI() {
  const keys = await getAllApiKeys();
  if (keys["wisphub.io"] && elements.settingsApiKeyIo) {
    elements.settingsApiKeyIo.value = keys["wisphub.io"];
  }
  if (keys["wisphub.app"] && elements.settingsApiKeyApp) {
    elements.settingsApiKeyApp.value = keys["wisphub.app"];
  }

  hasAnyApiKey = Boolean(keys["wisphub.io"] || keys["wisphub.app"]);
  return keys;
}

async function loadCachedStaffInfo(domainKey, sessionUsername = "") {
  if (!domainKey || !sessionUsername) {
    return false;
  }
  try {
    const result = await browserAPI.storage.local.get(STAFF_CACHE_KEY);
    const entry = (result[STAFF_CACHE_KEY] || {})[domainKey];
    if (!entry) {
      return false;
    }

    const cachedUsername = String(entry.username || "").trim().toLowerCase();
    const targetUsername = String(sessionUsername || "").trim().toLowerCase();
    if (!cachedUsername || cachedUsername !== targetUsername) {
      return false;
    }

    showStaffInfo(entry.username, entry.id);
    showStaffIdValue(entry.id);
    if (entry.ts && Date.now() - entry.ts < STAFF_CACHE_TTL) {
      return true;
    }
  } catch {
    // No cached data
  }
  return false;
}

async function saveStaffInfoToCache(domainKey, staff) {
  try {
    const result = await browserAPI.storage.local.get(STAFF_CACHE_KEY);
    const cache = result[STAFF_CACHE_KEY] || {};
    cache[domainKey] = {
      username: staff.username,
      nombre: staff.nombre,
      id: staff.id,
      ts: Date.now(),
    };
    await browserAPI.storage.local.set({ [STAFF_CACHE_KEY]: cache });
  } catch {
    // Cache write failed silently
  }
}

async function fetchStaffInfo() {
  try {
    if (!activeTabId || !activeSessionContext?.domainKey) {
      return;
    }

    const response = await browserAPI.tabs.sendMessage(activeTabId, {
      action: "GET_STAFF_INFO",
    });

    if (response?.staff) {
      showStaffInfo(
        response.staff.username || response.staff.nombre,
        response.staff.id,
      );
      showStaffIdValue(response.staff.id);
      saveStaffInfoToCache(activeSessionContext.domainKey, response.staff);
      writeLog(
        "info",
        `Staff detectado: ${response.staff.username} (ID: ${response.staff.id})`,
        "Staff",
      );
      return;
    }

    if (!hasAnyApiKey) {
      showStaffIdWarningState();
    }
  } catch {
    // Staff info not available yet
  }
}

function applySessionProfiles() {
  activeDomainProfiles = buildSessionProfilesForDomain(
    activeSessionContext?.domainKey,
    activeSessionContext?.username,
  );
  syncProfileSwitchButtonState();
}

async function initializeSessionCard(tab) {
  activeSessionContext = null;
  activeDomainProfiles = [];
  activeTabId = tab?.id || null;
  syncProfileSwitchButtonState();

  if (!tab?.id || !isWispHubDomain(tab.url)) {
    return false;
  }

  const sessionContext = await fetchSessionContext(tab.id);
  if (!sessionContext?.loggedIn || !sessionContext.username || !sessionContext.domainKey) {
    return false;
  }

  activeSessionContext = sessionContext;
  showStaffInfo(sessionContext.username, null);
  showStaffIdValue(null);
  applySessionProfiles();
  return true;
}

async function init() {
  initElements();

  const tab = await getActiveTab().catch(() => null);
  const domainKey = getDomainKey(tab?.url);

  const [settings] = await Promise.all([loadSettings(), loadApiKeysToUI()]);
  userSettings = settings;
  applySettingsToUI();

  const hasSessionCard = await initializeSessionCard(tab);
  if (hasSessionCard) {
    if (hasAnyApiKey) {
      const hasFreshCache = await loadCachedStaffInfo(
        domainKey,
        activeSessionContext?.username,
      );
      if (!hasFreshCache) {
        fetchStaffInfo();
      }
    } else {
      showStaffIdWarningState();
    }
  }

  setupEventListeners();
  renderChangelog(elements.changelogList);

  const calcState = await loadCalcState();
  if (calcState?.overlayOpen) {
    openCalculator();
  }

  checkConnection(elements, (level, msg) => writeLog(level, msg, "Conexión"));
  syncProfileSwitchButtonState();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
