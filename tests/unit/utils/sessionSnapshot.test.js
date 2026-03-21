import {
  buildSnapshotFingerprint,
  shouldPersistSessionSnapshot,
} from "../../../src/utils/sessionSnapshot.js";

function buildCookie(overrides = {}) {
  return {
    name: "sessionid",
    value: "abc",
    domain: ".wisphub.io",
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "lax",
    expirationDate: 1900000000,
    ...overrides,
  };
}

describe("sessionSnapshot utils", () => {
  it("builds stable fingerprint regardless of cookie order", () => {
    const a = [buildCookie({ name: "a" }), buildCookie({ name: "b" })];
    const b = [buildCookie({ name: "b" }), buildCookie({ name: "a" })];

    expect(buildSnapshotFingerprint(a)).toBe(buildSnapshotFingerprint(b));
  });

  it("persists when snapshot does not exist", () => {
    const nextCookies = [buildCookie()];
    expect(shouldPersistSessionSnapshot(null, nextCookies)).toBe(true);
  });

  it("persists when cookie fingerprint changed", () => {
    const existingSnapshot = { cookies: [buildCookie({ value: "old" })] };
    const nextCookies = [buildCookie({ value: "new" })];

    expect(shouldPersistSessionSnapshot(existingSnapshot, nextCookies)).toBe(
      true,
    );
  });

  it("persists when cookies are equal but timestamp refresh is requested", () => {
    const cookies = [buildCookie()];
    const existingSnapshot = { cookies };

    expect(
      shouldPersistSessionSnapshot(existingSnapshot, cookies, {
        refreshTimestamp: true,
      }),
    ).toBe(true);
  });

  it("can skip persistence when cookies are equal and timestamp refresh is off", () => {
    const cookies = [buildCookie()];
    const existingSnapshot = { cookies };

    expect(
      shouldPersistSessionSnapshot(existingSnapshot, cookies, {
        refreshTimestamp: false,
      }),
    ).toBe(false);
  });
});

