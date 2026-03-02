import { sendLogToPopup } from "../../../utils/logger.js";
import {
  getEditorInstance,
  getEditorText,
} from "../../../lib/editor/ckeditor.js";

const VALID_EQUIPMENT_TYPES = ["COMODATO", "COMO DATO", "DATO", "PROPIOS"];

const EQUIPMENT_RE = /EQUIPO\S*\s+([\w\s]+?)(?:\n|$)/i;

const PAQUETE_PRICE_RE = /PAQUETE:\s*\d+M?\s*(?:x|por)?\s*\$?\s*([\d,.]+)/i;

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

function extractPaquetePrice() {
  const editor = getEditorInstance();
  if (!editor) {
    return null;
  }
  const text = getEditorText(editor);
  if (!text) {
    return null;
  }
  const match = text.match(PAQUETE_PRICE_RE);
  if (!match) {
    return null;
  }
  return match[1].replace(/,/g, "").trim();
}

function getPlanInternetPrice() {
  const select = document.getElementById("id_cliente-plan_internet");
  if (!select) {
    return null;
  }
  const selectedText = select.options[select.selectedIndex]?.textContent || "";
  const priceMatch = selectedText.match(/\$\s*([\d,.]+)/);
  if (!priceMatch) {
    return null;
  }
  return priceMatch[1].replace(/,/g, "").trim();
}

function getCostoInstalacion() {
  const field = document.getElementById("id_cliente-costo_instalacion");
  if (!field) {
    return null;
  }
  return field.value?.replace(/[^0-9.]/g, "").trim() || null;
}

function isValidEquipmentType(type) {
  if (!type) {
    return true;
  }
  return VALID_EQUIPMENT_TYPES.some(
    (valid) => type === valid || type.includes(valid),
  );
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
    const paquetePrice = extractPaquetePrice();
    const planPrice = getPlanInternetPrice();

    const costoNum = parseFloat(costo);
    const paqNum = paquetePrice ? parseFloat(paquetePrice) : null;
    const planNum = planPrice ? parseFloat(planPrice) : null;

    if (
      (paqNum !== null && costoNum === paqNum) ||
      (planNum !== null && costoNum === planNum)
    ) {
      const matchSource =
        paqNum !== null && costoNum === paqNum
          ? `PAQUETE ($${paquetePrice})`
          : `Plan internet ($${planPrice})`;
      const costMsg =
        `El costo de instalación ($${costo}) es igual ` +
        `al precio de ${matchSource}.` +
        "\n\n¿Deseas continuar con el guardado?";
      const ok = window.confirm(costMsg);
      if (!ok) {
        log(
          `Submit cancelled: cost matches plan price ($${costo})`,
          `Guardado cancelado: costo igual al plan ($${costo})`,
          "warning",
        );
        return false;
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
  // Only on installation/service editing pages with CKEditor
  const isTargetPage =
    /\/(instalaciones\/(editar|agregar|nuevo)|preinstalacion\/(activar|editar)|solicitar-instalacion)/i.test(
      path,
    ) || /\/clientes\/(agregar|editar)\//i.test(path);

  if (!isTargetPage) {
    return;
  }

  const form = document.querySelector("form.validate-form, form.form");
  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    (e) => {
      if (!runValidationChain()) {
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
        if (!runValidationChain()) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      true,
    );
  }

  log("Form guards initialized", "Guardias de formulario inicializadas");
}
