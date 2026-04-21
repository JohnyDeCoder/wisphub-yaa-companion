/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import { buildProfileSnapshotKey } from "../../../src/utils/sessionKey.js";

describe("buildProfileSnapshotKey", () => {
  it("returns domainKey::accountDomain", () => {
    expect(buildProfileSnapshotKey("wisphub.io", "johny@vwinternetnetworks"))
      .toBe("wisphub.io::vwinternetnetworks");
  });

  it("returns the same key for different local parts with the same accountDomain", () => {
    expect(buildProfileSnapshotKey("wisphub.io", "kevin@vwinternetnetworks"))
      .toBe("wisphub.io::vwinternetnetworks");
    expect(buildProfileSnapshotKey("wisphub.io", "johny-m@vwinternetnetworks"))
      .toBe("wisphub.io::vwinternetnetworks");
  });

  it("normalizes to lowercase", () => {
    expect(buildProfileSnapshotKey("WISPHUB.IO", "Johny@VwInternetNetworks"))
      .toBe("wisphub.io::vwinternetnetworks");
  });

  it("returns empty string when username has no @ (no accountDomain)", () => {
    expect(buildProfileSnapshotKey("wisphub.io", "johny")).toBe("");
  });

  it("returns empty string when username is empty", () => {
    expect(buildProfileSnapshotKey("wisphub.io", "")).toBe("");
    expect(buildProfileSnapshotKey("wisphub.io", null)).toBe("");
  });

  it("returns empty string when domainKey is empty", () => {
    expect(buildProfileSnapshotKey("", "johny@vwinternetnetworks")).toBe("");
    expect(buildProfileSnapshotKey(null, "johny@vwinternetnetworks")).toBe("");
  });

  it("handles wisphub.app domain", () => {
    expect(buildProfileSnapshotKey("wisphub.app", "admin@vwinm"))
      .toBe("wisphub.app::vwinm");
  });
});
