import {
  getEditorInstance,
  getEditorText,
  getEditorContent,
  setEditorContent,
  isEditorReady,
} from "../../lib/editor/ckeditor.js";
import { MONTH_NAMES } from "../../config/constants.js";
import { NOTIFICATION_TYPES, UI_MESSAGES } from "../../config/messages.js";
import { sendLogToPopup } from "../../utils/logger.js";
import { formatPrice } from "../../utils/formatting.js";

let _notify = () => {};

export function initPriceCalcNotify(notifyFn) {
  _notify = notifyFn;
}

const S = "\\s+";
const S_OPT = "\\s*";
const PRICE = "\\$([\\d.,]+)";
const MONTH_NAME = "([A-ZÁÉÍÓÚÑ]+)";
// Matches month labels: RESTANTE, RESTANTE DE, RESTANTE DE MES, RESTO, RESTO MES, RESTO DE MES, MES, MES COMPLETO
const MONTH_LABEL = `(RESTANTE(?:${S}DE(?:${S}MES)?)?|RESTO(?:${S}(?:DE${S})?MES)?|MES(?:${S}COMPLETO)?)`;

// Matches full price lines: "<anything> + <monthLabel> <monthName> $<price> = $<total> [MXN]"
// Groups: 1=installPart, 2=monthLabel, 3=monthName, 4=monthPrice, 5=total
const PRICE_PATTERN =
  `([^\\n+]+?)${S_OPT}\\+${S_OPT}${MONTH_LABEL}` +
  `${S}${MONTH_NAME}${S}${PRICE}` +
  `${S_OPT}=${S_OPT}${PRICE}(?:${S}MXN)?`;
const PRICE_LINE_RE = new RegExp(PRICE_PATTERN, "i");

// Matches incomplete price lines with optional placeholders: "<anything> + RESTANTE DE MES FEBRERO $ = $"
const OPTIONAL_PRICE_TOKEN = "\\$[\\d.,]*";
const INCOMPLETE_MONTH_PART = `${MONTH_LABEL}(?:${S}${MONTH_NAME})?(?:${S}${OPTIONAL_PRICE_TOKEN})?`;
const OPTIONAL_PACKAGE_PART = `(?:${S}\\d+${S_OPT}M(?:BPS?)?${S_OPT}[Xx×]?${S_OPT}${OPTIONAL_PRICE_TOKEN})?`;
const INCOMPLETE_RE = new RegExp(
  `([^\\n+]+?)${S_OPT}\\+${S_OPT}${INCOMPLETE_MONTH_PART}${OPTIONAL_PACKAGE_PART}` +
    `(?:${S_OPT}=${S_OPT}${OPTIONAL_PRICE_TOKEN})?`,
  "i",
);

// Matches package price: "PAQUETE: 20M X $350" or "20 MBPS X $350"
const PACKAGE_PRICE_RE = new RegExp(`(?:PAQUETE:?${S})?\\d+${S_OPT}M(?:BPS?)?${S_OPT}[Xx×]?${S_OPT}\\$([\\d.,]+)`, "i");

let autoPriceCalcEnabled = false,
  dateListenerActive = false,
  dateWatchSuppressed = false;
let lastDateFieldValue = "";

export function setDateWatchSuppressed(val) {
  dateWatchSuppressed = val;
}

function getDaysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getInstallDate() {
  const field = document.getElementById("id_cliente-fecha_instalacion");
  if (!field || !field.value) {
    return null;
  }
  const m = field.value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) {
    return null;
  }
  return new Date(+m[3], +m[2] - 1, +m[1]);
}

function parsePrice(str) {
  return parseInt(str.replace(/[$,.\s]/g, ""), 10);
}

function extractPriceFromPlanText(text) {
  let m = text.match(/\$([\d][,.\d]*)/);
  if (m) {
    return parsePrice(m[1]);
  }
  m = text.match(/\(\$?([\d][,.\d]*)\)/);
  if (m) {
    return parsePrice(m[1]);
  }
  const candidates = [...text.matchAll(/\b(\d+(?:[,.]\d+)?)\b/g)];
  for (const c of candidates) {
    const val = parsePrice(c[1]);
    if (val < 100) {
      continue;
    }
    const after = text.slice(c.index + c[0].length);
    if (/^\s*(?:MEGAS?|MB|Mb|M\b)/i.test(after)) {
      continue;
    }
    return val;
  }
  return null;
}

function getMonthlyPriceFromForm() {
  const planSelect = document.getElementById("id_cliente-plan_internet");
  if (!planSelect) {
    return null;
  }
  const text = planSelect.options?.[planSelect.selectedIndex]?.text || "";
  return extractPriceFromPlanText(text);
}

function getInstallCostFromForm() {
  const field = document.getElementById("id_cliente-costo_instalacion");
  if (!field || !field.value) {
    return null;
  }
  const cleaned = field.value.replace(/[$,.\s]/g, "");
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : n;
}

function calculateProration(monthlyPrice, installDate) {
  const day = installDate.getDate();
  const totalDays = getDaysInMonth(installDate);
  const isProrated = day > 5 && day < 26;

  if (!isProrated) {
    const targetDate = day > 25 ? new Date(installDate.getFullYear(), installDate.getMonth() + 1, 1) : installDate;
    const monthName = MONTH_NAMES[targetDate.getMonth()];
    return { isProrated: false, price: monthlyPrice, monthName, label: `MES ${monthName}` };
  }

  const monthName = MONTH_NAMES[installDate.getMonth()];
  const remaining = totalDays - day;
  const price = Math.round((monthlyPrice / totalDays) * remaining);
  return { isProrated: true, price, monthName, label: `RESTANTE DE MES ${monthName}` };
}

function sendLog(level, consoleMsg, popupMsg) {
  sendLogToPopup("PriceCalc", level, consoleMsg, popupMsg);
}

function escapeForRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function flexHtmlReplace(html, plainText, replacement) {
  const pattern = escapeForRegex(plainText).replace(/\s+/g, "(?:\\s|&nbsp;)+");
  return html.replace(new RegExp(pattern, "i"), replacement);
}

function resolveMonthlyPrice(text) {
  const pkgMatch = text.match(PACKAGE_PRICE_RE);
  if (pkgMatch) {
    return parsePrice(pkgMatch[1]);
  }
  return getMonthlyPriceFromForm();
}

export function calculatePrices(options = {}) {
  const { silent = false } = options;
  const notify = silent ? () => {} : _notify;
  const editor = getEditorInstance();

  if (!editor || !isEditorReady(editor)) {
    notify(UI_MESSAGES.EDITOR_NOT_FOUND, NOTIFICATION_TYPES.ERROR);
    return { success: false, error: UI_MESSAGES.EDITOR_NOT_FOUND };
  }

  const text = getEditorText(editor);
  if (!text?.trim()) {
    notify(UI_MESSAGES.EDITOR_EMPTY, NOTIFICATION_TYPES.WARNING);
    return { success: false, error: UI_MESSAGES.EDITOR_EMPTY };
  }

  const installDate = getInstallDate();
  if (!installDate) {
    notify(UI_MESSAGES.PRICE_NO_DATE, NOTIFICATION_TYPES.WARNING);
    return { success: false, error: UI_MESSAGES.PRICE_NO_DATE };
  }

  const monthlyPrice = resolveMonthlyPrice(text);
  if (!monthlyPrice) {
    notify(UI_MESSAGES.PRICE_NO_PACKAGE, NOTIFICATION_TYPES.WARNING);
    return { success: false, error: UI_MESSAGES.PRICE_NO_PACKAGE };
  }

  const proration = calculateProration(monthlyPrice, installDate);
  const match = text.match(PRICE_LINE_RE);

  if (match) {
    return updateExistingPriceLine(editor, text, match, proration, notify);
  }

  if (INCOMPLETE_RE.test(text)) {
    return buildPriceLine(editor, text, proration, notify);
  }

  notify(UI_MESSAGES.PRICE_NO_LINE, NOTIFICATION_TYPES.WARNING);
  return { success: false, error: UI_MESSAGES.PRICE_NO_LINE };
}

function updateExistingPriceLine(editor, text, match, proration, notify) {
  // Extract install price from the install part text (group 1)
  const installPart = match[1].trim();
  const installPriceMatch = installPart.match(/\$([\d.,]+)/);
  const installPrice = installPriceMatch ? parsePrice(installPriceMatch[1]) : 0;
  const oldMonthLabel = match[2].toUpperCase().trim();
  const oldMonthName = match[3].toUpperCase().trim();
  const oldMonthPrice = parsePrice(match[4]);
  const oldTotal = parsePrice(match[5]);

  const newMonthPrice = proration.price;
  const newTotal = installPrice + newMonthPrice;
  const newMonthLabel = proration.isProrated ? "RESTANTE DE MES" : "MES";

  if (
    oldMonthPrice === newMonthPrice &&
    oldTotal === newTotal &&
    oldMonthName === proration.monthName &&
    oldMonthLabel === newMonthLabel
  ) {
    notify(UI_MESSAGES.PRICE_NO_CHANGE, NOTIFICATION_TYPES.INFO);
    return { success: true, noChange: true };
  }

  let html = getEditorContent(editor);
  const originalHtml = html;

  const oldMonthSection = `${oldMonthLabel} ${oldMonthName} $${match[4]}`;
  const newMonthSection = `${proration.label} ${formatPrice(newMonthPrice)}`;
  html = flexHtmlReplace(html, oldMonthSection, newMonthSection);

  const oldTotalSection = `$${match[5]}`;
  const newTotalSection = formatPrice(newTotal);
  html = flexHtmlReplace(html, oldTotalSection, newTotalSection);

  if (html === originalHtml) {
    sendLog(
      "error",
      `Replacement failed — searching: "${oldMonthSection}" and "${oldTotalSection}"`,
      "No pude actualizar esa línea de precios.",
    );
    sendLog("error", `Current HTML: ${originalHtml.substring(0, 300)}`, "Revisa el comentario y vuelve a intentarlo.");
    notify(UI_MESSAGES.PRICE_REPLACE_FAIL, NOTIFICATION_TYPES.WARNING);
    return { success: false, error: UI_MESSAGES.PRICE_REPLACE_FAIL };
  }

  setEditorContent(editor, html);

  const newLine =
    `${installPart} + ${proration.label} ` + `${formatPrice(newMonthPrice)} = ${formatPrice(newTotal)} MXN`;

  sendLog("success", `Price updated: ${match[0]} → ${newLine}`, `${match[0]} → ${newLine}`);
  notify(UI_MESSAGES.PRICE_UPDATED, NOTIFICATION_TYPES.SUCCESS);
  return { success: true, oldLine: match[0], newLine };
}

function buildPriceLine(editor, text, proration, notify) {
  const installCost = getInstallCostFromForm();
  const installPrice = installCost || 0;
  const newMonthPrice = proration.price;
  const total = installPrice + newMonthPrice;

  const incompleteMatch = text.match(INCOMPLETE_RE);
  if (!incompleteMatch) {
    return { success: false };
  }

  let html = getEditorContent(editor);
  const oldText = incompleteMatch[0];
  const installPart = oldText.split("+")[0].trim();
  const installPartHasPrice = /\$\s*[\d.,]+/.test(installPart);

  const equipLabel = installCost
    ? installPartHasPrice
      ? installPart
      : `${installPart} ${formatPrice(installPrice)}`
    : installPart;

  const newLine = `${equipLabel} + ${proration.label} ` + `${formatPrice(newMonthPrice)} = ${formatPrice(total)} MXN`;

  const originalHtml = html;
  html = flexHtmlReplace(html, oldText, newLine);

  if (html === originalHtml) {
    sendLog("error", `Replacement failed — searching: "${oldText}"`, "No pude generar la línea de precios.");
    sendLog("error", `Current HTML: ${originalHtml.substring(0, 300)}`, "Revisa el comentario y vuelve a intentarlo.");
    notify(UI_MESSAGES.PRICE_REPLACE_FAIL, NOTIFICATION_TYPES.WARNING);
    return { success: false, error: UI_MESSAGES.PRICE_REPLACE_FAIL };
  }

  setEditorContent(editor, html);
  sendLog("success", `Price generated: ${newLine}`, `Precio generado: ${newLine}`);
  notify(UI_MESSAGES.PRICE_UPDATED, NOTIFICATION_TYPES.SUCCESS);
  return { success: true, newLine };
}

export function hasPriceLine(text) {
  return PRICE_LINE_RE.test(text) || INCOMPLETE_RE.test(text);
}

// Debounce timer to avoid duplicate fires from multiple event sources
let dateChangeTimer = null;

function getDateFieldValue() {
  const field = document.getElementById("id_cliente-fecha_instalacion");
  return (field?.value || "").trim();
}

function onDateFieldChange() {
  const currentDateValue = getDateFieldValue();
  if (!currentDateValue) {
    return;
  }

  if (currentDateValue === lastDateFieldValue) {
    return;
  }

  lastDateFieldValue = currentDateValue;

  if (!autoPriceCalcEnabled || dateWatchSuppressed) {
    return;
  }

  clearTimeout(dateChangeTimer);
  dateChangeTimer = setTimeout(() => {
    // Re-check: suppression may have been set after the event fired
    if (dateWatchSuppressed) {
      return;
    }
    const editor = getEditorInstance();
    if (!editor || !isEditorReady(editor)) {
      return;
    }
    const text = getEditorText(editor);
    if (text && hasPriceLine(text)) {
      calculatePrices({ silent: false });
    }
  }, 300);
}

export function watchDateField() {
  if (dateListenerActive) {
    return;
  }

  const field = document.getElementById("id_cliente-fecha_instalacion");
  if (!field) {
    return;
  }

  lastDateFieldValue = (field.value || "").trim();

  // Native change/input events
  field.addEventListener("change", onDateFieldChange);
  field.addEventListener("input", onDateFieldChange);

  // Bootstrap datetimepicker fires dp.change via jQuery
  if (window.jQuery) {
    window.jQuery(field).closest(".datetimepicker-input").on("dp.change", onDateFieldChange);
  }

  dateListenerActive = true;
}

export function updatePriceCalcSettings(settings) {
  if (typeof settings?.autoPriceCalcEnabled === "boolean") {
    autoPriceCalcEnabled = settings.autoPriceCalcEnabled;
  }
}

export function isAutoPriceCalcEnabled() {
  return autoPriceCalcEnabled;
}

// Returns calculated price data for the template button without modifying the editor.
// Returns null if monthly price is unavailable.
export function tryCalculateForTemplate() {
  const monthlyPrice = getMonthlyPriceFromForm();
  if (!monthlyPrice) {
    return null;
  }

  // Use form date if available, otherwise current Mexico date
  const installDate =
    getInstallDate() || new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  const installCost = getInstallCostFromForm();
  const proration = calculateProration(monthlyPrice, installDate);

  return {
    installCost: installCost || 0,
    monthPrice: proration.price,
    monthLabel: proration.label,
    total: (installCost || 0) + proration.price,
  };
}
