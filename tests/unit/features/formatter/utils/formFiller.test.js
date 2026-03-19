import {
  autoFillFormFields,
  uppercaseFormFields,
} from "../../../../../src/features/formatter/utils/formFiller.js";

describe("formFiller", () => {
  it("auto-selects 'Pagina Internet' for pre-install comments when auto-fill is enabled", () => {
    document.body.innerHTML = `
      <select id="id_cliente-forma_contratacion">
        <option value="">---------</option>
        <option value="pagina_internet">Página Internet</option>
      </select>
    `;

    autoFillFormFields(
      {
        isPreInstallFormComment: true,
      },
      { autoFillEnabled: true },
    );

    const select = document.getElementById("id_cliente-forma_contratacion");
    expect(select.value).toBe("pagina_internet");
  });

  it("does not auto-select 'Pagina Internet' when auto-fill switch is disabled", () => {
    document.body.innerHTML = `
      <select id="id_cliente-forma_contratacion">
        <option value="" selected>---------</option>
        <option value="pagina_internet">Página Internet</option>
      </select>
    `;

    autoFillFormFields(
      {
        isPreInstallFormComment: true,
      },
      { autoFillEnabled: false },
    );

    const select = document.getElementById("id_cliente-forma_contratacion");
    expect(select.value).toBe("");
  });

  it("keeps coordinates URL untouched during auto-fill", () => {
    document.body.innerHTML = `
      <div class="controls">
        <input
          id="id_cliente-coordenadas"
          value="https://www.google.com/maps?q=19.2359169,-103.7155725"
          class="form-control"
        />
      </div>
    `;

    autoFillFormFields({ isPreInstallFormComment: false }, { autoFillEnabled: true });

    const field = document.getElementById("id_cliente-coordenadas");
    expect(field.value).toBe(
      "https://www.google.com/maps?q=19.2359169,-103.7155725",
    );
  });

  it("uppercases text but preserves URLs exactly in the address field", () => {
    document.body.innerHTML = `
      <div class="controls">
        <textarea id="id_perfil-direccion">calle colon https://maps.app.goo.gl/tPuZaJzqUNaKGrck6 (Ref: puerta azul)</textarea>
      </div>
    `;

    uppercaseFormFields();

    const field = document.getElementById("id_perfil-direccion");
    expect(field.value).toBe(
      "CALLE COLON https://maps.app.goo.gl/tPuZaJzqUNaKGrck6 (Ref: puerta azul)",
    );
  });
});
