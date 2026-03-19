import { __testables__ } from "../../../../../src/features/formatter/utils/formGuards.js";

describe("formGuards helpers", () => {
  const { extractPlanPriceFromText, hasFormValidationErrors, parseMoney } =
    __testables__;

  it("extracts plan price with different formats", () => {
    expect(extractPlanPriceFromText("20 MEGAS(350)-Simple Queue")).toBe("350");
    expect(extractPlanPriceFromText("20 MEGAS ($350)-Simple Queue")).toBe(
      "350",
    );
    expect(extractPlanPriceFromText("20 MEGAS / $350-Simple Queue")).toBe(
      "350",
    );
    expect(extractPlanPriceFromText("PLAN PRUEBA SIN PRECIO")).toBe(null);
  });

  it("detects visible validation errors in form", () => {
    document.body.innerHTML = `
      <form id="f1">
        <div class="form-group has-error"></div>
      </form>
    `;
    const form = document.getElementById("f1");
    expect(hasFormValidationErrors(form)).toBe(true);

    document.body.innerHTML = `
      <form id="f2">
        <input aria-invalid="true" />
      </form>
    `;
    const form2 = document.getElementById("f2");
    expect(hasFormValidationErrors(form2)).toBe(true);

    document.body.innerHTML = `
      <form id="f3">
        <span class="help-block has-error" style="display:none;">Error</span>
      </form>
    `;
    const form3 = document.getElementById("f3");
    expect(hasFormValidationErrors(form3)).toBe(false);
  });

  it("parses money values consistently", () => {
    expect(parseMoney("$1,250")).toBe(1250);
    expect(parseMoney("350")).toBe(350);
    expect(parseMoney("")).toBe(null);
  });
});
