import { defineWorkspace } from "vitest/config";

/**
 * Vitest 2 workspace config — aggregates the node-environment package tests
 * and the jsdom-environment web app tests so root `npm test` runs everything.
 */
export default defineWorkspace([
  {
    extends: "./vitest.config.ts",
    test: {
      name: "packages",
      include: ["packages/*/tests/**/*.test.ts"],
      environment: "node",
    },
  },
  "./apps/web/vitest.config.ts",
]);
