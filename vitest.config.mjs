import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";
import TestDriver from "testdriverai/vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    testTimeout: 900000,
    hookTimeout: 900000,
    reporters: ["default", TestDriver()],
    setupFiles: ["testdriverai/vitest/setup"],
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@xsam/shared": path.resolve(__dirname, "./packages/shared/src"),
      "@xsam/db": path.resolve(__dirname, "./packages/db/src"),
    },
  },
});
