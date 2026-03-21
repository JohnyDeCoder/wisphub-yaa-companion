import {
  resolveTorchTrafficState,
  TORCH_TRAFFIC_STATE,
} from "../../../../../src/features/clients/diagnostic/torchQuality.js";

describe("torchQuality", () => {
  it("detects traffic when flow rates are greater than zero", () => {
    expect(
      resolveTorchTrafficState({
        flows: [{ tx_rate: "10.0 Kbps", rx_rate: "2.0 Kbps" }],
      }),
    ).toBe(TORCH_TRAFFIC_STATE.TRAFFIC);
  });

  it("detects idle state when totals are present but zero", () => {
    expect(
      resolveTorchTrafficState({
        totals: {
          tx: "0.0 Kbps",
          rx: "0.0 Kbps",
        },
      }),
    ).toBe(TORCH_TRAFFIC_STATE.IDLE);
  });

  it("detects idle state when rows exist but counters are missing", () => {
    expect(
      resolveTorchTrafficState({
        flows: [{ "src-address": "10.0.50.27" }],
      }),
    ).toBe(TORCH_TRAFFIC_STATE.IDLE);
  });

  it("detects no data when neither totals nor flows exist", () => {
    expect(resolveTorchTrafficState({})).toBe(TORCH_TRAFFIC_STATE.NO_DATA);
  });
});
