/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import { normalizeValue, removeAccents } from "../../../src/utils/string.js";

describe("normalizeValue", () => {
  it("lowercases and trims a string", () => {
    expect(normalizeValue("  HELLO  ")).toBe("hello");
  });

  it("handles null and undefined gracefully", () => {
    expect(normalizeValue(null)).toBe("");
    expect(normalizeValue(undefined)).toBe("");
  });

  it("coerces numbers to string", () => {
    expect(normalizeValue(42)).toBe("42");
  });
});

describe("removeAccents", () => {
  it("strips diacritical marks", () => {
    expect(removeAccents("José")).toBe("Jose");
    expect(removeAccents("ñoño")).toBe("nono");
    expect(removeAccents("Ángel")).toBe("Angel");
  });

  it("leaves plain ASCII unchanged", () => {
    expect(removeAccents("hello")).toBe("hello");
  });

  it("handles null and empty gracefully", () => {
    expect(removeAccents(null)).toBe("");
    expect(removeAccents("")).toBe("");
  });
});
