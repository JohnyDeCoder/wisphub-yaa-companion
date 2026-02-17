import { sendLogToPopup } from '../../utils/logger.js';
import { applyHostTooltip } from '../../utils/hostTooltip.js';
import { decorateActionButtonGroup } from '../../utils/actionButtons.js';
import { copyToClipboard } from '../../utils/clipboard.js';

const PROCESSED_PHONE = 'data-wisphub-wa'; // Data attribute marker to avoid re-processing phone cells
const PROCESSED_ACTIONS = 'data-wisphub-actions'; // Data attribute marker to avoid re-injecting action buttons
const COUNTRY_CODE = '52'; // Default country code used to normalize Mexican phone numbers
const PHONE_RE = /^\+?\d[\d\s\-().]{6,}$/; // Generic phone-like text matcher before normalization
const IP_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/; // IPv4 matcher to ignore IP values in phone columns

// Header keywords used to locate phone columns
const PHONE_KEYWORDS = ['telefono', 'teléfono', 'celular', 'phone', 'tel', 'móvil', 'movil'];
// Header keywords used to locate action columns
const ACTION_KEYWORDS = ['acción', 'accion', 'acciones', 'action'];
// URL matcher used to extract client slug from row links
const SLUG_RE = /\/(?:cliente|clientes\/ver|facturas\/generar)\/([^/]+)/;

let _notify = null;
let _debounceTimer = null;

function log(consoleMsg, popupMsg, level = 'info') {
  sendLogToPopup('Clients', level, consoleMsg, popupMsg);
}

function cleanPhoneNumber(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7) {
    return null;
  }
  if (digits.length >= 12 && digits.startsWith(COUNTRY_CODE)) {
    return digits;
  }
  if (digits.length === 10) {
    return COUNTRY_CODE + digits;
  }
  return digits;
}

function looksLikeIP(text) {
  return IP_RE.test(text.trim());
}

function createWaLink(phoneText, cleaned) {
  const link = document.createElement('a');
  link.href = `https://wa.me/${cleaned}`;
  link.target = '_blank';
  link.rel = 'noopener';
  link.className = 'wisphub-yaa-wa-link';
  applyHostTooltip(link, 'Enviar mensaje por WhatsApp (Ctrl+Click = Copiar)', { placement: 'top' });

  link.textContent = phoneText;

  link.addEventListener('click', (e) => {
    e.stopImmediatePropagation();
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      copyToClipboard(phoneText).then((ok) => {
        if (ok && _notify) {
          _notify(`Teléfono copiado: ${phoneText}`, 'success', 2000);
          log(`Phone copied: ${phoneText}`, `Teléfono copiado: ${phoneText}`);
        }
      });
    }
  });

  return link;
}

function processPhoneElement(el) {
  if (el.hasAttribute(PROCESSED_PHONE)) {
    return false;
  }
  el.setAttribute(PROCESSED_PHONE, '1');

  const rawText = el.textContent.trim();
  if (!rawText) {
    return false;
  }

  const parts = rawText
    .split(/[,;/]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const validPhones = [];
  for (const part of parts) {
    if (looksLikeIP(part)) {
      continue;
    }
    if (PHONE_RE.test(part)) {
      const cleaned = cleanPhoneNumber(part);
      if (cleaned) {
        validPhones.push({ raw: part, cleaned });
      }
    }
  }

  if (validPhones.length === 0) {
    return false;
  }

  el.textContent = '';

  validPhones.forEach((phone, idx) => {
    if (idx > 0) {
      const sep = document.createElement('span');
      sep.className = 'wisphub-yaa-wa-separator';
      sep.textContent = '|';
      el.appendChild(sep);
    }
    el.appendChild(createWaLink(phone.raw, phone.cleaned));
  });

  return true;
}

function extractSlug(container) {
  const links = container.querySelectorAll('a[href]');
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    const m = href.match(SLUG_RE);
    if (m) {
      return m[1];
    }
  }
  return null;
}

function addActionButtons(container, options = {}) {
  if (container.hasAttribute(PROCESSED_ACTIONS)) {
    return false;
  }
  container.setAttribute(PROCESSED_ACTIONS, '1');

  const slug = extractSlug(container);
  if (!slug) {
    return false;
  }

  const btnBox = container.querySelector('.text-right') || container.querySelector('div') || container;

  // "Ver cliente" is skipped on installation list pages
  if (!options.skipViewClient) {
    const viewBtn = document.createElement('a');
    viewBtn.className = 'wisphub-yaa-action-btn wisphub-yaa-action-btn-view';
    viewBtn.href = `/clientes/ver/${slug}/`;
    applyHostTooltip(viewBtn, 'Ver cliente', { placement: 'top' });
    viewBtn.addEventListener('click', (e) => e.stopImmediatePropagation());
    btnBox.append(viewBtn);
  }

  const filesBtn = document.createElement('a');
  filesBtn.className = 'wisphub-yaa-action-btn wisphub-yaa-action-btn-files';
  filesBtn.href = `/clientes/ver/${slug}/#retab6`;
  applyHostTooltip(filesBtn, 'Ver archivos', { placement: 'top' });
  filesBtn.addEventListener('click', (e) => e.stopImmediatePropagation());

  btnBox.append(filesBtn);
  decorateActionButtonGroup(btnBox);
  return true;
}

function matchesKeywords(text, keywords) {
  const lower = text.trim().toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function findColumnIndex(table, keywords) {
  const headers = table.querySelectorAll('thead th');
  for (let i = 0; i < headers.length; i++) {
    if (matchesKeywords(headers[i].textContent, keywords)) {
      return i;
    }
  }
  const footers = table.querySelectorAll('tfoot th');
  for (let i = 0; i < footers.length; i++) {
    if (matchesKeywords(footers[i].textContent, keywords)) {
      return i;
    }
  }
  return -1;
}

function findPhoneColumnByContent(table) {
  const rows = table.querySelectorAll('tbody tr:not(.child)');
  if (rows.length === 0) {
    return -1;
  }
  const sampleSize = Math.min(rows.length, 5);
  const colCount = rows[0]?.querySelectorAll('td').length || 0;
  const scores = new Array(colCount).fill(0);

  for (let r = 0; r < sampleSize; r++) {
    const cells = rows[r].querySelectorAll('td');
    for (let c = 0; c < cells.length; c++) {
      const text = cells[c].textContent.trim();
      if (looksLikeIP(text)) {
        continue;
      }
      const phoneParts = text.split(/[,;/]+/);
      for (const part of phoneParts) {
        const trimmed = part.trim();
        if (looksLikeIP(trimmed)) {
          continue;
        }
        if (PHONE_RE.test(trimmed)) {
          const digits = trimmed.replace(/\D/g, '');
          if (digits.length >= 7 && digits.length <= 15) {
            scores[c]++;
            break;
          }
        }
      }
    }
  }

  let bestCol = -1;
  let bestScore = 0;
  for (let c = 0; c < scores.length; c++) {
    if (scores[c] > bestScore) {
      bestScore = scores[c];
      bestCol = c;
    }
  }
  return bestScore >= 2 ? bestCol : -1;
}

function processMainTable(table) {
  let phoneCol = findColumnIndex(table, PHONE_KEYWORDS);
  if (phoneCol === -1) {
    phoneCol = findPhoneColumnByContent(table);
  }
  const actionCol = findColumnIndex(table, ACTION_KEYWORDS);
  // On installation list pages, only inject "Ver archivos" (skip "Ver cliente")
  const actionOpts = isInstallationListPage() ? { skipViewClient: true } : {};

  let phoneCount = 0;
  let actionCount = 0;

  const rows = table.querySelectorAll('tbody tr:not(.child)');
  rows.forEach((row) => {
    const cells = row.querySelectorAll('td');
    if (phoneCol !== -1 && cells[phoneCol]) {
      if (processPhoneElement(cells[phoneCol])) {
        phoneCount++;
      }
    }
    if (actionCol !== -1 && cells[actionCol]) {
      if (addActionButtons(cells[actionCol], actionOpts)) {
        actionCount++;
      }
    }
  });

  return { phoneCount, actionCount };
}

function processResponsiveRows() {
  let phoneCount = 0;
  let actionCount = 0;
  const actionOpts = isInstallationListPage() ? { skipViewClient: true } : {};

  document.querySelectorAll('li[data-dt-column] .dtr-data').forEach((dataSpan) => {
    const li = dataSpan.closest('li[data-dt-column]');
    const titleSpan = li?.querySelector('.dtr-title');
    if (!titleSpan) {
      return;
    }
    const title = titleSpan.textContent;

    if (matchesKeywords(title, PHONE_KEYWORDS)) {
      if (processPhoneElement(dataSpan)) {
        phoneCount++;
      }
    }

    if (matchesKeywords(title, ACTION_KEYWORDS)) {
      if (addActionButtons(dataSpan, actionOpts)) {
        actionCount++;
      }
    }
  });

  return { phoneCount, actionCount };
}

function processAll() {
  let totalPhone = 0;
  let totalAction = 0;

  document.querySelectorAll('table').forEach((t) => {
    if (t.querySelector('tbody tr td')) {
      const r = processMainTable(t);
      totalPhone += r.phoneCount;
      totalAction += r.actionCount;
    }
  });

  const resp = processResponsiveRows();
  totalPhone += resp.phoneCount;
  totalAction += resp.actionCount;

  return totalPhone + totalAction;
}

function debouncedProcess() {
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    processAll();
  }, 300);
}

function startObserver() {
  const target = document.querySelector('#content') || document.body;
  const observer = new MutationObserver(debouncedProcess);
  observer.observe(target, { childList: true, subtree: true });
}

function pollUntilFound(maxAttempts, interval) {
  let attempts = 0;
  const check = () => {
    attempts++;
    const found = processAll();
    if (found > 0) {
      log(`Client enhancements injected: ${found} elements`, `Mejoras de clientes inyectadas: ${found} elementos`);
      startObserver();
      return;
    }
    if (attempts < maxAttempts) {
      setTimeout(check, interval);
    } else {
      startObserver();
    }
  };
  check();
}

// Installation list page — only phone links, no action buttons
function isInstallationListPage() {
  return /^\/Instalaciones\/?$/i.test(window.location.pathname);
}

function isSupportedPhonePage() {
  const path = window.location.pathname;
  // Client list pages (exclude detail/edit pages)
  if (/\/clientes(\/|$)/i.test(path) && !/\/clientes\/(ver|editar|agregar|nuevo)\//i.test(path)) {
    return true;
  }
  // Installation list page
  if (isInstallationListPage()) {
    return true;
  }
  return false;
}

export function initClientPhoneLinks(notifyFn) {
  if (!isSupportedPhonePage()) {
    return;
  }

  _notify = notifyFn;
  log('Phone link enhancements loaded', 'Mejoras de enlaces telefónicos cargadas');

  setTimeout(() => {
    pollUntilFound(20, 1000);
  }, 2000);
}
