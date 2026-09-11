import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  test: {
    include: ["server/**/*.test.ts", "client/**/*.test.ts", "client/**/*.test.tsx"],
    environment: "node",
    setupFiles: ["./client/src/test/setup.ts"],
  },
});
