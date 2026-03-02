import { sendLogToPopup } from "../../utils/logger.js";
import { getMexicoDateFormatted } from "../../utils/date.js";
import { SPECIAL_TICKETS } from "./specialTickets.js";

const ADD_TICKET_PATH_RE = /\/tickets\/agregar\/(\d+)\/?$/;

let _autoFillEnabled = true;
let _notify = () => () => {};

export function initTicketAutoFillNotify(notifyFn) {
  _notify = notifyFn;
}

export function updateTicketAutoFillSettings(settings) {
  if (typeof settings.autoFillTemplateEnabled === "boolean") {
    _autoFillEnabled = settings.autoFillTemplateEnabled;
  }
}

function log(consoleMsg, popupMsg, level = "info") {
  sendLogToPopup("TicketAutoFill", level, consoleMsg, popupMsg);
}

function findSpecialTicket(idServicio) {
  return SPECIAL_TICKETS.find((t) => String(t.id) === String(idServicio));
}

function setSelect2Value(selectId, textToMatch) {
  const $ = window.jQuery;
  if (!$) {
    return false;
  }

  const select = $(selectId);
  if (!select.length) {
    return false;
  }

  const normalizedTarget = textToMatch.toLowerCase().trim();
  let matchedValue = null;

  select.find("option").each(function () {
    const optionText = $(this).text().toLowerCase().trim();
    if (optionText === normalizedTarget) {
      matchedValue = $(this).val();
      return false;
    }
  });

  if (matchedValue === null) {
    select.find("option").each(function () {
      const optionText = $(this).text().toLowerCase().trim();
      if (optionText.includes(normalizedTarget)) {
        matchedValue = $(this).val();
        return false;
      }
    });
  }

  if (matchedValue === null) {
    return false;
  }

  select.val(matchedValue).trigger("change");
  return true;
}

function setCKEditorContent(editorId, html) {
  const ckeditor = window.CKEDITOR;
  if (!ckeditor || !ckeditor.instances[editorId]) {
    return false;
  }
  ckeditor.instances[editorId].setData(html);
  return true;
}

function setDatePickerValue(inputId, dateStr) {
  const $ = window.jQuery;
  if (!$) {
    return false;
  }

  const input = $(inputId);
  if (!input.length) {
    return false;
  }

  input.val(dateStr).trigger("change");
  return true;
}

function fillEstimatedDate() {
  const dateStr = getMexicoDateFormatted();
  return setDatePickerValue("#id_fecha_inicio", dateStr);
}

function fillDepartment() {
  return setSelect2Value("#id_departamentos_default", "soporte técnico");
}

function fillSpecialTicketFields(specialTicket) {
  const subjectFilled = setSelect2Value("#id_asuntos_default", "otro asunto");
  const deptFilled = fillDepartment();
  let descFilled = true;
  if (specialTicket.description) {
    descFilled = setCKEditorContent(
      "id_descripcion",
      `<strong>${specialTicket.description}</strong>`,
    );
  }
  const dateFilled = fillEstimatedDate();

  const allFilled = subjectFilled && deptFilled && descFilled && dateFilled;

  if (allFilled) {
    _notify(
      `Ticket especial "${specialTicket.label}" auto-rellenado`,
      "success",
      3000,
    );
    log(
      `Special ticket auto-filled: ${specialTicket.label}`,
      `Ticket especial auto-rellenado: ${specialTicket.label}`,
    );
  } else {
    _notify("Algunos campos no se pudieron auto-rellenar", "warning", 4000);
    log(
      `Partial auto-fill for: ${specialTicket.label}` +
        ` (subject=${subjectFilled}, dept=${deptFilled},` +
        ` desc=${descFilled}, date=${dateFilled})`,
      "Auto-rellenado parcial — revisa los campos",
      "warning",
    );
  }
}

function fillNormalTicketFields() {
  const deptFilled = fillDepartment();
  const dateFilled = fillEstimatedDate();

  const allFilled = deptFilled && dateFilled;

  if (allFilled) {
    _notify("Campos auto-rellenados", "success", 3000);
    log("Normal ticket fields auto-filled", "Campos de ticket auto-rellenados");
  } else {
    _notify("Algunos campos no se pudieron auto-rellenar", "warning", 4000);
    log(
      `Partial auto-fill (dept=${deptFilled}, date=${dateFilled})`,
      "Auto-rellenado parcial — revisa los campos",
      "warning",
    );
  }
}

function isAddTicketPage() {
  return ADD_TICKET_PATH_RE.test(window.location.pathname);
}

export function initTicketAutoFill() {
  if (!isAddTicketPage()) {
    return;
  }

  if (!_autoFillEnabled) {
    return;
  }

  const match = window.location.pathname.match(ADD_TICKET_PATH_RE);
  if (!match) {
    return;
  }

  const idServicio = match[1];
  const specialTicket = findSpecialTicket(idServicio);

  setTimeout(() => {
    try {
      if (specialTicket) {
        fillSpecialTicketFields(specialTicket);
      } else {
        fillNormalTicketFields();
      }
    } catch (error) {
      _notify("Error al auto-rellenar campos", "error", 4000);
      log(
        `Auto-fill error: ${error.message}`,
        "Error al auto-rellenar campos",
        "error",
      );
    }
  }, 1500);
}
