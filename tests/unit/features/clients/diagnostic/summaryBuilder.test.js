import { buildDiagnosticSummary } from "../../../../../src/features/clients/diagnostic/summaryBuilder.js";

describe("summaryBuilder", () => {
  it("builds a complete diagnostic summary for ticket notes", () => {
    const summary = buildDiagnosticSummary({
      generatedAt: "2026-03-19T20:30:00.000Z",
      clientContext: {
        serviceSlug: "010313@yaa-internet-by-vw",
        serviceId: "10313",
        clientName: "EDUARDO <strong>MATEO</strong> LUPERCIO",
        ip: "10.0.50.27",
        plan: "20 MEGAS($300)",
        router: "PUERTA DEL VALLE PPOOE",
        accountStatus: "Activo",
        pendingBalance: "0.00",
      },
      ping: {
        samples: [
          { host: "10.0.50.27", status: "reply", time: "9ms", ttl: "64" },
          { host: "10.0.50.27", status: "reply", time: "11ms", ttl: "64" },
          { host: "10.0.50.27", status: "reply", time: "10ms", ttl: "64" },
          { host: "10.0.50.27", status: "reply", time: "12ms", ttl: "64" },
          { host: "10.0.50.27", status: "reply", time: "13ms", ttl: "64" },
        ],
        metrics: {
          host: "10.0.50.27",
          packetLoss: "0%",
          minRtt: "9ms",
          avgRtt: "15ms",
          maxRtt: "22ms",
          ttl: "64",
        },
      },
      torch: {
        totals: {
          tx: "350kbps",
          rx: "900kbps",
        },
        flows: [
          {
            "src-address": "10.0.50.27",
            "dst-address": "8.8.8.8",
            "dst-port": "443",
            tx: "350kbps",
            rx: "900kbps",
          },
        ],
      },
      weeklyTraffic: {
        rows: [
          ["Dia", "Descarga", "Subida"],
          ["Lunes", "1.2 GB", "800 MB"],
          ["Martes", "400 MB", "250 MB"],
        ],
      },
      serviceHealth: {
        accountStatus: "Activo",
        pendingBalance: "0.00",
        issues: [],
        hasWarnings: false,
      },
    });

    expect(summary).toContain("Estado general: COMPLETO");
    expect(summary).toContain("Ping: OK");
    expect(summary).toContain("Torch: OK");
    expect(summary).toContain("Tráfico semanal: OK");
    expect(summary).toContain("Estado de cuenta: OK");
    expect(summary).toContain("Muestra 1: host 10.0.50.27 · estado reply");
    expect(summary).toContain("Muestra 4: host 10.0.50.27 · estado reply");
    expect(summary).toContain("Muestra 5: host 10.0.50.27 · estado reply");
    expect(summary).toContain(
      `${window.location.origin}/clientes/ping/010313@yaa-internet-by-vw/10313/`,
    );
    expect(summary).not.toContain("<strong>");
  });

  it("builds an error summary when all steps fail", () => {
    const summary = buildDiagnosticSummary({
      clientContext: {
        serviceSlug: "10309@yaa-internet-by-vw",
        serviceId: "10309",
        clientName: "LUIS ABRAHAM SILVA",
      },
      ping: { error: "no auth" },
      torch: { error: "forbidden" },
      weeklyTraffic: { error: "task missing" },
      serviceHealth: {
        accountStatus: "",
        pendingBalance: "",
        issues: ["Estado de servicio no disponible"],
        hasWarnings: true,
      },
    });

    expect(summary).toContain("Estado general: ERROR");
    expect(summary).toContain("Ping: ERROR (no auth)");
    expect(summary).toContain("Torch: ERROR (forbidden)");
    expect(summary).toContain("Tráfico semanal: ERROR (task missing)");
  });

  it("marks ping as alert when packet loss is 100%", () => {
    const summary = buildDiagnosticSummary({
      clientContext: {
        serviceSlug: "10309@yaa-internet-by-vw",
        serviceId: "10309",
        clientName: "LUIS ABRAHAM SILVA",
      },
      ping: {
        metrics: {
          host: "192.168.15.46",
          packetLoss: "100",
        },
      },
      torch: {},
      weeklyTraffic: {},
      serviceHealth: {
        accountStatus: "Activo",
        pendingBalance: "0.00",
        issues: [],
        hasWarnings: false,
      },
    });

    expect(summary).toContain("Ping: ALERTA");
    expect(summary).toContain(
      "Interpretación: Sin respuesta del host (pérdida total)",
    );
  });

  it("falls back to service slug when client name is unavailable", () => {
    const summary = buildDiagnosticSummary({
      clientContext: {
        serviceSlug: "9419@yaa-internet-by-vw",
        serviceId: "9419",
        clientName: "",
      },
      ping: {},
      torch: {},
      weeklyTraffic: {},
      serviceHealth: {},
    });

    expect(summary).toContain("Cliente: 9419@yaa-internet-by-vw");
  });
});
