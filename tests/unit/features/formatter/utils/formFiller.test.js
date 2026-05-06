/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import { uppercaseFormFields } from "../../../../../src/features/formatter/utils/formFiller.js";

function setField(id, value) {
  let field = document.getElementById(id);
  if (!field) {
    field = document.createElement("input");
    field.id = id;
    field.type = "text";
    document.body.appendChild(field);
  }
  field.value = value;
  return field;
}

describe("uppercaseFormFields — name fields accent removal", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("converts accented first name to uppercase without accents", () => {
    setField("id_usr-first_name", "Florencia");
    uppercaseFormFields();
    expect(document.getElementById("id_usr-first_name").value).toBe("FLORENCIA");
  });

  it("removes accents from first name", () => {
    setField("id_usr-first_name", "Jos\u00e9");
    uppercaseFormFields();
    expect(document.getElementById("id_usr-first_name").value).toBe("JOSE");
  });

  it("removes accents from last name", () => {
    setField("id_usr-last_name", "Jim\u00e9nez");
    uppercaseFormFields();
    expect(document.getElementById("id_usr-last_name").value).toBe("JIMENEZ");
  });

  it("handles multiple accented chars", () => {
    setField("id_usr-first_name", "\u00c1ngela");
    uppercaseFormFields();
    expect(document.getElementById("id_usr-first_name").value).toBe("ANGELA");
  });

  it("does NOT strip accents from non-name uppercase fields (ciudad)", () => {
    setField("id_perfil-ciudad", "M\u00e9xico");
    uppercaseFormFields();
    // ciudad uppercases but keeps accents
    expect(document.getElementById("id_perfil-ciudad").value).toBe("M\u00c9XICO");
  });
});
