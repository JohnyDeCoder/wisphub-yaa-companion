import { EXTENSION_NAME } from '../../config/constants.js';
import { MESSAGE_TYPES } from '../../config/messages.js';
import { sendLogToPopup } from '../../utils/logger.js';
import { applyHostTooltip } from '../../utils/hostTooltip.js';
import { waitForElement, waitForCondition } from '../../utils/polling.js';
import { copyToClipboard } from '../../utils/clipboard.js';
import { normalizeText, findColumnIndex, getDataTableCellText } from '../../utils/tableHelpers.js';

const CUSTOM_ACTION = 'new_selected_wisphub'; // Custom bulk-action value injected into ticket action selector
const OPTION_LABEL = `Marcar Tickets Como Nuevos — ${EXTENSION_NAME}`; // Visible label for custom ticket bulk action
const TICKETS_PATH_RE = /\/tickets\/\d*\/?$/; // URL path matcher for ticket list pages
const TABLE_SELECTOR = '#data-table-tickets'; // DataTable selector used to remove updated ticket rows
const COPY_BUTTON_CLASS = 'wisphub-yaa-ticket-copy-btn'; // CSS class for custom copy button in action cells
const COPY_BUTTON_VARIANT_CLASS = 'wisphub-yaa-action-btn-copy-ticket'; // CSS class for copy icon variant
const LOCALITY_KEYWORDS = ['barrio/localidad', 'barrio', 'localidad', 'neighborhood']; // Locality header aliases
const CLIENT_KEYWORDS = ['cliente', 'client', 'usuario', 'user']; // Header aliases for client column
const SUBJECT_KEYWORDS = ['asunto', 'subject']; // Header aliases for subject column
let _copyObserver = null;
let _copyDebounceTimer = 0;
let _copyClickBound = false;

let _notify = () => () => {};

export function initTicketNotify(notifyFn) {
  _notify = notifyFn;
}

function log(consoleMsg, popupMsg, level = 'info') {
  sendLogToPopup('Tickets', level, consoleMsg, popupMsg);
}

function getSelectedTicketIds() {
  return Array.from(document.querySelectorAll('input.editor-active:checked')).map((cb) => cb.value);
}

function matchesKeywords(text, keywords) {
  const normalized = normalizeText(text).toLowerCase();
  return keywords.some((kw) => normalized.includes(kw));
}

function getCellTextBySelectors(row, selector) {
  if (!row) {
    return '';
  }
  return normalizeText(row.querySelector(selector)?.textContent || '');
}

function getDataTableRowIndex(row) {
  const $ = window.jQuery;
  if (!$ || !$.fn?.DataTable) {
    return null;
  }

  const tableEl = $(TABLE_SELECTOR);
  if (!tableEl.length || !$.fn.DataTable.isDataTable(tableEl)) {
    return null;
  }

  const index = tableEl.DataTable().row(row).index();
  return Number.isFinite(index) ? index : null;
}

function getLocalityFromResponsiveContainer(container, keywords) {
  if (!container) {
    return '';
  }

  const searchKeywords = keywords || LOCALITY_KEYWORDS;
  const items = container.querySelectorAll('li');
  for (const item of items) {
    const title = item.querySelector('.dtr-title')?.textContent || '';
    if (!matchesKeywords(title, searchKeywords)) {
      continue;
    }

    const value = normalizeText(item.querySelector('.dtr-data')?.textContent || '');
    if (value) {
      return value;
    }
  }

  return '';
}

// Search responsive child rows / detached <li> nodes for a value matching given keywords.
function getValueFromResponsiveRows(row, rowIndex, keywords) {
  // DataTables responsive mode may move columns into child rows or detached <li> nodes.
  const nextRow = row?.nextElementSibling;
  if (nextRow?.classList.contains('child')) {
    const nextValue = getLocalityFromResponsiveContainer(nextRow, keywords);
    if (nextValue) {
      return nextValue;
    }
  }

  if (rowIndex === null || rowIndex === undefined) {
    return '';
  }

  const candidates = document.querySelectorAll(`li[data-dt-row="${rowIndex}"]`);
  for (const item of candidates) {
    const title = item.querySelector('.dtr-title')?.textContent || '';
    if (!matchesKeywords(title, keywords)) {
      continue;
    }

    const value = normalizeText(item.querySelector('.dtr-data')?.textContent || '');
    if (value) {
      return value;
    }
  }

  return '';
}

function trimIssueText(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return '';
  }

  const [base] = normalized.split(/\s*-\s*/, 2);
  return normalizeText(base || normalized);
}

function buildTicketCopyText(row, table) {
  if (!row || !table) {
    console.warn('[Tickets] buildTicketCopyText: missing row or table reference');
    return '';
  }

  const localityCol = findColumnIndex(table, LOCALITY_KEYWORDS, [], 'Tickets');
  const clientCol = findColumnIndex(table, CLIENT_KEYWORDS, [localityCol], 'Tickets');
  const subjectCol = findColumnIndex(table, SUBJECT_KEYWORDS, [localityCol, clientCol], 'Tickets');
  const rowIndex = getDataTableRowIndex(row);

  console.log(
    '[Tickets] Column indices → locality:',
    localityCol,
    '| client:',
    clientCol,
    '| subject:',
    subjectCol,
    '| rowIndex:',
    rowIndex,
  );

  // Priority: 1) DataTables API (logical index, always correct)
  //           2) CSS class selectors on <td>
  //           3) Responsive child rows / detached <li>
  // NOTE: getCellTextByIndex (DOM-based) is NOT used because hidden columns
  // shift DOM <td> indices and would return wrong data.
  const locality =
    getDataTableCellText(TABLE_SELECTOR, row, localityCol, 'Tickets') ||
    getCellTextBySelectors(row, 'td.localidad, td.barrio, td[class*="localidad"], td[class*="barrio"]') ||
    getValueFromResponsiveRows(row, rowIndex, LOCALITY_KEYWORDS);

  const client =
    getDataTableCellText(TABLE_SELECTOR, row, clientCol, 'Tickets') ||
    getCellTextBySelectors(row, 'td.cliente, td.usuario, td[class*="cliente"], td[class*="usuario"]') ||
    getValueFromResponsiveRows(row, rowIndex, CLIENT_KEYWORDS);

  const issueRaw =
    getDataTableCellText(TABLE_SELECTOR, row, subjectCol, 'Tickets') ||
    getCellTextBySelectors(row, 'td.asunto, td[class*="asunto"]') ||
    getValueFromResponsiveRows(row, rowIndex, SUBJECT_KEYWORDS);
  const issue = trimIssueText(issueRaw);

  console.log(
    '[Tickets] Extracted → locality:',
    JSON.stringify(locality),
    '| client:',
    JSON.stringify(client),
    '| issue:',
    JSON.stringify(issue),
  );

  // Require at least client and issue; locality is optional
  if (!client || !issue) {
    const missing = [];
    if (!locality) {
      missing.push('barrio/localidad');
    }
    if (!client) {
      missing.push('cliente/usuario');
    }
    if (!issue) {
      missing.push('asunto');
    }
    log(
      `Cannot build ticket text — missing: ${missing.join(', ')}`,
      `No se pudo construir el texto — faltan: ${missing.join(', ')}`,
      'warning',
    );
    return '';
  }

  if (!locality) {
    console.log('[Tickets] Locality is empty, building text without it');
  }

  return [locality, client, issue].filter(Boolean).join(' - ');
}

function createCopyActionButton() {
  const button = document.createElement('a');
  button.href = '#';
  button.className = `wisphub-yaa-action-btn ${COPY_BUTTON_VARIANT_CLASS} ${COPY_BUTTON_CLASS}`;
  button.setAttribute('role', 'button');
  button.setAttribute('aria-label', 'Copiar localidad, cliente y asunto');
  applyHostTooltip(button, 'Copiar localidad, cliente y asunto', { placement: 'top' });
  return button;
}

function injectTicketCopyButtons() {
  const table = document.querySelector(TABLE_SELECTOR);
  if (!table) {
    return 0;
  }

  let injected = 0;
  const actionCells = table.querySelectorAll('tbody tr:not(.child) td.accion, tbody tr:not(.child) td.acciones');

  actionCells.forEach((cell) => {
    if (cell.querySelector(`.${COPY_BUTTON_CLASS}`)) {
      return;
    }

    cell.append(' ', createCopyActionButton());
    injected++;
  });

  return injected;
}

function scheduleTicketCopyButtonsInjection() {
  clearTimeout(_copyDebounceTimer);
  _copyDebounceTimer = setTimeout(() => {
    injectTicketCopyButtons();
  }, 120);
}

function bindTicketCopyClickHandler(table) {
  if (!table || _copyClickBound) {
    return;
  }

  table.addEventListener(
    'click',
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest(`.${COPY_BUTTON_CLASS}`);
      if (!button) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const row = button.closest('tr');
      const payload = buildTicketCopyText(row, table);
      if (!payload) {
        _notify('No se pudo construir el texto del ticket', 'warning', 3000);
        return;
      }

      copyToClipboard(payload).then((ok) => {
        if (ok) {
          _notify(`Copiado: ${payload}`, 'success', 2800);
          log(`Ticket text copied: ${payload}`, `Texto copiado: ${payload}`);
          return;
        }
        _notify('No se pudo copiar el texto del ticket', 'error', 4000);
      });
    },
    true,
  );

  _copyClickBound = true;
}

function startTicketCopyObserver(table) {
  if (!table || _copyObserver) {
    return;
  }

  _copyObserver = new MutationObserver(() => {
    scheduleTicketCopyButtonsInjection();
  });

  _copyObserver.observe(table, { childList: true, subtree: true });
}

function initTicketCopyButtons() {
  waitForElement(TABLE_SELECTOR).then((table) => {
    if (!table) {
      return;
    }

    const injected = injectTicketCopyButtons();
    if (injected > 0) {
      log(
        `Custom copy button added to ${injected} ticket row(s)`,
        `Botón de copiado agregado en ${injected} ticket(s)`,
      );
    }

    bindTicketCopyClickHandler(table);
    startTicketCopyObserver(table);
  });
}

function setTablePageLength(length) {
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
    if (dt && dt.page.len() !== length) {
      dt.page.len(length).draw();
      log('Table set to 500 records', 'Tabla ajustada a 500 registros');
    }
  });
}

function injectOption(select) {
  if (select.querySelector(`option[value="${CUSTOM_ACTION}"]`)) {
    return;
  }
  const option = document.createElement('option');
  option.value = CUSTOM_ACTION;
  option.textContent = OPTION_LABEL;
  select.insertBefore(option, select.options[1] || null);
}

function interceptSubmit() {
  const btn = document.querySelector('button[name="form-acciones"]');
  if (!btn) {
    return;
  }
  btn.addEventListener(
    'click',
    (e) => {
      const select = document.getElementById('id_accion_select');
      if (select?.value === CUSTOM_ACTION) {
        e.preventDefault();
        e.stopImmediatePropagation();
        handleMarkAsNew();
      }
    },
    true,
  );
}

function handleMarkAsNew() {
  const ticketIds = getSelectedTicketIds();

  if (ticketIds.length === 0) {
    _notify('Selecciona al menos un ticket', 'warning');
    return;
  }

  if (!confirm(`¿Marcar ${ticketIds.length} ticket(s) como Nuevos?`)) {
    return;
  }

  log(`Marking ${ticketIds.length} ticket(s) as New...`, `Marcando ${ticketIds.length} ticket(s) como Nuevos...`);
  console.log('[Tickets] Selected IDs:', ticketIds);

  const dismissLoading = _notify(`Procesando ${ticketIds.length} ticket(s)...`, 'loading', 120000);

  const handler = (event) => {
    if (event.source !== window) {
      return;
    }
    const { type, results } = event.data || {};
    if (type !== MESSAGE_TYPES.UPDATE_TICKETS_RESPONSE) {
      return;
    }
    window.removeEventListener('message', handler);
    if (typeof dismissLoading === 'function') {
      dismissLoading();
    }
    processResults(results, ticketIds);
  };

  window.addEventListener('message', handler);
  window.postMessage({ type: MESSAGE_TYPES.UPDATE_TICKETS_REQUEST, ticketIds }, '*');
}

function processResults(results, ticketIds) {
  if (!results) {
    _notify('Error: sin respuesta del servidor', 'error');
    log('No server response', 'Sin respuesta del servidor', 'error');
    return;
  }

  const { success, failed, errors } = results;
  console.log('[Tickets] API result:', JSON.stringify(results));

  if (failed === 0) {
    _notify(`${success} ticket(s) marcados como Nuevos`, 'success', 5000);
    log(
      `${success} of ${ticketIds.length} ticket(s) marked as New`,
      `${success} de ${ticketIds.length} ticket(s) marcados como Nuevos`,
    );
  } else if (success > 0) {
    _notify(`${success} OK, ${failed} con error`, 'warning', 7000);
    log(`${success} succeeded, ${failed} failed`, `${success} exitosos, ${failed} con error`, 'warning');
  } else {
    _notify(`Error al actualizar ${failed} ticket(s)`, 'error', 7000);
    log(`${failed} ticket(s) failed to update`, `${failed} ticket(s) fallaron al actualizar`, 'error');
  }

  if (errors?.length) {
    errors.forEach((err) => log(`Ticket #${err.id}: ${err.error}`, `Ticket #${err.id}: ${err.error}`, 'error'));
  }

  if (success > 0) {
    removeTicketRows(ticketIds);
  }
}

function removeTicketRows(ticketIds) {
  try {
    const $ = window.jQuery;
    const tableEl = $ ? $(TABLE_SELECTOR) : null;
    const hasDT = tableEl && $.fn.DataTable && $.fn.DataTable.isDataTable(tableEl);

    ticketIds.forEach((id) => {
      const cb = document.querySelector(`input.editor-active[value="${id}"]`);
      const tr = cb?.closest('tr');
      if (!tr) {
        return;
      }
      if (hasDT) {
        tableEl.DataTable().row(tr).remove();
      } else {
        tr.remove();
      }
    });

    if (hasDT) {
      tableEl.DataTable().draw(false);
    }

    const select = document.getElementById('id_accion_select');
    if (select) {
      select.selectedIndex = 0;
    }

    log(`${ticketIds.length} row(s) removed from table`, `${ticketIds.length} fila(s) eliminadas de la tabla`);
  } catch (err) {
    console.error('[Tickets] Row removal failed:', err);
    window.location.reload();
  }
}

export function initTicketActions() {
  if (!TICKETS_PATH_RE.test(window.location.pathname)) {
    return;
  }

  console.log(`[${EXTENSION_NAME}] Tickets page detected`);
  log('Tickets module loaded', 'Módulo de tickets cargado');
  initTicketCopyButtons();

  waitForElement('#id_accion_select').then((select) => {
    if (!select) {
      return;
    }
    setTablePageLength(500);
    injectOption(select);
    interceptSubmit();
    log('"Mark as New" option added', 'Opción "Marcar como Nuevos" añadida');
  });
}
