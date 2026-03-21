import { normalizeText } from "../../../utils/tableHelpers.js";
import { CLIENTS_UI_MESSAGES } from "../../../config/messages.js";
import { extractClientContextFromContainer } from "./clientContext.js";
import {
  fetchPingPageContext,
  fetchTorchPageContext,
  fetchWeeklyTraffic,
  runPingSample,
  runTorchSnapshot,
} from "./sessionApi.js";
import { buildDiagnosticSummary } from "./summaryBuilder.js";
import {
  parsePacketLossPercentage,
  PING_HEALTH,
  resolvePingHealth,
} from "./pingQuality.js";
import {
  resolveTorchTrafficState,
  TORCH_TRAFFIC_STATE,
} from "./torchQuality.js";

const DIAGNOSTIC_STEPS = Object.freeze([
  { id: "ping", label: "Ping" },
  { id: "torch", label: "Torch" },
  { id: "weeklyTraffic", label: "Tráfico semanal" },
  { id: "serviceHealth", label: "Estado de cuenta" },
]);

const INACTIVE_SERVICE_STATUS_KEYWORDS = Object.freeze([
  "cancelado",
  "cancelada",
  "suspendido",
  "suspendida",
  "desactivado",
  "desactivada",
  "inactivo",
  "inactiva",
  "baja",
  "bloqueado",
  "cortado",
  "moroso",
]);

function toErrorMessage(error) {
  if (error instanceof Error) {
    return normalizeText(error.message);
  }
  return normalizeText(error);
}

function toLowerText(value) {
  return normalizeText(value).toLowerCase();
}

function hasNonEmptyValue(value) {
  return Boolean(normalizeText(value));
}

function parseBalance(value) {
  const raw = normalizeText(value);
  if (!raw) {
    return Number.NaN;
  }

  const compact = raw.replace(/\s/g, "").replace(/[^\d,.-]/g, "");
  if (!compact) {
    return Number.NaN;
  }

  let normalized = compact;
  if (compact.includes(",") && compact.includes(".")) {
    normalized = compact.replace(/,/g, "");
  } else if (compact.includes(",") && !compact.includes(".")) {
    normalized = compact.replace(/,/g, ".");
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function hasPingData(ping) {
  if (!ping || typeof ping !== "object") {
    return false;
  }

  const metrics = ping.metrics || {};
  const hasMetrics = Object.values(metrics).some(hasNonEmptyValue);
  const hasSamples = Array.isArray(ping.samples) && ping.samples.length > 0;
  return hasMetrics || hasSamples;
}

function hasTorchData(torch) {
  return resolveTorchTrafficState(torch) === TORCH_TRAFFIC_STATE.TRAFFIC;
}

function hasWeeklyTrafficData(weeklyTraffic) {
  if (!weeklyTraffic || typeof weeklyTraffic !== "object") {
    return false;
  }

  if (!Array.isArray(weeklyTraffic.rows)) {
    return false;
  }

  const rows = weeklyTraffic.rows.filter((row) => Array.isArray(row));
  if (rows.length === 0) {
    return false;
  }

  const firstCell = normalizeText(rows[0]?.[0]).toLowerCase();
  const hasHeader = firstCell === "dia" || firstCell === "día";
  return hasHeader ? rows.length > 1 : rows.length > 0;
}

function buildServiceHealthSnapshot(clientContext = {}) {
  const accountStatus = normalizeText(clientContext.accountStatus);
  const pendingBalance = normalizeText(clientContext.pendingBalance);
  const issues = [];

  if (!accountStatus) {
    issues.push("Estado de servicio no disponible");
  } else {
    const normalizedStatus = toLowerText(accountStatus);
    const hasInactiveState = INACTIVE_SERVICE_STATUS_KEYWORDS.some((keyword) =>
      normalizedStatus.includes(keyword),
    );
    if (hasInactiveState) {
      issues.push(`Servicio con estado ${normalizedStatus}`);
    }
  }

  const numericBalance = parseBalance(pendingBalance);
  if (Number.isFinite(numericBalance) && numericBalance > 0) {
    issues.push(`Saldo pendiente detectado: ${pendingBalance}`);
  }

  return {
    accountStatus,
    pendingBalance,
    issues,
    hasWarnings: issues.length > 0,
  };
}

function getStepSeverity(stepId, stepResult) {
  if (hasError(stepResult)) {
    return "error";
  }

  if (stepId === "ping") {
    if (!hasPingData(stepResult)) {
      return "warning";
    }

    const packetLoss = parsePacketLossPercentage(stepResult?.metrics?.packetLoss);
    const pingHealth = resolvePingHealth(packetLoss);
    return pingHealth === PING_HEALTH.HEALTHY ? "ok" : "warning";
  }
  if (stepId === "torch") {
    return hasTorchData(stepResult) ? "ok" : "warning";
  }
  if (stepId === "weeklyTraffic") {
    return hasWeeklyTrafficData(stepResult) ? "ok" : "warning";
  }
  if (stepId === "serviceHealth") {
    return stepResult?.hasWarnings ? "warning" : "ok";
  }

  return "warning";
}

export function isDiagnosticAbortError(error) {
  if (!(error instanceof Error)) {
    return false;
  }
  if (error.name === "AbortError") {
    return true;
  }

  const message = normalizeText(error.message).toLowerCase();
  return message.includes("aborted") || message.includes("cancelled");
}

export function normalizeDiagnosticErrorMessage(error) {
  const raw = toErrorMessage(error);
  if (!raw) {
    return CLIENTS_UI_MESSAGES.DIAGNOSTIC_RUN_FAILED;
  }

  if (raw.includes(CLIENTS_UI_MESSAGES.DIAGNOSTIC_CONTEXT_MISSING)) {
    return CLIENTS_UI_MESSAGES.DIAGNOSTIC_CONTEXT_MISSING;
  }

  if (/\b401\b/.test(raw)) {
    return CLIENTS_UI_MESSAGES.DIAGNOSTIC_AUTH_REQUIRED;
  }

  if (/\b403\b/.test(raw)) {
    return CLIENTS_UI_MESSAGES.DIAGNOSTIC_FORBIDDEN;
  }

  if (/timed out/i.test(raw)) {
    return CLIENTS_UI_MESSAGES.DIAGNOSTIC_TIMEOUT;
  }

  if (/aborted|cancelled/i.test(raw)) {
    return CLIENTS_UI_MESSAGES.DIAGNOSTIC_CANCELLED;
  }

  if (/task\s+.+\s+failed/i.test(raw)) {
    return CLIENTS_UI_MESSAGES.DIAGNOSTIC_TASK_FAILED;
  }

  if (
    /Missing .* context fields|did not provide task_id|Invalid JSON|invalid diagnostic context/i.test(
      raw,
    )
  ) {
    return CLIENTS_UI_MESSAGES.DIAGNOSTIC_PARSE_FAILED;
  }

  return CLIENTS_UI_MESSAGES.DIAGNOSTIC_RUN_FAILED;
}

async function runSafeStep(stepRunner) {
  try {
    return await stepRunner();
  } catch (error) {
    if (isDiagnosticAbortError(error)) {
      throw error;
    }
    const detail = toErrorMessage(error);
    const errorMessage = normalizeDiagnosticErrorMessage(detail);
    if (detail && detail !== errorMessage) {
      return { error: errorMessage, detail };
    }
    return { error: errorMessage };
  }
}

function getClientServiceContext(clientContext) {
  const serviceSlug = normalizeText(clientContext?.serviceSlug);
  const serviceId = normalizeText(clientContext?.serviceId);
  if (!serviceSlug || !serviceId) {
    throw new Error(CLIENTS_UI_MESSAGES.DIAGNOSTIC_CONTEXT_MISSING);
  }
  return { serviceSlug, serviceId };
}

function getSessionOptions(options = {}) {
  const {
    fetchImpl,
    requestInit,
    timeoutMs,
    intervalMs,
    sleepFn,
    nowFn,
    pingAttempts,
    torchSamplesPerAttempt,
    torchSampleDelayMs,
    signal,
  } = options;

  const resolvedTorchSamplesPerAttempt = Number.isFinite(
    torchSamplesPerAttempt,
  )
    ? Math.max(1, Math.floor(torchSamplesPerAttempt))
    : 3;
  const resolvedTorchSampleDelayMs = Number.isFinite(torchSampleDelayMs)
    ? Math.max(1, Math.floor(torchSampleDelayMs))
    : 700;

  return {
    fetchImpl,
    requestInit,
    timeoutMs,
    intervalMs,
    sleepFn,
    nowFn,
    pingAttempts,
    torchSamplesPerAttempt: resolvedTorchSamplesPerAttempt,
    torchSampleDelayMs: resolvedTorchSampleDelayMs,
    signal,
  };
}

function hasError(stepResult) {
  return Boolean(normalizeText(stepResult?.error));
}

function emitProgress(options, payload) {
  if (typeof options?.onProgress !== "function") {
    return;
  }
  options.onProgress(payload);
}

function ensureNotAborted(signal) {
  if (!signal?.aborted) {
    return;
  }

  const abortedError = new Error(CLIENTS_UI_MESSAGES.DIAGNOSTIC_CANCELLED);
  abortedError.name = "AbortError";
  throw abortedError;
}

export function resolveOverallStatus(stepResults) {
  const steps = DIAGNOSTIC_STEPS.map((step) =>
    getStepSeverity(step.id, stepResults[step.id]),
  );
  const okCount = steps.filter((severity) => severity === "ok").length;
  const errorCount = steps.filter((severity) => severity === "error").length;
  const warningCount = steps.filter((severity) => severity === "warning").length;

  if (errorCount > 0 && okCount === 0) {
    return "ERROR";
  }
  if (errorCount > 0 || warningCount > 0) {
    return "PARCIAL";
  }
  return "COMPLETO";
}

export function buildDiagnosticOutcomeNotification(overallStatus) {
  const normalizedStatus = normalizeText(overallStatus).toUpperCase();
  if (normalizedStatus === "ERROR") {
    return {
      message: CLIENTS_UI_MESSAGES.DIAGNOSTIC_COMPLETED_ERROR,
      type: "error",
      duration: 4500,
    };
  }

  if (normalizedStatus === "PARCIAL") {
    return {
      message: CLIENTS_UI_MESSAGES.DIAGNOSTIC_COMPLETED_PARTIAL,
      type: "warning",
      duration: 4200,
    };
  }

  return {
    message: CLIENTS_UI_MESSAGES.DIAGNOSTIC_COMPLETED,
    type: "success",
    duration: 3200,
  };
}

function hasRequiredServiceContext(clientContext) {
  const serviceSlug = normalizeText(clientContext?.serviceSlug);
  const serviceId = normalizeText(clientContext?.serviceId);
  return Boolean(serviceSlug && serviceId);
}

export function hasValidClientServiceContext(clientContext) {
  return hasRequiredServiceContext(clientContext);
}

export async function runClientDiagnosticForContext(clientContext, options = {}) {
  const { serviceSlug, serviceId } = getClientServiceContext(clientContext);
  const sessionOptions = getSessionOptions(options);
  const pingAttempts = Number.isFinite(options.pingAttempts)
    ? options.pingAttempts
    : 4;
  const totalSteps = DIAGNOSTIC_STEPS.length;
  const { signal } = options;

  ensureNotAborted(signal);

  emitProgress(options, {
    type: "started",
    totalSteps,
    clientContext,
  });

  const runStep = async (stepConfig, stepRunner) => {
    ensureNotAborted(signal);
    emitProgress(options, {
      type: "step-started",
      stepId: stepConfig.id,
      stepLabel: stepConfig.label,
      totalSteps,
    });

    const stepResult = await runSafeStep(stepRunner);
    const severity = getStepSeverity(stepConfig.id, stepResult);
    const eventType =
      severity === "error"
        ? "step-error"
        : severity === "warning"
          ? "step-warning"
          : "step-completed";

    emitProgress(options, {
      type: eventType,
      stepId: stepConfig.id,
      stepLabel: stepConfig.label,
      totalSteps,
      stepResult,
      severity,
    });

    ensureNotAborted(signal);
    return stepResult;
  };

  try {
    const ping = await runStep(DIAGNOSTIC_STEPS[0], async () => {
      const pageContext = await fetchPingPageContext(
        serviceSlug,
        serviceId,
        sessionOptions,
      );
      return runPingSample(pageContext, pingAttempts, {
        ...sessionOptions,
        pingExpandSamples: true,
        pingSampleTarget: pingAttempts,
      });
    });

    const torch = await runStep(DIAGNOSTIC_STEPS[1], async () => {
      const pageContext = await fetchTorchPageContext(
        serviceSlug,
        serviceId,
        sessionOptions,
      );
      return runTorchSnapshot(pageContext, sessionOptions);
    });

    const weeklyTraffic = await runStep(DIAGNOSTIC_STEPS[2], () =>
      fetchWeeklyTraffic(serviceSlug, serviceId, sessionOptions),
    );

    const serviceHealth = await runStep(
      DIAGNOSTIC_STEPS[3],
      async () => buildServiceHealthSnapshot(clientContext),
    );

    const summary = buildDiagnosticSummary({
      generatedAt: options.generatedAt,
      clientContext,
      ping,
      torch,
      weeklyTraffic,
      serviceHealth,
    });
    const overallStatus = resolveOverallStatus({
      ping,
      torch,
      weeklyTraffic,
      serviceHealth,
    });
    emitProgress(options, {
      type: "completed",
      totalSteps,
      overallStatus,
    });

    return {
      summary,
      overallStatus,
      clientContext,
      ping,
      torch,
      weeklyTraffic,
      serviceHealth,
    };
  } catch (error) {
    if (isDiagnosticAbortError(error)) {
      emitProgress(options, {
        type: "cancelled",
        totalSteps,
      });
    }
    throw error;
  }
}

export async function runClientDiagnosticForContainer(container, options = {}) {
  const clientContext = extractClientContextFromContainer(container);
  return runClientDiagnosticForContext(clientContext, options);
}

export const __testables__ = {
  normalizeDiagnosticErrorMessage,
  resolveOverallStatus,
  buildDiagnosticOutcomeNotification,
};
