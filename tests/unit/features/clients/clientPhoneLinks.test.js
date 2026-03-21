import { __testables__ } from "../../../../src/features/clients/clientPhoneLinks.js";

describe("clientPhoneLinks map resolution", () => {
  const {
    processMainTable,
    resolveMapFromText,
    resolveMapUrlFromRow,
    buildClientProvisionTemplateData,
    buildClientProvisionTemplate,
  } = __testables__;

  it("does not treat amounts like '$1,020' as coordinates", () => {
    expect(
      resolveMapFromText("EQUIPO COMODATO $850 + RESTANTE $170 = $1,020 MXN"),
    ).toBeNull();
  });

  it("on /Instalaciones/ prioritizes Dirección over Comentarios and Coordenadas", () => {
    const previousUrl = window.location.href;
    window.history.pushState({}, "", "/Instalaciones/");

    document.body.innerHTML = `
      <table id="lista-instalaciones">
        <thead>
          <tr>
            <th>Coordenadas</th>
            <th>Dirección</th>
            <th>Comentarios</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>19.5001,-103.7001</td>
            <td>DOMICILIO https://maps.app.goo.gl/iUBZK1NXi2UqDoVL7</td>
            <td>DOMICILIO CONOCIDO, (19.39294053953474, -104.05022262936681)</td>
            <td><div class="text-right"></div></td>
          </tr>
        </tbody>
      </table>
    `;

    const table = document.getElementById("lista-instalaciones");
    const row = table.querySelector("tbody tr");
    const mapUrl = resolveMapUrlFromRow(row, table, {});

    expect(mapUrl).toBe("https://maps.app.goo.gl/iUBZK1NXi2UqDoVL7");
    window.history.pushState({}, "", previousUrl);
  });

  it("on /clientes/ always adds map button with /clientes-mapa fallback", () => {
    const previousUrl = window.location.href;
    window.history.pushState({}, "", "/clientes/");

    document.body.innerHTML = `
      <table id="lista-clientes">
        <thead>
          <tr>
            <th>Servicio</th>
            <th>Dirección</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><a href="/clientes/editar/servicio/0485@yaa-connect/485/">0485</a></td>
            <td><div class="parrafo">C. 16 Septiembre 29</div></td>
            <td style="display:none;">
              <div class="text-right">
                <a href="/clientes/ver/0485@yaa-connect/">Ver cliente</a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    `;

    const table = document.getElementById("lista-clientes");
    const result = processMainTable(table);
    const mapBtn = table.querySelector(".wisphub-yaa-action-btn-map");

    expect(result.actionCount).toBeGreaterThan(0);
    expect(mapBtn).not.toBeNull();
    expect(mapBtn.getAttribute("href")).toBe(
      `${window.location.origin}/clientes-mapa/0485@yaa-connect/485/`,
    );

    window.history.pushState({}, "", previousUrl);
  });

  it("on /clientes/ prioritizes Coordenadas over Dirección for map button", () => {
    const previousUrl = window.location.href;
    window.history.pushState({}, "", "/clientes/");

    document.body.innerHTML = `
      <table id="lista-clientes">
        <thead>
          <tr>
            <th>Coordenadas</th>
            <th>Dirección</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>19.362602,-103.82448</td>
            <td>HTTPS://MAPS.APP.GOO.GL/IUBZK1NXI2UQDOVL7</td>
            <td style="display:none;">
              <div class="text-right">
                <a href="/clientes/ver/4552@yaa-internet-by-vw/">Ver cliente</a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    `;

    const table = document.getElementById("lista-clientes");
    processMainTable(table);
    const mapBtn = table.querySelector(".wisphub-yaa-action-btn-map");

    expect(mapBtn).not.toBeNull();
    expect(mapBtn.getAttribute("href")).toBe(
      "https://www.google.com/maps?q=19.362602%2C-103.82448",
    );

    window.history.pushState({}, "", previousUrl);
  });

  it("builds the provisioning template with migration and equipment line", () => {
    document.body.innerHTML = `
      <table id="lista-clientes">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Servicio</th>
            <th>Password Hotspot</th>
            <th>Router</th>
            <th>Barrio/Localidad</th>
            <th>Ip</th>
            <th>Estado</th>
            <th>Plan Internet</th>
            <th>Comentarios</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>LUZ ALEJANDRA DIAZ REYES</td>
            <td>2205</td>
            <td>LADR12345</td>
            <td>RB COALCOMAN FTTX</td>
            <td>COALCOMAN 1</td>
            <td>10.10.2.122</td>
            <td>Activo</td>
            <td>30MB / $400.00 MARUATA</td>
            <td><p><strong>MIGRACION<br><br>EQUIPOS PRESTADOS</strong></p></td>
          </tr>
        </tbody>
      </table>
    `;

    const table = document.getElementById("lista-clientes");
    const row = table.querySelector("tbody tr");
    const data = buildClientProvisionTemplateData(row, table);
    const payload = buildClientProvisionTemplate(row, table);

    expect(payload).toBe(
      [
        "MIGRACION",
        "LUZ ALEJANDRA DIAZ REYES",
        "2205",
        "LADR12345",
        "RB COALCOMAN FTTX",
        "COALCOMAN 1",
        "10.10.2.122",
        "Activo",
        "30MB / $400.00 MARUATA",
        "EQUIPOS PRESTADOS",
      ].join("\n"),
    );
    expect(data.missingFields).toEqual([]);
  });

  it("uses placeholders when service password or equipment line is missing", () => {
    document.body.innerHTML = `
      <table id="lista-clientes">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Servicio</th>
            <th>Router</th>
            <th>Barrio/Localidad</th>
            <th>Ip</th>
            <th>Estado</th>
            <th>Plan Internet</th>
            <th>Comentarios</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>FEDRA ALEJANDRA MARTINEZ Cruz</td>
            <td>9012</td>
            <td>PPPOE DIAMANTES</td>
            <td>COLIMA CENTRO</td>
            <td>10.20.30.40</td>
            <td>Activo</td>
            <td>50MB / $499.00</td>
            <td><p><strong>CLIENTE NUEVO</strong></p></td>
          </tr>
        </tbody>
      </table>
    `;

    const table = document.getElementById("lista-clientes");
    const row = table.querySelector("tbody tr");
    const data = buildClientProvisionTemplateData(row, table);
    const payload = buildClientProvisionTemplate(row, table);

    expect(payload).toContain("*{{POR LLENAR / PASSWORD HOTSPOT }}*");
    expect(payload).toContain("*{{POR LLENAR / EQUIPOS }}*");
    expect(data.missingFields).toEqual([
      "PASSWORD HOTSPOT",
      "EQUIPOS",
    ]);
  });

  it("uses dynamic placeholders for every missing provisioning field", () => {
    document.body.innerHTML = `
      <table id="lista-clientes">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Servicio</th>
            <th>Router</th>
            <th>Comentarios</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>HECTOR SANTANA VALENCIA</td>
            <td>2253</td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    `;

    const table = document.getElementById("lista-clientes");
    const row = table.querySelector("tbody tr");
    const payload = buildClientProvisionTemplate(row, table);
    const lines = payload.split("\n");

    expect(lines[0]).toBe("*{{POR LLENAR / ETAPA }}*");
    expect(lines[1]).toBe("HECTOR SANTANA VALENCIA");
    expect(lines[2]).toBe("2253");
    expect(lines[3]).toBe("*{{POR LLENAR / PASSWORD HOTSPOT }}*");
    expect(lines[4]).toBe("*{{POR LLENAR / ROUTER }}*");
    expect(lines[5]).toBe("*{{POR LLENAR / LOCALIDAD }}*");
    expect(lines[6]).toBe("*{{POR LLENAR / IP }}*");
    expect(lines[7]).toBe("*{{POR LLENAR / ESTADO }}*");
    expect(lines[8]).toBe("*{{POR LLENAR / PLAN INTERNET }}*");
    expect(lines[9]).toBe("*{{POR LLENAR / EQUIPOS }}*");
  });

  it("preserves empty DataTable values without DOM-index fallback", () => {
    const previousJQuery = window.jQuery;

    document.body.innerHTML = `
      <table id="lista-clientes">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Servicio</th>
            <th>Password Hotspot</th>
            <th>Router</th>
            <th>Barrio/Localidad</th>
            <th>Ip</th>
            <th>Estado</th>
            <th>Plan Internet</th>
            <th>Comentarios</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>MAIRA ANGELINA VARGAS REYES</td>
            <td>10134</td>
            <td>RB SANTA MARIA (62)</td>
            <td>FRACCIONAMIENTO VILLA MAGNA</td>
            <td>192.168.62.25</td>
            <td>Activo</td>
            <td>20 MEGAS(350)</td>
            <td><p><strong>CLIENTE NUEVO</strong></p></td>
          </tr>
        </tbody>
      </table>
    `;

    const table = document.getElementById("lista-clientes");
    const row = table.querySelector("tbody tr");
    const headers = Array.from(table.querySelectorAll("thead th"));
    const rowData = [
      "MAIRA ANGELINA VARGAS REYES",
      "10134",
      "",
      "RB SANTA MARIA (62)",
      "FRACCIONAMIENTO VILLA MAGNA",
      "192.168.62.25",
      "Activo",
      "20 MEGAS(350)",
      "<p><strong>CLIENTE NUEVO</strong></p>",
    ];

    const fakeDataTable = {
      columns: () => ({
        header: () => ({
          toArray: () => headers,
        }),
      }),
      cell: (_row, colIndex) => ({
        data: () => rowData[colIndex],
      }),
      row: () => ({
        data: () => rowData,
      }),
    };

    const jQueryMock = (target) => {
      if (target === table || target === "#lista-clientes") {
        return {
          length: 1,
          DataTable: () => fakeDataTable,
        };
      }

      if (target instanceof window.HTMLElement) {
        return {
          length: 1,
          text: () => target.textContent || "",
        };
      }

      return {
        length: 0,
        DataTable: () => fakeDataTable,
        text: () => "",
      };
    };

    jQueryMock.fn = {
      DataTable: {
        isDataTable: () => true,
      },
    };
    window.jQuery = jQueryMock;

    try {
      const payload = buildClientProvisionTemplate(row, table);
      const lines = payload.split("\n");

      expect(lines[3]).toBe("*{{POR LLENAR / PASSWORD HOTSPOT }}*");
      expect(lines[4]).toBe("RB SANTA MARIA (62)");
    } finally {
      window.jQuery = previousJQuery;
    }
  });

  it("injects provisioning and name copy buttons on /clientes/", () => {
    const previousUrl = window.location.href;
    window.history.pushState({}, "", "/clientes/");

    document.body.innerHTML = `
      <table id="lista-clientes">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Servicio</th>
            <th>Ip</th>
            <th>Estado</th>
            <th>Plan Internet</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>FEDRA ALEJANDRA MARTINEZ Cruz</td>
            <td><a href="/clientes/editar/servicio/9012@yaa-internet-by-vw/9012/">9012</a></td>
            <td>10.20.30.40</td>
            <td>Activo</td>
            <td>50MB / $499.00</td>
            <td><div class="text-right"><a href="/clientes/ver/9012@yaa-internet-by-vw/">Ver</a></div></td>
          </tr>
        </tbody>
      </table>
    `;

    const table = document.getElementById("lista-clientes");
    processMainTable(table);
    const actionCell = table.querySelector("tbody tr td:last-child");
    const actionButtons = actionCell.querySelectorAll(
      ".wisphub-yaa-action-btn",
    );
    const lastButton = actionButtons[actionButtons.length - 1];

    expect(
      table.querySelector(".wisphub-yaa-client-template-copy-btn"),
    ).not.toBeNull();
    const diagnosticButton = table.querySelector(
      ".wisphub-yaa-action-btn-diagnostic",
    );
    expect(diagnosticButton).toBeNull();
    const nameCopyLink = table.querySelector(".wisphub-yaa-client-name-copy-link");
    expect(nameCopyLink).not.toBeNull();
    expect(
      lastButton.classList.contains("wisphub-yaa-client-template-copy-btn"),
    ).toBe(true);
    expect(lastButton.classList.contains("wisphub-yaa-copy-control")).toBe(true);
    expect(nameCopyLink.classList.contains("wisphub-yaa-copy-control")).toBe(
      true,
    );

    window.history.pushState({}, "", previousUrl);
  });

  it("is idempotent on repeated passes and does not keep mutating action order", () => {
    const previousUrl = window.location.href;
    window.history.pushState({}, "", "/clientes/");

    document.body.innerHTML = `
      <table id="lista-clientes">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Servicio</th>
            <th>Ip</th>
            <th>Estado</th>
            <th>Plan Internet</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>FEDRA ALEJANDRA MARTINEZ CRUZ</td>
            <td><a href="/clientes/editar/servicio/9012@yaa-internet-by-vw/9012/">9012</a></td>
            <td>10.20.30.40</td>
            <td>Activo</td>
            <td>50MB / $499.00</td>
            <td><div class="text-right"><a href="/clientes/ver/9012@yaa-internet-by-vw/">Ver</a></div></td>
          </tr>
        </tbody>
      </table>
    `;

    const table = document.getElementById("lista-clientes");
    const firstPass = processMainTable(table);
    const secondPass = processMainTable(table);

    expect(firstPass.actionCount).toBeGreaterThan(0);
    expect(secondPass.actionCount).toBe(0);

    window.history.pushState({}, "", previousUrl);
  });

});
