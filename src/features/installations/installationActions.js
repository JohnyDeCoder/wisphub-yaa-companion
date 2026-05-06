import {
  COPY_CONTROL_CLASS,
  INSTALL_BUTTON_ID,
} from "../../config/constants.js";
import { INSTALLS_UI_MESSAGES } from "../../config/messages.js";
import { sendLogToPopup } from "../../utils/logger.js";
import { waitForElement } from "../../utils/polling.js";
import { applyHostTooltip } from "../../utils/hostTooltip.js";
import { decorateActionButtonGroup } from "../../utils/actionButtons.js";
import { getDomainKey } from "../../config/domains.js";
import { copyToClipboard } from "../../utils/clipboard.js";
import { showCopySuccess } from "../../utils/copyFeedback.js";
import {
  normalizeText,
  findColumnIndex,
  getDataTableCellText,
  getJQueryDataTable,
} from "../../utils/tableHelpers.js";

let _busy = false;

const INSTALLS_PATH_RE = /^\/Instalaciones\/?$/i;
const STATUS_PROGRESS_RE = /^(En\s+)?Progreso$/i;
const ACTION_BAR_SELECTOR = ".btn-group.new-buttons";
const TABLE_SELECTOR = "#lista-instalaciones";
const COPY_BUTTON_CLASS = "wisphub-yaa-install-copy-btn";
const COPY_BUTTON_VARIANT_CLASS = "wisphub-yaa-action-btn-copy-install";
const LOCALITY_KEYWORDS = [
  "barrio/localidad",
  "barrio",
  "localidad",
  "neighborhood",
];
const CLIENT_KEYWORDS = [
  "nombre del cliente",
  "nombre",
  "cliente",
  "client",
  "usuario",
  "user",
];
let _copyObserver = null;
let _copyDebounceTimer = 0;
let _copyClickBound = false;

let _notify = () => () => {};

export function initInstallNotify(notifyFn) {
  _notify = notifyFn;
}

function log(consoleMsg, popupMsg, level = "info", details = {}) {
  sendLogToPopup("Installs", level, consoleMsg, popupMsg, details);
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
  const dtResult = getJQueryDataTable(TABLE_SELECTOR);
  if (!dtResult) {
    log("jQuery/DataTable not available");
    return [];
  }

  const entries = [];

  dtResult.dt.rows().every(function () {
    const data = this.data();
    const node = this.node();
    for (let i = 0; i < data.length; i++) {
      const cellText = normalizeText(data[i]);
      if (STATUS_PROGRESS_RE.test(cellText)) {
        const idServicio = normalizeText(data[0]);
        const editUrl = extractEditUrl(node, idServicio);
        log(`In Progress → id=${idServicio}, url=${editUrl}`);
        entries.push({ clientId: idServicio, row: node, editUrl });
        break;
      }
    }
  });

  log(`Found ${entries.length} "In Progress" entries`);
  return entries;
}

async function updateViaWebForm(editUrl) {
  const getRes = await fetch(editUrl, { credentials: "same-origin" });
  if (!getRes.ok) {
    throw new Error(`GET ${getRes.status}: ${getRes.statusText}`);
  }

  const doc = new DOMParser().parseFromString(await getRes.text(), "text/html");
  const csrfInput = doc.querySelector('input[name="csrfmiddlewaretoken"]');
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
  form.querySelectorAll('input[type="file"]').forEach((el) => el.remove());

  log(`POST ${editUrl} estado_instalacion=1`);
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
    _notify(INSTALLS_UI_MESSAGES.NO_IN_PROGRESS, "warning");
    return;
  }

  if (!confirm(INSTALLS_UI_MESSAGES.CONFIRM_MARK_AS_NEW(entries.length))) {
    return;
  }

  _busy = true;
  log(
    `Marking ${entries.length} installation(s) as New...`,
    `Marcando ${entries.length} instalación(es) como Nuevas...`,
  );
  log(`Processing: ${entries.map((e) => e.clientId).join(", ")}`);

  const dismissLoading = _notify(
    INSTALLS_UI_MESSAGES.PROCESSING(entries.length),
    "loading",
    120000,
  );

  let success = 0;
  let failed = 0;
  const errors = [];

  for (const entry of entries) {
    try {
      await updateViaWebForm(entry.editUrl);
      success++;
      log(`#${entry.clientId} → OK`);
    } catch (err) {
      failed++;
      errors.push({ id: entry.clientId, error: err.message });
      log(`#${entry.clientId} → ERROR: ${err.message}`, undefined, "warn");
    }
  }

  if (typeof dismissLoading === "function") {
    dismissLoading();
  }

  if (failed === 0) {
    _notify(INSTALLS_UI_MESSAGES.SUCCESS_MARKED(success), "success", 5000);
    log(
      `${success} of ${entries.length} installation(s) marked as New`,
      INSTALLS_UI_MESSAGES.SUCCESS_MARKED(success),
      "success",
      {
        kind: "audit",
        action: "Marcadas como Nuevas",
        pagePath: window.location.pathname,
        pageUrl: window.location.href,
        stateColor: "success",
      },
    );
  } else if (success > 0) {
    _notify(INSTALLS_UI_MESSAGES.PARTIAL_SUCCESS(success, failed), "warning", 7000);
    log(
      `${success} succeeded, ${failed} failed`,
      INSTALLS_UI_MESSAGES.PARTIAL_SUCCESS(success, failed),
      "warning",
    );
  } else {
    _notify(INSTALLS_UI_MESSAGES.TOTAL_FAILURE(failed), "error", 7000);
    log(
      `${failed} installation(s) failed to update`,
      INSTALLS_UI_MESSAGES.TOTAL_FAILURE(failed),
      "error",
    );
  }

  if (errors.length) {
    errors.forEach((err) =>
      log(
        `Install #${err.id}: ${err.error}`,
        `Instalación #${err.id}: ${err.error}`,
        "error",
      ),
    );
  }

  if (success > 0) {
    entries.forEach((e) => {
      const badge = e.row.querySelector(".label");
      if (badge) {
        badge.className = "label estado-instalacion-nueva label-info";
        badge.textContent = " Nueva ";
      }
    });
    log(
      `${success} row(s) updated to "New"`,
      `${success} fila(s) actualizadas a "Nueva"`,
    );
  }

  _busy = false;
}

function injectButton(btnGroup) {
  if (document.getElementById(INSTALL_BUTTON_ID)) {
    return;
  }

  const btn = document.createElement("a");
  btn.id = INSTALL_BUTTON_ID;
  btn.className = "wisphub-yaa-action-btn wisphub-yaa-action-btn-mark-new";
  btn.href = "";
  applyHostTooltip(btn, 'Marcar instalaciones "En Progreso" como "Nueva"', {
    placement: "top",
  });
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
  log(`Domain key: ${domain}`);
  if (domain === "wisphub.app") {
    return "Inst. Fibra";
  }
  return "Inst. Antena";
}

// ── Build copy text ─────────────────────────────────────────────────────
function buildInstallCopyText(row, table) {
  if (!row || !table) {
    log("buildInstallCopyText: missing row or table reference", undefined, "warn");
    return "";
  }

  const localityCol = findColumnIndex(table, LOCALITY_KEYWORDS, [], "Installs");
  const clientCol = findColumnIndex(
    table,
    CLIENT_KEYWORDS,
    [localityCol],
    "Installs",
  );

  log(`Column indices → locality: ${localityCol} | client: ${clientCol}`);

  // Use DataTables API only — immune to column hiding / reordering.
  // getCellTextByIndex (DOM-based) is NOT used because hidden columns
  // shift DOM <td> indices and would return wrong data.
  const locality = getDataTableCellText(
    TABLE_SELECTOR,
    row,
    localityCol,
    "Installs",
  );
  const client = getDataTableCellText(
    TABLE_SELECTOR,
    row,
    clientCol,
    "Installs",
  );
  const suffix = getInstallTypeSuffix();

  log(`Extracted → locality: ${JSON.stringify(locality)} | client: ${JSON.stringify(client)} | suffix: ${suffix}`);

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
    log("Locality is empty, building text without it");
  }

  return [locality, client, suffix].filter(Boolean).join(" - ");
}

// ── Copy button creation & injection ────────────────────────────────────
function createCopyActionButton() {
  const button = document.createElement("a");
  button.href = "#";
  button.className = [
    "wisphub-yaa-action-btn",
    COPY_BUTTON_VARIANT_CLASS,
    COPY_BUTTON_CLASS,
    COPY_CONTROL_CLASS,
  ].join(" ");
  button.setAttribute("role", "button");
  button.setAttribute(
    "aria-label",
    "Copiar localidad, nombre y tipo de instalación",
  );
  applyHostTooltip(button, "Copiar localidad, nombre y tipo de instalación", {
    placement: "top",
  });
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

    const copyBtn = createCopyActionButton();
    const mapBtn = container.querySelector(".wisphub-yaa-action-btn-map");
    if (mapBtn) {
      container.insertBefore(copyBtn, mapBtn);
    } else {
      container.append(copyBtn);
    }
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
        _notify(INSTALLS_UI_MESSAGES.COPY_TEXT_BUILD_FAILED, "warning", 3000);
        return;
      }

      copyToClipboard(payload).then((ok) => {
        if (ok) {
          showCopySuccess(button);
          log(`Install text copied: ${payload}`, `Texto copiado: ${payload}`);
          return;
        }
        _notify(INSTALLS_UI_MESSAGES.COPY_TEXT_FAILED, "error", 4000);
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
      log(`Copy button added to ${injected} installation row(s)`);
    }

    bindInstallCopyClickHandler(table);
    startInstallCopyObserver(table);
  });
}

export function initInstallationActions() {
  if (!INSTALLS_PATH_RE.test(window.location.pathname)) {
    return;
  }

  log("Installations page detected");
  log("Installations module loaded");

  initInstallCopyButtons();
  waitForElement(ACTION_BAR_SELECTOR).then((btnGroup) => {
    if (!btnGroup) {
      return;
    }
    injectButton(btnGroup);
    log('"Mark as New" button added');
  });
}
