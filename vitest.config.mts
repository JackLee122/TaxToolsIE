import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Domain + integration tests use clean Node; Playwright owns the browser flows.
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
});