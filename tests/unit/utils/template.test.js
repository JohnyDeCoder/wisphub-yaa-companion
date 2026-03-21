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

});
