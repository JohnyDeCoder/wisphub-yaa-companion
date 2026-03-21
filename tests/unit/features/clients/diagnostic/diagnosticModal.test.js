const copyToClipboardMock = vi.hoisted(() => vi.fn());

vi.mock("../../../../../src/utils/clipboard.js", () => ({
  copyToClipboard: copyToClipboardMock,
}));

import {
  __testables__,
  openDiagnosticModal,
} from "../../../../../src/features/clients/diagnostic/diagnosticModal.js";

describe("diagnosticModal", () => {
  afterEach(() => {
    copyToClipboardMock.mockReset();
    vi.useRealTimers();
    document.getElementById("wisphub-yaa-diagnostic-modal")?.remove();
  });

  it("formats weekly traffic detail using days and active-traffic count", () => {
    const detail = __testables__.formatWeeklyTrafficDetail({
      rows: [
        ["Dia", "Descarga", "Subida"],
        ["Lunes", "0 B", "0 B"],
        ["Martes", "120 MB", "0 B"],
        ["Miércoles", "0 B", "15 MB"],
      ],
    });

    expect(detail.value).toBe("3 día(s) revisados · 2 con tráfico");
    expect(detail.tone).toBe("success");
  });

  it("formats torch detail with explicit idle/traffic interpretation", () => {
    const idle = __testables__.formatTorchDetail({
      totals: {
        tx: "0.0 Kbps",
        rx: "0.0 Kbps",
      },
    });
    expect(idle.value).toContain("Sin tráfico detectado en la ventana");
    expect(idle.tone).toBe("warning");

    const active = __testables__.formatTorchDetail({
      totals: {
        tx: "0.0 Kbps",
        rx: "1.94 Kbps",
      },
    });
    expect(active.value).toContain("Tráfico detectado");
    expect(active.tone).toBe("success");
  });

  it("shows service status value without the 'Estado' prefix", () => {
    const detail = __testables__.formatServiceHealthDetail({
      accountStatus: "Activo",
      pendingBalance: "0.00",
      hasWarnings: false,
      issues: [],
    });

    expect(detail.value).toBe("Activo · Saldo 0.00");
    expect(detail.value).not.toContain("Estado ");
  });

  it("resets copy button automatically after successful copy without success toast text", async () => {
    vi.useFakeTimers();
    copyToClipboardMock.mockResolvedValue(true);

    const modal = openDiagnosticModal({
      serviceSlug: "0001@yaa-internet-by-vw",
      serviceId: "1",
      ip: "192.168.17.10",
    });

    modal.showResult({
      overallStatus: "COMPLETO",
      summary: "Diagnóstico Express\nEstado general: COMPLETO",
      clientContext: {},
      ping: {},
      torch: {},
      weeklyTraffic: {},
      serviceHealth: {},
    });

    const statusNode = document.querySelector(".wisphub-yaa-diagnostic-status");
    const copyButton = document.querySelector(".wisphub-yaa-diagnostic-copy");
    expect(copyButton).not.toBeNull();
    expect(copyButton.disabled).toBe(false);

    const statusBeforeCopy = statusNode.textContent;
    copyButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();

    expect(copyToClipboardMock).toHaveBeenCalledTimes(1);
    expect(copyButton.disabled).toBe(true);
    expect(copyButton.getAttribute("aria-label")).toBe("Copiado");
    expect(statusNode.textContent).toBe(statusBeforeCopy);

    vi.advanceTimersByTime(1400);
    await Promise.resolve();

    expect(copyButton.disabled).toBe(false);
    expect(copyButton.getAttribute("aria-label")).toBe(
      "Copiar diagnóstico completo",
    );
  });

  it("uses full client name in modal subtitle when available", () => {
    openDiagnosticModal({
      clientName: "MARIO ANTONIO RIVERA RAMOS",
      serviceSlug: "9419@yaa-internet-by-vw",
      serviceId: "9419",
      ip: "10.27.0.129",
    });

    const subtitle = document.querySelector(".wisphub-yaa-diagnostic-subtitle");
    expect(subtitle?.textContent).toContain("MARIO ANTONIO RIVERA RAMOS");
    expect(subtitle?.textContent).not.toContain("9419@yaa-internet-by-vw ·");
  });

  it("shows and hides detail popovers from ghost help buttons", () => {
    const modal = openDiagnosticModal({
      serviceSlug: "9419@yaa-internet-by-vw",
      serviceId: "9419",
      ip: "10.27.0.129",
    });

    modal.showResult({
      overallStatus: "PARCIAL",
      summary: "Diagnóstico Express\nEstado general: PARCIAL",
      clientContext: {
        serviceSlug: "9419@yaa-internet-by-vw",
      },
      ping: {},
      torch: {},
      weeklyTraffic: {},
      serviceHealth: {},
    });

    const helpButton = document.querySelector(
      ".wisphub-yaa-diagnostic-detail-help-btn",
    );
    expect(helpButton).not.toBeNull();

    const popoverId = helpButton.getAttribute("data-popover-id");
    const popover = document.getElementById(popoverId);
    expect(popover).not.toBeNull();
    expect(popover.getAttribute("data-visible")).toBe("false");

    helpButton.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(helpButton.getAttribute("data-open")).toBe("true");
    expect(popover.getAttribute("data-visible")).toBe("true");
    expect(popover.textContent).toContain("resultado final");

    document
      .querySelector(".wisphub-yaa-diagnostic-status")
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(helpButton.getAttribute("data-open")).toBe("false");
    expect(popover.getAttribute("data-visible")).toBe("false");
  });
});
