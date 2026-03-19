import { __testables__ } from "../../../../src/features/tickets/ticketActions.js";

describe("ticketActions map button", () => {
  const {
    buildClientMapUrlFromUsername,
    resolveTicketMapUrl,
    injectTicketCopyButtons,
  } = __testables__;

  it("builds /clientes-mapa fallback URL from username", () => {
    const mapUrl = buildClientMapUrlFromUsername("0485@yaa-connect");
    expect(mapUrl).toBe(
      `${window.location.origin}/clientes-mapa/0485@yaa-connect/485/`,
    );
  });

  it("resolves map URL from Dirección before fallback", () => {
    document.body.innerHTML = `
      <table id="data-table-tickets">
        <thead>
          <tr>
            <th>Acción</th>
            <th>Cliente</th>
            <th>Dirección</th>
            <th>Usuario</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="accion"><a href="/tickets/ver/11493/">Ver</a></td>
            <td class="cliente">Cliente demo</td>
            <td class="cliente__perfilusuario__direccion">
              <div class="parrafo">HTTPS://MAPS.APP.GOO.GL/NSZNCSKYF1C53U8M6</div>
            </td>
            <td class="usuario">9707@yaa-internet-by-vw</td>
          </tr>
        </tbody>
      </table>
    `;

    const table = document.getElementById("data-table-tickets");
    const row = table.querySelector("tbody tr");
    const mapUrl = resolveTicketMapUrl(row, table);

    expect(mapUrl).toBe("HTTPS://MAPS.APP.GOO.GL/NSZNCSKYF1C53U8M6");
  });

  it("injects copy and map buttons in ticket action column", () => {
    document.body.innerHTML = `
      <table id="data-table-tickets">
        <thead>
          <tr>
            <th>Acción</th>
            <th>Dirección</th>
            <th>Usuario</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="accion"><a href="/tickets/ver/11493/">Ver</a></td>
            <td class="cliente__perfilusuario__direccion">
              <div class="parrafo">HTTPS://MAPS.APP.GOO.GL/IUBZK1NXI2UQDOVL7</div>
            </td>
            <td class="usuario">10295@yaa-internet-by-vw</td>
          </tr>
          <tr>
            <td class="accion"><a href="/tickets/ver/11489/">Ver</a></td>
            <td class="cliente__perfilusuario__direccion">
              <div class="parrafo">Emiliano Zapata #3</div>
            </td>
            <td class="usuario">0485@yaa-connect</td>
          </tr>
        </tbody>
      </table>
    `;

    const result = injectTicketCopyButtons();
    const rows = document.querySelectorAll("#data-table-tickets tbody tr");
    const firstMap = rows[0].querySelector(".wisphub-yaa-ticket-map-btn");
    const secondMap = rows[1].querySelector(".wisphub-yaa-ticket-map-btn");
    const firstCopy = rows[0].querySelector(".wisphub-yaa-ticket-copy-btn");
    const secondCopy = rows[1].querySelector(".wisphub-yaa-ticket-copy-btn");

    expect(result.copyCount).toBe(2);
    expect(result.mapCount).toBe(2);
    expect(firstCopy).not.toBeNull();
    expect(secondCopy).not.toBeNull();
    expect(firstCopy.classList.contains("wisphub-yaa-copy-control")).toBe(true);
    expect(secondCopy.classList.contains("wisphub-yaa-copy-control")).toBe(true);
    expect(firstMap.getAttribute("target")).toBeNull();
    expect(secondMap.getAttribute("target")).toBeNull();
    expect(firstMap.getAttribute("href")).toBe(
      "HTTPS://MAPS.APP.GOO.GL/IUBZK1NXI2UQDOVL7",
    );
    expect(secondMap.getAttribute("href")).toBe(
      `${window.location.origin}/clientes-mapa/0485@yaa-connect/485/`,
    );
  });
});
