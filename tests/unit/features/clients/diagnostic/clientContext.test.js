import {
  extractActiveClientContextFromPage,
  extractClientContextFromContainer,
  extractClientContextFromRow,
} from "../../../../../src/features/clients/diagnostic/clientContext.js";

describe("clientContext", () => {
  function setPageUrl(pathname) {
    const previousUrl = window.location.href;
    window.history.pushState({}, "", pathname);
    return () => window.history.pushState({}, "", previousUrl);
  }

  it("extracts core fields from a standard /clientes row", () => {
    const restoreUrl = setPageUrl("/clientes/");
    document.body.innerHTML = `
      <table id="lista-clientes">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Servicio</th>
            <th>Ip</th>
            <th>Plan Internet</th>
            <th>Router</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>EDUARDO MATEO LUPERCIO</td>
            <td><a href="/clientes/editar/servicio/010313@yaa-internet-by-vw/10313/">10313</a></td>
            <td>10.0.50.27</td>
            <td>20 MEGAS($300)</td>
            <td>PUERTA DEL VALLE PPOOE</td>
            <td><div class="text-right"><a href="/clientes/ver/010313@yaa-internet-by-vw/">Ver</a></div></td>
          </tr>
        </tbody>
      </table>
    `;

    const row = document.querySelector("#lista-clientes tbody tr");
    const table = document.getElementById("lista-clientes");
    const context = extractClientContextFromRow(row, table);

    expect(context).toEqual({
      serviceSlug: "010313@yaa-internet-by-vw",
      serviceId: "10313",
      clientName: "EDUARDO MATEO LUPERCIO",
      ip: "10.0.50.27",
      plan: "20 MEGAS($300)",
      router: "PUERTA DEL VALLE PPOOE",
      accountStatus: "",
      pendingBalance: "",
    });

    restoreUrl();
  });

  it("resolves the data row context from a child action container", () => {
    const restoreUrl = setPageUrl("/clientes/");
    document.body.innerHTML = `
      <table id="lista-clientes">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Servicio</th>
            <th>Ip</th>
            <th>Plan Internet</th>
            <th>Router</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>LUIS ABRAHAM SILVA</td>
            <td><a href="/clientes/editar/servicio/10309@yaa-internet-by-vw/10309/">10309</a></td>
            <td>192.168.15.46</td>
            <td>5 MEGAS ($350)</td>
            <td>RB450 Tecoman</td>
            <td><div class="text-right"><a href="/clientes/ver/10309@yaa-internet-by-vw/">Ver</a></div></td>
          </tr>
          <tr class="child">
            <td colspan="6"><div class="text-right" id="child-actions"></div></td>
          </tr>
        </tbody>
      </table>
    `;

    const container = document.getElementById("child-actions");
    const context = extractClientContextFromContainer(container);

    expect(context).toEqual({
      serviceSlug: "10309@yaa-internet-by-vw",
      serviceId: "10309",
      clientName: "LUIS ABRAHAM SILVA",
      ip: "192.168.15.46",
      plan: "5 MEGAS ($350)",
      router: "RB450 Tecoman",
      accountStatus: "",
      pendingBalance: "",
    });

    restoreUrl();
  });

  it("extracts context from /clientes/ver path without trailing slash", () => {
    const restoreUrl = setPageUrl("/clientes/ver/4552@yaa-internet-by-vw");
    document.body.innerHTML = `<h1>MARCOS GUZMAN TEODORO</h1>`;

    const context = extractActiveClientContextFromPage(
      "/clientes/ver/4552@yaa-internet-by-vw",
    );

    expect(context).toEqual({
      serviceSlug: "4552@yaa-internet-by-vw",
      serviceId: "4552",
      clientName: "MARCOS GUZMAN TEODORO",
      ip: "",
      plan: "",
      router: "",
      accountStatus: "",
      pendingBalance: "",
    });

    restoreUrl();
  });

  it("extracts pending balance and service state from /clientes/ver detail layout", () => {
    const restoreUrl = setPageUrl("/clientes/ver/0005@yaa-internet-by-vw/");
    document.body.innerHTML = `
      <div class="page-header">
        <h1 class="pull-left"><span>0005@yaa-internet-by-vw</span></h1>
      </div>
      <input id="id_perfil-saldo" value="450.00" />
      <table id="DataTables_Table_0">
        <thead>
          <tr>
            <th>Nombre en RB</th>
            <th>Ip</th>
            <th>Estado</th>
            <th>Plan Internet</th>
            <th>Router</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><a href="/clientes/editar/servicio/0005@yaa-internet-by-vw/5/">queue14</a></td>
            <td>192.168.17.14</td>
            <td>Suspendido</td>
            <td>PLAN AVANZADO 15MEGAS</td>
            <td>Rb 450 Tepames(17)(18)</td>
          </tr>
        </tbody>
      </table>
    `;

    const context = extractActiveClientContextFromPage(
      "/clientes/ver/0005@yaa-internet-by-vw/",
    );

    expect(context).toEqual({
      serviceSlug: "0005@yaa-internet-by-vw",
      serviceId: "5",
      clientName: "",
      ip: "192.168.17.14",
      plan: "PLAN AVANZADO 15MEGAS",
      router: "Rb 450 Tepames(17)(18)",
      accountStatus: "Suspendido",
      pendingBalance: "450.00",
    });

    restoreUrl();
  });

  it("prefers first and last name fields in /clientes/ver detail pages", () => {
    const restoreUrl = setPageUrl("/clientes/ver/9419@yaa-internet-by-vw/");
    document.body.innerHTML = `
      <div class="page-header">
        <h1 class="pull-left"><span>9419@yaa-internet-by-vw</span></h1>
      </div>
      <input id="id_usr-first_name" value="MARIO ANTONIO" />
      <input id="id_usr-last_name" value="RIVERA RAMOS" />
      <table>
        <thead>
          <tr>
            <th>Nombre en RB</th>
            <th>Ip</th>
            <th>Estado</th>
            <th>Plan Internet</th>
            <th>Router</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><a href="/clientes/editar/servicio/9419@yaa-internet-by-vw/9419/">9419</a></td>
            <td>10.27.0.129</td>
            <td>Activo</td>
            <td>10 MEGAS 350</td>
            <td>PPPOE ZAPOTITLAN</td>
          </tr>
        </tbody>
      </table>
    `;

    const context = extractActiveClientContextFromPage(
      "/clientes/ver/9419@yaa-internet-by-vw/",
    );

    expect(context.clientName).toBe("MARIO ANTONIO RIVERA RAMOS");
    restoreUrl();
  });
});
