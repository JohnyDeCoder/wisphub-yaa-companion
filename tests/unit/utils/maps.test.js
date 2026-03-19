import {
  buildGoogleMapsUrl,
  extractCoordinatesFromText,
  extractMapUrlFromText,
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

  it("extracts coordinates from embedded google maps parameters", () => {
    const url =
      "https://www.google.com/maps/place/test/@19.4207164,-103.709738,17z/data=!3d19.4207164!4d-103.709738";
    expect(extractCoordinatesFromText(url)).toBe("19.4207164,-103.709738");
  });

  it("returns short maps URL as destination when no coordinates can be resolved", () => {
    const shortUrl = "https://maps.app.goo.gl/mG6NeHRzmHt151Lq5";
    expect(getGoogleMapsDestination(shortUrl)).toBe(shortUrl);
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

  it("extracts only map URL when requested", () => {
    expect(extractMapUrlFromText("https://maps.app.goo.gl/mG6NeHRzmHt151Lq5")).toBe(
      "https://maps.app.goo.gl/mG6NeHRzmHt151Lq5",
    );
    expect(extractMapUrlFromText("DOMICILIO CONOCIDO https://maps.app.goo.gl/mG6NeHRzmHt151Lq5")).toBe(
      "https://maps.app.goo.gl/mG6NeHRzmHt151Lq5",
    );
    expect(extractMapUrlFromText("EQUIPO COMODATO $850 + RESTANTE $170 = $1,020 MXN")).toBeNull();
  });

  it("builds google maps URL from normalized coordinates", () => {
    expect(buildGoogleMapsUrl("19.5,-103.5")).toBe(
      "https://www.google.com/maps?q=19.5%2C-103.5",
    );
  });

  it("ignores invalid coordinate-like values", () => {
    expect(normalizeCoordinatesValue("192.168.77.253")).toBeNull();
    expect(normalizeCoordinatesValue("EQUIPO COMODATO $850 + RESTANTE $170 = $1,020 MXN")).toBeNull();
    expect(normalizeCoordinatesValue("CALLE 19, 120")).toBeNull();
    expect(getGoogleMapsDestination("texto sin mapa")).toBeNull();
  });
});
