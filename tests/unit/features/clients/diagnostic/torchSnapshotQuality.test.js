import {
  hasTorchFlowTraffic,
  parseRateToBps,
  selectBetterTorchSnapshot,
} from "../../../../../src/features/clients/diagnostic/torchSnapshotQuality.js";

describe("torchSnapshotQuality", () => {
  it("treats flow rows without traffic counters as no traffic", () => {
    expect(
      hasTorchFlowTraffic([
        {
          "src-address": "10.0.50.27",
          "dst-address": "8.8.8.8",
        },
      ]),
    ).toBe(false);
  });

  it("detects traffic when flow counters are greater than zero", () => {
    expect(
      hasTorchFlowTraffic([
        {
          tx_rate: "39.47 kbps",
          rx_rate: "10.35 kbps",
          tx_pack: "9",
          rx_pack: "1",
        },
      ]),
    ).toBe(true);
  });

  it("prefers snapshots with real traffic over zero snapshots", () => {
    const zeroSnapshot = {
      flows: [],
      totals: {
        tx: "0.0 Kbps",
        rx: "0.0 Kbps",
        txPackets: "0",
        rxPackets: "0",
      },
      error: "",
    };
    const trafficSnapshot = {
      flows: [],
      totals: {
        tx: "8.5 Kbps",
        rx: "1.3 Kbps",
        txPackets: "6",
        rxPackets: "2",
      },
      error: "",
    };

    expect(selectBetterTorchSnapshot(zeroSnapshot, trafficSnapshot)).toBe(
      trafficSnapshot,
    );
  });

  it("parses bitrate units to bps", () => {
    expect(parseRateToBps("1.5 Mbps")).toBe(1500000);
    expect(parseRateToBps("0.0 Kbps")).toBe(0);
  });
});
