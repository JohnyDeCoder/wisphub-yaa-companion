import { normalizeText } from "../../../utils/tableHelpers.js";

const RATE_UNITS = Object.freeze({
  "": 1,
  K: 1000,
  M: 1000 ** 2,
  G: 1000 ** 3,
});

function parseFirstNumber(value) {
  const normalized = normalizeText(value).replace(",", ".");
  if (!normalized) {
    return Number.NaN;
  }

  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return Number.NaN;
  }

  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function pickFlowValue(flow = {}, keys = []) {
  for (const key of keys) {
    if (key in flow) {
      return flow[key];
    }
  }
  return "";
}

export function parseRateToBps(value) {
  const normalized = normalizeText(value).replace(",", ".").toUpperCase();
  if (!normalized) {
    return Number.NaN;
  }

  const match = normalized.match(/(-?\d+(?:\.\d+)?)\s*([KMG]?)(?:BPS|B\/S|B)?/);
  if (!match) {
    return Number.NaN;
  }

  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount)) {
    return Number.NaN;
  }

  const unit = match[2] || "";
  const multiplier = RATE_UNITS[unit] || 1;
  return amount * multiplier;
}

export function parsePacketCount(value) {
  const raw = normalizeText(value).replace(",", "");
  if (!raw) {
    return Number.NaN;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function hasTorchAnyTotals(totals = {}) {
  if (!totals || typeof totals !== "object") {
    return false;
  }

  return [totals.tx, totals.rx, totals.txPackets, totals.rxPackets].some(
    (value) => Boolean(normalizeText(value)),
  );
}

export function hasTorchFlowRows(flows) {
  return Array.isArray(flows) && flows.length > 0;
}

export function hasTorchTotalTraffic(totals = {}) {
  const txRate = parseRateToBps(totals.tx);
  const rxRate = parseRateToBps(totals.rx);
  const txPackets = parsePacketCount(totals.txPackets);
  const rxPackets = parsePacketCount(totals.rxPackets);

  return (
    (Number.isFinite(txRate) && txRate > 0) ||
    (Number.isFinite(rxRate) && rxRate > 0) ||
    (Number.isFinite(txPackets) && txPackets > 0) ||
    (Number.isFinite(rxPackets) && rxPackets > 0)
  );
}

export function hasTorchFlowTraffic(flows) {
  if (!hasTorchFlowRows(flows)) {
    return false;
  }

  return flows.some((flow) => {
    const txRateValue = pickFlowValue(flow, [
      "tx_rate",
      "tx-rate",
      "txRate",
      "tx",
    ]);
    const rxRateValue = pickFlowValue(flow, [
      "rx_rate",
      "rx-rate",
      "rxRate",
      "rx",
    ]);
    const txPacketValue = pickFlowValue(flow, [
      "tx_pack",
      "tx_packets",
      "tx-packets",
      "txPacket",
    ]);
    const rxPacketValue = pickFlowValue(flow, [
      "rx_pack",
      "rx_packets",
      "rx-packets",
      "rxPacket",
    ]);

    const txRate = parseRateToBps(txRateValue);
    const rxRate = parseRateToBps(rxRateValue);
    const txPackets = parsePacketCount(txPacketValue);
    const rxPackets = parsePacketCount(rxPacketValue);

    if (
      (Number.isFinite(txRate) && txRate > 0) ||
      (Number.isFinite(rxRate) && rxRate > 0) ||
      (Number.isFinite(txPackets) && txPackets > 0) ||
      (Number.isFinite(rxPackets) && rxPackets > 0)
    ) {
      return true;
    }

    const fallbackNumericValues = [
      parseFirstNumber(txRateValue),
      parseFirstNumber(rxRateValue),
      parseFirstNumber(txPacketValue),
      parseFirstNumber(rxPacketValue),
    ];
    return fallbackNumericValues.some(
      (value) => Number.isFinite(value) && value > 0,
    );
  });
}

export function hasTorchTraffic(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return false;
  }

  return (
    hasTorchTotalTraffic(snapshot.totals) || hasTorchFlowTraffic(snapshot.flows)
  );
}

export function scoreTorchSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return -1;
  }

  const totals = snapshot.totals || {};
  const hasTraffic = hasTorchTraffic(snapshot);
  const hasRows = hasTorchFlowRows(snapshot.flows);
  const hasTotals = hasTorchAnyTotals(totals);
  const errorText = normalizeText(snapshot.error);

  let score = 0;
  if (hasTraffic) {
    score += 1000;
  }
  if (hasRows) {
    score += 15;
  }
  if (hasTotals) {
    score += 25;
  }
  if (errorText) {
    score -= 500;
  }

  return score;
}

export function selectBetterTorchSnapshot(current, candidate) {
  if (!candidate) {
    return current;
  }
  if (!current) {
    return candidate;
  }

  const currentScore = scoreTorchSnapshot(current);
  const candidateScore = scoreTorchSnapshot(candidate);
  if (candidateScore > currentScore) {
    return candidate;
  }

  return current;
}

export const __testables__ = {
  parseFirstNumber,
};
