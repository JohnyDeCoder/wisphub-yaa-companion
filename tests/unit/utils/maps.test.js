import {
  extractCoordinatesFromText,
  getGoogleMapsDestination,
  normalizeCoordinatesValue,
} from "../../../src/utils/maps.js";

describe("maps utils", () => {
  it("extracts normalized coordinates from plain text and map URLs", () => {
    expect(extractCoordinatesFromText("19.2359169,-103.7155725")).toBe(
      "19.2359169,-103.7155725",
    );

    expect(
      extractCoordinatesFromText(
        "https://www.google.com/maps?q=19.362602,-103.82448",
      ),
    ).toBe("19.362602,-103.82448");
  });

  it("extracts map URL tokens from mixed text and normalizes missing protocol", () => {
    const mixedText =
      "Referencia de ubicación https://maps.app.goo.gl/mG6NeHRzmHt151Lq5";
    expect(getGoogleMapsDestination(mixedText)).toBe(
      "https://maps.app.goo.gl/mG6NeHRzmHt151Lq5",
    );

    expect(getGoogleMapsDestination("maps.app.goo.gl/mG6NeHRzmHt151Lq5")).toBe(
      "https://maps.app.goo.gl/mG6NeHRzmHt151Lq5",
    );
  });

  it("ignores invalid coordinate-like values", () => {
    expect(normalizeCoordinatesValue("192.168.77.253")).toBeNull();
    expect(normalizeCoordinatesValue("EQUIPO COMODATO $850 + RESTANTE $170 = $1,020 MXN")).toBeNull();
    expect(normalizeCoordinatesValue("CALLE 19, 120")).toBeNull();
    expect(getGoogleMapsDestination("texto sin mapa")).toBeNull();
  });
});
