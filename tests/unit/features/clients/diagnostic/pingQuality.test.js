/* @vitest-environment node */
import {
  parsePacketLossPercentage,
  PING_HEALTH,
  resolvePingHealth,
} from "../../../../../src/features/clients/diagnostic/pingQuality.js";

describe("pingQuality", () => {
  it("parses packet loss values with percent and comma decimals", () => {
    expect(parsePacketLossPercentage("100%")).toBe(100);
    expect(parsePacketLossPercentage("0")).toBe(0);
    expect(parsePacketLossPercentage("12,5")).toBe(12.5);
  });

  it("resolves ping health consistently from packet loss percentage", () => {
    expect(resolvePingHealth(Number.NaN)).toBe(PING_HEALTH.UNKNOWN);
    expect(resolvePingHealth(0)).toBe(PING_HEALTH.HEALTHY);
    expect(resolvePingHealth(5)).toBe(PING_HEALTH.DEGRADED);
    expect(resolvePingHealth(100)).toBe(PING_HEALTH.DOWN);
    expect(resolvePingHealth(130)).toBe(PING_HEALTH.DOWN);
  });
});

