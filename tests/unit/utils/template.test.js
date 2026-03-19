import { generateTemplate } from "../../../src/utils/template.js";

describe("template generation", () => {
  it("uses CORTESÍA label when install cost is zero", () => {
    const text = generateTemplate(() => ({
      installCost: 0,
      monthPrice: 350,
      monthLabel: "MES ABRIL",
      total: 350,
    }));

    expect(text).toContain("EQUIPO COMODATO CORTESÍA + MES ABRIL $350 = $350 MXN");
  });

  it("keeps normal install amount when install cost is greater than zero", () => {
    const text = generateTemplate(() => ({
      installCost: 850,
      monthPrice: 90,
      monthLabel: "RESTANTE DE MES MARZO",
      total: 940,
    }));

    expect(text).toContain("EQUIPO COMODATO $850 + RESTANTE DE MES MARZO $90 = $940 MXN");
  });
});
