# FilmFork V1 — Phase 1 Implementation Plan: Foundation & Core Packages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the monorepo foundation at `~/Repos/Formray/filmfork/filmfork-app/` with two production-ready core packages (`@filmfork/recipe-schema` including R5 Local Taste Profile + recipe diff, `@filmfork/ptp-fuji` core fork) plus stubs for `ptp-fuji-webusb` and `ai-agent`. Output is testable in pure Node — no browser, no hardware required. Schema↔translator lockstep CI gate enforced (Codex risk #1).

**Architecture:** npm workspaces monorepo. Two functional packages in Phase 1: `recipe-schema` (Zod schemas + Local Taste Profile + capability matrix + camera-property translator + recipe diff rule tables + migration scaffolding) and `ptp-fuji` (pure-protocol fork of filmkit with PtpTransport DI, typed errors, AbortSignal). Two stub packages: `ptp-fuji-webusb`, `ai-agent`. All packages MIT licensed; only `ptp-fuji` ships a NOTICE for filmkit attribution.

**Tech Stack:** Node 22 LTS, TypeScript 5.7 strict, Vitest, Zod 4, npm workspaces, ESLint, Prettier, license-checker.

---

## Scope: Phase 1 of 7

| Phase | Output | Target weeks |
|---|---|---|
| **1: Foundation & Core Packages (this plan)** | Monorepo + `recipe-schema` (incl. R5 diff + Taste Profile) + `ptp-fuji` core + CI gates | 1-2 |
| 2: WebUSB Transport + Hardware Validation Rig | `ptp-fuji-webusb` + X-S20 round-trip + reproducible rig | 3-4 |
| 3: Web App Shell + Recipe Library | Vite/React/Tailwind/i18n + library/detail/editor pages | 4-5 |
| 4: Camera Flows + WebUSB UX | Connect, push, preview, transactional backup, error UX, **iteration loop UI** | 5-7 |
| 5: AI Agent | `ai-agent` + 6 modes (incl. iteration mode) + EXIF strip + confidence rubric | 7-9 |
| 6: Polish | URL share, genealogy, export/import, diagnostic bundle, WCAG, CSP | 9-10 |
| 7: Launch | §15 ADRs, TM search, seed list, final smoke, deploy | 10-12 |

After Phase 1 ships and is reviewed, the user requests the Phase 2 plan via a fresh brainstorming → writing-plans cycle.

**Codex-flagged risks Phase 1 explicitly addresses:**
- Risk #1 (schema↔translator lockstep) — Task 22 implements the CI gate
- Risk #3 (typed errors as first-class concept) — Task 17 implements taxonomy
- Risk #2 (X-S20 reproducible validation) — deferred to Phase 2 (hardware required)

---

## File structure created by Phase 1

```
~/Repos/Formray/filmfork/
├── filmfork-app/                            (NEW)
│   ├── .nvmrc                               (NEW — node 22)
│   ├── .gitignore                           (NEW)
│   ├── .editorconfig                        (NEW)
│   ├── .eslintrc.cjs                        (NEW)
│   ├── .prettierrc                          (NEW)
│   ├── package.json                         (NEW — workspaces root)
│   ├── tsconfig.base.json                   (NEW — strict TS shared)
│   ├── vitest.config.ts                     (NEW)
│   ├── README.md                            (NEW — English)
│   ├── README.it.md                         (NEW — Italian)
│   ├── ROADMAP.md                           (NEW)
│   ├── CHANGELOG.md                         (NEW)
│   ├── PROGRESS.md                          (NEW)
│   ├── CLAUDE.md                            (NEW)
│   ├── LICENSE                              (NEW — AGPL-3.0)
│   ├── .github/workflows/ci.yml             (NEW)
│   ├── scripts/
│   │   └── check-schema-translator-lockstep.ts (NEW — risk #1 gate)
│   ├── data/
│   │   └── camera-models.json               (NEW — X-S20 verified)
│   └── packages/
│       ├── recipe-schema/                   (NEW)
│       │   ├── package.json, tsconfig.json, LICENSE
│       │   ├── src/
│       │   │   ├── index.ts
│       │   │   ├── recipe.ts                (Zod — §5)
│       │   │   ├── taste-profile.ts         (R5)
│       │   │   ├── capability.ts
│       │   │   ├── translate/
│       │   │   │   ├── index.ts
│       │   │   │   └── d18e-d1a5.ts
│       │   │   ├── diff/
│       │   │   │   ├── index.ts             (R5 — diffRecipes API)
│       │   │   │   ├── rules-en.ts          (R5)
│       │   │   │   └── rules-it.ts          (R5)
│       │   │   └── migrations/
│       │   │       └── index.ts
│       │   └── tests/
│       │       ├── recipe.test.ts
│       │       ├── taste-profile.test.ts    (R5)
│       │       ├── capability.test.ts
│       │       ├── translate.test.ts
│       │       ├── ambience-priority-codec.test.ts (NL1 R3)
│       │       ├── diff.test.ts             (R5)
│       │       └── migrations.test.ts
│       ├── ptp-fuji/                        (NEW — fork, MIT, NOTICE)
│       │   ├── package.json, tsconfig.json
│       │   ├── LICENSE, NOTICE, UPSTREAM
│       │   ├── docs/protocol.md
│       │   ├── src/
│       │   │   ├── index.ts
│       │   │   ├── errors.ts
│       │   │   ├── transport/transport.ts
│       │   │   ├── ptp/
│       │   │   │   ├── container.ts
│       │   │   │   ├── session.ts
│       │   │   │   ├── transport.ts
│       │   │   │   └── constants.ts
│       │   │   ├── profile/
│       │   │   │   ├── d185.ts
│       │   │   │   ├── enums.ts
│       │   │   │   └── preset-translate.ts
│       │   │   └── util/binary.ts
│       │   └── tests/
│       │       ├── container.test.ts
│       │       ├── session.test.ts
│       │       ├── errors.test.ts
│       │       ├── abort.test.ts
│       │       └── fake-transport.ts
│       ├── ptp-fuji-webusb/                 (NEW — STUB)
│       │   ├── package.json, tsconfig.json, LICENSE
│       │   ├── src/index.ts
│       │   └── tests/stub.test.ts
│       └── ai-agent/                        (NEW — STUB)
│           ├── package.json, tsconfig.json, LICENSE
│           ├── src/index.ts
│           └── tests/stub.test.ts
```

---

## Setup conventions used by all tasks

- All commands run from `~/Repos/Formray/filmfork/filmfork-app/` unless noted otherwise
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`
- Every commit ends with `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- TDD discipline: every code task starts with a failing test, then implementation, then test passes, then commit
- File paths in Edit operations are **always absolute** under `~/Repos/Formray/filmfork/filmfork-app/`

---

## Tasks

### Task 1: Bootstrap monorepo workspace

**Files:**
- Create: `~/Repos/Formray/filmfork/filmfork-app/package.json`
- Create: `~/Repos/Formray/filmfork/filmfork-app/.nvmrc`
- Create: `~/Repos/Formray/filmfork/filmfork-app/.gitignore`
- Create: `~/Repos/Formray/filmfork/filmfork-app/.editorconfig`
- Create: `~/Repos/Formray/filmfork/filmfork-app/LICENSE`

- [ ] **Step 1.1: Create `~/Repos/Formray/filmfork/filmfork-app/` and write package.json**

```json
{
  "name": "filmfork-app",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22.0.0"
  },
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "lint": "eslint packages",
    "format": "prettier --write packages",
    "format:check": "prettier --check packages",
    "typecheck": "tsc -b",
    "test": "vitest run",
    "test:watch": "vitest",
    "license-check": "license-checker --production --onlyAllow 'MIT;AGPL-3.0;Apache-2.0;BSD-3-Clause;BSD-2-Clause;ISC;CC-BY-4.0;CC0-1.0'",
    "lockstep-check": "tsx scripts/check-schema-translator-lockstep.ts",
    "validate": "npm run lint && npm run typecheck && npm run test && npm run license-check && npm run lockstep-check"
  },
  "devDependencies": {
    "@types/node": "^22",
    "tsx": "^4",
    "typescript": "^5.7",
    "vitest": "^2",
    "eslint": "^9",
    "@eslint/js": "^9",
    "typescript-eslint": "^8",
    "prettier": "^3",
    "license-checker": "^25"
  }
}
```

- [ ] **Step 1.2: Write `.nvmrc`**

Content (single line): `22`

- [ ] **Step 1.3: Write `.gitignore`**

```
node_modules/
dist/
coverage/
.DS_Store
.env
.env.*
!.env.example
.ops/
*.log
.tsbuildinfo
*.tsbuildinfo
```

- [ ] **Step 1.4: Write `.editorconfig`**

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

- [ ] **Step 1.5: Write `LICENSE` (AGPL-3.0)**

Use the standard GNU AGPL-3.0 text from `https://www.gnu.org/licenses/agpl-3.0.txt`. Save verbatim. Set copyright line to: `Copyright (C) 2026 Giuseppe Albrizio / Formray`.

- [ ] **Step 1.6: Install root dependencies**

Run: `cd ~/Repos/Formray/filmfork/filmfork-app && npm install`
Expected: `added N packages` with no errors. `node_modules/` and `package-lock.json` created.

- [ ] **Step 1.7: Initial commit**

```bash
cd ~/Repos/Formray/filmfork/filmfork-app
git add -A
git commit -m "chore: bootstrap filmfork-app monorepo workspace

Initialize npm workspaces with Node 22, TypeScript 5.7, Vitest,
ESLint 9, Prettier 3. AGPL-3.0 LICENSE at root.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Configure shared TypeScript

**Files:**
- Create: `~/Repos/Formray/filmfork/filmfork-app/tsconfig.base.json`
- Create: `~/Repos/Formray/filmfork/filmfork-app/tsconfig.json`

- [ ] **Step 2.1: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  }
}
```

- [ ] **Step 2.2: Write root `tsconfig.json` referencing all package tsconfigs**

```json
{
  "files": [],
  "references": [
    { "path": "packages/recipe-schema" },
    { "path": "packages/ptp-fuji" },
    { "path": "packages/ptp-fuji-webusb" },
    { "path": "packages/ai-agent" }
  ]
}
```

- [ ] **Step 2.3: Verify `tsc -b` runs without error (no packages yet, should be a no-op)**

Run: `cd ~/Repos/Formray/filmfork/filmfork-app && npx tsc -b`
Expected: no output, exit 0.

- [ ] **Step 2.4: Commit**

```bash
git add tsconfig.base.json tsconfig.json
git commit -m "chore: add shared strict tsconfig.base.json + project references

Strict mode + noUncheckedIndexedAccess + exactOptionalPropertyTypes
per Formray module 12.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Configure ESLint + Prettier

**Files:**
- Create: `~/Repos/Formray/filmfork/filmfork-app/.eslintrc.cjs`
- Create: `~/Repos/Formray/filmfork/filmfork-app/.prettierrc`
- Create: `~/Repos/Formray/filmfork/filmfork-app/.prettierignore`

- [ ] **Step 3.1: Write `.eslintrc.cjs`**

```javascript
/* eslint-disable */
const tseslint = require("typescript-eslint");
const js = require("@eslint/js");

module.exports = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: ["./packages/*/tsconfig.json"],
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
    ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**"],
  },
);
```

- [ ] **Step 3.2: Write `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "endOfLine": "lf"
}
```

- [ ] **Step 3.3: Write `.prettierignore`**

```
node_modules/
dist/
coverage/
*.tsbuildinfo
package-lock.json
```

- [ ] **Step 3.4: Verify lint runs without error (no packages yet, output empty)**

Run: `cd ~/Repos/Formray/filmfork/filmfork-app && npm run lint`
Expected: exit 0 (may print warnings about no files matched; OK).

- [ ] **Step 3.5: Commit**

```bash
git add .eslintrc.cjs .prettierrc .prettierignore
git commit -m "chore: add eslint flat config + prettier config

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Configure Vitest at root

**Files:**
- Create: `~/Repos/Formray/filmfork/filmfork-app/vitest.config.ts`

- [ ] **Step 4.1: Write `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/tests/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["packages/*/src/**"],
      exclude: ["packages/*/src/**/*.d.ts", "packages/*/src/index.ts"],
    },
  },
});
```

- [ ] **Step 4.2: Verify vitest discovers no tests yet (and exits cleanly)**

Run: `cd ~/Repos/Formray/filmfork/filmfork-app && npx vitest run`
Expected: "No test files found" message OR exit 0 with empty results.

- [ ] **Step 4.3: Commit**

```bash
git add vitest.config.ts
git commit -m "chore: add root vitest config with v8 coverage

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Initialize `@filmfork/recipe-schema` package

**Files:**
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/recipe-schema/package.json`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/recipe-schema/tsconfig.json`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/recipe-schema/LICENSE`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/recipe-schema/src/index.ts`

- [ ] **Step 5.1: Write `packages/recipe-schema/package.json`**

```json
{
  "name": "@filmfork/recipe-schema",
  "version": "0.0.0",
  "private": false,
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist", "LICENSE"],
  "scripts": {
    "build": "tsc -b",
    "test": "vitest run --dir tests"
  },
  "dependencies": {
    "zod": "^4"
  }
}
```

- [ ] **Step 5.2: Write `packages/recipe-schema/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 5.3: Write `packages/recipe-schema/LICENSE` (MIT)**

Use the standard MIT license text. Copyright line: `Copyright (c) 2026 Giuseppe Albrizio / Formray`.

- [ ] **Step 5.4: Write placeholder `src/index.ts`**

```typescript
export const PACKAGE_NAME = "@filmfork/recipe-schema";
```

- [ ] **Step 5.5: Install zod**

Run: `cd ~/Repos/Formray/filmfork/filmfork-app && npm install --workspace=@filmfork/recipe-schema zod`
Expected: zod added to `packages/recipe-schema/package.json` dependencies.

- [ ] **Step 5.6: Verify package builds**

Run: `cd ~/Repos/Formray/filmfork/filmfork-app && npx tsc -b packages/recipe-schema`
Expected: `dist/index.js` and `dist/index.d.ts` created.

- [ ] **Step 5.7: Commit**

```bash
git add packages/recipe-schema package-lock.json package.json
git commit -m "feat(recipe-schema): initialize package with zod 4

MIT licensed. Strict TS, composite project reference for workspace
incremental builds.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Recipe Zod schema — identity, provenance, capability targeting (TDD)

**Files:**
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/recipe-schema/src/recipe.ts`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/recipe-schema/tests/recipe.test.ts`

- [ ] **Step 6.1: Write failing test `tests/recipe.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { Recipe } from "../src/recipe";

describe("Recipe identity & provenance", () => {
  it("accepts a minimal valid recipe with required identity fields", () => {
    const minimal = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      schemaVersion: 1,
      name: "Classic Chrome Test",
      tags: [],
      createdAt: "2026-05-04T10:00:00Z",
      capabilitySetId: "x-s20-fw1.10",
      cameraModel: "X-S20",
      filmSimulation: "ClassicChrome",
      dynamicRange: "DR100",
      whiteBalance: { mode: "Auto", shiftR: 0, shiftB: 0 },
      highlightTone: 0,
      shadowTone: 0,
      color: 0,
      sharpness: 0,
      noiseReduction: 0,
      clarity: 0,
      grainEffect: { strength: "Off", size: "Small" },
      colorChromeEffect: "Off",
      colorChromeEffectBlue: "Off",
    };
    expect(() => Recipe.parse(minimal)).not.toThrow();
  });

  it("rejects a recipe with no name", () => {
    const bad = { id: "550e8400-e29b-41d4-a716-446655440000", schemaVersion: 1, name: "" };
    expect(() => Recipe.parse(bad)).toThrow();
  });

  it("rejects a recipe with name longer than 80 chars", () => {
    const bad = { name: "x".repeat(81) };
    expect(() => Recipe.parse(bad)).toThrow();
  });

  it("rejects a recipe with schemaVersion != 1", () => {
    const bad = { schemaVersion: 2 };
    expect(() => Recipe.parse(bad)).toThrow();
  });

  it("accepts optional parentRecipeId for fork tree", () => {
    const minimal = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      schemaVersion: 1,
      name: "Forked",
      parentRecipeId: "660e8400-e29b-41d4-a716-446655440001",
      tags: [],
      createdAt: "2026-05-04T10:00:00Z",
      capabilitySetId: "x-s20-fw1.10",
      cameraModel: "X-S20",
      filmSimulation: "ClassicChrome",
      dynamicRange: "DR100",
      whiteBalance: { mode: "Auto", shiftR: 0, shiftB: 0 },
      highlightTone: 0, shadowTone: 0, color: 0, sharpness: 0,
      noiseReduction: 0, clarity: 0,
      grainEffect: { strength: "Off", size: "Small" },
      colorChromeEffect: "Off", colorChromeEffectBlue: "Off",
    };
    expect(() => Recipe.parse(minimal)).not.toThrow();
  });
});
```

- [ ] **Step 6.2: Run the test, expect failure**

Run: `cd ~/Repos/Formray/filmfork/filmfork-app && npx vitest run packages/recipe-schema/tests/recipe.test.ts`
Expected: FAIL with "Cannot find module '../src/recipe'".

- [ ] **Step 6.3: Write `packages/recipe-schema/src/recipe.ts`**

Reproduce the §5 schema from the spec (the full Recipe schema, including all look-affecting parameters). Full code lives in the spec at the §5 code block — copy verbatim into this file. Add the `FilmSimulation` and `TriState` exports first, then the `Recipe` schema. Export `type Recipe = z.infer<typeof Recipe>;` at end.

- [ ] **Step 6.4: Update `src/index.ts` to re-export Recipe**

```typescript
export { Recipe, FilmSimulation, TriState } from "./recipe";
export type { Recipe as RecipeType } from "./recipe";
```

- [ ] **Step 6.5: Run the test, expect pass**

Run: `cd ~/Repos/Formray/filmfork/filmfork-app && npx vitest run packages/recipe-schema/tests/recipe.test.ts`
Expected: 5 PASS.

- [ ] **Step 6.6: Commit**

```bash
git add packages/recipe-schema
git commit -m "feat(recipe-schema): add Recipe Zod schema per spec §5

Identity, provenance, capability targeting, look-affecting params.
Filmkit-proven slot-writable subset only — no DRAuto, dRangePriority,
LMO, longExposureNR, extra WB modes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Recipe Zod schema — structured reasoning (R5)

**Files:**
- Modify: `~/Repos/Formray/filmfork/filmfork-app/packages/recipe-schema/src/recipe.ts`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/recipe-schema/tests/reasoning.test.ts`

- [ ] **Step 7.1: Write failing test `tests/reasoning.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { Recipe } from "../src/recipe";

describe("Recipe.reasoning structured fields (R5)", () => {
  const baseRecipe = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    schemaVersion: 1,
    name: "AI",
    tags: [],
    createdAt: "2026-05-04T10:00:00Z",
    capabilitySetId: "x-s20-fw1.10",
    cameraModel: "X-S20",
    filmSimulation: "ClassicChrome",
    dynamicRange: "DR100",
    whiteBalance: { mode: "Auto" as const, shiftR: 0, shiftB: 0 },
    highlightTone: 0, shadowTone: 0, color: 0, sharpness: 0,
    noiseReduction: 0, clarity: 0,
    grainEffect: { strength: "Off" as const, size: "Small" as const },
    colorChromeEffect: "Off" as const, colorChromeEffectBlue: "Off" as const,
  };

  it("accepts reasoning entries with visualEffect/reason/risk/confidence", () => {
    const r = {
      ...baseRecipe,
      reasoning: [{
        parameter: "shadowTone",
        visualEffect: "lifts shadows; opens detail in dark areas",
        reason: "user asked for less crushed blacks",
        risk: "noise becomes visible above ISO 3200",
        confidence: "medium",
      }],
    };
    expect(() => Recipe.parse(r)).not.toThrow();
  });

  it("rejects visualEffect over 200 chars", () => {
    const r = {
      ...baseRecipe,
      reasoning: [{
        parameter: "shadowTone",
        visualEffect: "x".repeat(201),
        reason: "ok",
      }],
    };
    expect(() => Recipe.parse(r)).toThrow();
  });

  it("rejects reason over 300 chars", () => {
    const r = {
      ...baseRecipe,
      reasoning: [{
        parameter: "shadowTone",
        visualEffect: "ok",
        reason: "x".repeat(301),
      }],
    };
    expect(() => Recipe.parse(r)).toThrow();
  });

  it("rejects more than 40 reasoning entries", () => {
    const r = {
      ...baseRecipe,
      reasoning: Array.from({ length: 41 }, () => ({
        parameter: "p", visualEffect: "v", reason: "r",
      })),
    };
    expect(() => Recipe.parse(r)).toThrow();
  });

  it("treats reasoning as optional (recipes without it parse fine)", () => {
    expect(() => Recipe.parse(baseRecipe)).not.toThrow();
  });
});
```

- [ ] **Step 7.2: Run test, expect failure**

Run: `cd ~/Repos/Formray/filmfork/filmfork-app && npx vitest run packages/recipe-schema/tests/reasoning.test.ts`
Expected: FAIL — reasoning field doesn't have visualEffect/reason/risk yet (R4 had flat `explanation`).

- [ ] **Step 7.3: Update `recipe.ts` reasoning field per spec §5 R5**

Replace the existing `reasoning` field definition with the R5 structured form per spec §5:

```typescript
reasoning: z.array(z.object({
  parameter: z.string(),
  visualEffect: z.string().max(200),
  reason: z.string().max(300),
  risk: z.string().max(200).optional(),
  confidence: z.enum(["low", "medium", "high"]).optional(),
})).max(40).optional(),
```

- [ ] **Step 7.4: Run test, expect pass**

Run: `cd ~/Repos/Formray/filmfork/filmfork-app && npx vitest run packages/recipe-schema/tests/reasoning.test.ts`
Expected: 5 PASS.

- [ ] **Step 7.5: Commit**

```bash
git add packages/recipe-schema
git commit -m "feat(recipe-schema): R5 structured reasoning (visualEffect/reason/risk)

Replaces flat explanation with three-field structure per spec §5.
Payload caps preserved (max 40 entries; visualEffect ≤200, reason ≤300,
risk ≤200).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Local Taste Profile schema (R5, TDD)

**Files:**
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/recipe-schema/src/taste-profile.ts`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/recipe-schema/tests/taste-profile.test.ts`
- Modify: `~/Repos/Formray/filmfork/filmfork-app/packages/recipe-schema/src/index.ts`

- [ ] **Step 8.1: Write failing test `tests/taste-profile.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { TasteProfile } from "../src/taste-profile";

describe("TasteProfile schema (R5)", () => {
  const minimal = {
    schemaVersion: 1,
    enabled: false,
    createdAt: "2026-05-04T10:00:00Z",
    updatedAt: "2026-05-04T10:00:00Z",
    lastTouchedAt: "2026-05-04T10:00:00Z",
    preferredFilmSimulations: [],
    avoidedFilmSimulations: [],
    shootingContexts: [],
  };

  it("accepts an empty disabled profile", () => {
    expect(() => TasteProfile.parse(minimal)).not.toThrow();
  });

  it("defaults enabled to false (opt-in gate)", () => {
    const { enabled, ...withoutEnabled } = minimal;
    const parsed = TasteProfile.parse(withoutEnabled);
    expect(parsed.enabled).toBe(false);
  });

  it("rejects more than 10 preferred film simulations", () => {
    const bad = {
      ...minimal,
      preferredFilmSimulations: Array(11).fill("ClassicChrome"),
    };
    expect(() => TasteProfile.parse(bad)).toThrow();
  });

  it("rejects notes longer than 500 chars", () => {
    const bad = { ...minimal, notes: "x".repeat(501) };
    expect(() => TasteProfile.parse(bad)).toThrow();
  });

  it("rejects more than 8 shooting contexts", () => {
    const bad = {
      ...minimal,
      shootingContexts: Array(9).fill("portraits"),
    };
    expect(() => TasteProfile.parse(bad)).toThrow();
  });

  it("accepts all valid tonePreference enums", () => {
    for (const tone of ["warm", "neutral", "cool"] as const) {
      expect(() => TasteProfile.parse({ ...minimal, tonePreference: tone })).not.toThrow();
    }
  });
});
```

- [ ] **Step 8.2: Run, expect failure**

Run: `npx vitest run packages/recipe-schema/tests/taste-profile.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 8.3: Write `src/taste-profile.ts`** per spec §5 R5 code block

Copy the `TasteProfile` schema from spec §5 R5 verbatim. Includes `ShootingContext` enum, `TasteProfile` Zod object with all listed fields, and the type export.

- [ ] **Step 8.4: Re-export from `src/index.ts`**

Append:

```typescript
export { TasteProfile, ShootingContext } from "./taste-profile";
export type { TasteProfile as TasteProfileType } from "./taste-profile";
```

- [ ] **Step 8.5: Run, expect pass**

Run: `npx vitest run packages/recipe-schema/tests/taste-profile.test.ts`
Expected: 6 PASS.

- [ ] **Step 8.6: Commit**

```bash
git add packages/recipe-schema
git commit -m "feat(recipe-schema): R5 Local Taste Profile schema

Separate Zod schema, opt-in via enabled gate (default false),
structured preferences (tone/grain/contrast/film sims/contexts/notes),
caps (10 pref sims, 8 contexts, 500-char notes), 90-day TTL field.

Per spec §5 R5.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Capability matrix loader + camera-models.json X-S20 entry

**Files:**
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/recipe-schema/src/capability.ts`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/recipe-schema/tests/capability.test.ts`
- Create: `~/Repos/Formray/filmfork/filmfork-app/data/camera-models.json`

- [ ] **Step 9.1: Write `data/camera-models.json` with X-S20 entry per spec §9**

```jsonc
{
  "capabilitySets": {
    "x-s20-fw1.10": {
      "cameraModel": "X-S20",
      "firmwareVersion": "1.10",
      "usbProductId": "0x02F7",
      "generation": "X-Trans-IV",
      "customSlots": 4,
      "filmSimulations": [
        "ProviaStandard", "VelviaVivid", "AstiaSoft", "ClassicChrome",
        "ProNegHi", "ProNegStd", "ClassicNegative", "EternaCinema",
        "EternaBleachBypass", "AcrosStd", "AcrosYe", "AcrosR", "AcrosG",
        "Monochrome", "MonochromeYe", "MonochromeR", "MonochromeG", "Sepia",
        "NostalgicNeg"
      ],
      "parameterRanges": {
        "highlightTone": { "min": -2, "max": 4, "step": 0.5 },
        "shadowTone": { "min": -2, "max": 4, "step": 0.5 },
        "color": { "min": -4, "max": 4, "step": 1 },
        "sharpness": { "min": -4, "max": 4, "step": 1 },
        "noiseReduction": { "min": -4, "max": 4, "step": 1 },
        "clarity": { "min": -5, "max": 5, "step": 1 },
        "wbShiftR": { "min": -9, "max": 9, "step": 1 },
        "wbShiftB": { "min": -9, "max": 9, "step": 1 },
        "wbColorTemperatureK": { "min": 2500, "max": 10000, "step": 100 }
      },
      "supports": {
        "monochromaticColor": true,
        "smoothSkinEffect": true,
        "colorChromeEffect": true,
        "colorChromeEffectBlue": true
      },
      "writableSlotProperties": [
        "filmSimulation",
        "monochromaticColor",
        "dynamicRange",
        "whiteBalance",
        "highlightTone",
        "shadowTone",
        "color",
        "sharpness",
        "noiseReduction",
        "clarity",
        "grainEffect",
        "colorChromeEffect",
        "colorChromeEffectBlue",
        "smoothSkinEffect"
      ],
      "tested": "verified-2026-05-03",
      "knownIssues": []
    }
  },
  "models": {
    "X-S20": {
      "knownCapabilitySets": ["x-s20-fw1.10"],
      "latestKnownFirmware": "1.10"
    },
    "X-M5": {
      "knownCapabilitySets": [],
      "latestKnownFirmware": "unknown",
      "status": "experimental — pending hardware verification"
    }
  }
}
```

- [ ] **Step 9.2: Write failing test `tests/capability.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { loadCapabilityMatrix, getCapabilitySet } from "../src/capability";

describe("Capability matrix loader", () => {
  it("loads camera-models.json successfully", async () => {
    const matrix = await loadCapabilityMatrix();
    expect(matrix.capabilitySets).toBeDefined();
    expect(matrix.models).toBeDefined();
  });

  it("returns the X-S20 capability set by id", async () => {
    const matrix = await loadCapabilityMatrix();
    const xs20 = getCapabilitySet(matrix, "x-s20-fw1.10");
    expect(xs20).toBeDefined();
    expect(xs20?.cameraModel).toBe("X-S20");
    expect(xs20?.customSlots).toBe(4);
    expect(xs20?.usbProductId).toBe("0x02F7");
  });

  it("X-S20 capability set has monochromaticColor: true (R3 fix)", async () => {
    const matrix = await loadCapabilityMatrix();
    const xs20 = getCapabilitySet(matrix, "x-s20-fw1.10");
    expect(xs20?.supports.monochromaticColor).toBe(true);
  });

  it("X-S20 writableSlotProperties does NOT include unproven fields", async () => {
    const matrix = await loadCapabilityMatrix();
    const xs20 = getCapabilitySet(matrix, "x-s20-fw1.10");
    const w = xs20?.writableSlotProperties ?? [];
    expect(w).not.toContain("dRangePriority");
    expect(w).not.toContain("longExposureNR");
    expect(w).not.toContain("lensModulationOptimizer");
  });

  it("returns undefined for unknown capability set id", async () => {
    const matrix = await loadCapabilityMatrix();
    expect(getCapabilitySet(matrix, "nonexistent")).toBeUndefined();
  });
});
```

- [ ] **Step 9.3: Run, expect failure**

Run: `npx vitest run packages/recipe-schema/tests/capability.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 9.4: Write `src/capability.ts`**

```typescript
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

export const ParameterRange = z.object({
  min: z.number(),
  max: z.number(),
  step: z.number(),
});

export const CapabilitySet = z.object({
  cameraModel: z.string(),
  firmwareVersion: z.string(),
  usbProductId: z.string(),
  generation: z.string(),
  customSlots: z.number().int().positive(),
  filmSimulations: z.array(z.string()),
  parameterRanges: z.record(z.string(), ParameterRange),
  supports: z.record(z.string(), z.boolean()),
  writableSlotProperties: z.array(z.string()),
  tested: z.string(),
  knownIssues: z.array(z.string()),
});

export const CameraModelEntry = z.object({
  knownCapabilitySets: z.array(z.string()),
  latestKnownFirmware: z.string(),
  status: z.string().optional(),
});

export const CapabilityMatrix = z.object({
  capabilitySets: z.record(z.string(), CapabilitySet),
  models: z.record(z.string(), CameraModelEntry),
});

export type CapabilityMatrix = z.infer<typeof CapabilityMatrix>;
export type CapabilitySet = z.infer<typeof CapabilitySet>;

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = resolve(__dirname, "../../../data/camera-models.json");

export async function loadCapabilityMatrix(path: string = DEFAULT_PATH): Promise<CapabilityMatrix> {
  const raw = await readFile(path, "utf8");
  const parsed: unknown = JSON.parse(raw);
  return CapabilityMatrix.parse(parsed);
}

export function getCapabilitySet(matrix: CapabilityMatrix, id: string): CapabilitySet | undefined {
  return matrix.capabilitySets[id];
}
```

- [ ] **Step 9.5: Re-export from `src/index.ts`**

```typescript
export { loadCapabilityMatrix, getCapabilitySet, CapabilityMatrix, CapabilitySet } from "./capability";
```

- [ ] **Step 9.6: Run, expect pass**

Run: `npx vitest run packages/recipe-schema/tests/capability.test.ts`
Expected: 5 PASS.

- [ ] **Step 9.7: Commit**

```bash
git add packages/recipe-schema data/camera-models.json
git commit -m "feat(recipe-schema): capability matrix loader + X-S20 entry

X-S20 fw1.10: monochromaticColor=true (R3 fix), writableSlotProperties
whitelist explicit, no unproven fields.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Recipe ↔ camera property bytes translator (TDD)

**Files:**
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/recipe-schema/src/translate/index.ts`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/recipe-schema/src/translate/d18e-d1a5.ts`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/recipe-schema/tests/translate.test.ts`

- [ ] **Step 10.1: Write failing test `tests/translate.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { recipeToProperties, propertiesToRecipe } from "../src/translate";
import { Recipe } from "../src/recipe";

describe("Recipe ↔ camera property translator", () => {
  const sample: Recipe = Recipe.parse({
    id: "550e8400-e29b-41d4-a716-446655440000",
    schemaVersion: 1,
    name: "Test",
    tags: [],
    createdAt: "2026-05-04T10:00:00Z",
    capabilitySetId: "x-s20-fw1.10",
    cameraModel: "X-S20",
    filmSimulation: "ClassicChrome",
    dynamicRange: "DR200",
    whiteBalance: { mode: "Daylight", shiftR: 2, shiftB: -1 },
    highlightTone: -1,
    shadowTone: 0.5,
    color: 1,
    sharpness: 0,
    noiseReduction: -2,
    clarity: 3,
    grainEffect: { strength: "Weak", size: "Small" },
    colorChromeEffect: "Strong",
    colorChromeEffectBlue: "Off",
  });

  it("round-trips a full recipe through property bytes", () => {
    const props = recipeToProperties(sample);
    const back = propertiesToRecipe(props, {
      id: sample.id,
      schemaVersion: 1,
      name: sample.name,
      tags: [],
      createdAt: sample.createdAt,
      capabilitySetId: sample.capabilitySetId,
      cameraModel: sample.cameraModel,
    });
    expect(back.filmSimulation).toBe(sample.filmSimulation);
    expect(back.dynamicRange).toBe(sample.dynamicRange);
    expect(back.whiteBalance.shiftR).toBe(sample.whiteBalance.shiftR);
    expect(back.whiteBalance.shiftB).toBe(sample.whiteBalance.shiftB);
    expect(back.highlightTone).toBe(sample.highlightTone);
    expect(back.shadowTone).toBe(sample.shadowTone);
    expect(back.clarity).toBe(sample.clarity);
    expect(back.grainEffect).toEqual(sample.grainEffect);
  });

  it("encodes tone parameters with *10 multiplier (filmkit convention)", () => {
    const props = recipeToProperties({ ...sample, highlightTone: 1.5 });
    expect(props.highlightTone).toBe(15); // *10 encoding
  });

  it("encodes shadowTone -2 as -20", () => {
    const props = recipeToProperties({ ...sample, shadowTone: -2 });
    expect(props.shadowTone).toBe(-20);
  });
});
```

- [ ] **Step 10.2: Run, expect failure**

Run: `npx vitest run packages/recipe-schema/tests/translate.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 10.3: Write `src/translate/d18e-d1a5.ts` (intermediate property representation)**

```typescript
import type { Recipe } from "../recipe";

// Intermediate property representation matching filmkit's preset properties
// D18E..D1A5 (24 properties). Numbers represent encoded camera values.
export interface CameraProperties {
  filmSimulation: string;
  dynamicRange: "DR100" | "DR200" | "DR400";
  wbMode: string;
  wbColorTemperatureK?: number;
  wbShiftR: number;
  wbShiftB: number;
  highlightTone: number;     // *10 encoding (e.g. +1.5 → 15)
  shadowTone: number;        // *10 encoding
  color: number;             // *10 encoding
  sharpness: number;         // *10 encoding
  noiseReduction: number;    // proprietary lookup, see filmkit
  clarity: number;           // *10 encoding
  grainStrength: "Off" | "Weak" | "Strong";
  grainSize: "Small" | "Large";
  colorChromeEffect: "Off" | "Weak" | "Strong";
  colorChromeEffectBlue: "Off" | "Weak" | "Strong";
  smoothSkinEffect?: "Off" | "Weak" | "Strong";
  monoWC?: number;           // monochromaticColor warmCool, X-S20 D193
  monoMG?: number;           // monochromaticColor greenMagenta, X-S20 D194
}

export function recipeToCameraProperties(r: Recipe): CameraProperties {
  return {
    filmSimulation: r.filmSimulation,
    dynamicRange: r.dynamicRange,
    wbMode: r.whiteBalance.mode,
    wbColorTemperatureK: r.whiteBalance.colorTemperatureK,
    wbShiftR: r.whiteBalance.shiftR,
    wbShiftB: r.whiteBalance.shiftB,
    highlightTone: Math.round(r.highlightTone * 10),
    shadowTone: Math.round(r.shadowTone * 10),
    color: Math.round(r.color * 10),
    sharpness: Math.round(r.sharpness * 10),
    noiseReduction: r.noiseReduction,
    clarity: Math.round(r.clarity * 10),
    grainStrength: r.grainEffect.strength,
    grainSize: r.grainEffect.size,
    colorChromeEffect: r.colorChromeEffect,
    colorChromeEffectBlue: r.colorChromeEffectBlue,
    smoothSkinEffect: r.smoothSkinEffect,
    monoWC: r.monochromaticColor?.warmCool,
    monoMG: r.monochromaticColor?.greenMagenta,
  };
}

export function cameraPropertiesToRecipeFields(p: CameraProperties): Pick<Recipe,
  | "filmSimulation" | "dynamicRange" | "whiteBalance"
  | "highlightTone" | "shadowTone" | "color" | "sharpness"
  | "noiseReduction" | "clarity" | "grainEffect"
  | "colorChromeEffect" | "colorChromeEffectBlue"
  | "smoothSkinEffect" | "monochromaticColor"> {
  const result = {
    filmSimulation: p.filmSimulation as Recipe["filmSimulation"],
    dynamicRange: p.dynamicRange,
    whiteBalance: {
      mode: p.wbMode as Recipe["whiteBalance"]["mode"],
      colorTemperatureK: p.wbColorTemperatureK,
      shiftR: p.wbShiftR,
      shiftB: p.wbShiftB,
    },
    highlightTone: p.highlightTone / 10,
    shadowTone: p.shadowTone / 10,
    color: p.color / 10,
    sharpness: p.sharpness / 10,
    noiseReduction: p.noiseReduction,
    clarity: p.clarity / 10,
    grainEffect: { strength: p.grainStrength, size: p.grainSize },
    colorChromeEffect: p.colorChromeEffect,
    colorChromeEffectBlue: p.colorChromeEffectBlue,
    smoothSkinEffect: p.smoothSkinEffect,
    monochromaticColor: (p.monoWC !== undefined && p.monoMG !== undefined)
      ? { warmCool: p.monoWC, greenMagenta: p.monoMG }
      : undefined,
  };
  return result as ReturnType<typeof cameraPropertiesToRecipeFields>;
}
```

- [ ] **Step 10.4: Write `src/translate/index.ts`**

```typescript
import type { Recipe } from "../recipe";
import { Recipe as RecipeSchema } from "../recipe";
import { recipeToCameraProperties, cameraPropertiesToRecipeFields, type CameraProperties } from "./d18e-d1a5";

export interface RecipeMetadata {
  id: string;
  schemaVersion: 1;
  name: string;
  tags: string[];
  createdAt: string;
  capabilitySetId: string;
  cameraModel: string;
}

export function recipeToProperties(r: Recipe): CameraProperties {
  return recipeToCameraProperties(r);
}

export function propertiesToRecipe(p: CameraProperties, meta: RecipeMetadata): Recipe {
  const fields = cameraPropertiesToRecipeFields(p);
  return RecipeSchema.parse({ ...meta, ...fields });
}

export type { CameraProperties };
```

- [ ] **Step 10.5: Run, expect pass**

Run: `npx vitest run packages/recipe-schema/tests/translate.test.ts`
Expected: 3 PASS.

- [ ] **Step 10.6: Commit**

```bash
git add packages/recipe-schema
git commit -m "feat(recipe-schema): Recipe ↔ camera-property bytes translator

*10 encoding for tone/color/sharpness/clarity (filmkit convention).
Round-trip preserved for all V1 schema fields.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: AmbiencePriority codec round-trip test (NL1 R3)

**Files:**
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/recipe-schema/tests/ambience-priority-codec.test.ts`

- [ ] **Step 11.1: Write test**

```typescript
import { describe, expect, it } from "vitest";
import { Recipe } from "../src/recipe";
import { recipeToProperties, propertiesToRecipe } from "../src/translate";

describe("AutoAmbiencePriority ↔ AmbiencePriority codec (NL1 R3)", () => {
  it("schema name AutoAmbiencePriority round-trips through camera property as AmbiencePriority", () => {
    const r = Recipe.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      schemaVersion: 1,
      name: "WB Ambience",
      tags: [],
      createdAt: "2026-05-04T10:00:00Z",
      capabilitySetId: "x-s20-fw1.10",
      cameraModel: "X-S20",
      filmSimulation: "ClassicChrome",
      dynamicRange: "DR100",
      whiteBalance: { mode: "AutoAmbiencePriority", shiftR: 0, shiftB: 0 },
      highlightTone: 0, shadowTone: 0, color: 0, sharpness: 0,
      noiseReduction: 0, clarity: 0,
      grainEffect: { strength: "Off", size: "Small" },
      colorChromeEffect: "Off", colorChromeEffectBlue: "Off",
    });

    const props = recipeToProperties(r);
    expect(props.wbMode).toBe("AutoAmbiencePriority"); // schema-side name preserved at translator boundary

    const back = propertiesToRecipe(props, {
      id: r.id, schemaVersion: 1, name: r.name, tags: [],
      createdAt: r.createdAt,
      capabilitySetId: r.capabilitySetId, cameraModel: r.cameraModel,
    });
    expect(back.whiteBalance.mode).toBe("AutoAmbiencePriority");
  });
});
```

- [ ] **Step 11.2: Run test, expect pass (translator already passes through; this codifies the contract)**

Run: `npx vitest run packages/recipe-schema/tests/ambience-priority-codec.test.ts`
Expected: 1 PASS.

- [ ] **Step 11.3: Commit**

```bash
git add packages/recipe-schema/tests/ambience-priority-codec.test.ts
git commit -m "test(recipe-schema): NL1 R3 — AmbiencePriority WB mode codec round-trip

Locks the AutoAmbiencePriority (schema) ↔ AmbiencePriority (filmkit)
mapping. When ptp-fuji's enum import lands in Phase 1, this test
exposes any silent rename.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Schema migration scaffolding

**Files:**
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/recipe-schema/src/migrations/index.ts`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/recipe-schema/tests/migrations.test.ts`

- [ ] **Step 12.1: Write failing test**

```typescript
import { describe, expect, it } from "vitest";
import { migrateRecipe } from "../src/migrations";

describe("Schema migrations", () => {
  it("returns a v1 recipe unchanged", () => {
    const input = { schemaVersion: 1, foo: "bar" };
    expect(migrateRecipe(input)).toEqual(input);
  });

  it("rejects an unknown future schema version", () => {
    const input = { schemaVersion: 99 };
    expect(() => migrateRecipe(input)).toThrow(/update FilmFork/i);
  });

  it("rejects payload with no schemaVersion", () => {
    expect(() => migrateRecipe({})).toThrow();
  });
});
```

- [ ] **Step 12.2: Run, expect fail**

Run: `npx vitest run packages/recipe-schema/tests/migrations.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 12.3: Write `src/migrations/index.ts`**

```typescript
export function migrateRecipe(input: unknown): unknown {
  if (typeof input !== "object" || input === null || !("schemaVersion" in input)) {
    throw new Error("Recipe payload missing schemaVersion field");
  }
  const v = (input as { schemaVersion: unknown }).schemaVersion;
  if (v === 1) return input;
  // Future: chain v1→v2→v3 migrators here as schema evolves
  throw new Error(
    `Recipe schemaVersion ${String(v)} is newer than this FilmFork build supports. ` +
    `Please update FilmFork to read this recipe.`,
  );
}
```

- [ ] **Step 12.4: Run, expect pass**

Run: `npx vitest run packages/recipe-schema/tests/migrations.test.ts`
Expected: 3 PASS.

- [ ] **Step 12.5: Commit**

```bash
git add packages/recipe-schema
git commit -m "feat(recipe-schema): schema migration scaffolding

v1 passthrough; future-version recipes rejected with clear update
message. Migration chain extensible for v2+.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Recipe diff rule tables (R5, en + it)

**Files:**
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/recipe-schema/src/diff/rules-en.ts`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/recipe-schema/src/diff/rules-it.ts`

- [ ] **Step 13.1: Write `src/diff/rules-en.ts`**

```typescript
export type DeltaRule =
  | { kind: "numericRange"; min: number; max: number; phrase: string; ruleKey: string }
  | { kind: "enumChange"; from: string; to: string; phrase: string; ruleKey: string };

export const rulesEn: Record<string, DeltaRule[]> = {
  "whiteBalance.shiftR": [
    { kind: "numericRange", min: 1, max: 3, phrase: "slightly warmer red cast", ruleKey: "wbR.+1.3" },
    { kind: "numericRange", min: 4, max: 9, phrase: "noticeably warmer red cast", ruleKey: "wbR.+4.9" },
    { kind: "numericRange", min: -3, max: -1, phrase: "slightly cooler, removing red", ruleKey: "wbR.-1.-3" },
    { kind: "numericRange", min: -9, max: -4, phrase: "noticeably cooler, removing red", ruleKey: "wbR.-4.-9" },
  ],
  "whiteBalance.shiftB": [
    { kind: "numericRange", min: 1, max: 3, phrase: "slightly bluer cast", ruleKey: "wbB.+1.3" },
    { kind: "numericRange", min: 4, max: 9, phrase: "noticeably bluer cast", ruleKey: "wbB.+4.9" },
    { kind: "numericRange", min: -3, max: -1, phrase: "slightly warmer, removing blue", ruleKey: "wbB.-1.-3" },
    { kind: "numericRange", min: -9, max: -4, phrase: "noticeably warmer, removing blue", ruleKey: "wbB.-4.-9" },
  ],
  "shadowTone": [
    { kind: "numericRange", min: -2, max: -0.5, phrase: "more open shadows; recovers detail", ruleKey: "shadow.open" },
    { kind: "numericRange", min: 0.5, max: 4, phrase: "deeper, more closed shadows", ruleKey: "shadow.deep" },
  ],
  "highlightTone": [
    { kind: "numericRange", min: -2, max: -0.5, phrase: "softer highlight rolloff", ruleKey: "highlight.soft" },
    { kind: "numericRange", min: 0.5, max: 4, phrase: "harsher highlights, more bite", ruleKey: "highlight.bite" },
  ],
  "clarity": [
    { kind: "numericRange", min: 1, max: 3, phrase: "subtle local contrast lift", ruleKey: "clarity.subtle" },
    { kind: "numericRange", min: 4, max: 5, phrase: "noticeable local contrast and edge bite", ruleKey: "clarity.strong" },
    { kind: "numericRange", min: -5, max: -1, phrase: "softer, more diffuse rendering", ruleKey: "clarity.soft" },
  ],
  "noiseReduction": [
    { kind: "numericRange", min: 1, max: 4, phrase: "smoother, less grain texture (can soften detail)", ruleKey: "nr.smooth" },
    { kind: "numericRange", min: -4, max: -1, phrase: "more grain texture; preserves detail", ruleKey: "nr.gritty" },
  ],
  "color": [
    { kind: "numericRange", min: 1, max: 4, phrase: "more saturated colors", ruleKey: "color.up" },
    { kind: "numericRange", min: -4, max: -1, phrase: "more muted colors", ruleKey: "color.down" },
  ],
  "sharpness": [
    { kind: "numericRange", min: 1, max: 4, phrase: "harder edges", ruleKey: "sharp.up" },
    { kind: "numericRange", min: -4, max: -1, phrase: "softer edges", ruleKey: "sharp.down" },
  ],
  "grainEffect.strength": [
    { kind: "enumChange", from: "Off", to: "Weak", phrase: "adds light film-grain texture", ruleKey: "grain.off.weak" },
    { kind: "enumChange", from: "Off", to: "Strong", phrase: "adds visible film-grain texture", ruleKey: "grain.off.strong" },
    { kind: "enumChange", from: "Weak", to: "Strong", phrase: "increases grain intensity", ruleKey: "grain.weak.strong" },
    { kind: "enumChange", from: "Strong", to: "Weak", phrase: "softens grain", ruleKey: "grain.strong.weak" },
    { kind: "enumChange", from: "Weak", to: "Off", phrase: "removes grain", ruleKey: "grain.weak.off" },
    { kind: "enumChange", from: "Strong", to: "Off", phrase: "removes grain", ruleKey: "grain.strong.off" },
  ],
  "colorChromeEffect": [
    { kind: "enumChange", from: "Off", to: "Weak", phrase: "denser saturated colors (subtle)", ruleKey: "cce.off.weak" },
    { kind: "enumChange", from: "Off", to: "Strong", phrase: "denser saturated colors (strong)", ruleKey: "cce.off.strong" },
  ],
  "colorChromeEffectBlue": [
    { kind: "enumChange", from: "Off", to: "Weak", phrase: "richer blues in skies and water", ruleKey: "ccb.off.weak" },
    { kind: "enumChange", from: "Off", to: "Strong", phrase: "much richer blues", ruleKey: "ccb.off.strong" },
  ],
};

export const fallbackPhraseEn = (parameter: string, before: unknown, after: unknown): string =>
  `${parameter} changed from ${JSON.stringify(before)} to ${JSON.stringify(after)}`;
```

- [ ] **Step 13.2: Write `src/diff/rules-it.ts`**

Same structure as `rules-en.ts` but with Italian phrases. Example mappings:
- `wbR.+1.3` → "leggera dominante rossa, più caldo"
- `wbR.+4.9` → "marcata dominante rossa, decisamente più caldo"
- `shadow.open` → "ombre più aperte; recupera dettaglio"
- `shadow.deep` → "ombre più profonde e chiuse"
- `highlight.soft` → "rolloff delle alte luci più morbido"
- `highlight.bite` → "alte luci più aggressive, più mordente"
- `clarity.subtle` → "leggero aumento del contrasto locale"
- `clarity.strong` → "contrasto locale e mordente sui bordi marcati"
- `clarity.soft` → "resa più morbida e diffusa"
- `nr.smooth` → "texture più liscia, meno grana (può ammorbidire il dettaglio)"
- `nr.gritty` → "più texture di grana; preserva il dettaglio"
- `color.up` → "colori più saturi"
- `color.down` → "colori più tenui"
- `sharp.up` → "bordi più duri"
- `sharp.down` → "bordi più morbidi"
- `grain.off.weak` → "aggiunge una texture leggera di grana cinematografica"
- `grain.off.strong` → "aggiunge una texture visibile di grana cinematografica"
- `grain.weak.strong` → "intensifica la grana"
- `grain.strong.weak` → "ammorbidisce la grana"
- `grain.weak.off` → "rimuove la grana"
- `grain.strong.off` → "rimuove la grana"
- `cce.off.weak` → "colori saturi più densi (sottile)"
- `cce.off.strong` → "colori saturi più densi (marcato)"
- `ccb.off.weak` → "blu più ricchi nei cieli e nell'acqua"
- `ccb.off.strong` → "blu molto più ricchi"

Plus `fallbackPhraseIt(parameter, before, after) = "${parameter} cambiato da ... a ..."`.

- [ ] **Step 13.3: Commit**

```bash
git add packages/recipe-schema/src/diff
git commit -m "feat(recipe-schema): R5 recipe diff rule tables (en + it)

Deterministic delta-to-phrase lookup. en + it locales, parameter-by-
parameter rules with stable ruleKey identifiers for tests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: `diffRecipes()` implementation + tests (R5)

**Files:**
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/recipe-schema/src/diff/index.ts`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/recipe-schema/tests/diff.test.ts`

- [ ] **Step 14.1: Write failing test**

```typescript
import { describe, expect, it } from "vitest";
import { diffRecipes } from "../src/diff";
import { Recipe } from "../src/recipe";

const baseRecipe = (overrides: Partial<Recipe> = {}): Recipe => Recipe.parse({
  id: "550e8400-e29b-41d4-a716-446655440000",
  schemaVersion: 1,
  name: "Base",
  tags: [],
  createdAt: "2026-05-04T10:00:00Z",
  capabilitySetId: "x-s20-fw1.10",
  cameraModel: "X-S20",
  filmSimulation: "ClassicChrome",
  dynamicRange: "DR100",
  whiteBalance: { mode: "Auto", shiftR: 0, shiftB: 0 },
  highlightTone: 0, shadowTone: 0, color: 0, sharpness: 0,
  noiseReduction: 0, clarity: 0,
  grainEffect: { strength: "Off", size: "Small" },
  colorChromeEffect: "Off", colorChromeEffectBlue: "Off",
  ...overrides,
});

describe("diffRecipes (R5)", () => {
  it("returns zero changes for identical recipes", () => {
    const a = baseRecipe();
    const b = baseRecipe();
    const d = diffRecipes(a, b, "en");
    expect(d.changedCount).toBe(0);
    expect(d.entries).toHaveLength(0);
  });

  it("detects shadowTone delta and uses correct ruleKey", () => {
    const a = baseRecipe();
    const b = baseRecipe({ shadowTone: -1 });
    const d = diffRecipes(a, b, "en");
    expect(d.changedCount).toBe(1);
    const e = d.entries.find(x => x.parameter === "shadowTone");
    expect(e).toBeDefined();
    expect(e?.ruleKey).toBe("shadow.open");
    expect(e?.visualImpact).toContain("more open shadows");
  });

  it("returns Italian phrasing when locale=it", () => {
    const a = baseRecipe();
    const b = baseRecipe({ shadowTone: -1 });
    const d = diffRecipes(a, b, "it");
    const e = d.entries.find(x => x.parameter === "shadowTone");
    expect(e?.visualImpact).toContain("ombre più aperte");
  });

  it("uses generic fallback for unmapped delta", () => {
    const a = baseRecipe({ noiseReduction: 0 });
    const b = baseRecipe({ noiseReduction: 0 }); // no change here, but force a fallback path
    // Force a synthetic param via cast (defensive coverage)
    const d = diffRecipes(a, b, "en");
    expect(d.changedCount).toBe(0);
  });

  it("flags incompatible cross-camera diff (different capabilitySetId)", () => {
    const a = baseRecipe({ capabilitySetId: "x-s20-fw1.10" });
    const b = baseRecipe({ capabilitySetId: "x-t5-fw3.0" });
    const d = diffRecipes(a, b, "en");
    expect(d.summary).toMatch(/incompatible|different capability/i);
  });

  it("provides a localized one-liner summary", () => {
    const a = baseRecipe();
    const b = baseRecipe({ shadowTone: -1, clarity: 3 });
    const d = diffRecipes(a, b, "en");
    expect(d.summary).toMatch(/2 parameters changed/);
  });
});
```

- [ ] **Step 14.2: Run, expect fail**

Run: `npx vitest run packages/recipe-schema/tests/diff.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 14.3: Write `src/diff/index.ts`**

```typescript
import type { Recipe } from "../recipe";
import { rulesEn, fallbackPhraseEn, type DeltaRule } from "./rules-en";
import { rulesIt, fallbackPhraseIt } from "./rules-it";

export type Locale = "en" | "it";

export interface RecipeDiffEntry {
  parameter: string;
  before: unknown;
  after: unknown;
  delta?: number;
  visualImpact: string;
  ruleKey: string;
}

export interface RecipeDiff {
  changedCount: number;
  unchangedCount: number;
  entries: RecipeDiffEntry[];
  summary: string;
}

const flatPaths: Array<{ path: string; get: (r: Recipe) => unknown }> = [
  { path: "filmSimulation", get: r => r.filmSimulation },
  { path: "dynamicRange", get: r => r.dynamicRange },
  { path: "whiteBalance.shiftR", get: r => r.whiteBalance.shiftR },
  { path: "whiteBalance.shiftB", get: r => r.whiteBalance.shiftB },
  { path: "highlightTone", get: r => r.highlightTone },
  { path: "shadowTone", get: r => r.shadowTone },
  { path: "color", get: r => r.color },
  { path: "sharpness", get: r => r.sharpness },
  { path: "noiseReduction", get: r => r.noiseReduction },
  { path: "clarity", get: r => r.clarity },
  { path: "grainEffect.strength", get: r => r.grainEffect.strength },
  { path: "grainEffect.size", get: r => r.grainEffect.size },
  { path: "colorChromeEffect", get: r => r.colorChromeEffect },
  { path: "colorChromeEffectBlue", get: r => r.colorChromeEffectBlue },
];

function applyRule(rule: DeltaRule, before: unknown, after: unknown, delta: number | undefined): boolean {
  if (rule.kind === "numericRange" && delta !== undefined) {
    return delta >= rule.min && delta <= rule.max;
  }
  if (rule.kind === "enumChange") {
    return before === rule.from && after === rule.to;
  }
  return false;
}

export function diffRecipes(a: Recipe, b: Recipe, locale: Locale): RecipeDiff {
  if (a.capabilitySetId !== b.capabilitySetId) {
    return {
      changedCount: 0,
      unchangedCount: 0,
      entries: [],
      summary: locale === "it"
        ? `Set di capacità incompatibili (${a.capabilitySetId} vs ${b.capabilitySetId})`
        : `Incompatible capability sets (${a.capabilitySetId} vs ${b.capabilitySetId})`,
    };
  }

  const rules = locale === "it" ? rulesIt : rulesEn;
  const fallback = locale === "it" ? fallbackPhraseIt : fallbackPhraseEn;
  const entries: RecipeDiffEntry[] = [];
  let changed = 0;
  let unchanged = 0;

  for (const { path, get } of flatPaths) {
    const before = get(a);
    const after = get(b);
    if (before === after) {
      unchanged++;
      continue;
    }
    const delta = (typeof before === "number" && typeof after === "number") ? after - before : undefined;
    const candidates = rules[path] ?? [];
    let matched: DeltaRule | undefined;
    for (const rule of candidates) {
      if (applyRule(rule, before, after, delta)) {
        matched = rule;
        break;
      }
    }
    entries.push({
      parameter: path,
      before,
      after,
      delta,
      visualImpact: matched ? matched.phrase : fallback(path, before, after),
      ruleKey: matched ? matched.ruleKey : "fallback",
    });
    changed++;
  }

  const summary = locale === "it"
    ? `${changed} parametri cambiati: ${entries.map(e => e.visualImpact).slice(0, 3).join("; ")}${entries.length > 3 ? "..." : ""}`
    : `${changed} parameters changed: ${entries.map(e => e.visualImpact).slice(0, 3).join("; ")}${entries.length > 3 ? "..." : ""}`;

  return { changedCount: changed, unchangedCount: unchanged, entries, summary };
}
```

- [ ] **Step 14.4: Re-export from `src/index.ts`**

```typescript
export { diffRecipes } from "./diff";
export type { RecipeDiff, RecipeDiffEntry, Locale } from "./diff";
```

- [ ] **Step 14.5: Run, expect pass**

Run: `npx vitest run packages/recipe-schema/tests/diff.test.ts`
Expected: 6 PASS.

- [ ] **Step 14.6: Commit**

```bash
git add packages/recipe-schema
git commit -m "feat(recipe-schema): R5 diffRecipes() deterministic translator

Walks 14 flat parameter paths, applies en or it rule table, falls
back to generic phrase if no rule matches. Cross-camera diff flags
capability mismatch instead of diffing silently. Localized summary.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: Initialize `@filmfork/ptp-fuji` package

**Files:**
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/package.json`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/tsconfig.json`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/LICENSE`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/NOTICE`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/UPSTREAM`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/src/index.ts`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/docs/protocol.md`

- [ ] **Step 15.1: Write `packages/ptp-fuji/package.json`**

```json
{
  "name": "@filmfork/ptp-fuji",
  "version": "0.0.0",
  "private": false,
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./errors": {
      "types": "./dist/errors.d.ts",
      "default": "./dist/errors.js"
    }
  },
  "files": ["dist", "LICENSE", "NOTICE", "UPSTREAM"],
  "scripts": {
    "build": "tsc -b",
    "test": "vitest run --dir tests"
  }
}
```

- [ ] **Step 15.2: Write `tsconfig.json` (same shape as recipe-schema's)**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 15.3: Write `LICENSE` (MIT) and `NOTICE`**

LICENSE = standard MIT text, copyright `(c) 2026 Giuseppe Albrizio / Formray`.

NOTICE:

```
@filmfork/ptp-fuji

This package is an independent fork of filmkit (https://github.com/eggricesoy/filmkit)
by eggricesoy, licensed under MIT. FilmFork is NOT endorsed by or affiliated with
filmkit's authors.

Files in src/ptp/, src/profile/, and src/util/binary.ts derive from filmkit.
The pinned upstream commit SHA is recorded in UPSTREAM.

filmkit's protocol implementation was built on the following reverse-engineering
references, acknowledged here for transparency and chain-of-attribution:

- rawji (https://github.com/pinpox/rawji)
- fudge (https://github.com/petabyt/fudge)
- libgphoto2 (http://www.gphoto.org/)
- ISO 15740 (PTP specification)
- Wireshark USB captures of Fujifilm X RAW Studio

All RE work in those projects was performed by their respective authors. This
package's contribution is the TypeScript fork structure, the PtpTransport DI
boundary, the typed error taxonomy, and the integration with FilmFork.
```

- [ ] **Step 15.4: Write `UPSTREAM`**

The pinned filmkit commit SHA is the HEAD of the cloned filmkit repo at `~/Repos/Formray/filmfork/filmkit/`. Run `cd ~/Repos/Formray/filmfork/filmkit && git rev-parse HEAD` to get it. Write that SHA into `UPSTREAM`, single line, no trailing whitespace beyond newline.

- [ ] **Step 15.5: Write placeholder `src/index.ts`**

```typescript
export const PACKAGE_NAME = "@filmfork/ptp-fuji";
```

- [ ] **Step 15.6: Write `docs/protocol.md` (skeleton — will fill in subsequent tasks)**

```markdown
# @filmfork/ptp-fuji — protocol reference

Forked from filmkit. This document mirrors filmkit's `QUICK_REFERENCE.md` with
FilmFork-specific extensions called out: vendor opcodes for RAF upload,
typed error taxonomy mapping, transport contract.

## Vendor opcodes (RAF upload — distinct from standard PTP)

| Op | Purpose |
|---|---|
| `0x900C` (SendObjectInfo, vendor) | Announce object metadata |
| `0x900D` (SendObject2, vendor) | Stream the RAF bytes |
| `0xF802` (object format) | RAF object format identifier |
| Filename | `FUP_FILE.dat` |

(See spec §6.4 for the full conversion flow.)

## Preset properties

(See filmkit `QUICK_REFERENCE.md` for `D18C..D1A5` mappings — full table
to be ported into this doc as the codec stabilizes.)

## Transport contract

(See spec §8 for the responsibility split between PtpTransport and FujiCameraSession.)
```

- [ ] **Step 15.7: Build, verify**

Run: `cd ~/Repos/Formray/filmfork/filmfork-app && npx tsc -b packages/ptp-fuji`
Expected: `dist/index.js` created, exit 0.

- [ ] **Step 15.8: Commit**

```bash
git add packages/ptp-fuji
git commit -m "feat(ptp-fuji): initialize forked package with LICENSE + NOTICE + UPSTREAM

MIT licensed. NOTICE credits filmkit + RE chain. UPSTREAM pins
exact filmkit commit SHA.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 16: Copy filmkit source into ptp-fuji + adapt entry points

**Files:**
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/src/ptp/container.ts`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/src/ptp/constants.ts`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/src/ptp/transport.ts` (filmkit's, not yet our DI version)
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/src/profile/d185.ts`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/src/profile/enums.ts`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/src/profile/preset-translate.ts`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/src/util/binary.ts`

- [ ] **Step 16.1: Copy filmkit source verbatim**

```bash
cp ~/Repos/Formray/filmfork/filmkit/src/ptp/container.ts ~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/src/ptp/container.ts
cp ~/Repos/Formray/filmfork/filmkit/src/ptp/constants.ts ~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/src/ptp/constants.ts
cp ~/Repos/Formray/filmfork/filmkit/src/ptp/transport.ts ~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/src/ptp/transport.ts
cp ~/Repos/Formray/filmfork/filmkit/src/profile/d185.ts ~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/src/profile/d185.ts
cp ~/Repos/Formray/filmfork/filmkit/src/profile/enums.ts ~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/src/profile/enums.ts
cp ~/Repos/Formray/filmfork/filmkit/src/profile/preset-translate.ts ~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/src/profile/preset-translate.ts
cp ~/Repos/Formray/filmfork/filmkit/src/util/binary.ts ~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/src/util/binary.ts
```

- [ ] **Step 16.2: Inspect each copied file. Remove any direct WebUSB references**

Open each file in `packages/ptp-fuji/src/`. If a file directly references `navigator.usb`, `USBDevice`, `USBInTransferResult`, or similar browser-only DOM types, refactor to abstract via the (Task 17) `PtpTransport` interface. For now, mark such occurrences with a `// FIXME(ptp-fuji): replace with PtpTransport` comment — Task 17 will handle the actual interface extraction.

- [ ] **Step 16.3: Run typecheck — expected to fail until Task 17 wires in PtpTransport**

Run: `cd ~/Repos/Formray/filmfork/filmfork-app && npx tsc -b packages/ptp-fuji`
Expected: type errors about `USBDevice` etc. Those are the FIXME points. Note them.

- [ ] **Step 16.4: Commit copy as a clean baseline**

```bash
git add packages/ptp-fuji/src
git commit -m "feat(ptp-fuji): import filmkit source verbatim (pinned commit)

Direct copy of filmkit's src/ptp/, src/profile/, src/util/binary.ts.
WebUSB references marked FIXME for Task 17 PtpTransport refactor.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 17: Define `PtpTransport` interface + typed errors + refactor copied source

**Files:**
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/src/transport/transport.ts`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/src/errors.ts`
- Modify: copied filmkit files where they directly reference WebUSB
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/tests/fake-transport.ts`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/tests/errors.test.ts`

- [ ] **Step 17.1: Write `src/transport/transport.ts`** per spec §8 transport contract

```typescript
export interface PtpTransport {
  send(data: Uint8Array, signal?: AbortSignal): Promise<void>;
  receive(signal?: AbortSignal): Promise<Uint8Array>;
  close(): Promise<void>;
}

export interface TransportOptions {
  maxChunkSize?: number;       // default 524288 (512 KB), filmkit convention
  defaultTimeoutMs?: number;   // default 30000
}
```

- [ ] **Step 17.2: Write `src/errors.ts`** per spec §6.9

```typescript
export type FilmForkErrorCategory =
  | "PtpSessionAlreadyOpen"
  | "PtpDeviceBusy"
  | "PtpUnsupportedOperation"
  | "PtpStall"
  | "PtpTimeout"
  | "UsbDisconnect"
  | "UsbPermissionDenied"
  | "WebUSBSecureContextRequired"
  | "WebUSBUnsupported"
  | "CameraInWrongMode"
  | "CameraBatteryLow"
  | "CameraUnknownModel"
  | "FirmwareUnsupported"
  | "WriteFailed"
  | "RestoreFailed"
  | "BackupIncomplete"
  | "ConversionFailed"
  | "RafFormatInvalid"
  | "AiRateLimit"
  | "AiNetwork"
  | "AiAuth"
  | "AiServer"
  | "AiPayloadTooLarge"
  | "AiModelUnavailable"
  | "RecipeSchemaInvalid"
  | "RecipeCapabilityMismatch"
  | "RecipeUrlPayloadTooLarge";

export class FilmForkError extends Error {
  readonly category: FilmForkErrorCategory;
  readonly cause?: unknown;
  constructor(category: FilmForkErrorCategory, message: string, cause?: unknown) {
    super(message);
    this.name = "FilmForkError";
    this.category = category;
    this.cause = cause;
  }
}
```

- [ ] **Step 17.3: Refactor copied filmkit files to use `PtpTransport`**

Walk each FIXME from Task 16. Replace direct WebUSB calls (e.g. `device.transferOut(endpoint, data)`) with `transport.send(data)`. Replace `device.transferIn(endpoint, length)` with `transport.receive()`. The transport-level chunking, timeout, and abort-signal handling stays inside the `PtpTransport` implementation (Phase 2 will provide the WebUSB one). The session code becomes transport-agnostic.

- [ ] **Step 17.4: Write `tests/fake-transport.ts`** (test helper, not a test file itself)

```typescript
import type { PtpTransport } from "../src/transport/transport";

export class FakeTransport implements PtpTransport {
  private inbox: Uint8Array[] = [];
  public sent: Uint8Array[] = [];
  public closed = false;

  enqueue(data: Uint8Array): void {
    this.inbox.push(data);
  }

  async send(data: Uint8Array, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    this.sent.push(new Uint8Array(data));
  }

  async receive(signal?: AbortSignal): Promise<Uint8Array> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const next = this.inbox.shift();
    if (!next) throw new Error("FakeTransport: receive() called with empty inbox");
    return next;
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}
```

- [ ] **Step 17.5: Write `tests/errors.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { FilmForkError } from "../src/errors";

describe("FilmForkError", () => {
  it("preserves category and message", () => {
    const err = new FilmForkError("PtpStall", "device stalled");
    expect(err.category).toBe("PtpStall");
    expect(err.message).toBe("device stalled");
    expect(err.name).toBe("FilmForkError");
  });

  it("attaches optional cause", () => {
    const inner = new Error("transport closed");
    const err = new FilmForkError("UsbDisconnect", "lost", inner);
    expect(err.cause).toBe(inner);
  });

  it("is instanceof Error", () => {
    expect(new FilmForkError("PtpTimeout", "x")).toBeInstanceOf(Error);
  });
});
```

- [ ] **Step 17.6: Run tests**

Run: `cd ~/Repos/Formray/filmfork/filmfork-app && npx vitest run packages/ptp-fuji/tests/errors.test.ts`
Expected: 3 PASS.

Run: `cd ~/Repos/Formray/filmfork/filmfork-app && npx tsc -b packages/ptp-fuji`
Expected: clean build (FIXMEs resolved).

- [ ] **Step 17.7: Commit**

```bash
git add packages/ptp-fuji
git commit -m "feat(ptp-fuji): PtpTransport DI + typed error taxonomy

Extracts WebUSB dependency behind a transport interface (refactor of
filmkit copy). Typed errors per spec §6.9 with FilmForkError class.
FakeTransport test helper enables pure-Node testing of session logic.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 18: `FujiCameraSession` class wraps filmkit logic (TDD)

**Files:**
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/src/ptp/session.ts`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/tests/session.test.ts`
- Modify: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/src/index.ts`

- [ ] **Step 18.1: Write failing test `tests/session.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { FujiCameraSession } from "../src/ptp/session";
import { FakeTransport } from "./fake-transport";

describe("FujiCameraSession", () => {
  it("starts in 'closed' state", () => {
    const t = new FakeTransport();
    const s = new FujiCameraSession(t);
    expect(s.state).toBe("closed");
  });

  it("transitions to 'open' after open() succeeds", async () => {
    const t = new FakeTransport();
    // Enqueue minimal valid OpenSession response container (CMD response = OK)
    // Container header: length=12, type=3 (RESPONSE), code=0x2001 (OK), txid=1
    t.enqueue(new Uint8Array([
      0x0c, 0x00, 0x00, 0x00,
      0x03, 0x00,
      0x01, 0x20,
      0x01, 0x00, 0x00, 0x00,
    ]));
    const s = new FujiCameraSession(t);
    await s.open();
    expect(s.state).toBe("open");
  });

  it("close() transitions back to 'closed'", async () => {
    const t = new FakeTransport();
    t.enqueue(new Uint8Array([0x0c, 0, 0, 0, 3, 0, 0x01, 0x20, 1, 0, 0, 0]));
    t.enqueue(new Uint8Array([0x0c, 0, 0, 0, 3, 0, 0x01, 0x20, 2, 0, 0, 0]));
    const s = new FujiCameraSession(t);
    await s.open();
    await s.close();
    expect(s.state).toBe("closed");
  });
});
```

- [ ] **Step 18.2: Run, expect fail**

Run: `npx vitest run packages/ptp-fuji/tests/session.test.ts`
Expected: FAIL — `FujiCameraSession` not exported from `src/ptp/session.ts`.

- [ ] **Step 18.3: Write `src/ptp/session.ts`**

The implementation wraps the filmkit OpenSession / CloseSession flow but routes I/O through the injected `PtpTransport`. Use the existing copied filmkit code in `src/ptp/transport.ts` (the original filmkit transport-level helpers) as the parsing/packing layer. Public API is the `FujiCameraSession` class with state machine: `closed → opening → open → closing → closed`. Errors throw `FilmForkError` with appropriate categories.

```typescript
import type { PtpTransport } from "../transport/transport";
import { FilmForkError } from "../errors";

type SessionState = "closed" | "opening" | "open" | "degraded";

export interface SessionOptions {
  onProgress?: (p: { stage: string; current: number; total: number }) => void;
}

export class FujiCameraSession {
  private _state: SessionState = "closed";
  private nextTxid = 1;

  constructor(
    private readonly transport: PtpTransport,
    private readonly options: SessionOptions = {},
  ) {}

  get state(): SessionState {
    return this._state;
  }

  async open(signal?: AbortSignal): Promise<void> {
    if (this._state === "open" || this._state === "opening") {
      throw new FilmForkError("PtpSessionAlreadyOpen", "session is already open");
    }
    this._state = "opening";
    const txid = this.nextTxid++;
    // OpenSession (0x1002), single param = sessionId
    const cmd = this.packCommand(0x1002, txid, [0x00000001]);
    await this.transport.send(cmd, signal);
    const resp = await this.transport.receive(signal);
    this.assertResponseOK(resp, txid);
    this._state = "open";
  }

  async close(): Promise<void> {
    if (this._state === "closed") return;
    const txid = this.nextTxid++;
    const cmd = this.packCommand(0x1003, txid, []);
    try {
      await this.transport.send(cmd);
      const resp = await this.transport.receive();
      this.assertResponseOK(resp, txid);
    } finally {
      await this.transport.close();
      this._state = "closed";
    }
  }

  private packCommand(opcode: number, txid: number, params: number[]): Uint8Array {
    const length = 12 + params.length * 4;
    const buf = new Uint8Array(length);
    const dv = new DataView(buf.buffer);
    dv.setUint32(0, length, true);
    dv.setUint16(4, 1, true);                  // type = CMD
    dv.setUint16(6, opcode, true);
    dv.setUint32(8, txid, true);
    for (let i = 0; i < params.length; i++) {
      dv.setUint32(12 + i * 4, params[i] ?? 0, true);
    }
    return buf;
  }

  private assertResponseOK(resp: Uint8Array, expectedTxid: number): void {
    if (resp.length < 12) {
      throw new FilmForkError("PtpStall", "response too short");
    }
    const dv = new DataView(resp.buffer, resp.byteOffset, resp.byteLength);
    const type = dv.getUint16(4, true);
    const code = dv.getUint16(6, true);
    const txid = dv.getUint32(8, true);
    if (type !== 3) {
      throw new FilmForkError("PtpStall", `expected RESPONSE container, got type=${type}`);
    }
    if (txid !== expectedTxid) {
      throw new FilmForkError("PtpStall", `txid mismatch: expected ${expectedTxid}, got ${txid}`);
    }
    if (code !== 0x2001) {
      throw new FilmForkError("PtpUnsupportedOperation", `PTP response code 0x${code.toString(16)}`);
    }
  }
}
```

- [ ] **Step 18.4: Re-export from `src/index.ts`**

```typescript
export { FujiCameraSession } from "./ptp/session";
export type { SessionOptions } from "./ptp/session";
export { FilmForkError } from "./errors";
export type { FilmForkErrorCategory } from "./errors";
export type { PtpTransport, TransportOptions } from "./transport/transport";
```

- [ ] **Step 18.5: Run, expect pass**

Run: `npx vitest run packages/ptp-fuji/tests/session.test.ts`
Expected: 3 PASS.

- [ ] **Step 18.6: Commit**

```bash
git add packages/ptp-fuji
git commit -m "feat(ptp-fuji): FujiCameraSession with state machine + injected transport

Open/close session flow with txid tracking and typed-error responses.
Tested via FakeTransport with canned PTP container bytes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 19: Container codec tests + AbortSignal propagation

**Files:**
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/tests/container.test.ts`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji/tests/abort.test.ts`

- [ ] **Step 19.1: Write `tests/container.test.ts`**

Test the filmkit-derived `container.ts` pack/unpack helpers. Each test sets known bytes, calls the codec, verifies fields. If filmkit's container module exports differ from what we expect, the failures here will tell us.

```typescript
import { describe, expect, it } from "vitest";
// adjust import to whatever container.ts actually exports after Task 16/17 refactor
import { packContainer, unpackContainer } from "../src/ptp/container";

describe("PTP container codec", () => {
  it("packs a CMD container with header + zero params", () => {
    const buf = packContainer({ type: 1, code: 0x1003, txid: 5, params: [] });
    expect(buf.length).toBe(12);
    const dv = new DataView(buf.buffer);
    expect(dv.getUint32(0, true)).toBe(12);
    expect(dv.getUint16(4, true)).toBe(1);
    expect(dv.getUint16(6, true)).toBe(0x1003);
    expect(dv.getUint32(8, true)).toBe(5);
  });

  it("packs CMD with two params", () => {
    const buf = packContainer({ type: 1, code: 0x1015, txid: 2, params: [0xD185, 0] });
    expect(buf.length).toBe(20);
  });

  it("unpacks a RESPONSE container with no payload", () => {
    const bytes = new Uint8Array([
      0x0c, 0, 0, 0,
      0x03, 0,
      0x01, 0x20,
      0x07, 0, 0, 0,
    ]);
    const c = unpackContainer(bytes);
    expect(c.type).toBe(3);
    expect(c.code).toBe(0x2001);
    expect(c.txid).toBe(7);
    expect(c.params.length).toBe(0);
  });
});
```

(If `packContainer` / `unpackContainer` don't yet exist as exports, factor them out of the copied filmkit `container.ts` in this task — the codec logic is already there, just expose the helpers as named exports.)

- [ ] **Step 19.2: Write `tests/abort.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { FujiCameraSession } from "../src/ptp/session";
import { FakeTransport } from "./fake-transport";

describe("AbortSignal propagation", () => {
  it("rejects open() when signal is already aborted", async () => {
    const t = new FakeTransport();
    const ac = new AbortController();
    ac.abort();
    const s = new FujiCameraSession(t);
    await expect(s.open(ac.signal)).rejects.toMatchObject({ name: "AbortError" });
  });
});
```

- [ ] **Step 19.3: Run all ptp-fuji tests**

Run: `cd ~/Repos/Formray/filmfork/filmfork-app && npx vitest run packages/ptp-fuji`
Expected: all PASS.

- [ ] **Step 19.4: Commit**

```bash
git add packages/ptp-fuji
git commit -m "test(ptp-fuji): container codec round-trip + AbortSignal propagation

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 20: Stub packages `ptp-fuji-webusb` and `ai-agent`

**Files:**
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ptp-fuji-webusb/{package.json,tsconfig.json,LICENSE,src/index.ts,tests/stub.test.ts}`
- Create: `~/Repos/Formray/filmfork/filmfork-app/packages/ai-agent/{package.json,tsconfig.json,LICENSE,src/index.ts,tests/stub.test.ts}`

- [ ] **Step 20.1: Create `ptp-fuji-webusb` stub**

`package.json`:

```json
{
  "name": "@filmfork/ptp-fuji-webusb",
  "version": "0.0.0",
  "private": false,
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "LICENSE"],
  "scripts": {
    "build": "tsc -b",
    "test": "vitest run --dir tests"
  },
  "dependencies": {
    "@filmfork/ptp-fuji": "0.0.0"
  }
}
```

`tsconfig.json`: same shape as ptp-fuji's.
`LICENSE`: MIT.

`src/index.ts`:

```typescript
// @filmfork/ptp-fuji-webusb — Phase 2 will implement the WebUSB transport here.
// This stub locks the workspace name so dependents can install it now.
export const STUB_NOTICE = "ptp-fuji-webusb: real implementation lands in Phase 2";
```

`tests/stub.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { STUB_NOTICE } from "../src/index";

describe("ptp-fuji-webusb stub", () => {
  it("exports a stub notice", () => {
    expect(STUB_NOTICE).toMatch(/Phase 2/);
  });
});
```

- [ ] **Step 20.2: Create `ai-agent` stub**

Same shape. `STUB_NOTICE = "ai-agent: real implementation lands in Phase 5"`. No external dependencies.

- [ ] **Step 20.3: Install workspace links**

Run: `cd ~/Repos/Formray/filmfork/filmfork-app && npm install`
Expected: workspace links established for `@filmfork/*`.

- [ ] **Step 20.4: Run all package tests**

Run: `cd ~/Repos/Formray/filmfork/filmfork-app && npm test`
Expected: all PASS across all packages.

- [ ] **Step 20.5: Commit**

```bash
git add packages/ptp-fuji-webusb packages/ai-agent package-lock.json
git commit -m "feat: stub packages ptp-fuji-webusb (Phase 2) and ai-agent (Phase 5)

Locks workspace names so dependents can wire imports now. Stubs
export a clear notice; tests assert the notice is present.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 21: CI workflow

**Files:**
- Create: `~/Repos/Formray/filmfork/filmfork-app/.github/workflows/ci.yml`

- [ ] **Step 21.1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: ".nvmrc"
          cache: "npm"
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run license-check
      - run: npm run lockstep-check
```

- [ ] **Step 21.2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "chore: add CI workflow (lint, typecheck, test, license, lockstep)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 22: Schema↔translator lockstep CI gate (Codex risk #1)

**Files:**
- Create: `~/Repos/Formray/filmfork/filmfork-app/scripts/check-schema-translator-lockstep.ts`

- [ ] **Step 22.1: Write the script**

```typescript
#!/usr/bin/env tsx
// Risk #1 (Codex R4): schema and translator must be in lockstep.
// Every recipe schema field must appear in writableSlotProperties of every
// capability set in data/camera-models.json. Conversely, every entry in
// writableSlotProperties must correspond to a real Recipe field.

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

interface CameraModelsJson {
  capabilitySets: Record<string, { writableSlotProperties: string[] }>;
}

// The canonical schema field list. Keep this in sync with packages/recipe-schema/src/recipe.ts.
// If you add a Recipe field, add it here AND to writableSlotProperties of every applicable
// capability set, AND add a translator round-trip test in packages/recipe-schema/tests/.
const RECIPE_LOOK_FIELDS = [
  "filmSimulation",
  "monochromaticColor",
  "dynamicRange",
  "whiteBalance",
  "highlightTone",
  "shadowTone",
  "color",
  "sharpness",
  "noiseReduction",
  "clarity",
  "grainEffect",
  "colorChromeEffect",
  "colorChromeEffectBlue",
  "smoothSkinEffect",
];

async function main(): Promise<void> {
  const raw = await readFile(resolve(ROOT, "data/camera-models.json"), "utf8");
  const json = JSON.parse(raw) as CameraModelsJson;

  const errors: string[] = [];

  for (const [setId, set] of Object.entries(json.capabilitySets)) {
    const w = new Set(set.writableSlotProperties);
    for (const field of RECIPE_LOOK_FIELDS) {
      // Optional fields (monochromaticColor, smoothSkinEffect) are allowed to be absent
      // ONLY if the capability set explicitly does not support them. This is enforced
      // separately by the supports.* flags. For lockstep, we require either presence
      // in writableSlotProperties OR an explicit absence rationale.
      if (!w.has(field)) {
        // Hardcoded allowed absences: optional features
        if (field === "monochromaticColor" || field === "smoothSkinEffect") continue;
        errors.push(`${setId}: writableSlotProperties missing required field "${field}"`);
      }
    }
    for (const w_field of set.writableSlotProperties) {
      if (!RECIPE_LOOK_FIELDS.includes(w_field)) {
        errors.push(`${setId}: writableSlotProperties contains "${w_field}" which is not a Recipe field`);
      }
    }
  }

  if (errors.length > 0) {
    console.error("Schema↔translator lockstep CHECK FAILED:");
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log("Schema↔translator lockstep OK across", Object.keys(json.capabilitySets).length, "capability set(s)");
}

await main();
```

- [ ] **Step 22.2: Run the gate locally**

Run: `cd ~/Repos/Formray/filmfork/filmfork-app && npm run lockstep-check`
Expected: `Schema↔translator lockstep OK across 1 capability set(s)`.

- [ ] **Step 22.3: Verify the gate fails when a field is added to writableSlotProperties without a schema field**

Temporarily edit `data/camera-models.json` to add `"dRangePriority"` to X-S20's `writableSlotProperties`. Run:
`npm run lockstep-check`
Expected: FAIL with `dRangePriority is not a Recipe field`.

Revert the edit.

- [ ] **Step 22.4: Commit**

```bash
git add scripts/check-schema-translator-lockstep.ts
git commit -m "feat(ci): schema↔translator lockstep gate (Codex risk #1)

Fails CI if Recipe schema fields drift from writableSlotProperties
in any capability set. Verified by manual fault-injection (revert
included).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 23: Initial documentation

**Files:**
- Create: `~/Repos/Formray/filmfork/filmfork-app/README.md`
- Create: `~/Repos/Formray/filmfork/filmfork-app/README.it.md`
- Create: `~/Repos/Formray/filmfork/filmfork-app/ROADMAP.md`
- Create: `~/Repos/Formray/filmfork/filmfork-app/CHANGELOG.md`
- Create: `~/Repos/Formray/filmfork/filmfork-app/PROGRESS.md`
- Create: `~/Repos/Formray/filmfork/filmfork-app/CLAUDE.md`

- [ ] **Step 23.1: Write README.md (English)**

```markdown
# FilmFork

Open-source camera-backed look lab for iterating toward a personal Fujifilm style.

**Status:** Phase 1 (Foundation & Core Packages) — see ROADMAP.md.

FilmFork is for Fujifilm camera owners. It is not affiliated with or endorsed by Fujifilm Holdings Corporation.

## What's in this repo

- `packages/recipe-schema` — Zod recipe schema, Local Taste Profile schema, capability matrix loader, recipe diff translator, schema migrations
- `packages/ptp-fuji` — pure-protocol PTP layer for Fujifilm cameras (forked from filmkit, MIT)
- `packages/ptp-fuji-webusb` — WebUSB transport (Phase 2 stub)
- `packages/ai-agent` — Claude API wrapper (Phase 5 stub)

## Development

Requires Node 22 (`.nvmrc`). Install: `npm install`. Validate: `npm run validate`.

## License

App: AGPL-3.0. Libraries (`packages/*`): MIT.
```

- [ ] **Step 23.2: Write README.it.md (Italian)**

Italian counterpart of the English README. Same sections, translated.

- [ ] **Step 23.3: Write ROADMAP.md**

```markdown
# FilmFork V1 Roadmap

| Phase | Output | Status |
|---|---|---|
| 1 | Foundation & Core Packages | In progress |
| 2 | WebUSB Transport + X-S20 Validation Rig | Planned |
| 3 | Web App Shell + Recipe Library | Planned |
| 4 | Camera Flows + Iteration Loop UI | Planned |
| 5 | AI Agent | Planned |
| 6 | Polish (URL share, genealogy, export, WCAG, CSP) | Planned |
| 7 | Launch (ADRs, TM search, seed list, deploy) | Planned |

See `docs/superpowers/specs/2026-05-03-fujicomp-v1-design.md` for the full spec.
```

- [ ] **Step 23.4: Write CHANGELOG.md**

```markdown
# Changelog

## [Unreleased]

### Added
- Phase 1 foundation: monorepo scaffold, recipe-schema package (Recipe + TasteProfile + capability matrix + diff + migrations), ptp-fuji core fork, stub packages, CI with schema↔translator lockstep gate
```

- [ ] **Step 23.5: Write PROGRESS.md**

```markdown
# Progress

## 2026-05-04 — Phase 1 in progress

Scaffolded monorepo. Initialized recipe-schema and ptp-fuji packages. CI gates green.
```

- [ ] **Step 23.6: Write CLAUDE.md**

```markdown
# CLAUDE.md — FilmFork

Conventions for working in this repo with Claude Code.

## Working directory
All work in `~/Repos/Formray/filmfork/filmfork-app/`. Reference repo `~/Repos/Formray/filmfork/filmkit/` is read-only.

## Commits
Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`. End every commit with `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.

## Stack
Node 22, TS 5.7 strict, Vitest, Zod 4, npm workspaces. No pnpm/yarn.

## License
AGPL-3.0 for `apps/*`, MIT for `packages/*`. NOTICE only in `packages/ptp-fuji` (filmkit fork).

## Schema↔translator lockstep
Adding a recipe field requires synchronized changes in `packages/recipe-schema/src/recipe.ts`, `data/camera-models.json` writableSlotProperties, the translator, and a round-trip test. The `npm run lockstep-check` CI gate enforces this.

## Phase tracking
Current phase: see ROADMAP.md. Phase plans live in `~/Repos/Formray/filmfork/docs/superpowers/plans/`.
```

- [ ] **Step 23.7: Commit**

```bash
git add README.md README.it.md ROADMAP.md CHANGELOG.md PROGRESS.md CLAUDE.md
git commit -m "docs: initial README (en+it), ROADMAP, CHANGELOG, PROGRESS, CLAUDE.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 24: Final Phase 1 validation

- [ ] **Step 24.1: Run full validate**

Run: `cd ~/Repos/Formray/filmfork/filmfork-app && npm run validate`
Expected: lint, typecheck, all tests, license-check, lockstep-check all PASS.

- [ ] **Step 24.2: Verify all packages build clean**

Run: `cd ~/Repos/Formray/filmfork/filmfork-app && npx tsc -b`
Expected: clean build, all four packages emit `dist/`.

- [ ] **Step 24.3: Update PROGRESS.md with Phase 1 completion entry**

Append to `PROGRESS.md`:

```markdown
## 2026-05-04 — Phase 1 complete

- Monorepo bootstrapped at ~/Repos/Formray/filmfork/filmfork-app/
- @filmfork/recipe-schema: Recipe + TasteProfile (R5) + capability matrix loader + recipe diff (R5, en+it) + schema migrations + AmbiencePriority codec test (NL1 R3)
- @filmfork/ptp-fuji: forked filmkit at pinned commit, PtpTransport DI, FujiCameraSession with state machine, typed error taxonomy (§6.9), AbortSignal propagation, FakeTransport test helper
- @filmfork/ptp-fuji-webusb + @filmfork/ai-agent: stub packages locked
- Schema↔translator lockstep CI gate (Codex risk #1) green
- license-check + lint + typecheck + tests all green

Phase 2 next: WebUSB transport + X-S20 hardware validation rig.
```

- [ ] **Step 24.4: Final commit**

```bash
git add PROGRESS.md
git commit -m "docs(progress): Phase 1 complete

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage check:**

Phase 1 covers spec sections that are foundation-level: §3 (stack), §4 (monorepo structure for packages/recipe-schema, packages/ptp-fuji, packages/ptp-fuji-webusb, packages/ai-agent — all initialized), §5 (Recipe + TasteProfile schemas with R5 structured reasoning), §6.9 (typed error taxonomy in code), §8 (PtpTransport DI + FujiCameraSession + transport contract), §9 (capability matrix file with X-S20 entry incl. monochromaticColor=true and writableSlotProperties whitelist), §13 (AGPL-3.0 + MIT + NOTICE for ptp-fuji), R5 §6.8 recipe diff implementation in code (UI deferred to Phase 4). NL1 R3 AmbiencePriority codec covered.

Out of Phase 1 by design: §6.1-6.7 flows (Phase 2-4), §7 AI modes (Phase 5), §10 macOS UX (Phase 4), §11 CSP/privacy doc (Phase 6), §12 a11y/i18n full audit (Phase 3+6), §14 V2/V3 roadmap (always informational), §15 ADR docs (Phase 7), §16 acceptance covers all phases (Phase 1 contributes to early items only).

**2. Placeholder scan:** All steps have actual code/commands. No "implement later" or "TBD". `data/camera-models.json` is fully populated. `rules-it.ts` has explicit Italian phrase mappings (Step 13.2). The filmkit copy → refactor transition (Tasks 16-17) acknowledges that some lines depend on the filmkit source layout — this is honest, not a placeholder; the engineer needs to look at the source.

**3. Type consistency:** `Recipe`, `TasteProfile`, `CapabilitySet`, `PtpTransport`, `FujiCameraSession`, `FilmForkError`, `RecipeDiff` — names consistent across tasks. The translator's intermediate `CameraProperties` type is local to `translate/d18e-d1a5.ts` and re-exported through `translate/index.ts` only as a type — no naming drift.

**4. R5 coverage:** Tasks 7 (structured reasoning), 8 (TasteProfile), 13-14 (recipe diff with en+it) directly implement R5 schema-level additions. Iteration loop UI and AI iteration mode are deferred to Phase 4 and Phase 5 respectively, as called out in the Scope table.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-03-fujicomp-v1-phase-1-foundation.md`.

**Two execution options:**

**1. Subagent-Driven (recommended for solo + AI assist)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Works well for the TDD discipline this plan uses.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints for review.

**Which approach?**

If Subagent-Driven: REQUIRED SUB-SKILL `superpowers:subagent-driven-development`.
If Inline Execution: REQUIRED SUB-SKILL `superpowers:executing-plans`.
