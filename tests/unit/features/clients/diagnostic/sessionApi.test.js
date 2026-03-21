import {
  __testables__,
  fetchWeeklyTraffic,
  pollInternalTask,
  runPingSample,
  runTorchSnapshot,
} from "../../../../../src/features/clients/diagnostic/sessionApi.js";

function createTextResponse(body, options = {}) {
  const { ok = true, status = 200, statusText = "OK" } = options;
  return {
    ok,
    status,
    statusText,
    text: async () => body,
    json: async () => JSON.parse(body),
  };
}

function createJsonResponse(payload, options = {}) {
  const { ok = true, status = 200, statusText = "OK" } = options;
  return {
    ok,
    status,
    statusText,
    text: async () => JSON.stringify(payload),
    json: async () => payload,
  };
}

describe("sessionApi", () => {
  it("parses ping page context when inline ajax data uses escaped quotes", () => {
    const html = `
      <html>
        <body>
          <input name="ip" value="10.0.50.27" />
          <script>
            $.ajax({
              url: '/get/ping',
              data: {\\"id_router\\":\\"34773\\", \\"empresa_id\\":\\"9019\\", \\"ip\\": ip, \\"arp_ping\\": arp_ping, \\"interface\\": interface, \\"username\\":\\"johny@yaa-internet-by-vw\\"}
            });
          </script>
        </body>
      </html>
    `;

    const context = __testables__.parsePingPageContextFromHtml(html);
    expect(context.requestPath).toBe("/get/ping/");
    expect(context.params).toEqual({
      id_router: "34773",
      empresa_id: "9019",
      ip: "10.0.50.27",
      arp_ping: "false",
      interface: "",
      username: "johny@yaa-internet-by-vw",
      count: "4",
    });
  });

  it("normalizes ping interface placeholder and keeps empty interface key", () => {
    const html = `
      <html>
        <body>
          <input name="id_router" value="34773" />
          <input name="empresa_id" value="9019" />
          <input name="ip" value="10.0.50.27" />
          <select id="id_interfaces" name="interfaces">
            <option value="" selected>------------</option>
          </select>
          <script>
            $.ajax({
              url: "/get/ping",
              data: {
                "id_router": "34773",
                "empresa_id": "9019",
                "ip": ip,
                "arp_ping": arp_ping,
                "interface": interface,
                "username": "johny@yaa-internet-by-vw"
              }
            });
          </script>
        </body>
      </html>
    `;

    const context = __testables__.parsePingPageContextFromHtml(html);
    expect(context.params.interface).toBe("");
    expect(context.requestUrl).toContain("interface=");
  });

  it("removes empty torch interface to avoid ambiguous interface requests", () => {
    const html = `
      <html>
        <body>
          <input name="id_router" value="77" />
          <input name="empresa_id" value="13" />
          <select id="id_interfaces" name="interfaces">
            <option value="" selected>------------</option>
          </select>
          <input name="src_address" value="10.0.50.27" />
          <script>
            $.ajax({
              url: "/get/torch",
              data: {
                "id_router": "77",
                "empresa_id": "13",
                "interface": interface,
                "src_address": src_address
              }
            });
          </script>
        </body>
      </html>
    `;

    const context = __testables__.parseTorchPageContextFromHtml(html);
    expect(context.params).toEqual({
      id_router: "77",
      empresa_id: "13",
      src_address: "10.0.50.27",
    });
    expect(context.requestUrl).not.toContain("interface=");
  });

  it("falls back to the first valid torch interface option when selected value is empty", () => {
    const html = `
      <html>
        <body>
          <input name="id_router" value="77" />
          <input name="empresa_id" value="13" />
          <select id="id_interfaces" name="interfaces">
            <option value="" selected>------------</option>
            <option value="ether2">ether2</option>
            <option value="sfp1">sfp1</option>
          </select>
          <input name="src_address" value="10.0.50.27" />
        </body>
      </html>
    `;

    const context = __testables__.parseTorchPageContextFromHtml(html);
    expect(context.params).toEqual({
      id_router: "77",
      empresa_id: "13",
      interface: "ether2",
      src_address: "10.0.50.27",
    });
    expect(context.interfaceCandidates).toEqual(["ether2", "sfp1"]);
  });

  it("normalizes torch interface labels when option values are missing", () => {
    const html = `
      <html>
        <body>
          <input name="id_router" value="77" />
          <input name="empresa_id" value="13" />
          <select id="id_interfaces" name="interfaces">
            <option selected>------------</option>
            <option>ether2 - PRINCIPAL</option>
            <option>bridge1</option>
          </select>
          <input name="src_address" value="10.0.50.27" />
        </body>
      </html>
    `;

    const context = __testables__.parseTorchPageContextFromHtml(html);
    expect(context.params.interface).toBe("ether2");
    expect(context.interfaceCandidates).toEqual(["ether2", "bridge1"]);
  });

  it("fetches weekly traffic page, extracts task_id and resolves task rows", async () => {
    const calls = [];
    const fetchImpl = vi.fn(async (url) => {
      calls.push(String(url));
      if (String(url).includes("/trafico/semana/servicio/")) {
        return createTextResponse(`
          <html>
            <body>
              <input type="hidden" id="task-id" value="weekly-task-01" />
            </body>
          </html>
        `);
      }

      return createJsonResponse({
        status: "SUCCESS",
        result: [
          ["Dia", "Descarga", "Subida"],
          ["Lunes", "1.2 GB", "800 MB"],
        ],
      });
    });

    const result = await fetchWeeklyTraffic(
      "10313@yaa-internet-by-vw",
      "10313",
      {
        fetchImpl,
        sleepFn: async () => {},
      },
    );

    expect(result.taskId).toBe("weekly-task-01");
    expect(result.rows).toEqual([
      ["Dia", "Descarga", "Subida"],
      ["Lunes", "1.2 GB", "800 MB"],
    ]);
    expect(calls[0]).toBe(
      "/trafico/semana/servicio/10313@yaa-internet-by-vw/10313/",
    );
    expect(calls[1]).toBe("/task/weekly-task-01/status/");
  });

  it("normalizes task status payloads for pending, success and failure", () => {
    const pending = __testables__.normalizeInternalTaskStatus({
      status: "PENDING",
    });
    expect(pending.isFinal).toBe(false);
    expect(pending.isSuccess).toBe(false);

    const success = __testables__.normalizeInternalTaskStatus({
      status: "SUCCESS",
      result: [{ "avg-rtt": "25ms" }],
    });
    expect(success.isFinal).toBe(true);
    expect(success.isSuccess).toBe(true);
    expect(success.data).toEqual([{ "avg-rtt": "25ms" }]);

    const failure = __testables__.normalizeInternalTaskStatus({
      state: "FAILURE",
      error: "router timeout",
    });
    expect(failure.isFinal).toBe(true);
    expect(failure.isSuccess).toBe(false);
    expect(failure.errorMessage).toContain("router timeout");
  });

  it("pollInternalTask resolves when task transitions to SUCCESS", async () => {
    const responses = [
      createJsonResponse({ status: "PENDING" }),
      createJsonResponse({
        status: "SUCCESS",
        result: [{ "packet-loss": "0%" }],
      }),
    ];

    let elapsed = 0;
    const fetchImpl = vi.fn(async () => responses.shift());

    const result = await pollInternalTask("task-123", 5000, 200, {
      fetchImpl,
      nowFn: () => elapsed,
      sleepFn: async (ms) => {
        elapsed += ms;
      },
    });

    expect(result).toEqual([{ "packet-loss": "0%" }]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("pollInternalTask throws on timeout", async () => {
    let elapsed = 0;
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({ status: "PENDING" }),
    );

    await expect(
      pollInternalTask("task-timeout", 300, 100, {
        fetchImpl,
        nowFn: () => elapsed,
        sleepFn: async (ms) => {
          elapsed += ms;
        },
      }),
    ).rejects.toThrow("timed out");
  });

  it("runPingSample starts task and returns normalized ping metrics", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse({ task_id: "ping-task-1" }))
      .mockResolvedValueOnce(
        createJsonResponse({
          status: "SUCCESS",
          result: [
            {
              host: "10.0.50.27",
              "min-rtt": "9ms",
              "avg-rtt": "15ms",
              "max-rtt": "22ms",
              "packet-loss": "0%",
              ttl: "64",
              size: "56",
              time: "12ms",
            },
          ],
        }),
      );

    const result = await runPingSample(
      {
        requestPath: "/get/ping/",
        params: {
          id_router: "42",
          empresa_id: "9",
          ip: "10.0.50.27",
          arp_ping: "true",
          interface: "ether1",
          username: "010313@yaa-internet-by-vw",
          count: "2",
        },
      },
      4,
      {
        fetchImpl,
        sleepFn: async () => {},
      },
    );

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "/get/ping/?id_router=42&empresa_id=9&ip=10.0.50.27&arp_ping=true&interface=ether1&username=010313%40yaa-internet-by-vw&count=4",
      expect.objectContaining({ credentials: "same-origin", method: "GET" }),
    );
    expect(result.taskId).toBe("ping-task-1");
    expect(result.metrics).toEqual({
      host: "10.0.50.27",
      packetLoss: "0%",
      minRtt: "9ms",
      avgRtt: "15ms",
      maxRtt: "22ms",
      ttl: "64",
      size: "56",
      time: "12ms",
    });
    expect(result.samples).toHaveLength(1);
    expect(result.error).toBe("");
  });

  it("runPingSample can expand ping samples up to the requested target", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse({ task_id: "ping-task-base" }))
      .mockResolvedValueOnce(
        createJsonResponse({
          status: "SUCCESS",
          result: [
            {
              host: "10.0.50.27",
              "packet-loss": "0%",
              ttl: "64",
              time: "11ms",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(createJsonResponse({ task_id: "ping-task-2" }))
      .mockResolvedValueOnce(
        createJsonResponse({
          status: "SUCCESS",
          result: [
            {
              host: "10.0.50.27",
              "packet-loss": "0%",
              ttl: "64",
              time: "10ms",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(createJsonResponse({ task_id: "ping-task-3" }))
      .mockResolvedValueOnce(
        createJsonResponse({
          status: "SUCCESS",
          result: [
            {
              host: "10.0.50.27",
              "packet-loss": "0%",
              ttl: "64",
              time: "9ms",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(createJsonResponse({ task_id: "ping-task-4" }))
      .mockResolvedValueOnce(
        createJsonResponse({
          status: "SUCCESS",
          result: [
            {
              host: "10.0.50.27",
              "packet-loss": "0%",
              ttl: "64",
              time: "8ms",
            },
          ],
        }),
      );

    const result = await runPingSample(
      {
        requestPath: "/get/ping/",
        params: {
          id_router: "42",
          empresa_id: "9",
          ip: "10.0.50.27",
          arp_ping: "true",
          interface: "ether1",
          username: "010313@yaa-internet-by-vw",
          count: "4",
        },
      },
      4,
      {
        fetchImpl,
        sleepFn: async () => {},
        pingExpandSamples: true,
        pingSampleTarget: 4,
      },
    );

    expect(result.samples).toHaveLength(4);
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      "/get/ping/?id_router=42&empresa_id=9&ip=10.0.50.27&arp_ping=true&interface=ether1&username=010313%40yaa-internet-by-vw&count=1",
      expect.objectContaining({ credentials: "same-origin", method: "GET" }),
    );
  });

  it("runPingSample surfaces textual Mikrotik errors returned with SUCCESS status", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse({ task_id: "ping-task-2" }))
      .mockResolvedValueOnce(
        createJsonResponse({
          status: "SUCCESS",
          result:
            "<strong>Error Mikrotik:</strong> input does not match any value of interface",
        }),
      );

    const result = await runPingSample(
      {
        requestPath: "/get/ping/",
        params: {
          id_router: "42",
          empresa_id: "9",
          ip: "10.0.50.27",
          arp_ping: "false",
          interface: "",
          username: "010313@yaa-internet-by-vw",
          count: "1",
        },
      },
      1,
      {
        fetchImpl,
        sleepFn: async () => {},
      },
    );

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "/get/ping/?id_router=42&empresa_id=9&ip=10.0.50.27&arp_ping=false&interface=&username=010313%40yaa-internet-by-vw&count=1",
      expect.objectContaining({ credentials: "same-origin", method: "GET" }),
    );
    expect(result.samples).toEqual([]);
    expect(result.error).toContain("Error Mikrotik");
  });

  it("runTorchSnapshot starts with the first interface guess when none is provided", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse({ task_id: "torch-task-1" }))
      .mockResolvedValueOnce(
        createJsonResponse({
          status: "SUCCESS",
          result: {
            torch_ip_result: [],
            total: {},
          },
        }),
      );

    await runTorchSnapshot(
      {
        requestPath: "/get/torch/",
        params: {
          id_router: "42",
          empresa_id: "9",
          interface: "",
          src_address: "10.0.50.27",
        },
      },
      {
        fetchImpl,
        sleepFn: async () => {},
        torchSamplesPerAttempt: 1,
      },
    );

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "/get/torch/?id_router=42&empresa_id=9&src_address=10.0.50.27&interface=ether1",
      expect.objectContaining({ credentials: "same-origin", method: "GET" }),
    );
  });

  it("runTorchSnapshot keeps sampling the same interface and prefers a non-zero traffic snapshot", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse({ task_id: "torch-task-1" }))
      .mockResolvedValueOnce(
        createJsonResponse({
          status: "SUCCESS",
          result: {
            torch_ip_result: [],
            total: {
              tx: "0.0 Kbps",
              rx: "0.0 Kbps",
              tx_packets: "0",
              rx_packets: "0",
            },
          },
        }),
      )
      .mockResolvedValueOnce(createJsonResponse({ task_id: "torch-task-2" }))
      .mockResolvedValueOnce(
        createJsonResponse({
          status: "SUCCESS",
          result: {
            torch_ip_result: [],
            total: {
              tx: "10.5 Kbps",
              rx: "1.5 Kbps",
              tx_packets: "8",
              rx_packets: "3",
            },
          },
        }),
      );

    const result = await runTorchSnapshot(
      {
        requestPath: "/get/torch/",
        params: {
          id_router: "42",
          empresa_id: "9",
          interface: "bridge1",
          src_address: "10.0.50.27",
        },
      },
      {
        fetchImpl,
        sleepFn: async () => {},
        torchSamplesPerAttempt: 2,
      },
    );

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "/get/torch/?id_router=42&empresa_id=9&src_address=10.0.50.27&interface=bridge1",
      expect.objectContaining({ credentials: "same-origin", method: "GET" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      "/get/torch/?id_router=42&empresa_id=9&src_address=10.0.50.27&interface=bridge1",
      expect.objectContaining({ credentials: "same-origin", method: "GET" }),
    );
    expect(result.totals).toEqual({
      tx: "10.5 Kbps",
      rx: "1.5 Kbps",
      txPackets: "8",
      rxPackets: "3",
    });
  });

  it("runTorchSnapshot retries with next interface guess when current guess returns HTTP 500", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse(
          { error: "Internal Server Error" },
          { ok: false, status: 500, statusText: "Internal Server Error" },
        ),
      )
      .mockResolvedValueOnce(createJsonResponse({ task_id: "torch-task-2" }))
      .mockResolvedValueOnce(
        createJsonResponse({
          status: "SUCCESS",
          result: {
            torch_ip_result: [],
            total: {},
          },
        }),
      );

    await runTorchSnapshot(
      {
        requestPath: "/get/torch/",
        params: {
          id_router: "42",
          empresa_id: "9",
          src_address: "10.0.50.27",
          dst_address: "0.0.0.0/0",
        },
      },
      {
        fetchImpl,
        sleepFn: async () => {},
        torchSamplesPerAttempt: 1,
      },
    );

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "/get/torch/?id_router=42&empresa_id=9&src_address=10.0.50.27&dst_address=0.0.0.0%2F0&interface=ether1",
      expect.objectContaining({ credentials: "same-origin", method: "GET" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "/get/torch/?id_router=42&empresa_id=9&src_address=10.0.50.27&dst_address=0.0.0.0%2F0&interface=ether2",
      expect.objectContaining({ credentials: "same-origin", method: "GET" }),
    );
  });

  it("runTorchSnapshot retries with another explicit interface after ambiguous interface response", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse({ task_id: "torch-task-a" }))
      .mockResolvedValueOnce(
        createJsonResponse({
          status: "SUCCESS",
          result:
            'Error Mikrotik: ("ambiguous value of interface, more than one possible value matches input")',
        }),
      )
      .mockResolvedValueOnce(createJsonResponse({ task_id: "torch-task-b" }))
      .mockResolvedValueOnce(
        createJsonResponse({
          status: "SUCCESS",
          result: {
            torch_ip_result: [],
            total: {},
          },
        }),
      );

    await runTorchSnapshot(
      {
        requestPath: "/get/torch/",
        params: {
          id_router: "42",
          empresa_id: "9",
          src_address: "10.0.50.27",
        },
        interfaceCandidates: ["ether2"],
      },
      {
        fetchImpl,
        sleepFn: async () => {},
        torchSamplesPerAttempt: 1,
      },
    );

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "/get/torch/?id_router=42&empresa_id=9&src_address=10.0.50.27&interface=ether2",
      expect.objectContaining({ credentials: "same-origin", method: "GET" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      "/get/torch/?id_router=42&empresa_id=9&src_address=10.0.50.27&interface=ether1",
      expect.objectContaining({ credentials: "same-origin", method: "GET" }),
    );
  });

  it("runTorchSnapshot does not request torch without interface when all attempts fail", async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse(
        { error: "Internal Server Error" },
        { ok: false, status: 500, statusText: "Internal Server Error" },
      ),
    );

    await expect(
      runTorchSnapshot(
        {
          requestPath: "/get/torch/",
          params: {
            id_router: "35895",
            empresa_id: "9019",
            src_address: "10.27.0.129",
            dst_address: "0.0.0.0/0",
            username: "johny@yaa-internet-by-vw",
          },
        },
        {
          fetchImpl,
          sleepFn: async () => {},
          torchSamplesPerAttempt: 1,
        },
      ),
    ).rejects.toThrow(/Request failed \(500/i);

    const calledUrls = fetchImpl.mock.calls.map((call) => String(call[0]));
    expect(calledUrls.every((url) => url.includes("interface="))).toBe(true);
    expect(
      calledUrls.some(
        (url) =>
          url.includes("id_router=35895") && !url.includes("interface="),
      ),
    ).toBe(false);
  });
});
