import { __testables__ } from "../../../../src/features/coordinates/coordinateMapButton.js";

describe("coordinateMapButton helpers", () => {
  const { ensureCoordinateInlineContainer, ensureCoordinateButton } = __testables__;

  it("wraps coordinates input only once across repeated executions", () => {
    document.body.innerHTML = `
      <div class="controls">
        <input id="id_cliente-coordenadas" class="form-control" />
      </div>
    `;

    const input = document.getElementById("id_cliente-coordenadas");
    const first = ensureCoordinateInlineContainer(input);
    const second = ensureCoordinateInlineContainer(input);

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first).toBe(second);
    expect(document.querySelectorAll(".wisphub-yaa-coordinates-inline").length).toBe(1);
    expect(input.closest(".wisphub-yaa-coordinates-inline")).toBe(first);
  });

  it("returns null when input is missing or detached", () => {
    expect(ensureCoordinateInlineContainer(null)).toBeNull();

    const detached = document.createElement("input");
    expect(ensureCoordinateInlineContainer(detached)).toBeNull();
  });

  it("injects map button whenever the coordinates field exists", () => {
    document.body.innerHTML = `
      <div class="form-group" id="content-maps">
        <label class="control-label" for="id_cliente-coordenadas">Coordenadas</label>
        <div class="controls">
          <input id="id_cliente-coordenadas" class="form-control" value="19.39,-103.72" />
        </div>
      </div>
    `;

    const injected = ensureCoordinateButton();
    expect(injected).toBe(true);
    expect(document.getElementById("wisphub-yaa-open-coordinates-map-btn")).not.toBeNull();
  });
});
