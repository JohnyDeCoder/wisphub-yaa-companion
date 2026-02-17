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
    for (const change of latest.changes) {
      const li = document.createElement("li");
      li.textContent = change;
      list.appendChild(li);
    }
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
