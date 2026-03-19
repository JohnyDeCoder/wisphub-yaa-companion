import { vi } from "vitest";
import { applyHostTooltip, formatBrandedTitle } from "../../../src/utils/hostTooltip.js";

function setupJQueryMock({ hasTooltipInstance = false } = {}) {
  const tooltipSpy = vi.fn();
  const dataSpy = vi.fn((key) => {
    if (key === "bs.tooltip" && hasTooltipInstance) {
      return {};
    }
    return undefined;
  });

  const elementApi = {
    data: dataSpy,
    tooltip: tooltipSpy,
  };

  const jQueryMock = vi.fn(() => elementApi);
  jQueryMock.fn = {
    tooltip: vi.fn(),
  };

  window.jQuery = jQueryMock;
  return { tooltipSpy };
}

describe("hostTooltip", () => {
  afterEach(() => {
    delete window.jQuery;
  });

  it("formats branded title with extension suffix", () => {
    expect(formatBrandedTitle("Copiar")).toMatch(/Copiar/);
    expect(formatBrandedTitle("")).toBeTruthy();
  });

  it("initializes tooltip plugin and tooltip attributes", () => {
    const { tooltipSpy } = setupJQueryMock();
    const button = document.createElement("button");
    document.body.appendChild(button);

    applyHostTooltip(button, "Copiar cliente", { placement: "left" });

    expect(button.getAttribute("data-toggle")).toBe("tooltip");
    expect(button.getAttribute("data-placement")).toBe("left");
    expect(button.getAttribute("data-container")).toBe("body");
    expect(button.title).toContain("Copiar cliente");
    expect(tooltipSpy).toHaveBeenCalledWith({
      container: "body",
      placement: "left",
      trigger: "hover focus",
    });
  });

  it("destroys old tooltip instance before re-initializing", () => {
    const { tooltipSpy } = setupJQueryMock({ hasTooltipInstance: true });
    const button = document.createElement("button");
    document.body.appendChild(button);

    applyHostTooltip(button, "Acción rápida");

    expect(tooltipSpy).toHaveBeenNthCalledWith(1, "destroy");
    expect(tooltipSpy).toHaveBeenNthCalledWith(2, {
      container: "body",
      placement: "top",
      trigger: "hover focus",
    });
  });

  it("hides tooltip on click and mouse leave", () => {
    const { tooltipSpy } = setupJQueryMock();
    const link = document.createElement("a");
    link.href = "#";
    document.body.appendChild(link);

    applyHostTooltip(link, "Ver cliente");
    tooltipSpy.mockClear();

    link.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(tooltipSpy).toHaveBeenCalledWith("hide");

    tooltipSpy.mockClear();
    link.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    expect(tooltipSpy).toHaveBeenCalledWith("hide");
  });

  it("binds dismiss handlers only once even if reapplied", () => {
    const { tooltipSpy } = setupJQueryMock();
    const button = document.createElement("button");
    document.body.appendChild(button);

    applyHostTooltip(button, "Copiar");
    applyHostTooltip(button, "Copiar");

    tooltipSpy.mockClear();
    button.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));

    const hideCalls = tooltipSpy.mock.calls.filter((args) => args[0] === "hide");
    expect(hideCalls).toHaveLength(1);
  });
});

