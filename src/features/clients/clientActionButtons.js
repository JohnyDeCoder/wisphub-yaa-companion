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

function movePriorityActionButtonToEnd(container, templateButtonClass) {
  const templateButton = container.querySelector(`.${templateButtonClass}`);
  if (templateButton && templateButton !== container.lastElementChild) {
    container.appendChild(templateButton);
    return true;
  }
  if (templateButton) {
    return false;
  }

  const mapButton = container.querySelector(".wisphub-yaa-action-btn-map");
  if (mapButton && mapButton !== container.lastElementChild) {
    container.appendChild(mapButton);
    return true;
  }

  return false;
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

    const moved = movePriorityActionButtonToEnd(
      buttonContainer,
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

  if (!injected) {
    return false;
  }

  movePriorityActionButtonToEnd(buttonContainer, config.templateButtonClass);
  decorateActionButtonGroup(buttonContainer);
  return true;
}
