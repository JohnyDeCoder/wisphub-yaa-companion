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

const MEXICO_CITY_TIMEZONE = "America/Mexico_City";
const TRAFFIC_BYTES_UNITS = Object.freeze({
  B: 1,
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
  TB: 1024 ** 4,
});
const RATE_UNITS = Object.freeze({
  "": 1,
  K: 1000,
  M: 1000 ** 2,
  G: 1000 ** 3,
});
const PING_SAMPLE_LIMIT = 8;

function toPlainText(value) {
  return normalizeText(value);
}

function toTextOrDefault(value, fallback = "N/D") {
  const normalized = toPlainText(value);
  return normalized || fallback;
}

function isObject(value) {
  return typeof value === "object" && value !== null;
}

function formatGeneratedAt(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleString("es-MX", {
      timeZone: MEXICO_CITY_TIMEZONE,
      hour12: false,
    });
  }

  return date.toLocaleString("es-MX", {
    timeZone: MEXICO_CITY_TIMEZONE,
    hour12: false,
  });
}

function getClientContext(input) {
  const source = isObject(input?.clientContext)
    ? input.clientContext
    : isObject(input?.client)
      ? input.client
      : {};

  return {
    serviceSlug: toPlainText(source.serviceSlug),
    serviceId: toPlainText(source.serviceId),
    clientName: toPlainText(source.clientName),
    ip: toPlainText(source.ip),
    plan: toPlainText(source.plan),
    router: toPlainText(source.router),
    accountStatus: toPlainText(source.accountStatus),
    pendingBalance: toPlainText(source.pendingBalance),
  };
}

function getClientDisplayName(clientContext = {}) {
  return toPlainText(clientContext.clientName || clientContext.serviceSlug);
}

function hasPingData(ping) {
  if (!isObject(ping)) {
    return false;
  }

  const metrics = isObject(ping.metrics) ? ping.metrics : {};
  const hasMetrics = Object.values(metrics).some((value) => toPlainText(value));
  const hasSamples = Array.isArray(ping.samples) && ping.samples.length > 0;
  return hasMetrics || hasSamples;
}

function parseDataAmountToBytes(value) {
  const normalized = toPlainText(value).replace(",", ".");
  if (!normalized) {
    return null;
  }

  const match = normalized.match(
    /(-?\d+(?:\.\d+)?)\s*([KMGT]?)(?:I?B|B)(?:PS)?/i,
  );
  if (!match) {
    return null;
  }

  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount)) {
    return null;
  }

  const unitPrefix = toPlainText(match[2]).toUpperCase();
  const unit = unitPrefix ? `${unitPrefix}B` : "B";
  const multiplier = TRAFFIC_BYTES_UNITS[unit];
  if (!multiplier) {
    return null;
  }

  return amount * multiplier;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "N/D";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const fixed = value.toFixed(2).replace(/\.?0+$/, "");
  return `${fixed} ${units[unitIndex]}`;
}

function getWeeklyDataRows(weeklyTraffic) {
  if (!isObject(weeklyTraffic) || !Array.isArray(weeklyTraffic.rows)) {
    return [];
  }

  const rows = weeklyTraffic.rows
    .filter((row) => Array.isArray(row) && row.length >= 3)
    .map((row) => row.map((cell) => toPlainText(cell)));
  if (rows.length === 0) {
    return [];
  }

  const firstDay = toPlainText(rows[0]?.[0]).toLowerCase();
  if (firstDay === "dia" || firstDay === "día") {
    return rows.slice(1);
  }

  return rows;
}

function summarizeWeeklyTraffic(weeklyTraffic) {
  const rows = getWeeklyDataRows(weeklyTraffic);
  if (rows.length === 0) {
    return null;
  }

  let downloadTotal = 0;
  let uploadTotal = 0;
  let peakDay = "";
  let peakDownloadRaw = "";
  let peakDownloadBytes = -1;

  rows.forEach((row) => {
    const day = toPlainText(row[0]);
    const downloadRaw = toPlainText(row[1]);
    const uploadRaw = toPlainText(row[2]);

    const downloadBytes = parseDataAmountToBytes(downloadRaw);
    if (Number.isFinite(downloadBytes)) {
      downloadTotal += downloadBytes;
      if (downloadBytes > peakDownloadBytes) {
        peakDownloadBytes = downloadBytes;
        peakDay = day;
        peakDownloadRaw = downloadRaw;
      }
    }

    const uploadBytes = parseDataAmountToBytes(uploadRaw);
    if (Number.isFinite(uploadBytes)) {
      uploadTotal += uploadBytes;
    }
  });

  return {
    rows,
    downloadTotal,
    uploadTotal,
    peakDay: toTextOrDefault(peakDay),
    peakDownloadRaw: toTextOrDefault(peakDownloadRaw),
  };
}

function parseRateForSorting(value) {
  const normalized = toPlainText(value).replace(",", ".");
  if (!normalized) {
    return 0;
  }

  const match = normalized.match(/(-?\d+(?:\.\d+)?)\s*([KMG]?)(?:BPS|B)?/i);
  if (!match) {
    return 0;
  }

  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount)) {
    return 0;
  }

  const multiplier = RATE_UNITS[toPlainText(match[2]).toUpperCase()] || 1;
  return amount * multiplier;
}

function getTopTorchFlow(flows) {
  if (!Array.isArray(flows) || flows.length === 0) {
    return null;
  }

  const normalizedFlows = flows
    .filter((flow) => isObject(flow))
    .map((flow) => {
      const tx = toPlainText(flow.tx || flow["tx-rate"] || flow.tx_rate);
      const rx = toPlainText(flow.rx || flow["rx-rate"] || flow.rx_rate);
      const score = parseRateForSorting(tx) + parseRateForSorting(rx);
      return { flow, tx, rx, score };
    })
    .sort((left, right) => right.score - left.score);

  const top = normalizedFlows[0];
  if (!top) {
    return null;
  }

  const flow = top.flow;
  const source = toPlainText(
    flow["src-address"] || flow.src_address || flow.source || flow.src,
  );
  const destination = toPlainText(
    flow["dst-address"] || flow.dst_address || flow.destination || flow.dst,
  );
  const destinationPort = toPlainText(
    flow["dst-port"] || flow.dst_port || flow.destinationPort,
  );
  const destinationLabel = destinationPort
    ? `${destination}:${destinationPort}`
    : destination;

  if (!source && !destinationLabel) {
    return null;
  }

  return [
    `${toTextOrDefault(source)} -> ${toTextOrDefault(destinationLabel)}`,
    `(TX: ${toTextOrDefault(top.tx)} / RX: ${toTextOrDefault(top.rx)})`,
  ].join(" ");
}

function resolveStepStatus({ hasData, error }) {
  const errorText = toPlainText(error);
  if (errorText) {
    return { status: "ERROR", errorText };
  }
  if (hasData) {
    return { status: "OK", errorText: "" };
  }
  return { status: "SIN DATOS", errorText: "" };
}

function buildStepHeader(stepName, stepStatus) {
  if (stepStatus.status === "ERROR") {
    return `${stepName}: ERROR (${stepStatus.errorText})`;
  }
  return `${stepName}: ${stepStatus.status}`;
}

function resolveOverallStatus(stepStatuses) {
  const counts = stepStatuses.reduce(
    (accumulator, stepStatus) => {
      const next = { ...accumulator };
      if (stepStatus.status === "OK") {
        next.ok += 1;
      } else if (stepStatus.status === "ERROR") {
        next.error += 1;
      } else {
        next.warning += 1;
      }
      return next;
    },
    { ok: 0, error: 0, warning: 0 },
  );

  if (counts.ok === stepStatuses.length) {
    return "COMPLETO";
  }
  if (counts.error > 0 && counts.ok === 0) {
    return "ERROR";
  }
  return "PARCIAL";
}

function buildQuickLinks(clientContext) {
  if (!clientContext.serviceSlug || !clientContext.serviceId) {
    return [];
  }

  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://wisphub.io";
  const slug = clientContext.serviceSlug;
  const serviceId = clientContext.serviceId;
  return [
    `Ping: ${origin}/clientes/ping/${slug}/${serviceId}/`,
    `Torch: ${origin}/clientes/torch/${slug}/${serviceId}/`,
    `Tráfico: ${origin}/trafico/semana/servicio/${slug}/${serviceId}/`,
  ];
}

function getErrorValue(step) {
  if (!isObject(step)) {
    return "";
  }
  return step.error || step.message || step.detail;
}

function getPingSection(ping) {
  const metrics = isObject(ping?.metrics) ? ping.metrics : {};
  const stepStatus = resolveStepStatus({
    hasData: hasPingData(ping),
    error: getErrorValue(ping),
  });
  const packetLoss = parsePacketLossPercentage(metrics.packetLoss);
  const pingHealth = resolvePingHealth(packetLoss);
  const interpretedStepStatus =
    stepStatus.status === "OK" &&
    pingHealth !== PING_HEALTH.HEALTHY &&
    pingHealth !== PING_HEALTH.UNKNOWN
      ? { status: "ALERTA", errorText: "" }
      : stepStatus;

  const lines = [buildStepHeader("Ping", interpretedStepStatus)];
  if (interpretedStepStatus.status === "OK" || interpretedStepStatus.status === "ALERTA") {
    lines.push(`Host: ${toTextOrDefault(metrics.host)}`);
    lines.push(`Pérdida: ${toTextOrDefault(metrics.packetLoss)}`);
    lines.push(
      [
        "RTT min/avg/max:",
        `${toTextOrDefault(metrics.minRtt)} /`,
        `${toTextOrDefault(metrics.avgRtt)} /`,
        toTextOrDefault(metrics.maxRtt),
      ].join(" "),
    );
    lines.push(`TTL: ${toTextOrDefault(metrics.ttl)}`);

    const samples = Array.isArray(ping?.samples) ? ping.samples : [];
    if (samples.length > 0) {
      samples.slice(0, PING_SAMPLE_LIMIT).forEach((sample, index) => {
        const host = toPlainText(sample?.host || sample?.address || metrics.host);
        const status = toPlainText(sample?.status || sample?.result);
        const time = toPlainText(sample?.time);
        const ttl = toPlainText(sample?.ttl);

        const parts = [
          host ? `host ${host}` : "",
          status ? `estado ${status}` : "",
          time ? `tiempo ${time}` : "",
          ttl ? `ttl ${ttl}` : "",
        ].filter(Boolean);

        if (parts.length > 0) {
          lines.push(`Muestra ${index + 1}: ${parts.join(" · ")}`);
        }
      });
    }

    if (interpretedStepStatus.status === "ALERTA") {
      if (pingHealth === PING_HEALTH.DOWN) {
        lines.push("Interpretación: Sin respuesta del host (pérdida total)");
      } else {
        lines.push("Interpretación: Conectividad inestable (pérdida parcial)");
      }
    }
  }

  return { stepStatus: interpretedStepStatus, lines };
}

function getTorchSection(torch) {
  const totals = isObject(torch?.totals) ? torch.totals : {};
  const torchState = resolveTorchTrafficState(torch);
  const error = getErrorValue(torch);
  let stepStatus;

  if (error) {
    stepStatus = { status: "ERROR", errorText: error };
  } else if (torchState === TORCH_TRAFFIC_STATE.TRAFFIC) {
    stepStatus = { status: "OK", errorText: "" };
  } else if (torchState === TORCH_TRAFFIC_STATE.IDLE) {
    stepStatus = { status: "ALERTA", errorText: "" };
  } else {
    stepStatus = { status: "SIN DATOS", errorText: "" };
  }

  const lines = [buildStepHeader("Torch", stepStatus)];
  if (stepStatus.status === "OK" || stepStatus.status === "ALERTA") {
    lines.push(
      `Total TX/RX: ${toTextOrDefault(totals.tx)} / ${toTextOrDefault(totals.rx)}`,
    );
    lines.push(
      `Paquetes TX/RX: ${toTextOrDefault(totals.txPackets)} / ${toTextOrDefault(totals.rxPackets)}`,
    );
    lines.push(
      `Flujo principal: ${toTextOrDefault(getTopTorchFlow(torch?.flows))}`,
    );
    if (stepStatus.status === "ALERTA") {
      lines.push(
        [
          "Interpretación: La captura de Torch se ejecutó,",
          "pero no detectó flujo utilizable durante la ventana de muestreo",
        ].join(" "),
      );
      lines.push(
        "Recomendación: Abrir Torch en vivo para validar actividad en ese momento",
      );
    }
  }

  return { stepStatus, lines };
}

function getWeeklySection(weeklyTraffic) {
  const weeklySummary = summarizeWeeklyTraffic(weeklyTraffic);
  const stepStatus = resolveStepStatus({
    hasData: Boolean(weeklySummary),
    error: getErrorValue(weeklyTraffic),
  });

  const lines = [buildStepHeader("Tráfico semanal", stepStatus)];
  if (stepStatus.status === "OK" && weeklySummary) {
    lines.push(`Registros analizados: ${weeklySummary.rows.length}`);
    lines.push(`Descarga total: ${formatBytes(weeklySummary.downloadTotal)}`);
    lines.push(`Subida total: ${formatBytes(weeklySummary.uploadTotal)}`);
    lines.push(
      `Día pico descarga: ${weeklySummary.peakDay} (${weeklySummary.peakDownloadRaw})`,
    );

    const noUsageDetected =
      weeklySummary.downloadTotal <= 0 && weeklySummary.uploadTotal <= 0;
    if (noUsageDetected) {
      lines.push(
        "Interpretación: El reporte semanal respondió correctamente, pero no registró consumo en el periodo",
      );
    }
  }

  return { stepStatus, lines };
}

function getServiceHealthSection(serviceHealth, clientContext) {
  const accountStatus = toPlainText(
    serviceHealth?.accountStatus || clientContext.accountStatus,
  );
  const pendingBalance = toPlainText(
    serviceHealth?.pendingBalance || clientContext.pendingBalance,
  );
  const issues = Array.isArray(serviceHealth?.issues)
    ? serviceHealth.issues.map((item) => toPlainText(item)).filter(Boolean)
    : [];
  const hasWarnings = Boolean(serviceHealth?.hasWarnings || issues.length > 0);
  const error = getErrorValue(serviceHealth);

  let stepStatus;
  if (error) {
    stepStatus = { status: "ERROR", errorText: error };
  } else if (hasWarnings) {
    stepStatus = { status: "ALERTA", errorText: "" };
  } else if (accountStatus || pendingBalance) {
    stepStatus = { status: "OK", errorText: "" };
  } else {
    stepStatus = { status: "SIN DATOS", errorText: "" };
  }

  const lines = [buildStepHeader("Estado de cuenta", stepStatus)];
  if (stepStatus.status !== "ERROR") {
    lines.push(`Estado del servicio: ${toTextOrDefault(accountStatus)}`);
    lines.push(`Saldo pendiente: ${toTextOrDefault(pendingBalance)}`);
    if (issues.length > 0) {
      lines.push(`Observaciones: ${issues.join(" | ")}`);
    }
  }

  return { stepStatus, lines };
}

export function buildDiagnosticSummary(input = {}) {
  const clientContext = getClientContext(input);
  const pingSection = getPingSection(input.ping);
  const torchSection = getTorchSection(input.torch);
  const weeklySection = getWeeklySection(input.weeklyTraffic);
  const serviceHealthSection = getServiceHealthSection(
    input.serviceHealth,
    clientContext,
  );
  const overallStatus = resolveOverallStatus([
    pingSection.stepStatus,
    torchSection.stepStatus,
    weeklySection.stepStatus,
    serviceHealthSection.stepStatus,
  ]);

  const lines = [
    "Diagnóstico Express",
    `Estado general: ${overallStatus}`,
    `Fecha: ${formatGeneratedAt(input.generatedAt)}`,
    "",
    `Cliente: ${toTextOrDefault(getClientDisplayName(clientContext))}`,
    `Servicio: ${toTextOrDefault(clientContext.serviceSlug)} (ID: ${toTextOrDefault(clientContext.serviceId)})`,
    `IP servicio: ${toTextOrDefault(clientContext.ip)}`,
    `Plan: ${toTextOrDefault(clientContext.plan)}`,
    `Router: ${toTextOrDefault(clientContext.router)}`,
    "",
    ...pingSection.lines,
    "",
    ...torchSection.lines,
    "",
    ...weeklySection.lines,
    "",
    ...serviceHealthSection.lines,
  ];

  const quickLinks = buildQuickLinks(clientContext);
  if (quickLinks.length > 0) {
    lines.push("", "Enlaces rápidos:", ...quickLinks);
  }

  return lines.map((line) => toPlainText(line)).join("\n");
}

export const __testables__ = {
  parseDataAmountToBytes,
  summarizeWeeklyTraffic,
  formatBytes,
  resolveOverallStatus,
};
