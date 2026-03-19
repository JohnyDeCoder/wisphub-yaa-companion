import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.js"],
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    clearMocks: true,
    restoreMocks: true,
  },
});
