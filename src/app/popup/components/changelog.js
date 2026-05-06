import CHANGELOG from "../changelog.json";

// KaC category order — matches keepachangelog.com/es-ES/1.1.0/
const CATEGORY_ORDER = [
  "Agregado",
  "Cambiado",
  "Obsoleto",
  "Eliminado",
  "Corregido",
  "Seguridad",
];

function renderCategoryGroup(cat, items) {
  const group = document.createElement("div");
  group.className = "changelog-category-group";

  const label = document.createElement("span");
  label.className = "changelog-category";
  label.textContent = cat;
  group.appendChild(label);

  const ul = document.createElement("ul");
  ul.className = "changelog-changes";
  items.forEach((change) => {
    const li = document.createElement("li");
    li.textContent = change;
    ul.appendChild(li);
  });
  group.appendChild(ul);

  return group;
}

export function renderChangelog(container) {
  if (!container) {
    return;
  }

  container.replaceChildren();
  const visible = CHANGELOG.slice(0, 2);

  visible.forEach((entry) => {
    const div = document.createElement("div");
    div.className = "changelog-entry";

    const header = document.createElement("div");
    header.className = "changelog-header";

    const version = document.createElement("span");
    version.className = "changelog-version";
    version.textContent = `v${entry.version}`;

    const date = document.createElement("span");
    date.className = "changelog-date";
    date.textContent = entry.date;

    header.append(version, date);
    div.appendChild(header);

    CATEGORY_ORDER.forEach((cat) => {
      const items = entry.categories?.[cat];
      if (!Array.isArray(items) || items.length === 0) {
        return;
      }
      div.appendChild(renderCategoryGroup(cat, items));
    });

    container.appendChild(div);
  });

  if (CHANGELOG.length > 2) {
    const link = document.createElement("a");
    link.className = "changelog-more-link";
    link.href =
      "https://raw.githubusercontent.com/JohnyDeCoder/wisphub-yaa-companion/refs/heads/master/CHANGELOG.md";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = `y ${CHANGELOG.length - 2} versiones más...`;
    container.appendChild(link);
  }
}
