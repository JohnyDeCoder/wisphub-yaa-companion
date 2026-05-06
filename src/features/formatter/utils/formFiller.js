import { getMexicoDateTime } from "../../../utils/date.js";
import { removeAccents } from "../../../utils/string.js";

const UPPERCASE_FIELD_IDS = [
  "id_usr-first_name",
  "id_usr-last_name",
  "id_perfil-cedula",
  "id_perfil-direccion",
  "id_perfil-localidad",
  "id_perfil-ciudad",
  "id_perfil-razon_social",
  "id_perfil-rfc",
  "id_perfil-cedula_facturacion",
];
const NAME_FIELD_IDS = ["id_usr-first_name", "id_usr-last_name"];
const FIELD_LABELS = Object.freeze({
  "id_usr-first_name": "Nombre",
  "id_usr-last_name": "Apellido",
  "id_perfil-cedula": "Cédula",
  "id_perfil-direccion": "Dirección",
  "id_perfil-localidad": "Localidad",
  "id_perfil-ciudad": "Ciudad",
  "id_perfil-razon_social": "Razón social",
  "id_perfil-rfc": "RFC",
  "id_perfil-cedula_facturacion": "Cédula de facturación",
  "id_cliente-cliente_rb": "Cliente RB",
  "id_cliente-fecha_instalacion": "Fecha de instalación",
  "id_cliente-costo_instalacion": "Costo de instalación",
  "id_cliente-creado_por": "Asesor",
  "id_cliente-tecnico": "Técnico",
  "id_cliente-forma_contratacion": "Forma de contratación",
  "id_perfil-obligacion_fiscal": "Régimen fiscal",
  "id_perfil-informacion_adicional": "Información adicional",
});

function resolveFieldLabel(fieldId) {
  return FIELD_LABELS[fieldId] || fieldId;
}

function recordFieldChange(changeCollector, fieldId, before, after) {
  if (!Array.isArray(changeCollector) || before === after) {
    return;
  }

  changeCollector.push({
    fieldId,
    label: resolveFieldLabel(fieldId),
    before: String(before || "").trim(),
    after: String(after || "").trim(),
  });
}

const URL_RE = /https?:\/\/[^\s<>"')]+/gi;
const REFERENCE_RE = /\(Ref:[^)]*\)/gi;

function triggerChange(element) {
  element.dispatchEvent(new Event("change", { bubbles: true }));
  if (window.jQuery) {
    window.jQuery(element).trigger("change");
  }
}

function setFieldValue(id, value, changeCollector = null) {
  const field = document.getElementById(id);
  if (!field || !value) {
    return false;
  }
  if (field.value === value) {
    return false;
  }
  const previousValue = field.value;
  field.value = value;
  triggerChange(field);
  recordFieldChange(changeCollector, id, previousValue, field.value);
  return true;
}

function selectByUsername(selectId, username, changeCollector = null) {
  const select = document.getElementById(selectId);
  if (!select) {
    return false;
  }

  // Only fill if the field is currently empty/unset
  if (select.value && select.value !== "") {
    return false;
  }

  if (username) {
    const options = Array.from(select.options);
    const match = options.find((opt) => {
      const text = opt.textContent.trim().toLowerCase();
      return text.startsWith(username + "@") || text === username;
    });
    if (match) {
      const previousValue = select.value;
      select.value = match.value;
      triggerChange(select);
      recordFieldChange(
        changeCollector,
        selectId,
        previousValue,
        match.textContent.trim(),
      );
      return true;
    }
  }

  const firstOption = Array.from(select.options).find((opt) => opt.value);
  if (firstOption) {
    const previousValue = select.value;
    select.value = firstOption.value;
    triggerChange(select);
    recordFieldChange(
      changeCollector,
      selectId,
      previousValue,
      firstOption.textContent.trim(),
    );
    return true;
  }
  return false;
}

function selectByValueIfEmpty(selectId, value, changeCollector = null) {
  const select = document.getElementById(selectId);
  if (!select || !value) {
    return false;
  }

  if (select.value && select.value !== "") {
    return false;
  }

  const option = Array.from(select.options).find((opt) => opt.value === value);
  if (!option) {
    return false;
  }

  const previousValue = select.value;
  select.value = option.value;
  triggerChange(select);
  recordFieldChange(
    changeCollector,
    selectId,
    previousValue,
    option.textContent.trim(),
  );
  return true;
}

// Preserve "(Ref: ...)" parts in the address field
export function uppercaseFormFields(changeCollector = null) {
  let changedCount = 0;
  for (const id of UPPERCASE_FIELD_IDS) {
    const field = document.getElementById(id);
    if (!field || !field.value?.trim()) {
      continue;
    }

    const original = field.value;
    const refParts = [];
    const urlParts = [];

    let val = field.value;

    if (id === "id_perfil-direccion") {
      REFERENCE_RE.lastIndex = 0;
      val = val.replace(REFERENCE_RE, (match) => {
        refParts.push(match);
        return `__WISPHUB_REF_${refParts.length - 1}__`;
      });
    }

    URL_RE.lastIndex = 0;
    val = val.replace(URL_RE, (match) => {
      urlParts.push(match);
      return `__WISPHUB_URL_${urlParts.length - 1}__`;
    });

    val = NAME_FIELD_IDS.includes(id) ? removeAccents(val).toUpperCase() : val.toUpperCase();

    urlParts.forEach((url, index) => {
      val = val.replace(`__WISPHUB_URL_${index}__`, url);
    });

    if (id === "id_perfil-direccion") {
      refParts.forEach((ref, index) => {
        val = val.replace(`__WISPHUB_REF_${index}__`, ref);
      });
    }

    field.value = val;

    if (field.value !== original) {
      markFieldAsFormatted(field, original);
      recordFieldChange(changeCollector, id, original, field.value);
      changedCount += 1;
    }
  }
  return changedCount;
}

function markFieldAsFormatted(field, originalValue) {
  field.dataset.wisphubOriginal = originalValue ?? "";
  field.classList.add("wisphub-yaa-field-formatted");

  // Find the appropriate container for the indicator
  const container = field.closest(".controls") || field.parentElement;
  const existing = container?.querySelector(".wisphub-yaa-field-indicator");
  if (existing) {
    existing.remove();
  }

  const indicator = document.createElement("span");
  indicator.className = "wisphub-yaa-field-indicator";

  const label = document.createTextNode("Campo formateado ");
  const undoLink = document.createElement("a");
  undoLink.textContent = "Deshacer";
  undoLink.addEventListener("click", (e) => {
    e.preventDefault();
    field.value = field.dataset.wisphubOriginal || "";
    triggerChange(field);
    field.classList.remove("wisphub-yaa-field-formatted");
    delete field.dataset.wisphubOriginal;
    indicator.remove();
  });

  indicator.appendChild(label);
  indicator.appendChild(undoLink);
  container?.appendChild(indicator);
}

function applyNameTransform(field) {
  const val = field.value;
  if (!val) {
    return;
  }
  const transformed = removeAccents(val).toUpperCase();
  if (transformed !== val) {
    field.value = transformed;
  }
}

export function initNameFieldWatchers(getAutoFormatEnabled) {
  NAME_FIELD_IDS.forEach((id) => {
    const field = document.getElementById(id);
    if (!field) {
      return;
    }

    field.addEventListener("paste", () => {
      requestAnimationFrame(() => applyNameTransform(field));
    });

    field.addEventListener("input", () => {
      if (typeof getAutoFormatEnabled === "function" && getAutoFormatEnabled()) {
        applyNameTransform(field);
      }
    });
  });
}

export function clearAllFieldIndicators() {
  document.querySelectorAll(".wisphub-yaa-field-formatted").forEach((field) => {
    if (field.dataset.wisphubOriginal !== undefined) {
      field.value = field.dataset.wisphubOriginal;
      triggerChange(field);
      delete field.dataset.wisphubOriginal;
    }
    field.classList.remove("wisphub-yaa-field-formatted");
  });
  document
    .querySelectorAll(".wisphub-yaa-field-indicator")
    .forEach((el) => el.remove());
}

function setFieldValueWithMark(id, value, changeCollector = null) {
  const field = document.getElementById(id);
  if (!field || !value) {
    return false;
  }
  const originalValue = field.value || "";
  if (originalValue === value) {
    return false;
  }
  field.value = value;
  triggerChange(field);
  markFieldAsFormatted(field, originalValue);
  recordFieldChange(changeCollector, id, originalValue, field.value);
  return true;
}

function fillRegimenFiscal(data, changeCollector = null) {
  if (!data) {
    return 0;
  }

  let changedCount = 0;
  const select = document.getElementById("id_perfil-obligacion_fiscal");
  if (select) {
    const option = Array.from(select.options).find(
      (opt) => opt.value === data.code,
    );
    if (option) {
      if (select.value !== data.code) {
        changedCount += 1;
      }
      const previousValue = select.value;
      select.value = data.code;
      triggerChange(select);
      recordFieldChange(
        changeCollector,
        "id_perfil-obligacion_fiscal",
        previousValue,
        option.textContent.trim(),
      );
    }
  }

  if (setFieldValue("id_perfil-informacion_adicional", data.description, changeCollector)) {
    changedCount += 1;
  }
  return changedCount;
}

export function autoFillFormFields(parsedData, options = {}) {
  if (!parsedData) {
    return { changed: false, changedCount: 0 };
  }

  const autoFillEnabled = options.autoFillEnabled !== false;
  let changedCount = 0;
  const changes = [];

  changedCount += uppercaseFormFields(changes);

  if (setFieldValueWithMark("id_cliente-cliente_rb", parsedData.installNumber, changes)) {
    changedCount += 1;
  }

  const fechaField = document.getElementById("id_cliente-fecha_instalacion");
  if (fechaField && !fechaField.value?.trim()) {
    if (setFieldValueWithMark("id_cliente-fecha_instalacion", getMexicoDateTime(), changes)) {
      changedCount += 1;
    }
  }

  const costoField = document.getElementById("id_cliente-costo_instalacion");
  if (costoField && !costoField.value?.trim()) {
    if (setFieldValueWithMark(
      "id_cliente-costo_instalacion",
      parsedData.installCost,
      changes,
    )) {
      changedCount += 1;
    }
  }

  if (selectByUsername("id_cliente-creado_por", parsedData.asesor, changes)) {
    changedCount += 1;
  }

  if (selectByUsername("id_cliente-tecnico", parsedData.tecnico, changes)) {
    changedCount += 1;
  }

  if (autoFillEnabled && parsedData.isPreInstallFormComment) {
    if (selectByValueIfEmpty(
      "id_cliente-forma_contratacion",
      "pagina_internet",
      changes,
    )) {
      changedCount += 1;
    }
  }

  changedCount += fillRegimenFiscal(parsedData.regimenFiscal, changes);

  return {
    changed: changedCount > 0,
    changedCount,
    changes,
  };
}
