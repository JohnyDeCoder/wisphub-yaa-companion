import { browserAPI } from "../../utils/browser.js";
import { getDomainKey, isWispHubDomain } from "../../config/domains.js";
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

let userSettings = {};
let elements = {};
let isFormatted = false;
let currentStaffId = null;

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
  currentStaffId = String(staffId);
  elements.staffUsername.textContent = username;
  elements.staffIdBadge.textContent = `ID: ${staffId}`;
  elements.staffInfo.classList.remove("hidden");
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
      showToast(elements.toast, "Sin pestaña activa", "error");
      return;
    }

    const action = isFormatted ? "RESTORE_COMMENTS" : "FORMAT_COMMENTS";
    const response = await browserAPI.tabs.sendMessage(tab.id, {
      action,
      settings: userSettings,
      fromPopup: true,
    });

    if (response?.success) {
      isFormatted = !isFormatted;
      elements.btnFormatComment.textContent = isFormatted
        ? "Restaurar"
        : "Usar";
      showToast(
        elements.toast,
        isFormatted ? "¡Formateado!" : "Texto restaurado",
        isFormatted ? "success" : "info",
      );
      writeLog(
        "success",
        isFormatted
          ? "Formateador aplicado desde popup"
          : "Texto restaurado desde popup",
      );
    } else if (response?.error) {
      showToast(elements.toast, response.error, "error");
      writeLog("error", `Formateador: ${response.error}`);
    } else {
      showToast(elements.toast, "Usa el botón en el editor", "warning");
    }
  } catch {
    showToast(elements.toast, "Abre una página con el editor", "warning");
  }
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
    if (!keyIo && !keyApp) {
      showToast(elements.toast, "Ingresa al menos una API Key", "warning");
      return;
    }
    await saveAllApiKeys({ "wisphub.io": keyIo, "wisphub.app": keyApp });
    showToast(
      elements.toast,
      "API Keys guardadas, reinicia la página para que surtan efecto",
      "success",
    );
    writeLog("success", "API Keys actualizadas");
  });

  elements.staffIdBadge?.addEventListener("click", () => {
    if (!currentStaffId) {
      return;
    }
    navigator.clipboard.writeText(currentStaffId);
    elements.staffIdBadge.classList.add("copied");
    elements.staffIdBadge.textContent = "¡Copiado!";
    setTimeout(() => {
      elements.staffIdBadge.textContent = `ID: ${currentStaffId}`;
      elements.staffIdBadge.classList.remove("copied");
    }, 1500);
  });

  elements.btnLogs?.addEventListener("click", openLogsViewer);
  elements.btnLogsClose?.addEventListener("click", closeLogsViewer);
  elements.btnLogsClear?.addEventListener("click", async () => {
    await clearLogs();
    renderLogs(elements.logsList, []);
  });

  elements.btnOpenCalc?.addEventListener("click", openCalculator);
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
    showToast(elements.toast, "Ingresa el precio del paquete", "warning");
    return;
  }

  const dateStr = elements.calcDate?.value;
  if (!dateStr) {
    showToast(elements.toast, "Selecciona una fecha de instalación", "warning");
    return;
  }

  const [y, m, d] = dateStr.split("-").map(Number);
  const installDate = new Date(y, m - 1, d);
  const proration = calculateProration(packagePrice, installDate);

  const total = installPrice + proration.price;

  const installPart =
    installPrice > 0 ? `COMODATO ${formatPrice(installPrice)}` : "COMODATO $0";
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
      showToast(elements.toast, "Línea copiada al portapapeles", "success");
    })
    .catch(() => {
      showToast(elements.toast, "Error al copiar", "error");
    });
}

function showApiKeyWarning() {
  if (!elements.staffInfo) {
    return;
  }
  const existing = elements.staffInfo.querySelector(".wisphub-yaa-api-warning");
  if (existing) {
    return;
  }
  const badge = document.createElement("span");
  badge.className = "wisphub-yaa-api-warning";
  badge.textContent = "API Keys no configuradas";
  elements.staffInfo.parentElement?.insertBefore(
    badge,
    elements.staffInfo.nextSibling,
  );
}

async function loadApiKeysToUI() {
  const keys = await getAllApiKeys();
  if (keys["wisphub.io"] && elements.settingsApiKeyIo) {
    elements.settingsApiKeyIo.value = keys["wisphub.io"];
  }
  if (keys["wisphub.app"] && elements.settingsApiKeyApp) {
    elements.settingsApiKeyApp.value = keys["wisphub.app"];
  }
  if (!keys["wisphub.io"] && !keys["wisphub.app"]) {
    showApiKeyWarning();
  }
}

async function loadCachedStaffInfo(domainKey) {
  if (!domainKey) {
    return false;
  }
  try {
    const result = await browserAPI.storage.local.get(STAFF_CACHE_KEY);
    const entry = (result[STAFF_CACHE_KEY] || {})[domainKey];
    if (entry) {
      showStaffInfo(entry.username, entry.id);
      if (entry.ts && Date.now() - entry.ts < STAFF_CACHE_TTL) {
        return true;
      }
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
    const [tab] = await browserAPI.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab || !isWispHubDomain(tab.url)) {
      return;
    }

    const domainKey = getDomainKey(tab.url);
    const response = await browserAPI.tabs.sendMessage(tab.id, {
      action: "GET_STAFF_INFO",
    });

    if (response?.staff) {
      showStaffInfo(
        response.staff.username || response.staff.nombre,
        response.staff.id,
      );
      if (domainKey) {
        saveStaffInfoToCache(domainKey, response.staff);
      }
      writeLog(
        "info",
        `Staff detectado: ${response.staff.username} (ID: ${response.staff.id})`,
        "Staff",
      );
    }
  } catch {
    // Staff info not available yet
  }
}

async function init() {
  initElements();

  const [tab] = await browserAPI.tabs
    .query({ active: true, currentWindow: true })
    .catch(() => []);
  const domainKey = getDomainKey(tab?.url);

  const [settings, , hasFreshCache] = await Promise.all([
    loadSettings(),
    loadApiKeysToUI(),
    loadCachedStaffInfo(domainKey),
  ]);
  userSettings = settings;
  applySettingsToUI();

  setupEventListeners();
  renderChangelog(elements.changelogList);

  const calcState = await loadCalcState();
  if (calcState?.overlayOpen) {
    openCalculator();
  }

  checkConnection(elements, (level, msg) => writeLog(level, msg, "Conexión"));
  if (!hasFreshCache) {
    fetchStaffInfo();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
