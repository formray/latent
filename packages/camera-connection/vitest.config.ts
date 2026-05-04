import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "camera-connection",
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**"],
    },
  },
});
