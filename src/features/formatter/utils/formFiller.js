const UPPERCASE_FIELD_IDS = [
  'id_usr-first_name',
  'id_usr-last_name',
  'id_perfil-cedula',
  'id_perfil-direccion',
  'id_perfil-localidad',
  'id_perfil-ciudad',
  'id_perfil-razon_social',
  'id_perfil-rfc',
  'id_perfil-cedula_facturacion',
];

function triggerChange(element) {
  element.dispatchEvent(new Event('change', { bubbles: true }));
  if (window.jQuery) {
    window.jQuery(element).trigger('change');
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

  if (username) {
    const options = Array.from(select.options);
    const match = options.find((opt) => {
      const text = opt.textContent.trim().toLowerCase();
      return text.startsWith(username + '@') || text === username;
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

    if (id === 'id_perfil-direccion') {
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
  }
}

function getTomorrowMexico() {
  const now = new Date();
  const mexicoNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
  mexicoNow.setDate(mexicoNow.getDate() + 1);
  mexicoNow.setHours(12, 0, 0, 0);

  const dd = String(mexicoNow.getDate()).padStart(2, '0');
  const mm = String(mexicoNow.getMonth() + 1).padStart(2, '0');
  const yyyy = mexicoNow.getFullYear();

  return `${dd}/${mm}/${yyyy} 12:00`;
}

function fillRegimenFiscal(data) {
  if (!data) {
    return;
  }

  const select = document.getElementById('id_perfil-obligacion_fiscal');
  if (select) {
    const option = Array.from(select.options).find((opt) => opt.value === data.code);
    if (option) {
      select.value = data.code;
      triggerChange(select);
    }
  }

  setFieldValue('id_perfil-informacion_adicional', data.description);
}

export function autoFillFormFields(parsedData) {
  if (!parsedData) {
    return;
  }

  uppercaseFormFields();

  setFieldValue('id_cliente-cliente_rb', parsedData.installNumber);

  setFieldValue('id_cliente-fecha_instalacion', getTomorrowMexico());

  setFieldValue('id_cliente-costo_instalacion', parsedData.installCost);

  selectByUsername('id_cliente-creado_por', parsedData.asesor);

  selectByUsername('id_cliente-tecnico', parsedData.tecnico);

  fillRegimenFiscal(parsedData.regimenFiscal);
}
