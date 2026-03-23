/* @vitest-environment node */
import { probeDiagnosticStart } from "../../../../../src/features/clients/diagnostic/startProbe.js";

describe("diagnostic start probe", () => {
  it("reports started when execution is pending", async () => {
    const pending = new Promise(() => {});
    const result = await probeDiagnosticStart(pending);

    expect(result.started).toBe(true);
    expect(result.error).toBeNull();
  });

  it("reports not-started when execution rejects immediately", async () => {
    const error = new Error("DIAGNOSTIC_ALREADY_RUNNING");
    const immediateFailure = Promise.reject(error);

    const result = await probeDiagnosticStart(immediateFailure);

    expect(result.started).toBe(false);
    expect(result.error).toBe(error);
  });

  it("does not block startup for later failures", async () => {
    vi.useFakeTimers();
    try {
      const laterFailure = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("later-failure"));
        }, 10);
      });

      const result = await probeDiagnosticStart(laterFailure);

      expect(result.started).toBe(true);
      expect(result.error).toBeNull();
      await vi.advanceTimersByTimeAsync(20);
    } finally {
      vi.useRealTimers();
    }
  });
});


