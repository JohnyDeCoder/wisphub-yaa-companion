const mocks = vi.hoisted(() => ({
  extractActiveClientContextFromPage: vi.fn(),
  isDiagnosticFlowRunning: vi.fn(),
  runDiagnosticFlowForContext: vi.fn(),
}));

vi.mock("../../../../../src/features/clients/diagnostic/clientContext.js", () => ({
  extractActiveClientContextFromPage: mocks.extractActiveClientContextFromPage,
}));

vi.mock("../../../../../src/features/clients/diagnostic/diagnosticFlow.js", () => ({
  isDiagnosticFlowRunning: mocks.isDiagnosticFlowRunning,
  runDiagnosticFlowForContext: mocks.runDiagnosticFlowForContext,
}));

import { initClientDetailDiagnosticButton } from "../../../../../src/features/clients/diagnostic/clientDetailDiagnosticButton.js";

describe("clientDetailDiagnosticButton", () => {
  function setPageUrl(pathname) {
    const previousUrl = window.location.href;
    window.history.pushState({}, "", pathname);
    return () => window.history.pushState({}, "", previousUrl);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    mocks.extractActiveClientContextFromPage.mockReturnValue({
      serviceSlug: "0005@yaa-internet-by-vw",
      serviceId: "5",
      clientName: "0005@yaa-internet-by-vw",
      ip: "192.168.17.14",
      plan: "PLAN AVANZADO 15MEGAS",
      router: "Rb 450 Tepames(17)(18)",
      accountStatus: "Suspendido",
      pendingBalance: "450.00",
    });
    mocks.runDiagnosticFlowForContext.mockResolvedValue({
      overallStatus: "COMPLETO",
    });
    mocks.isDiagnosticFlowRunning.mockReturnValue(false);
  });

  it("injects the header action button on client detail pages", () => {
    const restoreUrl = setPageUrl("/clientes/ver/0005@yaa-internet-by-vw/");
    document.body.innerHTML = `
      <div class="page-header">
        <h1 class="pull-left"><span>0005@yaa-internet-by-vw</span></h1>
      </div>
    `;

    initClientDetailDiagnosticButton();

    const heading = document.querySelector(".page-header h1.pull-left");
    const button = document.querySelector(".wisphub-yaa-diagnostic-header-btn");
    const shortcuts = Array.from(
      document.querySelectorAll(".wisphub-yaa-diagnostic-header-shortcut-btn"),
    );
    const origin = window.location.origin;
    expect(heading?.classList.contains("wisphub-yaa-diagnostic-header-layout")).toBe(
      true,
    );
    expect(heading?.querySelector(".wisphub-yaa-diagnostic-header-left")).not.toBe(
      null,
    );
    expect(button).not.toBeNull();
    expect(button?.textContent).toContain("Ejecutar diagnóstico express");
    expect(shortcuts).toHaveLength(3);
    expect(shortcuts.every((item) => item.getAttribute("target") === "_blank")).toBe(
      true,
    );
    expect(shortcuts.map((item) => item.getAttribute("href"))).toEqual([
      `${origin}/clientes/ping/0005@yaa-internet-by-vw/5/`,
      `${origin}/clientes/torch/0005@yaa-internet-by-vw/5/`,
      `${origin}/trafico/semana/servicio/0005@yaa-internet-by-vw/5/`,
    ]);
    expect(shortcuts[0]?.classList.contains("wisphub-yaa-action-btn-diagnostic-ping")).toBe(
      true,
    );
    expect(
      shortcuts[1]?.classList.contains("wisphub-yaa-action-btn-diagnostic-torch"),
    ).toBe(true);
    expect(
      shortcuts[2]?.classList.contains("wisphub-yaa-action-btn-diagnostic-traffic"),
    ).toBe(true);
    restoreUrl();
  });

  it("runs diagnostic flow when header action is clicked", async () => {
    const restoreUrl = setPageUrl("/clientes/ver/0005@yaa-internet-by-vw/");
    document.body.innerHTML = `
      <div class="page-header">
        <h1 class="pull-left"><span>0005@yaa-internet-by-vw</span></h1>
      </div>
    `;

    initClientDetailDiagnosticButton();

    const button = document.querySelector(".wisphub-yaa-diagnostic-header-btn");
    button?.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      }),
    );

    await Promise.resolve();

    expect(mocks.extractActiveClientContextFromPage).toHaveBeenCalled();
    expect(mocks.runDiagnosticFlowForContext).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceSlug: "0005@yaa-internet-by-vw",
        serviceId: "5",
      }),
      expect.objectContaining({
        pingAttempts: 4,
      }),
    );
    restoreUrl();
  });
});
