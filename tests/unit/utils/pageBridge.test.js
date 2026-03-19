import { vi } from "vitest";
import {
  BRIDGE_META,
  buildBridgeMessage,
  clearBridgeToken,
  generateBridgeToken,
  getBridgeToken,
  isBridgeMessage,
  isMessageTokenValid,
  postBridgeMessage,
  setBridgeToken,
} from "../../../src/utils/pageBridge.js";

describe("pageBridge", () => {
  beforeEach(() => {
    clearBridgeToken();
  });

  it("stores and reads a valid token", () => {
    expect(setBridgeToken("short-token")).toBe(false);
    expect(getBridgeToken()).toBe("");

    const validToken = "1234567890abcdef";
    expect(setBridgeToken(validToken)).toBe(true);
    expect(getBridgeToken()).toBe(validToken);
  });

  it("builds bridge messages with channel metadata", () => {
    const token = "abcdef0123456789";
    setBridgeToken(token);

    const message = buildBridgeMessage("PING", { ok: true });

    expect(message.type).toBe("PING");
    expect(message.ok).toBe(true);
    expect(message[BRIDGE_META.CHANNEL_FIELD]).toBeDefined();
    expect(message[BRIDGE_META.TOKEN_FIELD]).toBe(token);
    expect(isBridgeMessage(message)).toBe(true);
  });

  it("can build a message without token", () => {
    const message = buildBridgeMessage("PING", {}, { includeToken: false });
    expect(message[BRIDGE_META.TOKEN_FIELD]).toBeUndefined();
  });

  it("validates message token correctly", () => {
    const expectedToken = "abcdef0123456789";
    const message = buildBridgeMessage(
      "PING",
      {},
      { token: expectedToken, includeToken: true },
    );

    expect(isMessageTokenValid(message, expectedToken)).toBe(true);
    expect(isMessageTokenValid(message, "different-token-123")).toBe(false);
    expect(isMessageTokenValid({ type: "PING" }, expectedToken)).toBe(false);
  });

  it("does not post when token is required but missing", () => {
    const spy = vi.spyOn(window, "postMessage");

    const sent = postBridgeMessage("PING", {}, { requireToken: true });
    expect(sent).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it("posts message when token is present", () => {
    const token = "abcdef0123456789";
    setBridgeToken(token);
    const spy = vi.spyOn(window, "postMessage");

    const sent = postBridgeMessage("PING", { foo: "bar" }, { requireToken: true });
    expect(sent).toBe(true);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "PING",
        foo: "bar",
        [BRIDGE_META.TOKEN_FIELD]: token,
      }),
      window.location.origin,
    );
  });

  it("generates a non-empty token", () => {
    const token = generateBridgeToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThanOrEqual(16);
    expect(token).toMatch(/^[a-f0-9]+$/i);
  });
});
