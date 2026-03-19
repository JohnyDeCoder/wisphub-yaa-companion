import { __testables__ } from "../../../../src/features/clients/clientPhoneLinks.js";

describe("clientPhoneLinks map resolution", () => {
  const {
    processMainTable,
    resolveMapFromText,
    resolveMapUrlFromRow,
    addActionButtons,
    buildClientProvisionTemplateData,
    buildClientProvisionTemplate,
    formatProvisioningName,
    resolveNameCopySettingsFromInputs,
    isSupportedPhonePage,
  } = __testables__;

  it("does not treat amounts like '$1,020' as coordinates", () => {
    expect(
      resolveMapFromText("EQUIPO COMODATO $850 + RESTANTE $170 = $1,020 MXN"),
    ).toBeNull();
  });

  it("prefers real coordinate column values and ignores comment prices", () => {
    document.body.innerHTML = `
      <table id="lista-clientes">
        <thead>
          <tr>
            <th>Coordenadas</th>
            <th>Comentarios</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>19.5981753,-103.9141518</td>
            <td>EQUIPO COMODATO $850 + RESTANTE $170 = $1,020 MXN</td>
            <td><div class="text-right"></div></td>
          </tr>
        </tbody>
      </table>
    `;

    const table = document.getElementById("lista-clientes");
    const row = table.querySelector("tbody tr");
    const mapUrl = resolveMapUrlFromRow(row, table, {
      coordinateCol: 0,
      mapSourceCols: [0, 1],
    });

    expect(mapUrl).toBe(
      "https://www.google.com/maps?q=19.5981753%2C-103.9141518",
    );
  });

  it("resolves map URLs from address/locality-like text when available", () => {
    document.body.innerHTML = `
      <table id="lista-clientes">
        <thead>
          <tr>
            <th>Dirección</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>DOMICILIO CONOCIDO https://maps.app.goo.gl/iUBZK1NXi2UqDoVL7</td>
            <td><div class="text-right"></div></td>
          </tr>
        </tbody>
      </table>
    `;

    const table = document.getElementById("lista-clientes");
    const row = table.querySelector("tbody tr");
    const mapUrl = resolveMapUrlFromRow(row, table, {
      coordinateCol: -1,
      mapSourceCols: [0],
    });

    expect(mapUrl).toBe("https://maps.app.goo.gl/iUBZK1NXi2UqDoVL7");
  });

  it("resolves map from comments column when valid coordinates exist", () => {
    document.body.innerHTML = `
      <table id="lista-clientes">
        <thead>
          <tr>
            <th>Comentarios</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>DOMICILIO CONOCIDO, (19.39294053953474, -104.05022262936681)</td>
            <td><div class="text-right"></div></td>
          </tr>
        </tbody>
      </table>
    `;

    const table = document.getElementById("lista-clientes");
    const row = table.querySelector("tbody tr");
    const mapUrl = resolveMapUrlFromRow(row, table, {
      coordinateCol: -1,
      mapSourceCols: [0],
    });

    expect(mapUrl).toBe(
      "https://www.google.com/maps?q=19.39294053953474%2C-104.05022262936681",
    );
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

  it("keeps same-tab navigation for map action button", () => {
    document.body.innerHTML = `
      <div class="text-right"></div>
    `;

    const container = document.querySelector(".text-right");
    const mapUrl = "https://www.google.com/maps?q=19.5%2C-103.5";

    const injected = addActionButtons(container, { mapUrl });
    const mapBtn = container.querySelector(".wisphub-yaa-action-btn-map");
    expect(injected).toBe(true);
    expect(mapBtn).not.toBeNull();
    expect(mapBtn.getAttribute("target")).toBeNull();

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    const dispatched = mapBtn.dispatchEvent(event);
    expect(dispatched).toBe(true);
    expect(event.defaultPrevented).toBe(false);
  });

  it("adds map button on second pass for already processed action containers", () => {
    document.body.innerHTML = `
      <div class="text-right">
        <a href="/clientes/ver/4552@yaa-internet-by-vw/">Ver</a>
      </div>
    `;

    const container = document.querySelector(".text-right");
    const initialResult = addActionButtons(container, { skipViewClient: true });
    expect(initialResult).toBe(true);
    expect(container.querySelector(".wisphub-yaa-action-btn-map")).toBeNull();

    const mapUrl = "https://www.google.com/maps?q=19.362602%2C-103.82448";
    const secondResult = addActionButtons(container, { mapUrl });
    const mapBtn = container.querySelector(".wisphub-yaa-action-btn-map");
    expect(secondResult).toBe(true);
    expect(mapBtn).not.toBeNull();
    expect(mapBtn.getAttribute("target")).toBeNull();

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    const dispatched = mapBtn.dispatchEvent(event);
    expect(dispatched).toBe(true);
    expect(event.defaultPrevented).toBe(false);
  });

  it("supports /preinstalaciones/ list pages", () => {
    const previousUrl = window.location.href;
    window.history.pushState({}, "", "/preinstalaciones/");
    expect(isSupportedPhonePage()).toBe(true);
    window.history.pushState({}, "", previousUrl);
  });

  it("injects map action button in /Instalaciones/ when Dirección has maps URL", () => {
    const previousUrl = window.location.href;
    window.history.pushState({}, "", "/Instalaciones/");

    document.body.innerHTML = `
      <table id="lista-instalaciones">
        <thead>
          <tr>
            <th>ID</th>
            <th>Dirección</th>
            <th>Comentarios</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>10295</td>
            <td><div class="parrafo">HTTPS://MAPS.APP.GOO.GL/IUBZK1NXI2UQDOVL7</div></td>
            <td><p>CLIENTE NUEVO</p></td>
            <td style="display:none;">
              <div class="text-right">
                <a class="btn btn-primary btn-sm" href="/Instalaciones/editar/10295@yaa-internet-by-vw/10295/">Editar</a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    `;

    const table = document.getElementById("lista-instalaciones");
    const result = processMainTable(table);
    const mapBtn = table.querySelector(".wisphub-yaa-action-btn-map");

    expect(result.actionCount).toBeGreaterThan(0);
    expect(mapBtn).not.toBeNull();
    expect(mapBtn.getAttribute("href")).toBe(
      "HTTPS://MAPS.APP.GOO.GL/IUBZK1NXI2UQDOVL7",
    );

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

    expect(payload).toContain("{{POR LLENAR / PASSWORD HOTSPOT }}");
    expect(payload).toContain("{{POR LLENAR / EQUIPOS }}");
    expect(data.missingFields).toEqual([
      "PASSWORD HOTSPOT",
      "EQUIPOS",
    ]);
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

      expect(lines[3]).toBe("{{POR LLENAR / PASSWORD HOTSPOT }}");
      expect(lines[4]).toBe("RB SANTA MARIA (62)");
    } finally {
      window.jQuery = previousJQuery;
    }
  });

  it("keeps only equipment type label from long equipment lines", () => {
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
            <td></td>
            <td>RB SANTA MARIA (62)</td>
            <td>FRACCIONAMIENTO VILLA MAGNA</td>
            <td>192.168.62.25</td>
            <td>Activo</td>
            <td>20 MEGAS(350)</td>
            <td><p><strong>CLIENTE NUEVO<br>EQUIPO COMODATO $ + RESTANTE DE MES MARZO $ = $</strong></p></td>
          </tr>
        </tbody>
      </table>
    `;

    const table = document.getElementById("lista-clientes");
    const row = table.querySelector("tbody tr");
    const payload = buildClientProvisionTemplate(row, table);
    const lines = payload.split("\n");

    expect(lines[lines.length - 1]).toBe("EQUIPO COMODATO");
  });

  it("formats names for provisioning with default and custom options", () => {
    expect(formatProvisioningName("FEDRA ALEJANDRA MARTINEZ Cruz")).toBe(
      "FEDRA_ALEJANDRA_MARTINEZ_CRUZ",
    );

    expect(
      formatProvisioningName("FEDRA ALEJANDRA MARTINEZ Cruz", {
        casing: "lower",
        separator: " ",
      }),
    ).toBe("fedra alejandra martinez cruz");

    expect(
      formatProvisioningName("MAIRA ANGELINA VARGAS REYES - 2", {
        casing: "title",
        separator: "_",
      }),
    ).toBe("Maira_Angelina_Vargas_Reyes_2");

    expect(
      formatProvisioningName("PROVEEDORA AGRICOLA TECOMAN -2", {
        casing: "title",
        separator: "_",
      }),
    ).toBe("Proveedora_Agricola_Tecoman_2");
  });

  it("supports reset keyword for name copy settings in either step", () => {
    const resetAtStepOne = resolveNameCopySettingsFromInputs("reset", "_");
    expect(resetAtStepOne.status).toBe("saved");
    expect(resetAtStepOne.reset).toBe(true);
    expect(resetAtStepOne.settings).toEqual({
      casing: "upper",
      separator: "_",
    });

    const resetAtStepTwo = resolveNameCopySettingsFromInputs("lower", "reset");
    expect(resetAtStepTwo.status).toBe("saved");
    expect(resetAtStepTwo.reset).toBe(true);
    expect(resetAtStepTwo.settings).toEqual({
      casing: "upper",
      separator: "_",
    });
  });

  it("supports empty separator as single space in settings input", () => {
    const result = resolveNameCopySettingsFromInputs("lower", "");
    expect(result.status).toBe("saved");
    expect(result.reset).toBe(false);
    expect(result.settings).toEqual({
      casing: "lower",
      separator: " ",
    });
  });

  it("supports separator aliases and quoted-space as single space", () => {
    const aliasCases = ["vacio", "vacío", "ESPACIO", '" "', "' '"];

    aliasCases.forEach((separatorInput) => {
      const result = resolveNameCopySettingsFromInputs("lower", separatorInput);
      expect(result.status).toBe("saved");
      expect(result.settings?.separator).toBe(" ");
    });
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

  it("keeps name copy icon aligned with txt-overflow name containers", () => {
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
            <th>Router</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="user"><div class="txt-overflow">MARIA SOFIA RAMIREZ SANCHEZ</div></td>
            <td><a href="/clientes/editar/servicio/2129@yaa-connect/2129/">2129</a></td>
            <td>10.0.50.26</td>
            <td>Activo</td>
            <td>50Mb / $350 BASICO 5</td>
            <td>RB TEPAMES FTTX</td>
            <td><div class="text-right"><a href="/clientes/ver/2129@yaa-connect/">Ver</a></div></td>
          </tr>
        </tbody>
      </table>
    `;

    const table = document.getElementById("lista-clientes");
    processMainTable(table);

    const nameCell = table.querySelector("tbody tr td.user");
    const host = nameCell.querySelector(".txt-overflow");
    const copyLink = nameCell.querySelector(
      ".wisphub-yaa-client-name-copy-link",
    );

    expect(host).not.toBeNull();
    expect(host.classList.contains("wisphub-yaa-client-name-text-host")).toBe(
      true,
    );
    expect(copyLink).not.toBeNull();
    expect(copyLink.classList.contains("wisphub-yaa-copy-control")).toBe(true);
    expect(host.nextElementSibling).toBe(copyLink);

    window.history.pushState({}, "", previousUrl);
  });
});
