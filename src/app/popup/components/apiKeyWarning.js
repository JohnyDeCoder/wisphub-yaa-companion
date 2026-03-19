export function setApiKeyWarningVisible(staffInfoElement, visible, message) {
  if (!staffInfoElement) {
    return;
  }

  const container = staffInfoElement.parentElement;
  if (!container) {
    return;
  }

  const badges = Array.from(
    container.querySelectorAll(".wisphub-yaa-api-warning"),
  ).filter((node) => node.parentElement === container);

  if (!visible) {
    badges.forEach((badge) => badge.remove());
    return;
  }

  if (badges.length > 0) {
    badges.slice(1).forEach((badge) => badge.remove());
    return;
  }

  const badge = document.createElement("span");
  badge.className = "wisphub-yaa-api-warning";
  badge.textContent = message;
  container.insertBefore(badge, staffInfoElement.nextSibling);
}
