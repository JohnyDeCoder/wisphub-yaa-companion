import { getMexicoDateTime } from "../../../utils/date.js";

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
const URL_RE = /https?:\/\/[^\s<>"')]+/gi;
const REFERENCE_RE = /\(Ref:[^)]*\)/gi;

function triggerChange(element) {
  element.dispatchEvent(new Event("change", { bubbles: true }));
  if (window.jQuery) {
    window.jQuery(element).trigger("change");
  }
}

function setFieldValue(id, value) {
  const field = document.getElementById(id);
  if (!field || !value) {
    return;
  }
  field.value = value;
  triggerChange(field);
}

function selectByUsername(selectId, username) {
  const select = document.getElementById(selectId);
  if (!select) {
    return;
  }

  // Only fill if the field is currently empty/unset
  if (select.value && select.value !== "") {
    return;
  }

  if (username) {
    const options = Array.from(select.options);
    const match = options.find((opt) => {
      const text = opt.textContent.trim().toLowerCase();
      return text.startsWith(username + "@") || text === username;
    });
    if (match) {
      select.value = match.value;
      triggerChange(select);
      return;
    }
  }

  const firstOption = Array.from(select.options).find((opt) => opt.value);
  if (firstOption) {
    select.value = firstOption.value;
    triggerChange(select);
  }
}

function selectByValueIfEmpty(selectId, value) {
  const select = document.getElementById(selectId);
  if (!select || !value) {
    return;
  }

  if (select.value && select.value !== "") {
    return;
  }

  const option = Array.from(select.options).find((opt) => opt.value === value);
  if (!option) {
    return;
  }

  select.value = option.value;
  triggerChange(select);
}

// Preserve "(Ref: ...)" parts in the address field
export function uppercaseFormFields() {
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

    val = val.toUpperCase();

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
    }
  }
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

function setFieldValueWithMark(id, value) {
  const field = document.getElementById(id);
  if (!field || !value) {
    return;
  }
  const originalValue = field.value || "";
  if (originalValue === value) {
    return;
  }
  field.value = value;
  triggerChange(field);
  markFieldAsFormatted(field, originalValue);
}

function fillRegimenFiscal(data) {
  if (!data) {
    return;
  }

  const select = document.getElementById("id_perfil-obligacion_fiscal");
  if (select) {
    const option = Array.from(select.options).find(
      (opt) => opt.value === data.code,
    );
    if (option) {
      select.value = data.code;
      triggerChange(select);
    }
  }

  setFieldValue("id_perfil-informacion_adicional", data.description);
}

export function autoFillFormFields(parsedData, options = {}) {
  if (!parsedData) {
    return;
  }

  const autoFillEnabled = options.autoFillEnabled !== false;

  uppercaseFormFields();

  setFieldValueWithMark("id_cliente-cliente_rb", parsedData.installNumber);

  const fechaField = document.getElementById("id_cliente-fecha_instalacion");
  if (fechaField && !fechaField.value?.trim()) {
    setFieldValueWithMark("id_cliente-fecha_instalacion", getMexicoDateTime());
  }

  const costoField = document.getElementById("id_cliente-costo_instalacion");
  if (costoField && !costoField.value?.trim()) {
    setFieldValueWithMark(
      "id_cliente-costo_instalacion",
      parsedData.installCost,
    );
  }

  selectByUsername("id_cliente-creado_por", parsedData.asesor);

  selectByUsername("id_cliente-tecnico", parsedData.tecnico);

  if (autoFillEnabled && parsedData.isPreInstallFormComment) {
    selectByValueIfEmpty("id_cliente-forma_contratacion", "pagina_internet");
  }

  fillRegimenFiscal(parsedData.regimenFiscal);
}
