import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.js"],
    exclude: ["dist/**", "node_modules/**", "tmp/**"],
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "https://wisphub.io/",
      },
    },
    globals: true,
    setupFiles: ["./tests/setup.js"],
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    hookTimeout: 10000,
    testTimeout: 15000,
  },
  onConsoleLog(log, type) {
    if (type !== "stderr") {
      return;
    }

    if (log.includes("Not implemented: navigation to another Document")) {
      return false;
    }
  },
});
