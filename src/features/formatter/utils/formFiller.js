import { getMexicoDateTime } from "../../../utils/date.js";

const UPPERCASE_FIELD_IDS = [
  "id_usr-first_name",
  "id_usr-last_name",
  "id_perfil-cedula",
  "id_perfil-direccion",
  "id_perfil-localidad",
  "id_perfil-ciudad",
  "id_cliente-coordenadas",
  "id_perfil-razon_social",
  "id_perfil-rfc",
  "id_perfil-cedula_facturacion",
];

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

// Preserve "(Ref: ...)" parts in the address field
export function uppercaseFormFields() {
  for (const id of UPPERCASE_FIELD_IDS) {
    const field = document.getElementById(id);
    if (!field || !field.value?.trim()) {
      continue;
    }

    const original = field.value;

    if (id === "id_perfil-direccion") {
      const refParts = [];
      let val = field.value.replace(/\(Ref:[^)]*\)/gi, (m) => {
        refParts.push(m);
        return `__REF_${refParts.length - 1}__`;
      });
      val = val.toUpperCase();
      refParts.forEach((ref, i) => {
        val = val.replace(`__REF_${i}__`, ref);
      });
      field.value = val;
    } else {
      field.value = field.value.toUpperCase();
    }

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

  const label = document.createTextNode("Campo formateado \u00B7 ");
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

export function autoFillFormFields(parsedData) {
  if (!parsedData) {
    return;
  }

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

  fillRegimenFiscal(parsedData.regimenFiscal);
}
