// KaC category order — matches keepachangelog.com/es-ES/1.1.0/
const CATEGORY_ORDER = ["Agregado", "Cambiado", "Obsoleto", "Eliminado", "Corregido", "Seguridad"];

async function loadChangelog() {
  try {
    const response = await fetch("../popup/changelog.json");
    if (!response.ok) {
      throw new Error("Changelog not found");
    }
    const data = await response.json();
    const latest = data[0];
    if (!latest) {
      return;
    }

    document.getElementById("versionBadge").textContent = `v${latest.version}`;

    const list = document.getElementById("changesList");
    list.textContent = "";

    CATEGORY_ORDER.forEach((cat) => {
      const items = latest.categories?.[cat];
      if (!Array.isArray(items) || items.length === 0) {
        return;
      }

      const labelLi = document.createElement("li");
      labelLi.className = "modal-category-label";
      labelLi.textContent = cat;
      list.appendChild(labelLi);

      for (const change of items) {
        const li = document.createElement("li");
        li.textContent = change;
        list.appendChild(li);
      }
    });
  } catch {
    document.getElementById("versionBadge").textContent = "v--";
  }
}

function openModal() {
  document.getElementById("modalOverlay").classList.add("visible");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("visible");
}

document.getElementById("btnChangelog").addEventListener("click", openModal);
document.getElementById("btnClose").addEventListener("click", closeModal);
document
  .getElementById("btnGotIt")
  .addEventListener("click", () => window.close());
document
  .getElementById("btnDismiss")
  .addEventListener("click", () => window.close());

document.getElementById("modalOverlay").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) {
    closeModal();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
  }
});

document.addEventListener("DOMContentLoaded", loadChangelog);
