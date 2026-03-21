import { copyToClipboard } from "../../../utils/clipboard.js";
import { normalizeText } from "../../../utils/tableHelpers.js";
import {
  parsePacketLossPercentage,
  PING_HEALTH,
  resolvePingHealth,
} from "./pingQuality.js";
import {
  resolveTorchTrafficState,
  TORCH_TRAFFIC_STATE,
} from "./torchQuality.js";

const MODAL_ROOT_ID = "wisphub-yaa-diagnostic-modal";
const MODAL_VISIBLE_CLASS = "wisphub-yaa-diagnostic-modal-visible";
const MODAL_CLOSING_CLASS = "wisphub-yaa-diagnostic-modal-closing";
const COPY_BUTTON_RESET_MS = 1400;
const STEP_IDS = Object.freeze([
  "ping",
  "torch",
  "weeklyTraffic",
  "serviceHealth",
]);
const STEP_LABELS = Object.freeze({
  ping: "Ping",
  torch: "Torch",
  weeklyTraffic: "Tráfico semanal",
  serviceHealth: "Estado de cuenta",
});
const DETAIL_HELP_MESSAGES = Object.freeze({
  "Estado general":
    "Resume el resultado final del diagnóstico. COMPLETO no detecta alertas; " +
    "PARCIAL indica alertas; ERROR indica fallas críticas.",
  Servicio:
    "Identificador del servicio usado para consultar y cruzar datos dentro de WispHub.",
  "IP servicio":
    "Dirección IP actual del servicio que se evalúa en las pruebas técnicas.",
  Plan: "Plan comercial detectado para contextualizar capacidad y soporte.",
  Router:
    "Router o zona de red donde está registrado el cliente para esta cuenta.",
  "Estado del servicio":
    "Estado administrativo reportado por WispHub, por ejemplo Activo, Suspendido o Cancelado.",
  "Saldo pendiente":
    "Monto pendiente de pago detectado al momento de ejecutar el diagnóstico.",
  Ping:
    "Prueba de alcance y respuesta del host; sirve para detectar caída o latencia anómala.",
  Torch:
    "Lectura de tráfico instantáneo (TX/RX) en una ventana corta para validar flujo real.",
  "Tráfico semanal":
    "Resumen de uso por días para identificar actividad reciente o periodos sin consumo.",
  "Estado de cuenta":
    "Validación comercial del servicio para detectar alertas de estatus o cobranza.",
});

const STATUS_TONES = Object.freeze({
  INFO: "info",
  RUNNING: "running",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
});
const DETAIL_HELP_BUTTON_CLASS = "wisphub-yaa-diagnostic-detail-help-btn";
const DETAIL_HELP_POPOVER_CLASS = "wisphub-yaa-diagnostic-detail-popover";
const DETAIL_HELP_POPOVER_VISIBLE = "data-visible";
const DETAIL_HELP_BUTTON_OPEN = "data-open";
const DETAIL_HELP_POPOVER_ID_ATTR = "data-popover-id";
const DETAIL_HELP_POPOVER_PREFIX = "wisphub-yaa-diagnostic-detail-popover-";
let detailHelpPopoverSequence = 0;

const TRAFFIC_BYTES_UNITS = Object.freeze({
  B: 1,
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
  TB: 1024 ** 4,
});
const SVG_NS = "http://www.w3.org/2000/svg";

const CLOSE_ICON_PATH = [
  "m12 13.4l-4.9 4.9q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7",
  "l4.9-4.9l-4.9-4.9q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275",
  "l4.9 4.9l4.9-4.9q.275-.275.7-.275t.7.275t.275.7t-.275.7",
  "L13.4 12l4.9 4.9q.275.275.275.7t-.275.7t-.7.275t-.7-.275z",
].join(" ");

const RERUN_ICON_PATH = [
  "M12 17q-1.425 0-2.6-.712t-1.825-1.913q-.175-.3-.062-.638t.437-.462",
  "q.275-.125.55 0t.425.4Q9.375 14.5 10.2 15t1.8.5q1.45 0 2.475-1.025",
  "T15.5 12t-1.025-2.475T12 8.5q-.7 0-1.325.25T9.55 9.5h.7q.325 0 .538.213",
  "t.212.537t-.213.538t-.537.212H8q-.425 0-.712-.288T7 10V7.75q0-.325",
  ".213-.537T7.75 7t.538.213t.212.537v.675q.725-.675 1.625-1.05T12 7q2.075",
  "0 3.538 1.463T17 12t-1.463 3.538T12 17m-7 4q-.825 0-1.412-.587T3 19v-3",
  "q0-.425.288-.712T4 15t.713.288T5 16v3h3q.425 0 .713.288T9 20t-.288.713",
  "T8 21zm14 0h-3q-.425 0-.712-.288T15 20t.288-.712T16 19h3v-3q0-.425",
  ".288-.712T20 15t.713.288T21 16v3q0 .825-.587 1.413T19 21M3 8V5q0-.825",
  ".588-1.412T5 3h3q.425 0 .713.288T9 4t-.288.713T8 5H5v3q0 .425-.288.713",
  "T4 9t-.712-.288T3 8m16 0V5h-3q-.425 0-.712-.288T15 4t.288-.712T16 3h3",
  "q.825 0 1.413.588T21 5v3q0 .425-.288.713T20 9t-.712-.288T19 8",
].join(" ");

const COPY_ICON_PATH = [
  "M9 18q-.825 0-1.412-.587T7 16V4q0-.825.588-1.412T9 2h9q.825 0",
  "1.413.588T20 4v12q0 .825-.587 1.413T18 18zM3.288 7.713Q3 7.425 3 7",
  "t.288-.712T4 6t.713.288T5 7t-.288.713T4 8t-.712-.288m0 3.5Q3 10.926",
  "3 10.5t.288-.712T4 9.5t.713.288T5 10.5t-.288.713T4 11.5t-.712-.288m0",
  "3.5Q3 14.426 3 14t.288-.712T4 13t.713.288T5 14t-.288.713T4 15t-.712-.288",
  "m0 3.5Q3 17.926 3 17.5t.288-.712T4 16.5t.713.288T5 17.5t-.288.713T4",
  "18.5t-.712-.288m0 3.5Q3 21.426 3 21t.288-.712T4 20t.713.288T5 21t-.288",
  ".713T4 22t-.712-.288m3.5 0Q6.5 21.426 6.5 21t.288-.712T7.5 20t.713.288",
  "T8.5 21t-.288.713T7.5 22t-.712-.288m3.5 0Q10 21.426 10 21t.288-.712T11 20",
  "t.713.288T12 21t-.288.713T11 22t-.712-.288m3.5 0Q13.5 21.426 13.5 21",
  "t.288-.712T14.5 20t.713.288t.287.712t-.288.713T14.5 22t-.712-.288",
].join(" ");

const CHECK_ICON_PATH = [
  "m9.55 15.15l8.475-8.475q.3-.3.7-.3t.7.3t.3.713t-.3.712",
  "l-9.175 9.2q-.3.3-.7.3t-.7-.3L4.55 13q-.3-.3-.288-.712",
  "t.313-.713t.713-.3t.712.3z",
].join(" ");

function toInlineText(value) {
  return normalizeText(value);
}

function createPathIcon(pathData, size = 16) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", "0 0 24 24");

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute("d", pathData);

  svg.append(path);
  return svg;
}

function createButtonIconNode(pathData) {
  const icon = document.createElement("span");
  icon.className = "wisphub-yaa-diagnostic-btn-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.append(createPathIcon(pathData, 16));
  return icon;
}

function createCloseIconNode() {
  const icon = document.createElementNS(SVG_NS, "svg");
  icon.setAttribute("width", "24");
  icon.setAttribute("height", "24");
  icon.setAttribute("viewBox", "0 0 24 24");

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute("d", CLOSE_ICON_PATH);
  icon.append(path);
  return icon;
}

function createRunningSpinnerSvg() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 24 24");

  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("stroke", "currentColor");
  group.setAttribute("stroke-width", "1");

  const circle = document.createElementNS(SVG_NS, "circle");
  circle.setAttribute("cx", "12");
  circle.setAttribute("cy", "12");
  circle.setAttribute("r", "9.5");
  circle.setAttribute("fill", "none");
  circle.setAttribute("stroke-linecap", "round");
  circle.setAttribute("stroke-width", "3");

  const dashArray = document.createElementNS(SVG_NS, "animate");
  dashArray.setAttribute("attributeName", "stroke-dasharray");
  dashArray.setAttribute("calcMode", "spline");
  dashArray.setAttribute("dur", "1.5s");
  dashArray.setAttribute(
    "keySplines",
    "0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1",
  );
  dashArray.setAttribute("keyTimes", "0;0.475;0.95;1");
  dashArray.setAttribute("repeatCount", "indefinite");
  dashArray.setAttribute("values", "0 150;42 150;42 150;42 150");

  const dashOffset = document.createElementNS(SVG_NS, "animate");
  dashOffset.setAttribute("attributeName", "stroke-dashoffset");
  dashOffset.setAttribute("calcMode", "spline");
  dashOffset.setAttribute("dur", "1.5s");
  dashOffset.setAttribute(
    "keySplines",
    "0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1",
  );
  dashOffset.setAttribute("keyTimes", "0;0.475;0.95;1");
  dashOffset.setAttribute("repeatCount", "indefinite");
  dashOffset.setAttribute("values", "0;-16;-59;-59");

  const rotate = document.createElementNS(SVG_NS, "animateTransform");
  rotate.setAttribute("attributeName", "transform");
  rotate.setAttribute("dur", "2s");
  rotate.setAttribute("repeatCount", "indefinite");
  rotate.setAttribute("type", "rotate");
  rotate.setAttribute("values", "0 12 12;360 12 12");

  circle.append(dashArray, dashOffset);
  group.append(circle, rotate);
  svg.append(group);
  return svg;
}

function resetCopyButtonContent(copyButton) {
  if (!copyButton) {
    return;
  }

  copyButton.replaceChildren(createButtonIconNode(COPY_ICON_PATH));
  copyButton.setAttribute("aria-label", "Copiar diagnóstico completo");
  copyButton.setAttribute("title", "Copiar diagnóstico completo");
}

function markCopyButtonAsCopied(copyButton) {
  if (!copyButton) {
    return;
  }

  copyButton.replaceChildren(createButtonIconNode(CHECK_ICON_PATH));
  copyButton.setAttribute("aria-label", "Copiado");
  copyButton.setAttribute("title", "Copiado");
  copyButton.disabled = true;
}

function toTextOrDefault(value, fallback = "N/D") {
  const text = toInlineText(value);
  return text || fallback;
}

function normalizeSummaryText(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function getOverallTone(overallStatus) {
  const normalized = toInlineText(overallStatus).toUpperCase();
  if (normalized === "ERROR") {
    return STATUS_TONES.ERROR;
  }
  if (normalized === "PARCIAL") {
    return STATUS_TONES.WARNING;
  }
  return STATUS_TONES.SUCCESS;
}

function getOverallLabel(overallStatus) {
  const normalized = toInlineText(overallStatus).toUpperCase();
  if (normalized === "ERROR") {
    return "ERROR";
  }
  if (normalized === "PARCIAL") {
    return "PARCIAL";
  }
  return "COMPLETO";
}

function getStepStatusLabel(status) {
  if (status === "done") {
    return "Listo";
  }
  if (status === "warning") {
    return "Alerta";
  }
  if (status === "error") {
    return "Error";
  }
  if (status === "running") {
    return "En curso";
  }
  return "Pendiente";
}

function createSpinnerNode() {
  const node = document.createElement("span");
  node.className = "wisphub-yaa-diagnostic-step-spinner";
  node.setAttribute("aria-hidden", "true");
  node.append(createRunningSpinnerSvg());
  return node;
}

function createStepRow(stepId) {
  const row = document.createElement("li");
  row.className = "wisphub-yaa-diagnostic-step";
  row.setAttribute("data-step-id", stepId);
  row.setAttribute("data-step-state", "pending");

  const label = document.createElement("span");
  label.className = "wisphub-yaa-diagnostic-step-label";
  label.textContent = STEP_LABELS[stepId] || stepId;

  const status = document.createElement("span");
  status.className = "wisphub-yaa-diagnostic-step-status";

  const statusText = document.createElement("span");
  statusText.className = "wisphub-yaa-diagnostic-step-status-text";
  statusText.textContent = getStepStatusLabel("pending");

  status.append(statusText);
  row.append(label, status);
  return row;
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}

function setStatus(refs, text, tone = STATUS_TONES.INFO) {
  refs.status.textContent = toInlineText(text);
  refs.status.setAttribute("data-tone", tone);
  refs.progressBar.setAttribute("data-tone", tone);
}

function setStepState(stepsRoot, stepId, state) {
  const row = stepsRoot?.querySelector(`[data-step-id="${stepId}"]`);
  if (!row) {
    return;
  }

  row.setAttribute("data-step-state", state);
  const statusNode = row.querySelector(".wisphub-yaa-diagnostic-step-status");
  const statusText = row.querySelector(".wisphub-yaa-diagnostic-step-status-text");
  if (!statusNode || !statusText) {
    return;
  }

  statusText.textContent = getStepStatusLabel(state);
  statusNode
    .querySelectorAll(".wisphub-yaa-diagnostic-step-spinner")
    .forEach((spinner) => spinner.remove());

  if (state === "running") {
    statusNode.append(createSpinnerNode());
  }
}

function resetStepStates(stepsRoot) {
  STEP_IDS.forEach((stepId) => setStepState(stepsRoot, stepId, "pending"));
}

function buildSubtitle(clientContext = {}) {
  const name = toInlineText(clientContext.clientName);
  const slug = toInlineText(clientContext.serviceSlug);
  const clientLabel = name || slug || "N/A";
  const serviceId = toTextOrDefault(clientContext.serviceId, "N/A");
  const ip = toTextOrDefault(clientContext.ip, "N/A");
  return `${clientLabel} · ID ${serviceId} · IP ${ip}`;
}

function hideDetails(refs) {
  refs.detailsSection.hidden = true;
  refs.detailsList.replaceChildren();
  closeAllDetailPopovers(refs.root);
}

function nextDetailHelpPopoverId() {
  detailHelpPopoverSequence += 1;
  return `${DETAIL_HELP_POPOVER_PREFIX}${detailHelpPopoverSequence}`;
}

function getDetailHelpMessage(label) {
  const normalizedLabel = toInlineText(label);
  return (
    DETAIL_HELP_MESSAGES[normalizedLabel] ||
    "Explica el dato mostrado en esta tarjeta para facilitar interpretación rápida."
  );
}

function closeAllDetailPopovers(scope) {
  if (!scope) {
    return;
  }

  scope
    .querySelectorAll(`.${DETAIL_HELP_POPOVER_CLASS}[${DETAIL_HELP_POPOVER_VISIBLE}="true"]`)
    .forEach((popover) => {
      popover.setAttribute(DETAIL_HELP_POPOVER_VISIBLE, "false");
    });

  scope
    .querySelectorAll(`.${DETAIL_HELP_BUTTON_CLASS}[${DETAIL_HELP_BUTTON_OPEN}="true"]`)
    .forEach((button) => {
      button.setAttribute(DETAIL_HELP_BUTTON_OPEN, "false");
      button.setAttribute("aria-expanded", "false");
    });
}

function toggleDetailPopover(root, button) {
  if (!root || !button) {
    return;
  }

  const popoverId = button.getAttribute(DETAIL_HELP_POPOVER_ID_ATTR);
  if (!popoverId) {
    return;
  }

  const popover = root.querySelector(`#${popoverId}`);
  if (!popover) {
    return;
  }

  const isOpen = button.getAttribute(DETAIL_HELP_BUTTON_OPEN) === "true";
  closeAllDetailPopovers(root);

  if (isOpen) {
    return;
  }

  button.setAttribute(DETAIL_HELP_BUTTON_OPEN, "true");
  button.setAttribute("aria-expanded", "true");
  popover.setAttribute(DETAIL_HELP_POPOVER_VISIBLE, "true");
}

function createDetailRow(label, value, tone = STATUS_TONES.INFO) {
  const row = document.createElement("div");
  row.className = "wisphub-yaa-diagnostic-detail-row";
  row.setAttribute("data-tone", tone);

  const heading = document.createElement("div");
  heading.className = "wisphub-yaa-diagnostic-detail-head";

  const labelNode = document.createElement("span");
  labelNode.className = "wisphub-yaa-diagnostic-detail-label";
  labelNode.textContent = toInlineText(label);

  const helpButton = document.createElement("button");
  helpButton.className = DETAIL_HELP_BUTTON_CLASS;
  helpButton.setAttribute("type", "button");
  helpButton.setAttribute("aria-label", `Más información sobre ${toInlineText(label)}`);
  helpButton.setAttribute("aria-expanded", "false");
  helpButton.setAttribute(DETAIL_HELP_BUTTON_OPEN, "false");

  const popover = document.createElement("div");
  popover.className = DETAIL_HELP_POPOVER_CLASS;
  popover.id = nextDetailHelpPopoverId();
  popover.setAttribute("role", "note");
  popover.setAttribute(DETAIL_HELP_POPOVER_VISIBLE, "false");
  popover.textContent = getDetailHelpMessage(label);
  helpButton.setAttribute(DETAIL_HELP_POPOVER_ID_ATTR, popover.id);

  const valueNode = document.createElement("span");
  valueNode.className = "wisphub-yaa-diagnostic-detail-value";
  valueNode.textContent = toTextOrDefault(value);

  heading.append(labelNode, helpButton);
  row.append(heading, valueNode, popover);
  return row;
}

function addDetailRows(container, rows = []) {
  rows.forEach((row) =>
    container.append(createDetailRow(row.label, row.value, row.tone)),
  );
}

function formatPingDetail(ping = {}) {
  const error = toInlineText(ping.error);
  if (error) {
    return { value: error, tone: STATUS_TONES.ERROR };
  }

  const metrics = ping.metrics || {};
  const host = toInlineText(metrics.host);
  const packetLoss = toInlineText(metrics.packetLoss);
  const avgRtt = toInlineText(metrics.avgRtt);
  const packetLossValue = parsePacketLossPercentage(packetLoss);
  const pingHealth = resolvePingHealth(packetLossValue);
  const detail = [
    host ? `Host ${host}` : "",
    packetLoss ? `Pérdida ${packetLoss}` : "",
    avgRtt ? `RTT ${avgRtt}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  if (!detail) {
    return {
      value: "Sin datos",
      tone: STATUS_TONES.WARNING,
    };
  }

  if (pingHealth === PING_HEALTH.DOWN) {
    return {
      value: `${detail} · Sin respuesta del host`,
      tone: STATUS_TONES.WARNING,
    };
  }

  if (pingHealth === PING_HEALTH.DEGRADED) {
    return {
      value: `${detail} · Respuesta intermitente`,
      tone: STATUS_TONES.WARNING,
    };
  }

  return {
    value: detail,
    tone: STATUS_TONES.SUCCESS,
  };
}

function formatTorchDetail(torch = {}) {
  const error = toInlineText(torch.error);
  if (error) {
    return { value: error, tone: STATUS_TONES.ERROR };
  }

  const totals = torch.totals || {};
  const tx = toInlineText(totals.tx);
  const rx = toInlineText(totals.rx);
  const txRx = [tx, rx].filter(Boolean).join(" / ");
  const trafficState = resolveTorchTrafficState(torch);

  if (trafficState === TORCH_TRAFFIC_STATE.TRAFFIC) {
    return {
      value: txRx ? `TX/RX ${txRx} · Tráfico detectado` : "Tráfico detectado",
      tone: STATUS_TONES.SUCCESS,
    };
  }

  if (trafficState === TORCH_TRAFFIC_STATE.IDLE) {
    return {
      value: txRx
        ? `TX/RX ${txRx} · Sin tráfico detectado en la ventana`
        : "Sin tráfico detectado en la ventana",
      tone: STATUS_TONES.WARNING,
    };
  }

  return {
    value: "Sin datos",
    tone: STATUS_TONES.WARNING,
  };
}

function parseTrafficAmountToBytes(value) {
  const normalized = toInlineText(value).replace(",", ".");
  if (!normalized) {
    return null;
  }

  const match = normalized.match(/(-?\d+(?:\.\d+)?)\s*([KMGT]?)(?:I?B|B)(?:PS)?/i);
  if (!match) {
    return null;
  }

  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount)) {
    return null;
  }

  const unitPrefix = toInlineText(match[2]).toUpperCase();
  const unit = unitPrefix ? `${unitPrefix}B` : "B";
  const multiplier = TRAFFIC_BYTES_UNITS[unit];
  if (!multiplier) {
    return null;
  }

  return amount * multiplier;
}

function getWeeklyTrafficDataRows(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }

  const validRows = rows.filter((row) => Array.isArray(row) && row.length >= 3);
  if (validRows.length === 0) {
    return [];
  }

  const firstLabel = toInlineText(validRows[0]?.[0]).toLowerCase();
  if (firstLabel === "dia" || firstLabel === "día") {
    return validRows.slice(1);
  }

  return validRows;
}

function formatWeeklyTrafficDetail(weeklyTraffic = {}) {
  const error = toInlineText(weeklyTraffic.error);
  if (error) {
    return { value: error, tone: STATUS_TONES.ERROR };
  }

  const rows = getWeeklyTrafficDataRows(weeklyTraffic.rows);
  const rowCount = rows.length;
  const activeDays = rows.reduce((count, row) => {
    const download = parseTrafficAmountToBytes(row[1]);
    const upload = parseTrafficAmountToBytes(row[2]);
    const hasUsage =
      (Number.isFinite(download) && download > 0) ||
      (Number.isFinite(upload) && upload > 0);
    return hasUsage ? count + 1 : count;
  }, 0);

  return {
    value:
      rowCount > 0
        ? `${rowCount} día(s) revisados · ${activeDays} con tráfico`
        : "Sin datos",
    tone: rowCount > 0 && activeDays > 0 ? STATUS_TONES.SUCCESS : STATUS_TONES.WARNING,
  };
}

function formatServiceHealthDetail(serviceHealth = {}, context = {}) {
  const error = toInlineText(serviceHealth.error);
  if (error) {
    return { value: error, tone: STATUS_TONES.ERROR };
  }

  const status = toInlineText(serviceHealth.accountStatus || context.accountStatus);
  const pendingBalance = toInlineText(
    serviceHealth.pendingBalance || context.pendingBalance,
  );
  const issues = Array.isArray(serviceHealth.issues)
    ? serviceHealth.issues.map((item) => toInlineText(item)).filter(Boolean)
    : [];

  if (issues.length > 0 || serviceHealth.hasWarnings) {
    return {
      value: issues.join(" | ") || "Con alertas",
      tone: STATUS_TONES.WARNING,
    };
  }

  if (!status && !pendingBalance) {
    return {
      value: "Sin datos",
      tone: STATUS_TONES.WARNING,
    };
  }

  return {
    value: [status, pendingBalance && `Saldo ${pendingBalance}`]
      .filter(Boolean)
      .join(" · "),
    tone: STATUS_TONES.SUCCESS,
  };
}

function buildDetailRows(result = {}) {
  const context = result.clientContext || {};
  const rows = [
    {
      label: "Estado general",
      value: getOverallLabel(result.overallStatus),
      tone: getOverallTone(result.overallStatus),
    },
    { label: "Servicio", value: context.serviceSlug || "N/D" },
    { label: "IP servicio", value: context.ip || "N/D" },
    { label: "Plan", value: context.plan || "N/D" },
    { label: "Router", value: context.router || "N/D" },
    { label: "Estado del servicio", value: context.accountStatus || "N/D" },
    { label: "Saldo pendiente", value: context.pendingBalance || "N/D" },
  ];

  const ping = formatPingDetail(result.ping);
  const torch = formatTorchDetail(result.torch);
  const weeklyTraffic = formatWeeklyTrafficDetail(result.weeklyTraffic);
  const serviceHealth = formatServiceHealthDetail(
    result.serviceHealth,
    result.clientContext,
  );

  rows.push(
    { label: "Ping", value: ping.value, tone: ping.tone },
    { label: "Torch", value: torch.value, tone: torch.tone },
    { label: "Tráfico semanal", value: weeklyTraffic.value, tone: weeklyTraffic.tone },
    { label: "Estado de cuenta", value: serviceHealth.value, tone: serviceHealth.tone },
  );

  return rows;
}

function createModalRoot() {
  const root = document.createElement("div");
  root.id = MODAL_ROOT_ID;
  root.className = "wisphub-yaa-diagnostic-modal";
  root.setAttribute("aria-hidden", "true");
  root.inert = true;
  root.__summaryText = "";
  root.__onRequestClose = null;
  root.__onRetry = null;
  root.__closeTimer = null;

  const backdrop = document.createElement("div");
  backdrop.className = "wisphub-yaa-diagnostic-modal-backdrop";
  backdrop.setAttribute("aria-hidden", "true");
  backdrop.setAttribute("role", "presentation");

  const dialog = document.createElement("div");
  dialog.className = "wisphub-yaa-diagnostic-modal-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "wisphub-yaa-diagnostic-title");

  const header = document.createElement("div");
  header.className = "wisphub-yaa-diagnostic-modal-header";

  const titleWrap = document.createElement("div");
  titleWrap.className = "wisphub-yaa-diagnostic-title-wrap";

  const title = document.createElement("h3");
  title.id = "wisphub-yaa-diagnostic-title";
  title.className = "wisphub-yaa-diagnostic-title";
  title.textContent = "Diagnóstico Express";

  const subtitle = document.createElement("p");
  subtitle.className = "wisphub-yaa-diagnostic-subtitle";
  subtitle.textContent = "";

  titleWrap.append(title, subtitle);

  const closeButton = document.createElement("button");
  closeButton.className = "wisphub-yaa-diagnostic-close-btn";
  closeButton.setAttribute("type", "button");
  closeButton.setAttribute("aria-label", "Cerrar diagnóstico");
  closeButton.append(createCloseIconNode());

  header.append(titleWrap, closeButton);

  const status = document.createElement("p");
  status.className = "wisphub-yaa-diagnostic-status";
  status.textContent = "Listo para ejecutar";
  status.setAttribute("data-tone", STATUS_TONES.INFO);

  const progress = document.createElement("div");
  progress.className = "wisphub-yaa-diagnostic-progress";

  const progressBar = document.createElement("div");
  progressBar.className = "wisphub-yaa-diagnostic-progress-bar";
  progressBar.style.width = "0%";
  progressBar.setAttribute("data-tone", STATUS_TONES.INFO);
  progress.append(progressBar);

  const steps = document.createElement("ul");
  steps.className = "wisphub-yaa-diagnostic-steps";
  STEP_IDS.forEach((stepId) => {
    steps.append(createStepRow(stepId));
  });

  const detailsSection = document.createElement("section");
  detailsSection.className = "wisphub-yaa-diagnostic-details";
  detailsSection.hidden = true;

  const detailsHeader = document.createElement("div");
  detailsHeader.className = "wisphub-yaa-diagnostic-details-header";

  const detailsTitle = document.createElement("h4");
  detailsTitle.className = "wisphub-yaa-diagnostic-details-title";
  detailsTitle.textContent = "Detalles";

  const copyButton = document.createElement("button");
  copyButton.className =
    "wisphub-yaa-diagnostic-btn wisphub-yaa-diagnostic-btn-primary wisphub-yaa-diagnostic-copy";
  copyButton.setAttribute("type", "button");
  copyButton.disabled = true;
  resetCopyButtonContent(copyButton);

  detailsHeader.append(detailsTitle, copyButton);

  const detailsList = document.createElement("div");
  detailsList.className = "wisphub-yaa-diagnostic-details-list";

  detailsSection.append(detailsHeader, detailsList);

  const actions = document.createElement("div");
  actions.className = "wisphub-yaa-diagnostic-actions";

  const rerunButton = document.createElement("button");
  rerunButton.className =
    "wisphub-yaa-diagnostic-btn wisphub-yaa-diagnostic-btn-primary wisphub-yaa-diagnostic-rerun";
  rerunButton.setAttribute("type", "button");
  rerunButton.append(
    createButtonIconNode(RERUN_ICON_PATH),
    Object.assign(document.createElement("span"), { textContent: "Re-ejecutar" }),
  );
  rerunButton.disabled = true;

  actions.append(rerunButton);

  dialog.append(header, status, progress, steps, detailsSection, actions);
  root.append(backdrop, dialog);
  document.body.append(root);

  const hideRoot = () => {
    if (root.__copyResetTimer) {
      window.clearTimeout(root.__copyResetTimer);
      root.__copyResetTimer = null;
    }

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && root.contains(activeElement)) {
      activeElement.blur();
    }
    root.classList.remove(MODAL_VISIBLE_CLASS, MODAL_CLOSING_CLASS);
    root.inert = true;
    root.setAttribute("aria-hidden", "true");
    if (root.__previousFocus instanceof HTMLElement && document.contains(root.__previousFocus)) {
      root.__previousFocus.focus();
    }
  };

  const closeModal = (reason = "close") => {
    root.__onRequestClose?.(reason);

    if (root.getAttribute("aria-hidden") === "true") {
      return;
    }

    if (root.__closeTimer) {
      window.clearTimeout(root.__closeTimer);
      root.__closeTimer = null;
    }

    if (prefersReducedMotion()) {
      hideRoot();
      return;
    }

    root.classList.add(MODAL_CLOSING_CLASS);
    root.classList.remove(MODAL_VISIBLE_CLASS);
    root.__closeTimer = window.setTimeout(() => {
      root.__closeTimer = null;
      hideRoot();
    }, 220);
  };

  backdrop.addEventListener("click", () => closeModal("backdrop"));
  closeButton.addEventListener("click", () => closeModal("close-button"));

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    if (root.getAttribute("aria-hidden") === "true") {
      return;
    }
    closeModal("escape");
  });

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const helpButton = target.closest(`.${DETAIL_HELP_BUTTON_CLASS}`);
    if (helpButton && root.contains(helpButton)) {
      event.preventDefault();
      event.stopPropagation();
      toggleDetailPopover(root, helpButton);
      return;
    }

    closeAllDetailPopovers(root);
  });

  copyButton.addEventListener("click", async () => {
    const text = normalizeSummaryText(root.__summaryText);
    if (!text) {
      return;
    }

    copyButton.disabled = true;
    const copied = await copyToClipboard(text);
    if (!copied) {
      setStatus(
        {
          status,
          progressBar,
        },
        "No se pudo copiar el diagnóstico completo.",
        STATUS_TONES.ERROR,
      );
      copyButton.disabled = false;
      return;
    }

    markCopyButtonAsCopied(copyButton);
    if (root.__copyResetTimer) {
      window.clearTimeout(root.__copyResetTimer);
      root.__copyResetTimer = null;
    }
    root.__copyResetTimer = window.setTimeout(() => {
      root.__copyResetTimer = null;
      if (!copyButton.isConnected) {
        return;
      }
      resetCopyButtonContent(copyButton);
      copyButton.disabled = !normalizeSummaryText(root.__summaryText);
    }, COPY_BUTTON_RESET_MS);
  });

  rerunButton.addEventListener("click", () => {
    if (rerunButton.disabled) {
      return;
    }
    root.__onRetry?.();
  });

  return {
    root,
    subtitle,
    status,
    progressBar,
    steps,
    detailsSection,
    detailsList,
    copyButton,
    rerunButton,
    closeModal,
  };
}

function getModalRefs(options = {}) {
  const existing = document.getElementById(MODAL_ROOT_ID);
  if (existing) {
    existing.__onRequestClose = options.onRequestClose || null;
    existing.__onRetry = options.onRetry || null;
    return {
      root: existing,
      subtitle: existing.querySelector(".wisphub-yaa-diagnostic-subtitle"),
      status: existing.querySelector(".wisphub-yaa-diagnostic-status"),
      progressBar: existing.querySelector(".wisphub-yaa-diagnostic-progress-bar"),
      steps: existing.querySelector(".wisphub-yaa-diagnostic-steps"),
      detailsSection: existing.querySelector(".wisphub-yaa-diagnostic-details"),
      detailsList: existing.querySelector(".wisphub-yaa-diagnostic-details-list"),
      copyButton: existing.querySelector(".wisphub-yaa-diagnostic-copy"),
      rerunButton: existing.querySelector(".wisphub-yaa-diagnostic-rerun"),
      closeModal: existing.__closeModal || (() => {}),
    };
  }

  const refs = createModalRoot();
  refs.root.__onRequestClose = options.onRequestClose || null;
  refs.root.__onRetry = options.onRetry || null;
  refs.root.__closeModal = refs.closeModal;
  return refs;
}

function createProgressController(refs) {
  const stepState = new Map();
  STEP_IDS.forEach((stepId) => {
    stepState.set(stepId, "pending");
  });

  function countFinishedSteps() {
    let count = 0;
    stepState.forEach((status) => {
      if (status === "done" || status === "warning" || status === "error") {
        count += 1;
      }
    });
    return count;
  }

  function updateProgressBar(totalSteps = STEP_IDS.length) {
    const completed = countFinishedSteps();
    const percent = Math.max(0, Math.min(100, (completed / totalSteps) * 100));
    refs.progressBar.style.width = `${percent}%`;
  }

  function updateStep(stepId, state, totalSteps = STEP_IDS.length) {
    stepState.set(stepId, state);
    setStepState(refs.steps, stepId, state);
    updateProgressBar(totalSteps);
  }

  return {
    applyProgressEvent(event = {}) {
      const eventType = toInlineText(event.type);
      const stepId = toInlineText(event.stepId);
      const totalSteps = Number.isFinite(event.totalSteps)
        ? event.totalSteps
        : STEP_IDS.length;

      if (eventType === "started") {
        refs.progressBar.style.width = "0%";
        hideDetails(refs);
        resetStepStates(refs.steps);
        stepState.clear();
        STEP_IDS.forEach((id) => stepState.set(id, "pending"));
        resetCopyButtonContent(refs.copyButton);
        if (refs.copyButton) {
          refs.copyButton.disabled = true;
        }
        if (refs.rerunButton) {
          refs.rerunButton.disabled = true;
        }
        setStatus(refs, "Ejecutando diagnóstico express...", STATUS_TONES.RUNNING);
        return;
      }

      if (eventType === "step-started" && stepId) {
        setStatus(
          refs,
          `Ejecutando ${STEP_LABELS[stepId] || stepId}...`,
          STATUS_TONES.RUNNING,
        );
        updateStep(stepId, "running", totalSteps);
        return;
      }

      if (eventType === "step-completed" && stepId) {
        updateStep(stepId, "done", totalSteps);
        return;
      }

      if (eventType === "step-warning" && stepId) {
        updateStep(stepId, "warning", totalSteps);
        return;
      }

      if (eventType === "step-error" && stepId) {
        updateStep(stepId, "error", totalSteps);
        return;
      }

      if (eventType === "cancelled") {
        setStatus(refs, "Diagnóstico cancelado.", STATUS_TONES.WARNING);
      }
    },
  };
}

export function openDiagnosticModal(clientContext = {}, options = {}) {
  const refs = getModalRefs(options);

  if (refs.root.__closeTimer) {
    window.clearTimeout(refs.root.__closeTimer);
    refs.root.__closeTimer = null;
  }
  if (refs.root.__copyResetTimer) {
    window.clearTimeout(refs.root.__copyResetTimer);
    refs.root.__copyResetTimer = null;
  }

  refs.root.classList.remove(MODAL_CLOSING_CLASS);
  refs.root.classList.add(MODAL_VISIBLE_CLASS);
  refs.root.__previousFocus =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  refs.root.inert = false;
  refs.root.setAttribute("aria-hidden", "false");
  refs.root.__summaryText = "";
  refs.subtitle.textContent = buildSubtitle(clientContext);
  resetCopyButtonContent(refs.copyButton);
  if (refs.copyButton) {
    refs.copyButton.disabled = true;
  }
  if (refs.rerunButton) {
    refs.rerunButton.disabled = true;
  }
  refs.progressBar.style.width = "0%";
  hideDetails(refs);
  resetStepStates(refs.steps);
  setStatus(refs, "Ejecutando diagnóstico express...", STATUS_TONES.RUNNING);

  const progress = createProgressController(refs);

  return {
    updateProgress: progress.applyProgressEvent,
    showResult(result = {}) {
      const detailRows = buildDetailRows(result);
      refs.detailsList.replaceChildren();
      addDetailRows(refs.detailsList, detailRows);
      refs.detailsSection.hidden = false;

      const overallLabel = getOverallLabel(result.overallStatus);
      const overallTone = getOverallTone(result.overallStatus);
      const statusText =
        overallLabel === "COMPLETO"
          ? "Se completó el diagnóstico express."
          : overallLabel === "PARCIAL"
            ? "Se completó el diagnóstico express con alertas."
            : "El diagnóstico express finalizó con errores.";

      setStatus(refs, statusText, overallTone);
      refs.progressBar.style.width = "100%";
      refs.root.__summaryText = result.summary || "";
      if (refs.copyButton) {
        resetCopyButtonContent(refs.copyButton);
        refs.copyButton.disabled = !normalizeSummaryText(result.summary);
      }
      if (refs.rerunButton) {
        refs.rerunButton.disabled = false;
      }
    },
    showError(message) {
      refs.detailsList.replaceChildren();
      addDetailRows(refs.detailsList, [
        {
          label: "Error",
          value: toTextOrDefault(message, "Error de diagnóstico"),
          tone: STATUS_TONES.ERROR,
        },
      ]);
      refs.detailsSection.hidden = false;
      if (refs.copyButton) {
        resetCopyButtonContent(refs.copyButton);
        refs.copyButton.disabled = true;
      }
      if (refs.rerunButton) {
        refs.rerunButton.disabled = false;
      }
      setStatus(
        refs,
        toTextOrDefault(message, "Error de diagnóstico"),
        STATUS_TONES.ERROR,
      );
    },
    showCancelled() {
      if (refs.copyButton) {
        resetCopyButtonContent(refs.copyButton);
        refs.copyButton.disabled = true;
      }
      if (refs.rerunButton) {
        refs.rerunButton.disabled = false;
      }
      hideDetails(refs);
      setStatus(refs, "Diagnóstico cancelado.", STATUS_TONES.WARNING);
    },
    isClosed() {
      return refs.root.getAttribute("aria-hidden") === "true";
    },
  };
}

export const __testables__ = {
  formatTorchDetail,
  formatWeeklyTrafficDetail,
  formatServiceHealthDetail,
  normalizeSummaryText,
};
