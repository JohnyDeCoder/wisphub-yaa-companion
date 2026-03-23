/* @vitest-environment node */
import {
  buildLogoutRedirectUrl,
  buildSessionProfilesForDomain,
  isLoginPath,
  resolveSectionBasePath,
} from "../../../src/config/sessionProfiles.js";

describe("sessionProfiles config", () => {
  it("builds domain profiles preserving current username local-part case", () => {
    const profiles = buildSessionProfilesForDomain(
      "wisphub.io",
      "Johny@yaa-internet-by-vw",
    );

    expect(profiles).toHaveLength(2);
    expect(profiles[0]).toMatchObject({
      key: "colima",
      username: "Johny@yaa-internet-by-vw",
      isCurrent: true,
    });
    expect(profiles[1]).toMatchObject({
      key: "michoacan",
      username: "Johny@vwinternetnetworks",
      isCurrent: false,
    });
  });

  it("resolves section base path preserving original pathname case", () => {
    expect(
      resolveSectionBasePath("/Clientes/ver/10313@yaa-internet-by-vw/"),
    ).toBe("/Clientes/");
    expect(resolveSectionBasePath("/TICKETS/editar/2/")).toBe("/TICKETS/");
    expect(resolveSectionBasePath("/instalaciones/")).toBe("/instalaciones/");
    expect(resolveSectionBasePath("/PANEL/")).toBe("/PANEL/");
    expect(
      resolveSectionBasePath("/clientes/ver/10313@yaa-internet-by-vw/"),
    ).toBe("/clientes/");
  });

  it("builds logout redirect URL with encoded login next path", () => {
    expect(buildLogoutRedirectUrl("/clientes/")).toBe(
      "/accounts/logout/?next=%2Faccounts%2Flogin%2F%3Fnext%3D%252Fclientes%252F",
    );
  });

  it("detects login paths", () => {
    expect(isLoginPath("/accounts/login/")).toBe(true);
    expect(isLoginPath("/accounts/login")).toBe(true);
    expect(isLoginPath("/clientes/")).toBe(false);
  });
});

