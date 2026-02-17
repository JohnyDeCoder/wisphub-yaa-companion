import { EXTENSION_NAME, INSTALL_BUTTON_ID } from "../../config/constants.js";
import { sendLogToPopup } from "../../utils/logger.js";
import { waitForElement, waitForCondition } from "../../utils/polling.js";
import { applyHostTooltip } from "../../utils/hostTooltip.js";
import { decorateActionButtonGroup } from "../../utils/actionButtons.js";
import { getDomainKey } from "../../config/domains.js";
import { copyToClipboard } from "../../utils/clipboard.js";
import { normalizeText, findColumnIndex, getDataTableCellText } from "../../utils/tableHelpers.js";

let _busy = false;

const INSTALLS_PATH_RE = /^\/Instalaciones\/?$/i; // URL path matcher for installations list pages
const STATUS_PROGRESS_RE = /^(En\s+)?Progreso$/i; // Status matcher used to detect rows pending migration to "Nueva"
const ACTION_BAR_SELECTOR = ".btn-group.new-buttons"; // Container selector where the custom action button is injected
const TABLE_SELECTOR = "#lista-instalaciones"; // DataTable selector for installations list
const COPY_BUTTON_CLASS = "wisphub-yaa-install-copy-btn"; // CSS class for custom copy button in action cells
const COPY_BUTTON_VARIANT_CLASS = "wisphub-yaa-action-btn-copy-install"; // CSS class for copy icon variant
const LOCALITY_KEYWORDS = ["barrio/localidad", "barrio", "localidad", "neighborhood"]; // Locality header aliases
// Client header aliases — ordered from most specific to least specific
const CLIENT_KEYWORDS = ["nombre del cliente", "nombre", "cliente", "client", "usuario", "user"];
let _copyObserver = null;
let _copyDebounceTimer = 0;
let _copyClickBound = false;

let _notify = () => () => {};

export function initInstallNotify(notifyFn) {
  _notify = notifyFn;
}

function log(consoleMsg, popupMsg, level = "info") {
  sendLogToPopup("Installs", level, consoleMsg, popupMsg);
}

function extractEditUrl(row, idServicio) {
  const links = row.querySelectorAll("a[href]");
  for (const link of links) {
    const href = link.getAttribute("href");
    if (href && href.includes("editar")) {
      return new URL(href, window.location.origin).href;
    }
  }
  for (const link of links) {
    const href = link.getAttribute("href");
    if (href && href.includes(idServicio)) {
      return new URL(href, window.location.origin).href;
    }
  }
  return `${window.location.origin}/editar-cliente/${idServicio}/`;
}

function getInProgressEntries() {
  const $ = window.jQuery;
  if (!$ || !$.fn?.DataTable) {
    console.log("[Installs] jQuery/DataTable not available");
    return [];
  }

  const tableEl = $(TABLE_SELECTOR);
  if (!tableEl.length) {
    console.log("[Installs] Table not found:", TABLE_SELECTOR);
    return [];
  }

  const dt = tableEl.DataTable();
  const entries = [];

  dt.rows().every(function () {
    const data = this.data();
    const node = this.node();
    for (let i = 0; i < data.length; i++) {
      const cellText = normalizeText(data[i]);
      if (STATUS_PROGRESS_RE.test(cellText)) {
        const idServicio = normalizeText(data[0]);
        const editUrl = extractEditUrl(node, idServicio);
        console.log(`[Installs] In Progress → id=${idServicio}, url=${editUrl}`);
        entries.push({ clientId: idServicio, row: node, editUrl });
        break;
      }
    }
  });

  console.log(`[Installs] Found ${entries.length} "In Progress" entries`);
  return entries;
}

async function updateViaWebForm(editUrl) {
  const getRes = await fetch(editUrl, { credentials: "same-origin" });
  if (!getRes.ok) {
    throw new Error(`GET ${getRes.status}: ${getRes.statusText}`);
  }

  const doc = new DOMParser().parseFromString(await getRes.text(), "text/html");
  const csrfInput = doc.querySelector("input[name=\"csrfmiddlewaretoken\"]");
  if (!csrfInput) {
    throw new Error("CSRF token not found");
  }

  const estadoSelect = doc.querySelector("#id_cliente-estado_instalacion");
  if (!estadoSelect) {
    throw new Error("estado_instalacion field not found");
  }

  const form = estadoSelect.closest("form");
  if (!form) {
    throw new Error("Form not found");
  }

  estadoSelect.value = "1";
  form.querySelectorAll("input[type=\"file\"]").forEach((el) => el.remove());

  console.log(`[Installs] POST ${editUrl} estado_instalacion=1`);
  const postRes = await fetch(editUrl, {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-CSRFToken": csrfInput.value },
    body: new FormData(form),
  });

  if (!postRes.ok) {
    const text = await postRes.text().catch(() => "");
    throw new Error(`POST ${postRes.status}: ${text.substring(0, 200)}`);
  }
}

async function handleMarkAsNew() {
  if (_busy) {
    return;
  }

  const entries = getInProgressEntries();
  if (entries.length === 0) {
    _notify("No se encontraron instalaciones \"En Progreso\"", "warning");
    return;
  }

  if (!confirm(`¿Marcar ${entries.length} instalación(es) de "En Progreso" a "Nueva"?`)) {
    return;
  }

  _busy = true;
  log(
    `Marking ${entries.length} installation(s) as New...`,
    `Marcando ${entries.length} instalación(es) como Nuevas...`,
  );
  console.log(
    "[Installs] Processing:",
    entries.map((e) => e.clientId),
  );

  const dismissLoading = _notify(`Procesando ${entries.length} instalación(es)...`, "loading", 120000);

  let success = 0;
  let failed = 0;
  const errors = [];

  for (const entry of entries) {
    try {
      await updateViaWebForm(entry.editUrl);
      success++;
      console.log(`[Installs] #${entry.clientId} → OK`);
    } catch (err) {
      failed++;
      errors.push({ id: entry.clientId, error: err.message });
      console.warn(`[Installs] #${entry.clientId} → ERROR:`, err.message);
    }
  }

  if (typeof dismissLoading === "function") {
    dismissLoading();
  }

  if (failed === 0) {
    _notify(`${success} instalación(es) marcadas como Nuevas`, "success", 5000);
    log(
      `${success} of ${entries.length} installation(s) marked as New`,
      `${success} de ${entries.length} instalación(es) marcadas como Nuevas`,
    );
  } else if (success > 0) {
    _notify(`${success} OK, ${failed} con error`, "warning", 7000);
    log(`${success} succeeded, ${failed} failed`, `${success} exitosas, ${failed} con error`, "warning");
  } else {
    _notify(`Error al actualizar ${failed} instalación(es)`, "error", 7000);
    log(`${failed} installation(s) failed to update`, `${failed} instalación(es) fallaron al actualizar`, "error");
  }

  if (errors.length) {
    errors.forEach((err) => log(`Install #${err.id}: ${err.error}`, `Instalación #${err.id}: ${err.error}`, "error"));
  }

  if (success > 0) {
    entries.forEach((e) => {
      const badge = e.row.querySelector(".label");
      if (badge) {
        badge.className = "label estado-instalacion-nueva label-info";
        badge.textContent = " Nueva ";
      }
    });
    log(`${success} row(s) updated to "New"`, `${success} fila(s) actualizadas a "Nueva"`);
  }

  _busy = false;
}

function showAllRecords() {
  waitForCondition(
    () => {
      const $ = window.jQuery;
      if (!$ || !$.fn.DataTable) {
        return null;
      }
      const el = $(TABLE_SELECTOR);
      if (!el.length || !$.fn.DataTable.isDataTable(el)) {
        return null;
      }
      return el.DataTable();
    },
    { interval: 1000 },
  ).then((dt) => {
    if (dt && dt.page.len() !== -1) {
      dt.page.len(-1).draw();
      log("Table set to show all records", "Tabla ajustada a mostrar todos los registros");
    }
  });
}

function injectButton(btnGroup) {
  if (document.getElementById(INSTALL_BUTTON_ID)) {
    return;
  }

  const btn = document.createElement("a");
  btn.id = INSTALL_BUTTON_ID;
  btn.className = "wisphub-yaa-action-btn wisphub-yaa-action-btn-mark-new";
  btn.href = "";
  applyHostTooltip(btn, "Marcar instalaciones \"En Progreso\" como \"Nueva\"", { placement: "top" });
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    handleMarkAsNew();
  });

  btnGroup.appendChild(btn);
  decorateActionButtonGroup(btnGroup);
}

// ── Installation type suffix based on domain ────────────────────────────
function getInstallTypeSuffix() {
  const domain = getDomainKey(window.location.hostname);
  console.log("[Installs] Domain key:", domain);
  if (domain === "wisphub.app") {
    return "Inst. Fibra";
  }
  return "Inst. Antena";
}

// ── Build copy text ─────────────────────────────────────────────────────
function buildInstallCopyText(row, table) {
  if (!row || !table) {
    console.warn("[Installs] buildInstallCopyText: missing row or table reference");
    return "";
  }

  const localityCol = findColumnIndex(table, LOCALITY_KEYWORDS, [], "Installs");
  const clientCol = findColumnIndex(table, CLIENT_KEYWORDS, [localityCol], "Installs");

  console.log("[Installs] Column indices → locality:", localityCol, "| client:", clientCol);

  // Use DataTables API only — immune to column hiding / reordering.
  // getCellTextByIndex (DOM-based) is NOT used because hidden columns
  // shift DOM <td> indices and would return wrong data.
  const locality = getDataTableCellText(TABLE_SELECTOR, row, localityCol, "Installs");
  const client = getDataTableCellText(TABLE_SELECTOR, row, clientCol, "Installs");
  const suffix = getInstallTypeSuffix();

  console.log(
    "[Installs] Extracted → locality:",
    JSON.stringify(locality),
    "| client:",
    JSON.stringify(client),
    "| suffix:",
    suffix,
  );

  // Require at least client; locality is optional
  if (!client) {
    const missing = [];
    if (!locality) {
      missing.push("barrio/localidad");
    }
    missing.push("nombre del cliente");
    log(
      `Cannot build install text — missing: ${missing.join(", ")}`,
      `No se pudo construir el texto — faltan: ${missing.join(", ")}`,
      "warning",
    );
    return "";
  }

  if (!locality) {
    console.log("[Installs] Locality is empty, building text without it");
  }

  return [locality, client, suffix].filter(Boolean).join(" - ");
}

// ── Copy button creation & injection ────────────────────────────────────
function createCopyActionButton() {
  const button = document.createElement("a");
  button.href = "#";
  button.className = `wisphub-yaa-action-btn ${COPY_BUTTON_VARIANT_CLASS} ${COPY_BUTTON_CLASS}`;
  button.setAttribute("role", "button");
  button.setAttribute("aria-label", "Copiar localidad, nombre y tipo de instalación");
  applyHostTooltip(button, "Copiar localidad, nombre y tipo de instalación", { placement: "top" });
  return button;
}

function injectInstallCopyButtons() {
  const table = document.querySelector(TABLE_SELECTOR);
  if (!table) {
    return 0;
  }

  let injected = 0;
  // Action column may live in a visible <td> OR inside a responsive child <li>.
  // Target every .text-right container that holds installation action links.
  const actionContainers = table.querySelectorAll("tbody .text-right");

  actionContainers.forEach((container) => {
    if (container.querySelector(`.${COPY_BUTTON_CLASS}`)) {
      return;
    }
    // Sanity check: must contain at least one action link (edit / activate / delete)
    if (!container.querySelector("a.btn")) {
      return;
    }

    container.append(" ", createCopyActionButton());
    injected++;
  });

  return injected;
}

function scheduleInstallCopyButtonsInjection() {
  clearTimeout(_copyDebounceTimer);
  _copyDebounceTimer = setTimeout(() => {
    injectInstallCopyButtons();
  }, 120);
}

function bindInstallCopyClickHandler(table) {
  if (!table || _copyClickBound) {
    return;
  }

  table.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest(`.${COPY_BUTTON_CLASS}`);
      if (!button) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      // Resolve the data row — button may be inside a responsive tr.child
      let row = button.closest("tr");
      if (row?.classList.contains("child")) {
        row = row.previousElementSibling;
      }
      const payload = buildInstallCopyText(row, table);
      if (!payload) {
        _notify("No se pudo construir el texto de la instalación", "warning", 3000);
        return;
      }

      copyToClipboard(payload).then((ok) => {
        if (ok) {
          _notify(`Copiado: ${payload}`, "success", 2800);
          log(`Install text copied: ${payload}`, `Texto copiado: ${payload}`);
          return;
        }
        _notify("No se pudo copiar el texto de la instalación", "error", 4000);
      });
    },
    true,
  );

  _copyClickBound = true;
}

function startInstallCopyObserver(table) {
  if (!table || _copyObserver) {
    return;
  }

  _copyObserver = new MutationObserver(() => {
    scheduleInstallCopyButtonsInjection();
  });

  _copyObserver.observe(table, { childList: true, subtree: true });
}

function initInstallCopyButtons() {
  waitForElement(TABLE_SELECTOR).then((table) => {
    if (!table) {
      return;
    }

    const injected = injectInstallCopyButtons();
    if (injected > 0) {
      log(
        `Copy button added to ${injected} installation row(s)`,
        `Botón de copiado agregado en ${injected} instalación(es)`,
      );
    }

    bindInstallCopyClickHandler(table);
    startInstallCopyObserver(table);
  });
}

export function initInstallationActions() {
  if (!INSTALLS_PATH_RE.test(window.location.pathname)) {
    return;
  }

  console.log(`[${EXTENSION_NAME}] Installations page detected`);
  log("Installations module loaded", "Módulo de instalaciones cargado");

  showAllRecords();
  initInstallCopyButtons();
  waitForElement(ACTION_BAR_SELECTOR).then((btnGroup) => {
    if (!btnGroup) {
      return;
    }
    injectButton(btnGroup);
    log("\"Mark as New\" button added", "Botón \"Marcar como Nuevas\" añadido");
  });
}
