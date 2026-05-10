/* @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import {
  __testables__,
} from "../../../../src/features/clients/clientQuickInfo.js";

function makeRow({ value, nombre, ip, comentariosText } = {}) {
  const tr = document.createElement("tr");

  const tdCheck = document.createElement("td");
  const input = document.createElement("input");
  input.name = "id_servicio_username";
  input.value = value ?? "9012#9012@yaa-internet-by-vw";
  tdCheck.appendChild(input);

  const tdIgnore = document.createElement("td");
  tdIgnore.textContent = "ignore";

  const tdName = document.createElement("td");
  tdName.className = "user";
  tdName.textContent = nombre ?? "Florencia Chavez";

  tr.append(tdCheck, tdIgnore, tdName);

  if (ip !== undefined) {
    const tdIp = document.createElement("td");
    tdIp.className = "ip";
    tdIp.textContent = ip;
    tr.appendChild(tdIp);
  }

  if (comentariosText !== undefined) {
    const tdComentarios = document.createElement("td");
    tdComentarios.className = "comentarios";
    tdComentarios.textContent = comentariosText;
    tr.appendChild(tdComentarios);
  }

  return tr;
}

describe("clientQuickInfo helpers", () => {
  it("extracts idServicio, username, nombre, ip and comentariosText from the row", () => {
    const row = makeRow({ value: "9012#9012@yaa-internet-by-vw", nombre: "Florencia Chavez", ip: "10.0.5.22" });

    const rowData = __testables__.parseRowData(row);

    expect(rowData).toMatchObject({
      idServicio: "9012",
      username: "9012@yaa-internet-by-vw",
      nombre: "Florencia Chavez",
      ip: "10.0.5.22",
      comentariosText: "",
    });
    expect(rowData).not.toHaveProperty("serviceSlug");
  });

  it("reads nombre from data-client-name attribute when present", () => {
    const row = makeRow({ nombre: "Texto Celda" });
    const tdName = row.querySelector("td.user");
    const link = document.createElement("a");
    link.setAttribute("data-client-name", "Nombre Desde Atributo");
    tdName.appendChild(link);

    const rowData = __testables__.parseRowData(row);

    expect(rowData.nombre).toBe("Nombre Desde Atributo");
  });

  it("returns empty string for ip when the td.ip cell is absent", () => {
    const row = makeRow({ value: "9013#9013@yaa-internet-by-vw", nombre: "Sin IP" });

    const rowData = __testables__.parseRowData(row);

    expect(rowData.ip).toBe("");
  });

  it("returns empty comentariosText when td.comentarios is absent", () => {
    const row = makeRow({ value: "9014#9014@yaa-internet-by-vw" });

    const rowData = __testables__.parseRowData(row);

    expect(rowData.comentariosText).toBe("");
  });

  it("reads comentariosText from td.comentarios when present", () => {
    const row = makeRow({ comentariosText: "CLIENTE NUEVO\nEQUIPO COMODATO $1,500" });

    const rowData = __testables__.parseRowData(row);

    expect(rowData.comentariosText).toBe("CLIENTE NUEVO\nEQUIPO COMODATO $1,500");
  });

  it("normalizes the quick info delay within the allowed range", () => {
    expect(__testables__.normalizeQuickInfoDelay(-50)).toBe(0);
    expect(__testables__.normalizeQuickInfoDelay(13000)).toBe(10000);
    expect(__testables__.normalizeQuickInfoDelay("abc")).toBe(1000);
  });
});

describe("detectEquipmentType", () => {
  const { detectEquipmentType } = __testables__;

  it("returns null for empty text", () => {
    expect(detectEquipmentType("")).toBeNull();
    expect(detectEquipmentType(null)).toBeNull();
  });

  it("detects comodato", () => {
    expect(detectEquipmentType("EQUIPO COMODATO $1,500 + RESTANTE DE MES MAYO $271")).toBe("Comodato");
    expect(detectEquipmentType("EQUIPO COMO DATO $1,200")).toBe("Comodato");
    expect(detectEquipmentType("EQUIPO COMO-DATO + MES MAYO")).toBe("Comodato");
  });

  it("detects prestado", () => {
    expect(detectEquipmentType("EQUIPO PRESTADO $1,000 + RESTANTE DE MES ABRIL $82")).toBe("Prestado");
    expect(detectEquipmentType("PRESTADOS $850 + RESTANTE DE MES ABRIL $260")).toBe("Prestado");
    expect(detectEquipmentType("EQUIPOS PRESTADOS")).toBe("Prestado");
    expect(detectEquipmentType("EQUIPO PRESTADO")).toBe("Prestado");
  });

  it("detects comprado", () => {
    expect(detectEquipmentType("EQUIPO COMPRADOS $2900 + RESTANTE DE MES MARZO $192")).toBe("Comprado");
    expect(detectEquipmentType("CLIENTE NUEVO (EQUIPOS COMPRADOS)")).toBe("Comprado");
    expect(detectEquipmentType("EQUIPOS COMPRADOS (YA LOS TENÍA EL CLIENTE)")).toBe("Comprado");
  });

  it("detects propio", () => {
    expect(detectEquipmentType("EQUIPOS PROPIOS")).toBe("Propio");
    expect(detectEquipmentType("EQUIPO PROPIO")).toBe("Propio");
    expect(detectEquipmentType("REMUDADERO\nEQUIPOS PROPIOS")).toBe("Propio");
  });

  it("detects migration alone", () => {
    expect(detectEquipmentType("MIGRACIÓN")).toBe("Migración");
    expect(detectEquipmentType("MIGRACION")).toBe("Migración");
  });

  it("detects migration with equipment type", () => {
    expect(detectEquipmentType("MIGRACIÓN\nEQUIPOS PRESTADOS")).toBe("Migración · Prestado");
    expect(detectEquipmentType("MIGRACIÓN\nEQUIPO COMODATO")).toBe("Migración · Comodato");
    expect(detectEquipmentType("MIGRACION\nEQUIPOS PROPIOS")).toBe("Migración · Propio");
    expect(detectEquipmentType("EQUIPO COMO DATO(MIGRACION)")).toBe("Migración · Comodato");
  });

  it("returns null when no equipment or migration keywords found", () => {
    expect(detectEquipmentType("INSTALACIÓN – CAMBIO DE COMPAÑÍA (CON REPETIDORES)")).toBeNull();
    expect(detectEquipmentType("CLIENTE NUEVO\nHORARIO: 2-7 PM")).toBeNull();
  });

  it("handles accented text correctly", () => {
    expect(detectEquipmentType("MIGRACIÓN · COMODATO")).toBe("Migración · Comodato");
  });

  it("returns the FIRST equipment type found line-by-line, ignoring later lines", () => {
    const text = "CLIENTE NUEVO\n\nEQUIPOS PROPIOS\n\nEQUIPOS PRESTADO $ + RESTANTE DE MES MARZO $ = $\n\nHORARIO: POR CONFIRMAR";
    expect(detectEquipmentType(text)).toBe("Propio");
  });

  it("still detects migration when equipment is on a later line", () => {
    const text = "MIGRACION\n\nEQUIPOS PROPIOS";
    expect(detectEquipmentType(text)).toBe("Migración · Propio");
  });
});

describe("formatSaldo", () => {
  it("returns null when saldo object is null", () => {
    expect(__testables__.formatSaldo(null)).toBeNull();
  });

  it("returns null when saldo.saldo field is null", () => {
    expect(__testables__.formatSaldo({ saldo: null })).toBeNull();
  });

  it("returns null when saldo.saldo is not a finite number", () => {
    expect(__testables__.formatSaldo({ saldo: "abc" })).toBeNull();
  });

  it("returns debt info when saldo is positive", () => {
    const result = __testables__.formatSaldo({ saldo: "150.50" });
    expect(result).toMatchObject({ text: "Deuda: $150.50", type: "debt" });
  });

  it("returns ok when saldo is zero", () => {
    const result = __testables__.formatSaldo({ saldo: "0.00" });
    expect(result).toMatchObject({ text: "Al corriente", type: "ok" });
  });
});
