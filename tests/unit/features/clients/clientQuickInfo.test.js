/* @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import {
  __testables__,
} from "../../../../src/features/clients/clientQuickInfo.js";

function makeRow({ value, nombre, ip } = {}) {
  const tr = document.createElement("tr");

  const tdCheck = document.createElement("td");
  const input = document.createElement("input");
  input.name = "id_servicio_username";
  input.value = value ?? "9012#9012@yaa-internet-by-vw";
  tdCheck.appendChild(input);

  const tdIgnore = document.createElement("td");
  tdIgnore.textContent = "ignore";

  const tdName = document.createElement("td");
  tdName.textContent = nombre ?? "Florencia Chavez";

  tr.append(tdCheck, tdIgnore, tdName);

  if (ip !== undefined) {
    const tdIp = document.createElement("td");
    tdIp.className = "ip";
    tdIp.textContent = ip;
    tr.appendChild(tdIp);
  }

  return tr;
}

describe("clientQuickInfo helpers", () => {
  it("extracts idServicio, username, nombre and ip from the row", () => {
    const row = makeRow({ value: "9012#9012@yaa-internet-by-vw", nombre: "Florencia Chavez", ip: "10.0.5.22" });

    const rowData = __testables__.parseRowData(row);

    expect(rowData).toMatchObject({
      idServicio: "9012",
      username: "9012@yaa-internet-by-vw",
      nombre: "Florencia Chavez",
      ip: "10.0.5.22",
    });
    expect(rowData).not.toHaveProperty("serviceSlug");
  });

  it("returns empty string for ip when the td.ip cell is absent", () => {
    const row = makeRow({ value: "9013#9013@yaa-internet-by-vw", nombre: "Sin IP" });

    const rowData = __testables__.parseRowData(row);

    expect(rowData.ip).toBe("");
  });

  it("normalizes the quick info delay within the allowed range", () => {
    expect(__testables__.normalizeQuickInfoDelay(-50)).toBe(0);
    expect(__testables__.normalizeQuickInfoDelay(13000)).toBe(10000);
    expect(__testables__.normalizeQuickInfoDelay("abc")).toBe(1000);
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
