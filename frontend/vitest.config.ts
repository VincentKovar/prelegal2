import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // react() resolves against a nested vite copy under node_modules/vitest,
  // which TS sees as a distinct (incompatible) Plugin type from vitest's own.
  plugins: [react() as never],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
