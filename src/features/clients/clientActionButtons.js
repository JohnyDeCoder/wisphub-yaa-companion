import { decorateActionButtonGroup } from "../../utils/actionButtons.js";
import { applyHostTooltip } from "../../utils/hostTooltip.js";

function bindMapActionClick(button, mapActionBoundAttribute) {
  if (!button || button.getAttribute(mapActionBoundAttribute) === "1") {
    return;
  }
  button.setAttribute(mapActionBoundAttribute, "1");
  button.addEventListener("click", (event) => event.stopImmediatePropagation());
}

function createMapActionButton(mapUrl, mapActionBoundAttribute) {
  const mapButton = document.createElement("a");
  mapButton.className = "wisphub-yaa-action-btn wisphub-yaa-action-btn-map";
  mapButton.href = mapUrl;
  applyHostTooltip(mapButton, "Ver ubicación en Google Maps", {
    placement: "top",
  });
  bindMapActionClick(mapButton, mapActionBoundAttribute);
  return mapButton;
}

function ensureClientTemplateActionButton(container, config) {
  if (!config.isClientListPage()) {
    return false;
  }

  if (container.querySelector(`.${config.templateButtonClass}`)) {
    return false;
  }

  container.append(config.createTemplateCopyButton());
  return true;
}

function ensureClientDiagnosticActionButton(container, config) {
  if (!config.isClientListPage()) {
    return false;
  }

  if (
    !config.diagnosticButtonClass ||
    typeof config.createDiagnosticButton !== "function"
  ) {
    return false;
  }

  if (container.querySelector(`.${config.diagnosticButtonClass}`)) {
    return false;
  }

  container.append(config.createDiagnosticButton());
  return true;
}

export function getActionButtonContainer(container) {
  if (container?.matches?.(".text-right")) {
    return container;
  }
  return (
    container.querySelector(".text-right") ||
    container.querySelector("div") ||
    container
  );
}

function moveActionButtonToEnd(container, buttonClass) {
  if (!buttonClass) {
    return false;
  }

  const button = container.querySelector(`.${buttonClass}`);
  if (!button) {
    return false;
  }

  if (button !== container.lastElementChild) {
    container.appendChild(button);
    return true;
  }

  return false;
}

function moveButtonsToEndInOrder(container, buttonClasses = []) {
  const buttons = buttonClasses
    .map((buttonClass) => {
      if (!buttonClass) {
        return null;
      }
      return container.querySelector(`.${buttonClass}`);
    })
    .filter(Boolean);

  if (buttons.length === 0) {
    return false;
  }

  const children = Array.from(container.children);
  const trailing = children.slice(-buttons.length);
  const alreadyOrdered = trailing.every((node, index) => node === buttons[index]);
  if (alreadyOrdered) {
    return false;
  }

  buttons.forEach((button) => {
    container.appendChild(button);
  });
  return true;
}

function movePriorityActionButtonsToEnd(
  container,
  diagnosticButtonClass,
  templateButtonClass,
) {
  const hasTemplate = Boolean(container.querySelector(`.${templateButtonClass}`));
  if (hasTemplate) {
    return moveButtonsToEndInOrder(container, [
      diagnosticButtonClass,
      templateButtonClass,
    ]);
  }

  return moveActionButtonToEnd(container, "wisphub-yaa-action-btn-map");
}

function appendViewAndFilesButtons(buttonContainer, slug, skipViewClient) {
  let injected = false;

  if (!skipViewClient && slug) {
    const viewButton = document.createElement("a");
    viewButton.className = "wisphub-yaa-action-btn wisphub-yaa-action-btn-view";
    viewButton.href = `/clientes/ver/${slug}/`;
    applyHostTooltip(viewButton, "Ver cliente", { placement: "top" });
    viewButton.addEventListener("click", (event) =>
      event.stopImmediatePropagation(),
    );
    buttonContainer.append(viewButton);
    injected = true;
  }

  if (slug) {
    const filesButton = document.createElement("a");
    filesButton.className =
      "wisphub-yaa-action-btn wisphub-yaa-action-btn-files";
    filesButton.href = `/clientes/ver/${slug}/#retab6`;
    applyHostTooltip(filesButton, "Ver archivos", { placement: "top" });
    filesButton.addEventListener("click", (event) =>
      event.stopImmediatePropagation(),
    );
    buttonContainer.append(filesButton);
    injected = true;
  }

  return injected;
}

export function addOrUpdateClientActionButtons({
  container,
  options = {},
  config,
}) {
  const buttonContainer = getActionButtonContainer(container);
  const slug = config.extractSlug(container);
  const fallbackMapUrl =
    options.forceClientMapFallback && slug
      ? config.buildFallbackMapUrl(slug)
      : "";
  const resolvedMapUrl =
    options.mapUrl ||
    config.resolveMapUrl(container, options) ||
    fallbackMapUrl;

  if (container.hasAttribute(config.processedActionsAttribute)) {
    let changed = false;
    const currentMapButton = buttonContainer.querySelector(
      ".wisphub-yaa-action-btn-map",
    );

    if (resolvedMapUrl) {
      if (!currentMapButton) {
        buttonContainer.append(
          createMapActionButton(resolvedMapUrl, config.mapActionBoundAttribute),
        );
        changed = true;
      } else {
        bindMapActionClick(currentMapButton, config.mapActionBoundAttribute);
        const currentHref = currentMapButton.getAttribute("href") || "";
        if (currentHref !== resolvedMapUrl) {
          currentMapButton.href = resolvedMapUrl;
          changed = true;
        }
      }
    }

    if (ensureClientTemplateActionButton(buttonContainer, config)) {
      changed = true;
    }

    if (ensureClientDiagnosticActionButton(buttonContainer, config)) {
      changed = true;
    }

    const moved = movePriorityActionButtonsToEnd(
      buttonContainer,
      config.diagnosticButtonClass,
      config.templateButtonClass,
    );
    if (changed || moved) {
      decorateActionButtonGroup(buttonContainer);
      return true;
    }
    return false;
  }

  container.setAttribute(config.processedActionsAttribute, "1");
  if (!slug && !resolvedMapUrl) {
    return false;
  }

  let injected = appendViewAndFilesButtons(
    buttonContainer,
    slug,
    options.skipViewClient,
  );

  if (resolvedMapUrl) {
    buttonContainer.append(
      createMapActionButton(resolvedMapUrl, config.mapActionBoundAttribute),
    );
    injected = true;
  }

  if (ensureClientTemplateActionButton(buttonContainer, config)) {
    injected = true;
  }

  if (ensureClientDiagnosticActionButton(buttonContainer, config)) {
    injected = true;
  }

  if (!injected) {
    return false;
  }

  movePriorityActionButtonsToEnd(
    buttonContainer,
    config.diagnosticButtonClass,
    config.templateButtonClass,
  );
  decorateActionButtonGroup(buttonContainer);
  return true;
}
