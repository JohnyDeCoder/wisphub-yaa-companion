import { sendLogToPopup } from "../../utils/logger.js";
import { applyHostTooltip } from "../../utils/hostTooltip.js";
import { decorateActionButtonGroup } from "../../utils/actionButtons.js";
import { waitForElement } from "../../utils/polling.js";

const SPECIAL_TICKETS = [
  { id: 5059, label: "Mantenimiento General", description: "VALOR 3" },
  { id: 8751, label: "Ir a Sitio", description: "VALOR 2,5" },
  { id: 8752, label: "Sitio Día Completo", description: "VALOR 4" },
];

const BUTTON_CLASS = "wisphub-yaa-special-ticket-btn";
const DROPDOWN_CLASS = "wisphub-yaa-special-ticket-dropdown";
const BACKDROP_CLASS = "wisphub-yaa-special-ticket-backdrop";
const ACTION_BAR_SELECTOR = ".btn-group.new-buttons";

const TICKETS_PATH_RE = /\/tickets\/(ver\/\d+|(\d*\/?))$/i;
const CLIENTS_PATH_RE = /\/clientes\/(ver\/[^/]+)?\/?$/i;

function log(consoleMsg, popupMsg, level = "info") {
  sendLogToPopup("SpecialTickets", level, consoleMsg, popupMsg);
}

function buildSpecialTicketUrl(specialTicketId) {
  return `/tickets/agregar/${specialTicketId}/`;
}

function closeDropdown() {
  const dropdown = document.querySelector(`.${DROPDOWN_CLASS}`);
  const backdrop = document.querySelector(`.${BACKDROP_CLASS}`);
  if (dropdown) {
    dropdown.remove();
  }
  if (backdrop) {
    backdrop.remove();
  }
}

function showDropdown(button) {
  closeDropdown();

  const backdrop = document.createElement("div");
  backdrop.className = BACKDROP_CLASS;
  backdrop.addEventListener("click", closeDropdown);
  document.body.appendChild(backdrop);

  const dropdown = document.createElement("ul");
  dropdown.className = `${DROPDOWN_CLASS} dt-button-collection dropdown-menu`;
  dropdown.style.display = "block";

  SPECIAL_TICKETS.forEach((ticket) => {
    const li = document.createElement("li");
    li.className = "dt-button";

    const link = document.createElement("a");
    link.href = buildSpecialTicketUrl(ticket.id);
    link.textContent = ticket.label.toUpperCase();

    link.addEventListener("click", () => {
      closeDropdown();
      log(
        `Special ticket: ${ticket.label} (${ticket.id})`,
        `Ticket especial: ${ticket.label}`,
      );
    });

    li.appendChild(link);
    dropdown.appendChild(li);
  });

  const rect = button.getBoundingClientRect();
  dropdown.style.position = "absolute";
  dropdown.style.top = `${rect.bottom + window.scrollY}px`;
  dropdown.style.left = `${rect.left + window.scrollX}px`;
  document.body.appendChild(dropdown);
}

function createSpecialTicketButton() {
  const button = document.createElement("a");
  button.className = `wisphub-yaa-action-btn wisphub-yaa-action-btn-special-ticket ${BUTTON_CLASS}`;
  button.href = "";
  button.setAttribute("role", "button");
  applyHostTooltip(button, "Crear ticket especial", { placement: "top" });

  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    showDropdown(button);
  });

  return button;
}

function isSupportedPage() {
  const path = window.location.pathname;
  return TICKETS_PATH_RE.test(path) || CLIENTS_PATH_RE.test(path);
}

export function initSpecialTickets() {
  if (!isSupportedPage()) {
    return;
  }

  waitForElement(ACTION_BAR_SELECTOR).then((btnGroup) => {
    if (!btnGroup || document.querySelector(`.${BUTTON_CLASS}`)) {
      return;
    }

    const button = createSpecialTicketButton();
    btnGroup.appendChild(button);
    decorateActionButtonGroup(btnGroup);

    log("Special ticket button added", "Botón de ticket especial añadido");
  });
}

export { SPECIAL_TICKETS };
