import { COPY_CONTROL_CLASS } from "../../../config/constants.js";
import { CLIENTS_UI_MESSAGES } from "../../../config/messages.js";
import { applyHostTooltip } from "../../../utils/hostTooltip.js";
import { runDiagnosticFlowForContainer } from "./diagnosticFlow.js";

const RUNNING_ATTRIBUTE = "data-wisphub-diagnostic-running";

function setButtonRunningState(button, isRunning) {
  if (!button) {
    return;
  }

  if (isRunning) {
    button.setAttribute(RUNNING_ATTRIBUTE, "1");
    button.setAttribute("aria-disabled", "true");
    button.setAttribute("data-disabled", "true");
    return;
  }

  button.removeAttribute(RUNNING_ATTRIBUTE);
  button.removeAttribute("aria-disabled");
  button.removeAttribute("data-disabled");
}

function isButtonRunning(button) {
  return button?.getAttribute(RUNNING_ATTRIBUTE) === "1";
}

async function handleDiagnosticRun(button, options = {}) {
  if (isButtonRunning(button)) {
    return;
  }

  setButtonRunningState(button, true);

  try {
    await runDiagnosticFlowForContainer(button, options);
  } catch {
    // Flow module already reports the error in the modal.
  } finally {
    setButtonRunningState(button, false);
  }
}

export function createDiagnosticActionButton({ options = {} } = {}) {
  const button = document.createElement("a");
  button.href = "#";
  button.className = [
    "wisphub-yaa-action-btn",
    "wisphub-yaa-action-btn-diagnostic",
    COPY_CONTROL_CLASS,
  ].join(" ");
  button.setAttribute("role", "button");
  button.setAttribute("aria-label", CLIENTS_UI_MESSAGES.DIAGNOSTIC_TOOLTIP);
  applyHostTooltip(button, CLIENTS_UI_MESSAGES.DIAGNOSTIC_TOOLTIP, {
    placement: "top",
  });

  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    await handleDiagnosticRun(button, options);
  });

  return button;
}
