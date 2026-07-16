import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      // Next.js sustituye "server-only" por un módulo vacío en el
      // compilador server-side; Vitest no reproduce ese alias, así que lo
      // hacemos explícito aquí para poder testear módulos que lo usan.
      "server-only": resolve(__dirname, "test/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
