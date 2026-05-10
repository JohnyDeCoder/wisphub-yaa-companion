import { describe, it, expect } from "vitest";
import { TRICK_DEFS, DEFAULT_TRICK_ACCENT } from "../../../src/config/tricks.js";

describe("TRICK_DEFS", () => {
  const colorTricks = Object.entries(TRICK_DEFS).filter(([, d]) => d.group === "color");
  const nonColorTricks = Object.entries(TRICK_DEFS).filter(([, d]) => d.group !== "color");

  it("all tricks have name and group", () => {
    for (const [code, def] of Object.entries(TRICK_DEFS)) {
      expect(def.name, `${code}.name`).toBeTruthy();
      expect("group" in def, `${code}.group`).toBe(true);
    }
  });

  it("color-group tricks have themeClass, accent, accentDark, rgb, darkText — except LSD", () => {
    const themed = colorTricks.filter(([code]) => code !== "LSD");
    for (const [code, def] of themed) {
      expect(def.themeClass, `${code}.themeClass`).toBeTruthy();
      expect(def.accent, `${code}.accent`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(def.accentDark, `${code}.accentDark`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(def.rgb, `${code}.rgb`).toMatch(/^\d+,\d+,\d+$/);
      expect(typeof def.darkText, `${code}.darkText`).toBe("boolean");
    }
  });

  it("non-color tricks do not have themeClass", () => {
    for (const [code, def] of nonColorTricks) {
      expect(def.themeClass, `${code} should not have themeClass`).toBeUndefined();
    }
  });

  it("non-color tricks have expected semantic groups", () => {
    expect(TRICK_DEFS.MIRROR.group).toBe("transform");
    expect(TRICK_DEFS.STRIPE.group).toBe("table");
    expect(TRICK_DEFS.RETRO.group).toBe("filter");
    expect(TRICK_DEFS.STARS.group).toBe("ambient");
  });

  it("MATRIX and KAWAII have darkText: true", () => {
    expect(TRICK_DEFS.MATRIX.darkText).toBe(true);
    expect(TRICK_DEFS.KAWAII.darkText).toBe(true);
  });

  it("OCEAN and FIRE have darkText: false", () => {
    expect(TRICK_DEFS.OCEAN.darkText).toBe(false);
    expect(TRICK_DEFS.FIRE.darkText).toBe(false);
  });

  it("all themeClasses are unique", () => {
    const classes = colorTricks.map(([, d]) => d.themeClass).filter(Boolean);
    expect(new Set(classes).size).toBe(classes.length);
  });
});

describe("DEFAULT_TRICK_ACCENT", () => {
  it("has required fields with correct formats", () => {
    expect(DEFAULT_TRICK_ACCENT.accent).toMatch(/^#[0-9a-f]{6}$/i);
    expect(DEFAULT_TRICK_ACCENT.accentDark).toMatch(/^#[0-9a-f]{6}$/i);
    expect(DEFAULT_TRICK_ACCENT.rgb).toMatch(/^\d+,\d+,\d+$/);
    expect(DEFAULT_TRICK_ACCENT.darkText).toBe(false);
  });
});
