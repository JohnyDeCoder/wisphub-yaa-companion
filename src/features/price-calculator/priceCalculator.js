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
// Uses horizontal whitespace [^\S\n] to prevent matching across line breaks
const OPTIONAL_PRICE_TOKEN = "\\$[\\d.,]*";
const HS = "[^\\S\\n]+";
const HS_OPT = "[^\\S\\n]*";
const INCOMPLETE_MONTH_PART = `${MONTH_LABEL}(?:${HS}${MONTH_NAME})?(?:${HS}${OPTIONAL_PRICE_TOKEN})?`;
const OPTIONAL_PACKAGE_PART = `(?:${HS}\\d+${HS_OPT}M(?:BPS?)?${HS_OPT}[Xx×]?${HS_OPT}${OPTIONAL_PRICE_TOKEN})?`;
const INCOMPLETE_RE = new RegExp(
  `([^\\n+]+?)${HS_OPT}\\+${HS_OPT}${INCOMPLETE_MONTH_PART}${OPTIONAL_PACKAGE_PART}` +
    `(?:${HS_OPT}=${HS_OPT}${OPTIONAL_PRICE_TOKEN})?`,
  "i",
);

// Matches package price: "PAQUETE: 20M X $350" or "20 MBPS X $350"
const PACKAGE_PRICE_RE = new RegExp(
  `(?:PAQUETE:?${S})?\\d+${S_OPT}M(?:BPS?)?${S_OPT}[Xx×]?${S_OPT}\\$([\\d.,]+)`,
  "i",
);

let autoPriceCalcEnabled = false,
  dateListenerActive = false,
  dateWatchSuppressed = false;
let lastDateFieldValue = "";
let lastPlanValue = "";
let lastCostValue = "";
let recalcTimer = null;

export function setDateWatchSuppressed(val) {
  dateWatchSuppressed = val;
  if (val) {
    clearTimeout(recalcTimer);
  }
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
    const targetDate =
      day > 25
        ? new Date(installDate.getFullYear(), installDate.getMonth() + 1, 1)
        : installDate;
    const monthName = MONTH_NAMES[targetDate.getMonth()];
    return {
      isProrated: false,
      price: monthlyPrice,
      monthName,
      label: `MES ${monthName}`,
    };
  }

  const monthName = MONTH_NAMES[installDate.getMonth()];
  const remaining = totalDays - day;
  const price = Math.round((monthlyPrice / totalDays) * remaining);
  return {
    isProrated: true,
    price,
    monthName,
    label: `RESTANTE DE MES ${monthName}`,
  };
}

function sendLog(level, consoleMsg, popupMsg) {
  sendLogToPopup("PriceCalc", level, consoleMsg, popupMsg);
}

function escapeForRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Accented characters → alternations that also match their HTML entity forms
const ENTITY_ALTERNATIONS = [
  [/Ñ/gi, "(?:Ñ|&Ntilde;|&ntilde;)"],
  [/Á/gi, "(?:Á|&Aacute;|&aacute;)"],
  [/É/gi, "(?:É|&Eacute;|&eacute;)"],
  [/Í/gi, "(?:Í|&Iacute;|&iacute;)"],
  [/Ó/gi, "(?:Ó|&Oacute;|&oacute;)"],
  [/Ú/gi, "(?:Ú|&Uacute;|&uacute;)"],
];

function flexHtmlReplace(html, plainText, replacement) {
  let pattern = escapeForRegex(plainText);
  for (const [re, alt] of ENTITY_ALTERNATIONS) {
    pattern = pattern.replace(re, alt);
  }
  pattern = pattern.replace(/\s+/g, "(?:\\s|&nbsp;)+");
  return html.replace(new RegExp(pattern, "i"), replacement);
}

function resolveMonthlyPrice(text) {
  // Form selector takes priority; fall back to package price in comment text
  const formPrice = getMonthlyPriceFromForm();
  if (formPrice) {
    return formPrice;
  }
  const pkgMatch = text.match(PACKAGE_PRICE_RE);
  if (pkgMatch) {
    return parsePrice(pkgMatch[1]);
  }
  return null;
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
  const monthlyPrice = resolveMonthlyPrice(text);
  const completeMatch = text.match(PRICE_LINE_RE);

  // Full calculation: date + monthly price available
  if (installDate && monthlyPrice) {
    const proration = calculateProration(monthlyPrice, installDate);
    if (completeMatch) {
      return updateExistingPriceLine(editor, completeMatch, proration, notify);
    }
    if (INCOMPLETE_RE.test(text)) {
      return buildPriceLine(editor, text, proration, notify);
    }
    notify(UI_MESSAGES.PRICE_NO_LINE, NOTIFICATION_TYPES.WARNING);
    return { success: false, error: UI_MESSAGES.PRICE_NO_LINE };
  }

  // Partial update: existing complete line → update install cost, keep month values
  if (completeMatch) {
    return updateExistingPriceLine(editor, completeMatch, null, notify);
  }

  // Incomplete line without full data → fill install cost placeholder
  if (INCOMPLETE_RE.test(text)) {
    const formCost = getInstallCostFromForm();
    if (formCost !== null) {
      return fillCostInIncomplete(editor, text, formCost, notify);
    }
  }

  if (!installDate) {
    notify(UI_MESSAGES.PRICE_NO_DATE, NOTIFICATION_TYPES.WARNING);
    return { success: false, error: UI_MESSAGES.PRICE_NO_DATE };
  }

  notify(UI_MESSAGES.PRICE_NO_PACKAGE, NOTIFICATION_TYPES.WARNING);
  return { success: false, error: UI_MESSAGES.PRICE_NO_PACKAGE };
}

function updateExistingPriceLine(editor, match, proration, notify) {
  const installPart = match[1].trim();
  const installPriceMatch = installPart.match(/\$([\d.,]+)/);
  const textInstallPrice = installPriceMatch
    ? parsePrice(installPriceMatch[1])
    : 0;

  const formCost = getInstallCostFromForm();
  const installPrice = formCost !== null ? formCost : textInstallPrice;

  const oldMonthPrice = parsePrice(match[4]);
  const oldTotal = parsePrice(match[5]);

  // With proration: full recalc; without: keep existing month values (cost-only)
  const newMonthPrice = proration ? proration.price : oldMonthPrice;
  const monthLabel = proration
    ? proration.label
    : `${match[2].trim()} ${match[3].trim()}`;
  const newTotal = installPrice + newMonthPrice;

  const installChanged = formCost !== null && formCost !== textInstallPrice;
  let newInstallPart = installPart;
  if (installChanged) {
    if (installPriceMatch) {
      newInstallPart = installPart.replace(
        /\$[\d.,]+/,
        formatPrice(formCost),
      );
    } else if (/\$\s*$/.test(installPart)) {
      newInstallPart = installPart.replace(/\$\s*$/, formatPrice(formCost));
    }
  }

  const oldLabelText = `${match[2].trim()} ${match[3].trim()}`;
  if (
    !installChanged &&
    oldMonthPrice === newMonthPrice &&
    oldTotal === newTotal &&
    monthLabel === oldLabelText
  ) {
    notify(UI_MESSAGES.PRICE_NO_CHANGE, NOTIFICATION_TYPES.INFO);
    return { success: true, noChange: true };
  }

  // Build the complete new line and replace in one shot (avoids ambiguous partial matches)
  const newLine =
    `${newInstallPart} + ${monthLabel} ` +
    `${formatPrice(newMonthPrice)} = ${formatPrice(newTotal)} MXN`;

  let html = getEditorContent(editor);
  const originalHtml = html;
  html = flexHtmlReplace(html, match[0], newLine);

  if (html === originalHtml) {
    sendLog(
      "error",
      `Replacement failed — searching: "${match[0]}"`,
      "No pude actualizar esa línea de precios.",
    );
    sendLog(
      "error",
      `Current HTML: ${originalHtml.substring(0, 300)}`,
      "Revisa el comentario y vuelve a intentarlo.",
    );
    notify(UI_MESSAGES.PRICE_REPLACE_FAIL, NOTIFICATION_TYPES.WARNING);
    return { success: false, error: UI_MESSAGES.PRICE_REPLACE_FAIL };
  }

  setEditorContent(editor, html);

  sendLog(
    "success",
    `Price updated: ${match[0]} → ${newLine}`,
    `${match[0]} → ${newLine}`,
  );
  notify(UI_MESSAGES.PRICE_UPDATED, NOTIFICATION_TYPES.SUCCESS);
  return { success: true, oldLine: match[0], newLine };
}

function buildPriceLine(editor, text, proration, notify) {
  const incompleteMatch = text.match(INCOMPLETE_RE);
  if (!incompleteMatch) {
    return { success: false };
  }

  let html = getEditorContent(editor);
  const oldText = incompleteMatch[0];
  const installPart = oldText.split("+")[0].trim();
  const textPriceMatch = installPart.match(/\$([\d.,]+)/);

  // Priority: price already in comment text, then form field
  const textPrice = textPriceMatch ? parsePrice(textPriceMatch[1]) : 0;
  const formCost = getInstallCostFromForm();
  const installPrice = textPrice || formCost || 0;
  const newMonthPrice = proration.price;
  const total = installPrice + newMonthPrice;

  let equipLabel;
  if (textPriceMatch) {
    // Text already has a price (e.g. "CAMBIO DE COMPAÑIA $350") — keep as-is
    equipLabel = installPart;
  } else if (installPrice > 0) {
    // No price in text but we have one from the form — fill the placeholder
    equipLabel = /\$\s*$/.test(installPart)
      ? installPart.replace(/\$\s*$/, formatPrice(installPrice))
      : `${installPart} ${formatPrice(installPrice)}`;
  } else {
    equipLabel = installPart;
  }

  const newLine =
    `${equipLabel} + ${proration.label} ` +
    `${formatPrice(newMonthPrice)} = ${formatPrice(total)} MXN`;

  const originalHtml = html;
  html = flexHtmlReplace(html, oldText, newLine);

  if (html === originalHtml) {
    sendLog(
      "error",
      `Replacement failed — searching: "${oldText}"`,
      "No pude generar la línea de precios.",
    );
    sendLog(
      "error",
      `Current HTML: ${originalHtml.substring(0, 300)}`,
      "Revisa el comentario y vuelve a intentarlo.",
    );
    notify(UI_MESSAGES.PRICE_REPLACE_FAIL, NOTIFICATION_TYPES.WARNING);
    return { success: false, error: UI_MESSAGES.PRICE_REPLACE_FAIL };
  }

  setEditorContent(editor, html);
  sendLog(
    "success",
    `Price generated: ${newLine}`,
    `Precio generado: ${newLine}`,
  );
  notify(UI_MESSAGES.PRICE_UPDATED, NOTIFICATION_TYPES.SUCCESS);
  return { success: true, newLine };
}

function fillCostInIncomplete(editor, text, formCost, notify) {
  const incMatch = text.match(INCOMPLETE_RE);
  if (!incMatch) {
    return { success: false };
  }

  const oldText = incMatch[0];
  const plusIdx = oldText.indexOf("+");
  const installPart = oldText.substring(0, plusIdx).trim();
  const restPart = oldText.substring(plusIdx);

  const textPriceMatch = installPart.match(/\$([\d.,]+)/);
  const existingPrice = textPriceMatch ? parsePrice(textPriceMatch[1]) : null;

  if (existingPrice === formCost) {
    return { success: true, noChange: true };
  }

  let newInstallPart;
  if (textPriceMatch) {
    newInstallPart = installPart.replace(/\$[\d.,]+/, formatPrice(formCost));
  } else if (/\$\s*$/.test(installPart)) {
    newInstallPart = installPart.replace(/\$\s*$/, formatPrice(formCost));
  } else {
    newInstallPart = `${installPart} ${formatPrice(formCost)}`;
  }

  const newText = `${newInstallPart} ${restPart}`;

  let html = getEditorContent(editor);
  const originalHtml = html;
  html = flexHtmlReplace(html, oldText, newText);

  if (html === originalHtml) {
    return { success: false, error: UI_MESSAGES.PRICE_REPLACE_FAIL };
  }

  setEditorContent(editor, html);
  sendLog(
    "success",
    `Cost updated: ${oldText} → ${newText}`,
    `Costo: ${newText}`,
  );
  notify(UI_MESSAGES.PRICE_UPDATED, NOTIFICATION_TYPES.SUCCESS);
  return { success: true, newLine: newText };
}

export function hasPriceLine(text) {
  return PRICE_LINE_RE.test(text) || INCOMPLETE_RE.test(text);
}

// Shared debounced recalculation — cancels any pending timer and schedules a new one.
function scheduleRecalc(delay = 300) {
  if (!autoPriceCalcEnabled || dateWatchSuppressed) {
    return;
  }

  clearTimeout(recalcTimer);
  recalcTimer = setTimeout(() => {
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
  }, delay);
}

function getDateFieldValue() {
  const field = document.getElementById("id_cliente-fecha_instalacion");
  return (field?.value || "").trim();
}

function onDateFieldChange() {
  const currentDateValue = getDateFieldValue();
  if (!currentDateValue || currentDateValue === lastDateFieldValue) {
    return;
  }
  lastDateFieldValue = currentDateValue;
  scheduleRecalc(300);
}

function onPlanFieldChange() {
  const planSelect = document.getElementById("id_cliente-plan_internet");
  const currentValue = planSelect?.value || "";
  if (currentValue === lastPlanValue) {
    return;
  }
  lastPlanValue = currentValue;
  scheduleRecalc(300);
}

function onCostFieldChange() {
  const costField = document.getElementById("id_cliente-costo_instalacion");
  const currentValue = (costField?.value || "").trim();
  if (currentValue === lastCostValue) {
    return;
  }
  lastCostValue = currentValue;
  scheduleRecalc(500);
}

export function watchDateField() {
  if (dateListenerActive) {
    return;
  }

  const dateField = document.getElementById("id_cliente-fecha_instalacion");
  const planSelect = document.getElementById("id_cliente-plan_internet");
  const costField = document.getElementById("id_cliente-costo_instalacion");

  if (!dateField && !planSelect && !costField) {
    return;
  }

  // Watch "Fecha instalacion" — native events + Bootstrap datetimepicker
  if (dateField) {
    lastDateFieldValue = (dateField.value || "").trim();
    dateField.addEventListener("change", onDateFieldChange);
    dateField.addEventListener("input", onDateFieldChange);

    if (window.jQuery) {
      window
        .jQuery(dateField)
        .closest(".datetimepicker-input")
        .on("dp.change", onDateFieldChange);
    }
  }

  // Watch "Plan internet" selector (also via jQuery for Select2 compatibility)
  if (planSelect) {
    lastPlanValue = planSelect.value || "";
    planSelect.addEventListener("change", onPlanFieldChange);
    if (window.jQuery) {
      window.jQuery(planSelect).on("change", onPlanFieldChange);
    }
  }

  // Watch "Costo instalacion" input
  if (costField) {
    lastCostValue = (costField.value || "").trim();
    costField.addEventListener("change", onCostFieldChange);
    costField.addEventListener("input", onCostFieldChange);
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
    getInstallDate() ||
    new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }),
    );
  const installCost = getInstallCostFromForm();
  const proration = calculateProration(monthlyPrice, installDate);

  return {
    installCost: installCost || 0,
    monthPrice: proration.price,
    monthLabel: proration.label,
    total: (installCost || 0) + proration.price,
  };
}
