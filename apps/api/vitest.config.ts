import { defineConfig } from "vitest/config";

// Coleta apenas os specs de src/: sem isto, o Vitest 4 também varre dist/ e
// tenta executar os specs compilados em CommonJS pelo nest build, que falham.
export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
  },
});
