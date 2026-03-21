import {
  hasTorchAnyTotals,
  hasTorchFlowRows,
  hasTorchFlowTraffic,
  hasTorchTotalTraffic,
  parseRateToBps,
} from "./torchSnapshotQuality.js";

export const TORCH_TRAFFIC_STATE = Object.freeze({
  TRAFFIC: "traffic",
  IDLE: "idle",
  NO_DATA: "no_data",
});

export function resolveTorchTrafficState(torch) {
  if (!torch || typeof torch !== "object") {
    return TORCH_TRAFFIC_STATE.NO_DATA;
  }

  if (hasTorchFlowTraffic(torch.flows) || hasTorchTotalTraffic(torch.totals)) {
    return TORCH_TRAFFIC_STATE.TRAFFIC;
  }

  if (hasTorchAnyTotals(torch.totals) || hasTorchFlowRows(torch.flows)) {
    return TORCH_TRAFFIC_STATE.IDLE;
  }

  return TORCH_TRAFFIC_STATE.NO_DATA;
}

export const __testables__ = {
  parseRateToBps,
};
