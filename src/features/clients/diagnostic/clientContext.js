import { extractServiceIdFromServiceSlug } from "../../../utils/maps.js";
import {
  findColumnIndex,
  getDataTableCellText,
  normalizeText,
} from "../../../utils/tableHelpers.js";

const EMPTY_CLIENT_CONTEXT = Object.freeze({
  serviceSlug: "",
  serviceId: "",
  clientName: "",
  ip: "",
  plan: "",
  router: "",
  accountStatus: "",
  pendingBalance: "",
});

const CLIENT_NAME_KEYWORDS = ["nombre", "name", "cliente", "client"];
const CLIENT_SERVICE_KEYWORDS = ["servicio", "service", "id servicio"];
const CLIENT_IP_KEYWORDS = ["ip"];
const CLIENT_PLAN_KEYWORDS = ["plan internet", "plan", "paquete"];
const CLIENT_ROUTER_KEYWORDS = ["router"];
const CLIENT_STATUS_KEYWORDS = ["estado", "status"];
const CLIENT_LIST_PATH_RE = /\/clientes(\/|$)/i;
const CLIENT_EXCLUDED_PATH_RE = /\/clientes\/(ver|editar|agregar|nuevo)\//i;
const CLIENT_DETAIL_PATH_RE = /\/clientes\/ver\/([^/]+)\/?$/i;
const CLIENT_SERVICE_EDIT_PATH_RE =
  /\/clientes\/editar\/servicio\/([^/]+)\/([^/]+)\/?$/i;

const SERVICE_EDIT_LINK_RE =
  /\/clientes\/editar\/servicio\/([^/]+)\/([^/]+)\/?/i;
const SERVICE_VIEW_LINK_RE = /\/clientes\/ver\/([^/]+)\/?/i;

function createEmptyClientContext() {
  return { ...EMPTY_CLIENT_CONTEXT };
}

function toSafeClientContext(context) {
  return {
    serviceSlug: normalizeText(context?.serviceSlug),
    serviceId: normalizeText(context?.serviceId),
    clientName: normalizeText(context?.clientName),
    ip: normalizeText(context?.ip),
    plan: normalizeText(context?.plan),
    router: normalizeText(context?.router),
    accountStatus: normalizeText(context?.accountStatus),
    pendingBalance: normalizeText(context?.pendingBalance),
  };
}

function hasServiceContext(context) {
  return Boolean(
    normalizeText(context?.serviceSlug) && normalizeText(context?.serviceId),
  );
}

function getTableSelector(table) {
  if (!table?.id) {
    return "";
  }

  const escaped = window.CSS?.escape ? window.CSS.escape(table.id) : table.id;
  return `#${escaped}`;
}

function getCellTextFromRow(table, row, colIndex) {
  if (!table || !row || colIndex < 0) {
    return "";
  }

  const tableSelector = getTableSelector(table);
  if (tableSelector) {
    const value = getDataTableCellText(
      tableSelector,
      row,
      colIndex,
      "ClientContext",
    );
    if (value) {
      return normalizeText(value);
    }
  }

  const cell = row.querySelectorAll("td")[colIndex];
  return normalizeText(cell?.textContent);
}

function buildChildDetailEntries(row) {
  const childRow = row?.nextElementSibling;
  if (!childRow?.classList?.contains("child")) {
    return [];
  }

  return Array.from(childRow.querySelectorAll("li[data-dt-column]")).map(
    (item) => ({
      title: normalizeText(
        item.querySelector(".dtr-title")?.textContent,
      ).toLowerCase(),
      value: normalizeText(item.querySelector(".dtr-data")?.textContent),
    }),
  );
}

function getChildValueByKeywords(entries, keywords) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return "";
  }

  for (const keyword of keywords) {
    const match = entries.find((entry) => entry.title.includes(keyword));
    if (match?.value) {
      return match.value;
    }
  }

  return "";
}

function resolveFieldValue({
  table,
  row,
  childEntries,
  keywords,
  exclude = [],
}) {
  const colIndex = findColumnIndex(table, keywords, exclude);
  const rowValue = getCellTextFromRow(table, row, colIndex);

  if (rowValue) {
    return { value: rowValue, colIndex };
  }

  return {
    value: getChildValueByKeywords(childEntries, keywords),
    colIndex,
  };
}

function resolveBaseRow(row) {
  if (!row) {
    return null;
  }

  if (!row.classList.contains("child")) {
    return row;
  }

  return row.previousElementSibling || null;
}

function extractServiceMetadata(row) {
  const links = row?.querySelectorAll?.("a[href]") || [];
  let serviceSlug = "";
  let serviceId = "";

  for (const link of links) {
    const href = normalizeText(link.getAttribute("href"));
    const editMatch = href.match(SERVICE_EDIT_LINK_RE);
    if (editMatch) {
      serviceSlug = normalizeText(editMatch[1]);
      serviceId = normalizeText(editMatch[2]);
      break;
    }

    if (!serviceSlug) {
      const viewMatch = href.match(SERVICE_VIEW_LINK_RE);
      if (viewMatch) {
        serviceSlug = normalizeText(viewMatch[1]);
      }
    }
  }

  if (!serviceId && serviceSlug) {
    serviceId = extractServiceIdFromServiceSlug(serviceSlug);
  }

  return { serviceSlug, serviceId };
}

function resolveServiceIdFromValue(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "";
  }

  const match = normalized.match(/\b0*(\d+)\b/);
  if (!match) {
    return normalized;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? String(parsed) : normalized;
}

function isClientListPath(pathname = "") {
  const path = normalizeText(pathname) || window.location.pathname;
  return CLIENT_LIST_PATH_RE.test(path) && !CLIENT_EXCLUDED_PATH_RE.test(path);
}

function findSelectedClientRow() {
  const checkedRows = Array.from(
    document.querySelectorAll('table tbody tr:not(.child) input[type="checkbox"]:checked'),
  )
    .map((input) => input.closest("tr"))
    .filter(Boolean);
  if (checkedRows.length > 0) {
    return checkedRows[0];
  }

  const selectedRow = document.querySelector("table tbody tr.selected:not(.child)");
  if (selectedRow) {
    return selectedRow;
  }

  return null;
}

function extractContextFromServiceEditPath(pathname) {
  const match = normalizeText(pathname).match(CLIENT_SERVICE_EDIT_PATH_RE);
  if (!match) {
    return createEmptyClientContext();
  }

  const serviceSlug = normalizeText(match[1]);
  const serviceId = normalizeText(match[2]) || extractServiceIdFromServiceSlug(serviceSlug);
  const ip = normalizeText(
    document.getElementById("id_cliente-ip")?.value ||
      document.querySelector('[name="ip"]')?.value,
  );

  return toSafeClientContext({
    serviceSlug,
    serviceId,
    ip,
  });
}

function extractPendingBalanceFromClientDetailPage() {
  const selectors = [
    "#id_perfil-saldo",
    'input[name="perfil-saldo"]',
    '[data-field="saldo"]',
  ];

  for (const selector of selectors) {
    const node = document.querySelector(selector);
    if (!node) {
      continue;
    }

    const value = normalizeText(node.value || node.textContent);
    if (value) {
      return value;
    }
  }

  return "";
}

function extractClientNameFromDetailForm() {
  const firstName = normalizeText(
    document.getElementById("id_usr-first_name")?.value ||
      document.querySelector('[name="usr-first_name"]')?.value,
  );
  const lastName = normalizeText(
    document.getElementById("id_usr-last_name")?.value ||
      document.querySelector('[name="usr-last_name"]')?.value,
  );

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return normalizeText(fullName);
}

function isServiceSlugLikeText(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return false;
  }

  return /^\d+@[^@\s]+$/i.test(normalized);
}

function getFirstServiceRowFromDetailPage() {
  const tables = Array.from(document.querySelectorAll("table"));
  for (const table of tables) {
    const rows = Array.from(table.querySelectorAll("tbody tr:not(.child)"));
    const row = rows.find((entry) =>
      entry.querySelector('a[href*="/clientes/editar/servicio/"]'),
    );
    if (row) {
      return { row, table };
    }
  }

  return { row: null, table: null };
}

function extractServiceContextFromClientDetailPage() {
  const { row, table } = getFirstServiceRowFromDetailPage();
  if (!row || !table) {
    return createEmptyClientContext();
  }

  const childEntries = buildChildDetailEntries(row);
  const serviceData = resolveFieldValue({
    table,
    row,
    childEntries,
    keywords: CLIENT_SERVICE_KEYWORDS,
  });
  const ipData = resolveFieldValue({
    table,
    row,
    childEntries,
    keywords: CLIENT_IP_KEYWORDS,
    exclude: [serviceData.colIndex],
  });
  const planData = resolveFieldValue({
    table,
    row,
    childEntries,
    keywords: CLIENT_PLAN_KEYWORDS,
    exclude: [serviceData.colIndex, ipData.colIndex],
  });
  const routerData = resolveFieldValue({
    table,
    row,
    childEntries,
    keywords: CLIENT_ROUTER_KEYWORDS,
    exclude: [serviceData.colIndex, ipData.colIndex, planData.colIndex],
  });
  const statusData = resolveFieldValue({
    table,
    row,
    childEntries,
    keywords: CLIENT_STATUS_KEYWORDS,
    exclude: [
      serviceData.colIndex,
      ipData.colIndex,
      planData.colIndex,
      routerData.colIndex,
    ],
  });

  const metadata = extractServiceMetadata(row);

  return toSafeClientContext({
    serviceSlug: metadata.serviceSlug,
    serviceId:
      metadata.serviceId || resolveServiceIdFromValue(serviceData.value),
    ip: ipData.value,
    plan: planData.value,
    router: routerData.value,
    accountStatus: statusData.value,
  });
}

function extractContextFromClientDetailPath(pathname) {
  const match = normalizeText(pathname).match(CLIENT_DETAIL_PATH_RE);
  if (!match) {
    return createEmptyClientContext();
  }

  const slugFromPath = normalizeText(match[1]);
  const detailServiceContext = extractServiceContextFromClientDetailPage();
  const serviceSlug = detailServiceContext.serviceSlug || slugFromPath;
  const serviceId =
    detailServiceContext.serviceId || extractServiceIdFromServiceSlug(serviceSlug);
  const pendingBalance = extractPendingBalanceFromClientDetailPage();
  const formClientName = extractClientNameFromDetailForm();

  const heading =
    normalizeText(
      document.querySelector(".page-header h1 span")?.textContent ||
        document.querySelector(".page-header h1 .wisphub-yaa-client-name")?.textContent ||
        document.querySelector("h1 .wisphub-yaa-client-name")?.textContent ||
        document.querySelector("h1")?.textContent ||
        document.querySelector(".page-title")?.textContent,
    ) || "";
  const resolvedClientName = formClientName || heading;

  return toSafeClientContext({
    serviceSlug,
    serviceId,
    clientName: isServiceSlugLikeText(resolvedClientName) ? "" : resolvedClientName,
    ip: detailServiceContext.ip,
    plan: detailServiceContext.plan,
    router: detailServiceContext.router,
    accountStatus: detailServiceContext.accountStatus,
    pendingBalance,
  });
}

export function extractClientContextFromRow(inputRow, inputTable) {
  const row = resolveBaseRow(inputRow);
  const table = inputTable || row?.closest?.("table");
  if (!row || !table) {
    return createEmptyClientContext();
  }

  const childEntries = buildChildDetailEntries(row);
  const serviceData = resolveFieldValue({
    table,
    row,
    childEntries,
    keywords: CLIENT_SERVICE_KEYWORDS,
  });
  const nameData = resolveFieldValue({
    table,
    row,
    childEntries,
    keywords: CLIENT_NAME_KEYWORDS,
    exclude: [serviceData.colIndex],
  });
  const ipData = resolveFieldValue({
    table,
    row,
    childEntries,
    keywords: CLIENT_IP_KEYWORDS,
    exclude: [serviceData.colIndex, nameData.colIndex],
  });
  const planData = resolveFieldValue({
    table,
    row,
    childEntries,
    keywords: CLIENT_PLAN_KEYWORDS,
    exclude: [serviceData.colIndex, nameData.colIndex, ipData.colIndex],
  });
  const routerData = resolveFieldValue({
    table,
    row,
    childEntries,
    keywords: CLIENT_ROUTER_KEYWORDS,
    exclude: [
      serviceData.colIndex,
      nameData.colIndex,
      ipData.colIndex,
      planData.colIndex,
    ],
  });
  const statusData = resolveFieldValue({
    table,
    row,
    childEntries,
    keywords: CLIENT_STATUS_KEYWORDS,
    exclude: [
      serviceData.colIndex,
      nameData.colIndex,
      ipData.colIndex,
      planData.colIndex,
      routerData.colIndex,
    ],
  });

  const serviceMetadata = extractServiceMetadata(row);
  const serviceSlug = serviceMetadata.serviceSlug;
  const serviceId =
    serviceMetadata.serviceId || resolveServiceIdFromValue(serviceData.value);

  return {
    serviceSlug,
    serviceId,
    clientName: nameData.value,
    ip: ipData.value,
    plan: planData.value,
    router: routerData.value,
    accountStatus: statusData.value,
    pendingBalance: "",
  };
}

export function extractClientContextFromContainer(container) {
  const row = container?.closest?.("tr");
  if (!row) {
    return createEmptyClientContext();
  }

  const baseRow = resolveBaseRow(row);
  const table = baseRow?.closest?.("table");
  return extractClientContextFromRow(baseRow, table);
}

export function sanitizeClientContext(clientContext) {
  return toSafeClientContext(clientContext);
}

export function hasClientServiceContext(clientContext) {
  return hasServiceContext(clientContext);
}

export function extractActiveClientContextFromPage(pathname = "") {
  if (isClientListPath(pathname)) {
    const selectedRow = findSelectedClientRow();
    if (!selectedRow) {
      return createEmptyClientContext();
    }
    const table = selectedRow.closest("table");
    return extractClientContextFromRow(selectedRow, table);
  }

  const path = normalizeText(pathname) || window.location.pathname;
  const fromServiceEdit = extractContextFromServiceEditPath(path);
  if (hasServiceContext(fromServiceEdit)) {
    return fromServiceEdit;
  }

  const fromDetail = extractContextFromClientDetailPath(path);
  if (hasServiceContext(fromDetail)) {
    return fromDetail;
  }

  return createEmptyClientContext();
}
