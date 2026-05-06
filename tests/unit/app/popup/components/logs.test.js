/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../../../src/utils/browser.js", () => ({
  browserAPI: {
    storage: {
      local: {
        get: vi.fn(async () => ({})),
        set: vi.fn(async () => {}),
      },
    },
  },
}));

import { browserAPI } from "../../../../../src/utils/browser.js";
import { addLog, renderLogs } from "../../../../../src/app/popup/components/logs.js";

describe("popup logs renderer", () => {
  let container;

  beforeEach(() => {
    document.body.replaceChildren();
    container = document.createElement("div");
    container.className = "logs-list";
    document.body.appendChild(container);
  });

  it("renders the empty state centered with a line break", () => {
    renderLogs(container, []);

    const empty = container.querySelector(".logs-empty");
    expect(empty).not.toBeNull();
    expect(container.classList.contains("logs-list--empty")).toBe(true);
    expect(empty.querySelector("br")).not.toBeNull();
    expect(empty.textContent).toContain("Sin actividad registrada hoy.");
    expect(empty.textContent).toContain(
      "Las acciones que realices aparecerán aquí.",
    );
  });

  it("renders audit entries without per-entry delete buttons", () => {
    renderLogs(container, [
      {
        time: "9:41:10 AM",
        level: "success",
        message: "[Formateador] Comentario actualizado y 2 campos",
        feature: "Formateador",
        action: "Formateo aplicado",
        pagePath: "/clientes/ver/9012@yaa-internet-by-vw/",
        before: "Nombre: José",
        after: "Nombre: JOSE",
        ts: 123,
      },
    ]);

    expect(container.classList.contains("logs-list--empty")).toBe(false);
    expect(container.querySelector(".log-entry")).not.toBeNull();
    expect(container.querySelector(".log-action")?.textContent).toBe(
      "Formateo aplicado",
    );
    expect(container.querySelectorAll(".log-state")).toHaveLength(2);
    expect(container.textContent).toContain("Antes");
    expect(container.textContent).toContain("Después");
    expect(container.querySelector(".log-delete-btn")).toBeNull();
  });

  it("renders pagePath as clickable link in message when pageUrl is provided", () => {
    renderLogs(container, [
      {
        time: "9:41:10 AM",
        level: "success",
        message: "Comentario actualizado",
        feature: "Instalaciones",
        action: "Formateo aplicado",
        pagePath: "/preinstalacion/activar/10531@yaa/10531/",
        pageUrl: "https://wisphub.io/preinstalacion/activar/10531@yaa/10531/",
        before: "TEXTO ORIGINAL",
        after: "TEXTO FORMATEADO",
        stateColor: "info",
        ts: 456,
        tags: [],
      },
    ]);

    const link = container.querySelector(".log-msg-link");
    expect(link).not.toBeNull();
    expect(link.getAttribute("href")).toBe(
      "https://wisphub.io/preinstalacion/activar/10531@yaa/10531/",
    );
    expect(link.textContent).toBe("/preinstalacion/activar/10531@yaa/10531/");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(container.querySelector(".log-page")).toBeNull();
    const msgEl = container.querySelector(".log-msg");
    expect(msgEl.textContent).toContain("Comentario actualizado en ");
  });

  it("renders message as plain text when pageUrl is absent", () => {
    renderLogs(container, [
      {
        time: "9:41:10 AM",
        level: "info",
        message: "Módulo cargado",
        feature: "General",
        action: "",
        pagePath: "",
        pageUrl: "",
        ts: 111,
        tags: [],
      },
    ]);

    expect(container.querySelector(".log-msg-link")).toBeNull();
    expect(container.querySelector(".log-msg").textContent).toBe("Módulo cargado");
  });

  it("buildLogEntry persiste pageUrl y stateColor desde details", async () => {
    let stored = [];
    browserAPI.storage.local.get.mockResolvedValue({ wisphubYaaLogs: [] });
    browserAPI.storage.local.set.mockImplementation(async (obj) => {
      stored = obj.wisphubYaaLogs;
    });

    await addLog("success", "Comentario actualizado", {
      pageUrl: "https://wisphub.io/preinstalacion/activar/10531@yaa/10531/",
      pagePath: "/preinstalacion/activar/10531@yaa/10531/",
      stateColor: "info",
      before: "TEXTO ORIGINAL",
      after: "TEXTO FORMATEADO",
    });

    expect(stored).toHaveLength(1);
    expect(stored[0].pageUrl).toBe(
      "https://wisphub.io/preinstalacion/activar/10531@yaa/10531/",
    );
    expect(stored[0].stateColor).toBe("info");
  });

  it("applies data-color to after-state block when stateColor is set", () => {
    renderLogs(container, [
      {
        time: "9:41:10 AM",
        level: "success",
        message: "Comentario actualizado",
        feature: "Instalaciones",
        action: "Formateo aplicado",
        pagePath: "/preinstalacion/activar/10531@yaa/10531/",
        pageUrl: "https://wisphub.io/preinstalacion/activar/10531@yaa/10531/",
        before: "TEXTO ORIGINAL",
        after: "TEXTO FORMATEADO",
        stateColor: "info",
        ts: 789,
        tags: [],
      },
    ]);

    const afterBlock = container.querySelector(".log-state--after");
    expect(afterBlock).not.toBeNull();
    expect(afterBlock.dataset.color).toBe("info");
  });

  it("does not set data-color on after-state when stateColor is absent", () => {
    renderLogs(container, [
      {
        time: "9:41:10 AM",
        level: "success",
        message: "Texto sin color",
        feature: "General",
        action: "",
        pagePath: "",
        pageUrl: "",
        before: "ANTES",
        after: "DESPUES",
        stateColor: "",
        ts: 999,
        tags: [],
      },
    ]);

    const afterBlock = container.querySelector(".log-state--after");
    expect(afterBlock).not.toBeNull();
    expect(afterBlock.dataset.color).toBeUndefined();
  });
});
