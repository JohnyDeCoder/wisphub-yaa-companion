import { CLIENTS_UI_MESSAGES } from "../../../../../src/config/messages.js";

const mocks = vi.hoisted(() => ({
  extractClientContextFromContainer: vi.fn(),
  fetchPingPageContext: vi.fn(),
  runPingSample: vi.fn(),
  fetchTorchPageContext: vi.fn(),
  runTorchSnapshot: vi.fn(),
  fetchWeeklyTraffic: vi.fn(),
  buildDiagnosticSummary: vi.fn(),
}));

vi.mock("../../../../../src/features/clients/diagnostic/clientContext.js", () => ({
  extractClientContextFromContainer: mocks.extractClientContextFromContainer,
}));

vi.mock("../../../../../src/features/clients/diagnostic/sessionApi.js", () => ({
  fetchPingPageContext: mocks.fetchPingPageContext,
  runPingSample: mocks.runPingSample,
  fetchTorchPageContext: mocks.fetchTorchPageContext,
  runTorchSnapshot: mocks.runTorchSnapshot,
  fetchWeeklyTraffic: mocks.fetchWeeklyTraffic,
}));

vi.mock("../../../../../src/features/clients/diagnostic/summaryBuilder.js", () => ({
  buildDiagnosticSummary: mocks.buildDiagnosticSummary,
}));

import {
  __testables__,
  runClientDiagnosticForContainer,
} from "../../../../../src/features/clients/diagnostic/diagnosticRunner.js";

const BASE_CLIENT_CONTEXT = Object.freeze({
  serviceSlug: "10313@yaa-internet-by-vw",
  serviceId: "10313",
  clientName: "EDUARDO MATEO LUPERCIO",
  ip: "10.0.50.27",
  plan: "20 MEGAS($300)",
  router: "PUERTA DEL VALLE PPOOE",
  accountStatus: "Activo",
  pendingBalance: "0.00",
});

function setupSuccessfulStepMocks() {
  mocks.extractClientContextFromContainer.mockReturnValue({
    ...BASE_CLIENT_CONTEXT,
  });
  mocks.fetchPingPageContext.mockResolvedValue({
    requestPath: "/get/ping/",
    params: { ip: BASE_CLIENT_CONTEXT.ip },
  });
  mocks.runPingSample.mockResolvedValue({
    taskId: "ping-task-1",
    metrics: { host: BASE_CLIENT_CONTEXT.ip, packetLoss: "0%" },
  });
  mocks.fetchTorchPageContext.mockResolvedValue({
    requestPath: "/get/torch/",
    params: { src_address: BASE_CLIENT_CONTEXT.ip },
  });
  mocks.runTorchSnapshot.mockResolvedValue({
    taskId: "torch-task-1",
    totals: { tx: "350kbps", rx: "900kbps" },
    flows: [],
  });
  mocks.fetchWeeklyTraffic.mockResolvedValue({
    taskId: "weekly-task-1",
    rows: [
      ["Dia", "Descarga", "Subida"],
      ["Lunes", "1.2 GB", "800 MB"],
    ],
  });
  mocks.buildDiagnosticSummary.mockReturnValue("diagnostic summary");
}

describe("diagnosticRunner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSuccessfulStepMocks();
  });

  it("maps auth, timeout and task failures to user-facing messages", () => {
    expect(
      __testables__.normalizeDiagnosticErrorMessage(
        "[SessionApi] Request failed (401 Unauthorized) for /get/ping/",
      ),
    ).toBe(CLIENTS_UI_MESSAGES.DIAGNOSTIC_AUTH_REQUIRED);

    expect(
      __testables__.normalizeDiagnosticErrorMessage(
        "[SessionApi] Task task-a timed out after 20000ms",
      ),
    ).toBe(CLIENTS_UI_MESSAGES.DIAGNOSTIC_TIMEOUT);

    expect(
      __testables__.normalizeDiagnosticErrorMessage(
        "[SessionApi] Task task-b failed: router timeout",
      ),
    ).toBe(CLIENTS_UI_MESSAGES.DIAGNOSTIC_TASK_FAILED);
  });

  it("returns PARCIAL when one step fails and keeps a summary", async () => {
    mocks.runPingSample.mockRejectedValueOnce(
      new Error("[SessionApi] Task task-a timed out after 20000ms"),
    );

    const result = await runClientDiagnosticForContainer(document.body);

    expect(result.overallStatus).toBe("PARCIAL");
    expect(result.ping.error).toBe(CLIENTS_UI_MESSAGES.DIAGNOSTIC_TIMEOUT);
    expect(result.summary).toBe("diagnostic summary");
    expect(mocks.buildDiagnosticSummary).toHaveBeenCalledTimes(1);
  });

  it("returns PARCIAL when service is cancelled even with healthy API steps", async () => {
    mocks.extractClientContextFromContainer.mockReturnValueOnce({
      serviceSlug: "0022@yaa-internet-by-vw",
      serviceId: "22",
      clientName: "Karene Ceballos Valdovinos - FIBRA",
      ip: "169.168.17.31",
      plan: "PLAN 10/5MB TEPAMES",
      router: "Rb 450 Tepames(17)(18)",
      accountStatus: "Cancelado",
      pendingBalance: "320.00",
    });

    const result = await runClientDiagnosticForContainer(document.body);

    expect(result.overallStatus).toBe("PARCIAL");
    expect(result.serviceHealth.hasWarnings).toBe(true);
  });

  it("throws when client context lacks service slug/id", async () => {
    mocks.extractClientContextFromContainer.mockReturnValueOnce({
      serviceSlug: "",
      serviceId: "",
    });

    await expect(
      runClientDiagnosticForContainer(document.body),
    ).rejects.toThrow(CLIENTS_UI_MESSAGES.DIAGNOSTIC_CONTEXT_MISSING);
  });
});
