/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import {
  bindExclusiveDetailsGroup,
  syncExclusiveDetailsGroup,
} from "../../../../../src/app/popup/utils/exclusiveDetails.js";

describe("exclusiveDetails", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("keeps only the first details open during sync", () => {
    document.body.innerHTML = `
      <section>
        <details open></details>
        <details open></details>
        <details></details>
      </section>
    `;

    const details = document.querySelectorAll("details");
    const active = syncExclusiveDetailsGroup(details);

    expect(active).toBe(details[0]);
    expect(details[0].open).toBe(true);
    expect(details[1].open).toBe(false);
  });

  it("closes sibling details when another one is opened", () => {
    document.body.innerHTML = `
      <section id="group">
        <details open data-name="one"></details>
        <details data-name="two"></details>
        <details data-name="three"></details>
      </section>
    `;

    const container = document.getElementById("group");
    const details = bindExclusiveDetailsGroup(container, "details");

    details[1].open = true;
    details[1].dispatchEvent(new Event("toggle"));

    expect(details[0].open).toBe(false);
    expect(details[1].open).toBe(true);
    expect(details[2].open).toBe(false);
  });
});
