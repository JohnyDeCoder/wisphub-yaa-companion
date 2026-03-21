import { CLIENTS_UI_MESSAGES } from "../../../config/messages.js";
import {
  extractClientContextFromContainer,
  sanitizeClientContext,
} from "./clientContext.js";
import { openDiagnosticModal } from "./diagnosticModal.js";
import {
  isDiagnosticAbortError,
  normalizeDiagnosticErrorMessage,
  runClientDiagnosticForContext,
} from "./diagnosticRunner.js";

let activeDiagnosticPromise = null;
const DIAGNOSTIC_RUNNING_EVENT = "wisphub-yaa:diagnostic-running";

function emitRunningState(running) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(DIAGNOSTIC_RUNNING_EVENT, {
      detail: {
        running: Boolean(running),
      },
    }),
  );
}

function buildProgressRelay(viewer, options = {}) {
  const externalProgress = options.onProgress;
  return (event) => {
    viewer.updateProgress(event);
    if (typeof externalProgress === "function") {
      externalProgress(event);
    }
  };
}

async function runDiagnosticFlow(clientContext, options = {}) {
  if (activeDiagnosticPromise) {
    throw new Error(CLIENTS_UI_MESSAGES.DIAGNOSTIC_ALREADY_RUNNING);
  }

  const safeContext = sanitizeClientContext(clientContext);
  const abortController = new AbortController();
  let cancelledByUser = false;
  const viewer = openDiagnosticModal(safeContext, {
    onRequestClose: () => {
      cancelledByUser = true;
      if (!abortController.signal.aborted) {
        abortController.abort();
      }
    },
    onRetry: () => {
      if (activeDiagnosticPromise) {
        return;
      }
      runDiagnosticFlow(safeContext, options).catch(() => {
        // Modal already handles flow errors.
      });
    },
  });
  const progressRelay = buildProgressRelay(viewer, options);

  const execution = (async () => {
    try {
      const result = await runClientDiagnosticForContext(safeContext, {
        ...options,
        onProgress: progressRelay,
        signal: abortController.signal,
      });
      viewer.showResult(result);
      return result;
    } catch (error) {
      if (isDiagnosticAbortError(error)) {
        if (!cancelledByUser) {
          viewer.showCancelled();
        }
        throw error;
      }
      const errorMessage = normalizeDiagnosticErrorMessage(error);
      viewer.showError(errorMessage);
      throw error;
    }
  })();

  activeDiagnosticPromise = execution;
  emitRunningState(true);
  try {
    return await execution;
  } finally {
    activeDiagnosticPromise = null;
    emitRunningState(false);
  }
}

export function isDiagnosticFlowRunning() {
  return Boolean(activeDiagnosticPromise);
}

export function runDiagnosticFlowForContainer(container, options = {}) {
  const clientContext = extractClientContextFromContainer(container);
  return runDiagnosticFlow(clientContext, options);
}

export function runDiagnosticFlowForContext(clientContext, options = {}) {
  return runDiagnosticFlow(clientContext, options);
}
