import { sendLogToPopup } from "../../utils/logger.js";

const SPECIAL_TICKETS = [
  {
    id: 5059,
    label: "Mantenimiento General",
    description: "VALOR 2.5",
    domain: "wisphub.io",
  },
  {
    id: 8751,
    label: "Ir a Sitio",
    description: "VALOR 1.5",
    domain: "wisphub.io",
  },
  {
    id: 8752,
    label: "Sitio Día Completo",
    description: "VALOR 4",
    domain: "wisphub.io",
  },
  {
    id: 8712,
    label: "Servicio Antena Publica Claves",
    domain: "wisphub.io",
  },
  { id: 1000, label: "Mantenimiento AP Publicas", domain: "wisphub.app" },
  { id: 760, label: "Mantenimiento Publicas", domain: "wisphub.app" },
];

const NAV_ITEM_CLASS = "wisphub-yaa-special-ticket-nav";
const DROPDOWN_CLASS = "wisphub-yaa-special-ticket-dropdown";
const BACKDROP_CLASS = "wisphub-yaa-special-ticket-backdrop";

function log(consoleMsg, popupMsg, level = "info") {
  sendLogToPopup("SpecialTickets", level, consoleMsg, popupMsg);
}

function buildSpecialTicketUrl(ticket) {
  const path = `/tickets/agregar/${ticket.id}/`;
  if (ticket.domain) {
    return `https://${ticket.domain}${path}`;
  }
  return path;
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

function showDropdown(toggle) {
  closeDropdown();

  const backdrop = document.createElement("div");
  backdrop.className = BACKDROP_CLASS;
  backdrop.addEventListener("click", closeDropdown);
  document.body.appendChild(backdrop);

  const dropdown = document.createElement("ul");
  dropdown.className = `${DROPDOWN_CLASS} dropdown-menu`;
  dropdown.style.display = "block";

  SPECIAL_TICKETS.forEach((ticket) => {
    const li = document.createElement("li");

    const link = document.createElement("a");
    link.href = buildSpecialTicketUrl(ticket);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = ticket.label;
    if (ticket.description) {
      const badge = document.createElement("span");
      badge.className = "wisphub-yaa-ticket-badge";
      badge.textContent = ticket.description;
      link.appendChild(document.createTextNode(" "));
      link.appendChild(badge);
    }

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

  const rect = toggle.getBoundingClientRect();
  dropdown.style.position = "absolute";
  dropdown.style.top = `${rect.bottom + window.scrollY}px`;
  dropdown.style.left = `${rect.left + window.scrollX}px`;
  document.body.appendChild(dropdown);
}

function findNavbar() {
  return (
    document.querySelector(".menu-top ul.nav") ||
    document.querySelector(".navbar-nav") ||
    document.querySelector("ul.nav.navbar-nav")
  );
}

function findAyudaItem(navbar) {
  const items = navbar.querySelectorAll("li");
  for (const li of items) {
    const link = li.querySelector("#open-nav-ayuda, .open-nav-ayuda");
    if (link) {
      return li;
    }
  }
  return null;
}

function createNavDropdown() {
  const li = document.createElement("li");
  li.className = NAV_ITEM_CLASS;

  const toggle = document.createElement("a");
  toggle.href = "#";
  toggle.className = "wisphub-yaa-nav-special-tickets";

  const iconSpan = document.createElement("span");
  iconSpan.className = "wisphub-yaa-nav-icon";
  toggle.appendChild(iconSpan);
  toggle.appendChild(document.createTextNode(" Tickets Especiales"));

  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    showDropdown(toggle);
  });

  li.appendChild(toggle);
  return li;
}

export function initSpecialTickets() {
  if (document.querySelector(`.${NAV_ITEM_CLASS}`)) {
    return;
  }

  const navbar = findNavbar();
  if (!navbar) {
    log(
      "Navbar not found, skipping special tickets",
      "Navbar no encontrado",
      "warning",
    );
    return;
  }

  const navItem = createNavDropdown();
  const ayudaLi = findAyudaItem(navbar);

  if (ayudaLi) {
    navbar.insertBefore(navItem, ayudaLi);
  } else {
    navbar.appendChild(navItem);
  }

  log("Special ticket nav added", "Tickets especiales añadidos al navbar");
}

export { SPECIAL_TICKETS };
