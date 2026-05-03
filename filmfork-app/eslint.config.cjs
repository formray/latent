/* eslint-disable */
const tseslint = require("typescript-eslint");
const js = require("@eslint/js");

module.exports = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: [
          "./packages/*/tsconfig.json",
          "./apps/*/tsconfig.json",
        ],
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/tests/**",
      "**/vite.config.ts",
      "**/vitest.config.ts",
      "**/vitest.workspace.ts",
    ],
  },
);
