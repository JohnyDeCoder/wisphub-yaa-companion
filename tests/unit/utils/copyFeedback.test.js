import { vi } from "vitest";
import { showCopySuccess } from "../../../src/utils/copyFeedback.js";

describe("copyFeedback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("applies temporary disabled attributes while copied feedback is active", () => {
    const button = document.createElement("a");
    button.title = "Copiar";
    document.body.appendChild(button);

    showCopySuccess(button);

    expect(button.classList.contains("wisphub-yaa-action-btn-copied")).toBe(true);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.getAttribute("data-disabled")).toBe("true");
    expect(button.title).toBe("Copiado");

    vi.advanceTimersByTime(2000);

    expect(button.classList.contains("wisphub-yaa-action-btn-copied")).toBe(false);
    expect(button.hasAttribute("aria-disabled")).toBe(false);
    expect(button.hasAttribute("data-disabled")).toBe(false);
    expect(button.title).toBe("Copiar");
  });

  it("restores previous disabled attributes after copy feedback finishes", () => {
    const button = document.createElement("a");
    button.setAttribute("aria-disabled", "false");
    button.setAttribute("data-disabled", "custom-state");
    document.body.appendChild(button);

    showCopySuccess(button);

    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.getAttribute("data-disabled")).toBe("true");

    vi.advanceTimersByTime(2000);

    expect(button.getAttribute("aria-disabled")).toBe("false");
    expect(button.getAttribute("data-disabled")).toBe("custom-state");
  });
});
