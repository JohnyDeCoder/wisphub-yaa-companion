import { sendLogToPopup } from "../../../utils/logger.js";
import {
  getEditorInstance,
  getEditorText,
} from "../../../lib/editor/ckeditor.js";
import { isFormatterScopePath } from "../../../config/pagePatterns.js";

const VALID_EQUIPMENT_TYPES = ["COMODATO", "COMO DATO", "DATO", "PROPIOS"];
const SUBMIT_CONFIRM_GRACE_MS = 2500;

const EQUIPMENT_RE = /EQUIPO\S*\s+([\w\s]+?)(?:\n|$)/i;
const COMMENT_PRICE_RE = /(PAQUETE|PLAN)(?:\s+INTERNET)?[^\n]*?\$\s*([\d,.]+)/i;

function log(consoleMsg, popupMsg, level = "info") {
  sendLogToPopup("FormGuards", level, consoleMsg, popupMsg);
}

function extractEquipmentType() {
  const editor = getEditorInstance();
  if (!editor) {
    return null;
  }
  const text = getEditorText(editor);
  if (!text) {
    return null;
  }
  const match = text.match(EQUIPMENT_RE);
  if (!match) {
    return null;
  }
  return match[1].trim().toUpperCase();
}

function parseMoney(value) {
  if (value == null) {
    return null;
  }
  const raw = String(value).replace(/[^\d.,]/g, "").trim();
  if (!raw) {
    return null;
  }
  const normalized = raw.replace(/,/g, "");
  const num = Number.parseFloat(normalized);
  return Number.isFinite(num) ? num : null;
}

function formatMoney(value) {
  const num = parseMoney(value);
  if (num === null) {
    return String(value || "");
  }
  return num.toLocaleString("es-MX");
}

function extractCommentPrice() {
  const editor = getEditorInstance();
  if (!editor) {
    return null;
  }
  const text = getEditorText(editor);
  if (!text) {
    return null;
  }
  const match = text.match(COMMENT_PRICE_RE);
  if (!match) {
    return null;
  }
  return {
    label: match[1].toUpperCase(),
    value: match[2].trim(),
  };
}

function extractPlanPriceFromText(text) {
  if (!text) {
    return null;
  }

  let match = text.match(/\$\s*([\d][\d.,]*)/);
  if (match) {
    return match[1].trim();
  }

  match = text.match(/\(\s*\$?\s*([\d][\d.,]*)\s*\)/);
  if (match) {
    return match[1].trim();
  }

  const numericCandidates = [...text.matchAll(/\b(\d+(?:[.,]\d+)?)\b/g)];
  for (const candidate of numericCandidates) {
    const raw = candidate[1];
    const value = parseMoney(raw);
    if (value === null || value < 100) {
      continue;
    }

    const after = text.slice(candidate.index + candidate[0].length);
    if (/^\s*(?:MEGAS?|MB|M(?:BPS?)?\b)/i.test(after)) {
      continue;
    }

    return raw;
  }

  return null;
}

function getPlanInternetPrice() {
  const select = document.getElementById("id_cliente-plan_internet");
  if (!select) {
    return null;
  }
  const selectedText = select.options[select.selectedIndex]?.textContent || "";
  return extractPlanPriceFromText(selectedText);
}

function getCostoInstalacion() {
  const field = document.getElementById("id_cliente-costo_instalacion");
  if (!field) {
    return null;
  }
  return field.value?.trim() || null;
}

function isValidEquipmentType(type) {
  if (!type) {
    return true;
  }
  return VALID_EQUIPMENT_TYPES.some(
    (valid) => type === valid || type.includes(valid),
  );
}

function isVisible(element) {
  if (!element) {
    return false;
  }

  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden";
}

function hasFormValidationErrors(form) {
  if (!form) {
    return false;
  }

  if (form.querySelector("[aria-invalid='true']")) {
    return true;
  }

  if (form.querySelector(".form-group.has-error, .controls.has-error")) {
    return true;
  }

  const messageSelectors = [".help-block.has-error", ".invalid-feedback", ".error"];
  const messages = form.querySelectorAll(messageSelectors.join(","));

  for (const message of messages) {
    if (isVisible(message) && (message.textContent || "").trim()) {
      return true;
    }
  }

  return false;
}

function runValidationChain() {
  // Check 1: Equipment type
  const equipType = extractEquipmentType();
  if (equipType && !isValidEquipmentType(equipType)) {
    const msg =
      `El tipo de equipo detectado es "${equipType}", ` +
      "que no es comodato/dato/propios." +
      "\n\n¿Deseas continuar con el guardado?";
    const ok = window.confirm(msg);
    if (!ok) {
      log(
        `Submit cancelled: equipment type "${equipType}"`,
        `Guardado cancelado: equipo "${equipType}"`,
        "warning",
      );
      return false;
    }
  }

  // Check 2: Cost equals plan price
  const costo = getCostoInstalacion();
  if (costo) {
    const commentPrice = extractCommentPrice();
    const planPrice = getPlanInternetPrice();

    const costoNum = parseMoney(costo);
    const commentNum = parseMoney(commentPrice?.value);
    const planNum = parseMoney(planPrice);

    if (
      (commentNum !== null && costoNum === commentNum) ||
      (planNum !== null && costoNum === planNum)
    ) {
      const matchSource =
        commentNum !== null && costoNum === commentNum
          ? `${commentPrice.label} ($${formatMoney(commentPrice.value)})`
          : `Plan internet ($${formatMoney(planPrice)})`;
      const costMsg =
        `El costo de instalación ($${formatMoney(costo)}) es igual ` +
        `al precio de ${matchSource}.` +
        "\n\n¿Deseas continuar con el guardado?";
      const ok = window.confirm(costMsg);
      if (!ok) {
        log(
          `Submit cancelled: install cost matches ${matchSource}`,
          `Guardado cancelado: costo igual a ${matchSource}`,
          "warning",
        );
        return false;
      }
    }

    // Check 3: Comment package/plan price differs from selected internet plan
    if (commentNum !== null && planNum !== null && commentNum !== planNum) {
      const mismatchMsg =
        `El comentario indica ${commentPrice.label} ` +
        `($${formatMoney(commentPrice.value)}), ` +
        `pero en "Plan internet" está seleccionado ` +
        `($${formatMoney(planPrice)}).` +
        "\n\n¿Deseas continuar con el guardado?";
      const ok = window.confirm(mismatchMsg);
      if (!ok) {
        log(
          `Submit cancelled: ${commentPrice.label} ($${commentPrice.value}) != plan ($${planPrice})`,
          `Guardado cancelado: ${commentPrice.label} no coincide con Plan internet`,
          "warning",
        );
        return false;
      }
    }

    // Check 4: Install cost lower than package/plan price (except explicit courtesy)
    if (costoNum !== null && costoNum > 0) {
      const referencePrices = [];
      if (commentNum !== null) {
        referencePrices.push({
          label: commentPrice.label,
          raw: commentPrice.value,
          value: commentNum,
        });
      }
      if (planNum !== null) {
        referencePrices.push({
          label: "Plan internet",
          raw: planPrice,
          value: planNum,
        });
      }

      const higherReferences = referencePrices.filter((ref) => ref.value > costoNum);
      if (higherReferences.length > 0) {
        const strongestRef = higherReferences.sort((a, b) => b.value - a.value)[0];
        const lowerCostMsg =
          `El costo de instalación ($${formatMoney(costo)}) es menor ` +
          `que ${strongestRef.label} ($${formatMoney(strongestRef.raw)}).` +
          "\n\nEsto puede ser válido si aplicaste un descuento/cortesía," +
          "\npero verifica antes de guardar." +
          "\n\n¿Deseas continuar con el guardado?";
        const ok = window.confirm(lowerCostMsg);
        if (!ok) {
          log(
            `Submit cancelled: install cost ($${costo}) lower than ${strongestRef.label} ($${strongestRef.raw})`,
            `Guardado cancelado: costo menor que ${strongestRef.label}`,
            "warning",
          );
          return false;
        }
      }
    }
  }

  return true;
}

function findSubmitButton() {
  // Look for the "Guardar Cambios" submit button
  const buttons = document.querySelectorAll(
    'button[type="submit"], input[type="submit"]',
  );
  for (const btn of buttons) {
    const text = btn.textContent || btn.value || "";
    if (/guardar|salvar|save/i.test(text)) {
      return btn;
    }
  }
  // Fallback: find any submit button with fa-floppy-o icon
  for (const btn of buttons) {
    if (btn.querySelector(".fa-floppy-o")) {
      return btn;
    }
  }
  return buttons[0] || null;
}

export function initFormGuards() {
  const path = window.location.pathname;
  if (!isFormatterScopePath(path)) {
    return;
  }

  const form = document.querySelector("form.validate-form, form.form");
  if (!form) {
    return;
  }
  let lastClickApprovalAt = 0;

  function validateBeforeSubmit(source) {
    if (hasFormValidationErrors(form)) {
      return true;
    }

    const now = Date.now();
    if (
      source === "submit" &&
      lastClickApprovalAt > 0 &&
      now - lastClickApprovalAt <= SUBMIT_CONFIRM_GRACE_MS
    ) {
      lastClickApprovalAt = 0;
      return true;
    }

    const ok = runValidationChain();
    if (source === "click") {
      lastClickApprovalAt = ok ? now : 0;
    }
    return ok;
  }

  form.addEventListener(
    "submit",
    (e) => {
      if (!validateBeforeSubmit("submit")) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );

  // Also intercept direct button clicks in case jQuery submits the form
  const submitBtn = findSubmitButton();
  if (submitBtn) {
    submitBtn.addEventListener(
      "click",
      (e) => {
        if (!validateBeforeSubmit("click")) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      true,
    );
  }

  log("Form guards initialized", "Guardias de formulario inicializadas");
}

export const __testables__ = {
  extractPlanPriceFromText,
  hasFormValidationErrors,
  parseMoney,
};
