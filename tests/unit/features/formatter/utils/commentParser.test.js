import {
  canRemoveDatosFiscalesSection,
  isPreInstallFormComment,
  parseAsesor,
  parseCommentData,
  parseInstallCost,
  parseInstallNumber,
  parsePackagePrice,
  parseRegimenFiscal,
  parseTecnico,
  removeDatosFiscalesSection,
} from "../../../../../src/features/formatter/utils/commentParser.js";

describe("commentParser", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
    document.title = "";
  });

  it("parses fiscal regimen and pricing values", () => {
    const text = `
      REGIMEN FISCAL: 601 - General de Ley Personas Morales
      EQUIPO COMODATO $ 1,500
      PAQUETE FIBRA $ 850
    `;

    const regimen = parseRegimenFiscal(text);
    expect(regimen).toEqual({
      code: "601",
      description: "601 - General de Ley Personas Morales",
    });
    expect(parseInstallCost(text)).toBe("1500");
    expect(parsePackagePrice(text)).toBe("850");
  });

  it("parses asesor and tecnico mentions in different formats", () => {
    expect(parseAsesor("ASESOR: (@Juan.Perez@)")).toBe("juan.perez");
    expect(parseAsesor("ASESORA: Maria_01")).toBe("maria_01");
    expect(parseTecnico("TECNICO: carlos@")).toBe("carlos");
  });

  it("parses installation number from title, url, and header fallback", () => {
    document.title = "Instalacion 45879@ WispHub";
    expect(parseInstallNumber()).toBe("45879");

    document.title = "Sin folio";
    window.history.pushState({}, "", "/instalaciones/9123@editar/");
    expect(parseInstallNumber()).toBe("9123");

    window.history.pushState({}, "", "/clientes/listado");
    document.body.innerHTML = `
      <div class="page-header">
        <h1><span>Solicitud 7771@ Pendiente</span></h1>
      </div>
    `;
    expect(parseInstallNumber()).toBe("7771");
  });

  it("removes fiscal section only when lines are valid regimen entries", () => {
    const fiscalOnly = `
      === DATOS FISCALES
      REGIMEN FISCAL: 601 - General
      ===
      resto
    `;
    expect(canRemoveDatosFiscalesSection(fiscalOnly)).toBe(true);

    const mixed = `
      === DATOS FISCALES
      REGIMEN FISCAL: 601 - General
      RFC: ABCD123
      ===
    `;
    expect(canRemoveDatosFiscalesSection(mixed)).toBe(false);

    const cleaned = removeDatosFiscalesSection(fiscalOnly);
    expect(cleaned).not.toMatch(/DATOS\s+FISCALES/i);
  });

  it("builds a normalized parsed payload", () => {
    document.title = "Instalacion 1234@";
    const text = `
      REGIMEN FISCAL: 612 - Personas Fisicas con Actividades Empresariales
      EQUIPO COMODATO $ 700
      PAQUETE PRO $ 999
      ASESOR: juan_01
      TECNICO: (@carlos@)
      === DATOS FISCALES
      REGIMEN FISCAL: 612 - Personas Fisicas con Actividades Empresariales
      ===
    `;

    const parsed = parseCommentData(text);
    expect(parsed.regimenFiscal?.code).toBe("612");
    expect(parsed.installCost).toBe("700");
    expect(parsed.packagePrice).toBe("999");
    expect(parsed.asesor).toBe("juan_01");
    expect(parsed.tecnico).toBe("carlos");
    expect(parsed.installNumber).toBe("1234");
    expect(parsed.canRemoveFiscalSection).toBe(true);
  });

  it("prefers equipment cost over package price in single-line comments", () => {
    const text =
      "CLIENTE NUEVO EQUIPO COMODATO $850 + RESTANTE DE MES MARZO $147 = $997 MXN " +
      "PAQUETE: 20 MBPS X $350 MXN HORARIO: POR CONFIRMAR";

    expect(parseInstallCost(text)).toBe("850");
    expect(parsePackagePrice(text)).toBe("350");
  });

  it("parses package price from PLAN label", () => {
    const text = "PLAN: 20 MBPS X $350 MXN";
    expect(parsePackagePrice(text)).toBe("350");
  });

  it("parses courtesy install cost as zero", () => {
    const text =
      "CLIENTE NUEVO\nEQUIPO COMODATO CORTESÍA + RESTANTE DE MES ABRIL $350 = $350 MXN";
    expect(parseInstallCost(text)).toBe("0");
  });

  it("detects comments created from pre-installation form marker", () => {
    const withMarker =
      "CLIENTE NUEVO\n--- HECHO CON EL FORMULARIO DE PRE-INSTALACIÓN";
    const withoutMarker = "CLIENTE NUEVO\nHORARIO: POR CONFIRMAR";

    expect(isPreInstallFormComment(withMarker)).toBe(true);
    expect(isPreInstallFormComment(withoutMarker)).toBe(false);

    const parsed = parseCommentData(withMarker);
    expect(parsed.isPreInstallFormComment).toBe(true);
  });
});
