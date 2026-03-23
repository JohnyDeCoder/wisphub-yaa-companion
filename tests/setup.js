import { beforeEach } from "vitest";

beforeEach(() => {
  if (typeof window !== "undefined" && window.history?.replaceState) {
    window.history.replaceState({}, "", "/");
  }

  if (typeof document !== "undefined") {
    document.body.replaceChildren();
    document.title = "";
  }

  if (typeof window !== "undefined") {
    window.localStorage?.clear();
    window.sessionStorage?.clear();
  }
});
