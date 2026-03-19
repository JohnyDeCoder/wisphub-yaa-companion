import { setApiKeyWarningVisible } from "../../../src/app/popup/components/apiKeyWarning.js";

function createContainer() {
  document.body.innerHTML = `
    <section id="popup-root">
      <div id="staffInfo"></div>
      <div id="tail"></div>
    </section>
  `;

  return {
    container: document.getElementById("popup-root"),
    staffInfo: document.getElementById("staffInfo"),
  };
}

describe("setApiKeyWarningVisible", () => {
  it("adds a single warning badge and avoids duplicates", () => {
    const { container, staffInfo } = createContainer();

    setApiKeyWarningVisible(staffInfo, true, "API Keys no configuradas");
    setApiKeyWarningVisible(staffInfo, true, "API Keys no configuradas");

    const badges = container.querySelectorAll(".wisphub-yaa-api-warning");
    expect(badges).toHaveLength(1);
    expect(badges[0].textContent).toBe("API Keys no configuradas");
  });

  it("removes all warning badges when visibility is disabled", () => {
    const { container, staffInfo } = createContainer();

    setApiKeyWarningVisible(staffInfo, true, "API Keys no configuradas");
    setApiKeyWarningVisible(staffInfo, false, "API Keys no configuradas");

    expect(container.querySelectorAll(".wisphub-yaa-api-warning")).toHaveLength(0);
  });

  it("deduplicates pre-existing repeated badges", () => {
    const { container, staffInfo } = createContainer();

    for (let i = 0; i < 3; i++) {
      const badge = document.createElement("span");
      badge.className = "wisphub-yaa-api-warning";
      badge.textContent = `Dup ${i}`;
      container.appendChild(badge);
    }

    setApiKeyWarningVisible(staffInfo, true, "API Keys no configuradas");

    expect(container.querySelectorAll(".wisphub-yaa-api-warning")).toHaveLength(1);
  });

  it("is safe when staff info element is missing", () => {
    expect(() =>
      setApiKeyWarningVisible(null, true, "API Keys no configuradas"),
    ).not.toThrow();
  });
});
