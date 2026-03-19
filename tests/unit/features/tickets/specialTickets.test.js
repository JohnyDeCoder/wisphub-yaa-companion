import { SPECIAL_TICKETS } from "../../../../src/features/tickets/specialTickets.js";

describe("specialTickets catalog", () => {
  it("includes 'Servicio Antena Publica Claves' right after 'Sitio Día Completo'", () => {
    const sitioDiaCompletoIndex = SPECIAL_TICKETS.findIndex(
      (ticket) => ticket.label === "Sitio Día Completo",
    );
    const antenaPublicaIndex = SPECIAL_TICKETS.findIndex(
      (ticket) => ticket.label === "Servicio Antena Publica Claves",
    );

    expect(sitioDiaCompletoIndex).toBeGreaterThanOrEqual(0);
    expect(antenaPublicaIndex).toBe(sitioDiaCompletoIndex + 1);
    expect(SPECIAL_TICKETS[antenaPublicaIndex]).toMatchObject({
      id: 8712,
      domain: "wisphub.io",
    });
  });
});
