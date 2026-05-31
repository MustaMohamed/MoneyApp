# Src Application Root Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move MoneyApp's application source from root-level folders into `src/`, including Expo Router routes under `src/app`, without changing app behavior.

**Architecture:** Keep infrastructure at the repository root and make `src/` the application root. The public import contract remains `@/...`, but TypeScript and Jest resolve it to `src/*`. Folder moves are split by top-level folder so parallel workers can own disjoint write scopes; shared config and documentation are integrated centrally after folder moves.

**Tech Stack:** Expo Router, React Native, TypeScript, Jest, oxlint, oxfmt, Expo prebuild.

---

## File Ownership Map

- `src/app/`: moved from `app/`; Expo Router route-only files.
- `src/modules/`: moved from `modules/`; canonical feature code.
- `src/components/`: moved from `components/`; shared UI and compatibility wrappers.
- `src/constants/`: moved from `constants/`; enums, strings, tokens, config.
- `src/database/`: moved from `database/`; client, migrations, compatibility queries, entities.
- `src/repositories/`: moved from `repositories/`; compatibility repositories plus shared app settings repository.
- `src/screens/`: moved from `screens/`; legacy/dev screens.
- `src/store/`: moved from `store/`; compatibility stores and global stores.
- `src/test_helpers/`: moved from `test_helpers/`; test support imported through `@/...`.
- `src/utils/`: moved from `utils/`; shared hooks, schemas, helpers.
- Root config/docs: `tsconfig.json`, `jest.config.js`, `scripts/generate-typed-routes.js`, `AGENTS.md`.

## Parallel Worker Tasks

Each worker must edit only its assigned folder move. Workers are not alone in the codebase: do not revert other workers' edits, and do not update shared config unless your task explicitly says so.

### Task 1: Move Router Folder

**Files:**
- Move: `app/` -> `src/app/`

- [ ] **Step 1: Move the folder**

Run:

```bash
mkdir -p src
git mv app src/app
```

Expected: `git status --short` shows renames under `src/app`.

- [ ] **Step 2: Verify route files stayed route-only**

Run:

```bash
find src/app -type f | sort
```

Expected: Only `_layout.tsx` and `index.tsx` route files, with existing `[id]/index.tsx` exceptions if present.

### Task 2: Move Modules Folder

**Files:**
- Move: `modules/` -> `src/modules/`

- [ ] **Step 1: Move the folder**

Run:

```bash
mkdir -p src
git mv modules src/modules
```

Expected: `git status --short` shows renames under `src/modules`.

- [ ] **Step 2: Spot-check module roots**

Run:

```bash
find src/modules -maxdepth 1 -type d | sort
```

Expected: domain folders such as `accounts`, `budget`, `onboarding`, `transactions`.

### Task 3: Move Components Folder

**Files:**
- Move: `components/` -> `src/components/`

- [ ] **Step 1: Move the folder**

Run:

```bash
mkdir -p src
git mv components src/components
```

Expected: `git status --short` shows renames under `src/components`.

### Task 4: Move Constants Folder

**Files:**
- Move: `constants/` -> `src/constants/`

- [ ] **Step 1: Move the folder**

Run:

```bash
mkdir -p src
git mv constants src/constants
```

Expected: `git status --short` shows renames under `src/constants`.

### Task 5: Move Database Folder

**Files:**
- Move: `database/` -> `src/database/`

- [ ] **Step 1: Move the folder**

Run:

```bash
mkdir -p src
git mv database src/database
```

Expected: `git status --short` shows renames under `src/database`.

### Task 6: Move Repositories Folder

**Files:**
- Move: `repositories/` -> `src/repositories/`

- [ ] **Step 1: Move the folder**

Run:

```bash
mkdir -p src
git mv repositories src/repositories
```

Expected: `git status --short` shows renames under `src/repositories`.

### Task 7: Move Screens Folder

**Files:**
- Move: `screens/` -> `src/screens/`

- [ ] **Step 1: Move the folder**

Run:

```bash
mkdir -p src
git mv screens src/screens
```

Expected: `git status --short` shows renames under `src/screens`.

### Task 8: Move Store Folder

**Files:**
- Move: `store/` -> `src/store/`

- [ ] **Step 1: Move the folder**

Run:

```bash
mkdir -p src
git mv store src/store
```

Expected: `git status --short` shows renames under `src/store`.

### Task 9: Move Utils Folder

**Files:**
- Move: `utils/` -> `src/utils/`

- [ ] **Step 1: Move the folder**

Run:

```bash
mkdir -p src
git mv utils src/utils
```

Expected: `git status --short` shows renames under `src/utils`.

### Task 9A: Move Imported Test Helpers Folder

**Files:**
- Move: `test_helpers/` -> `src/test_helpers/`

- [ ] **Step 1: Move the folder**

Run:

```bash
mkdir -p src
git mv test_helpers src/test_helpers
```

Expected: `git status --short` shows renames under `src/test_helpers`.

## Central Integration Tasks

Run these after the folder-move workers have landed.

### Task 10: Update Alias And Test Configuration

**Files:**
- Modify: `tsconfig.json`
- Modify: `jest.config.js`

- [ ] **Step 1: Update TypeScript alias**

Change:

```json
"paths": {
  "@/*": ["./*"]
}
```

to:

```json
"paths": {
  "@/*": ["./src/*"]
}
```

- [ ] **Step 2: Update Jest alias**

Change:

```js
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/$1',
},
```

to:

```js
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
},
```

- [ ] **Step 3: Update Jest coverage paths**

Change the `collectCoverageFrom` app globs to `src/...` equivalents:

```js
collectCoverageFrom: [
  'src/store/**/*.ts',
  'src/repositories/**/*.ts',
  'src/database/**/*.ts',
  'src/utils/responsive.ts',
  'src/utils/format_amount.ts',
  'src/utils/format_date.ts',
  'src/utils/onboarding_nav.ts',
  'src/screens/**/*.store.ts',
  'src/screens/**/*.state.ts',
  'src/app/**/*.helpers.ts',
  'src/app/**/*.store.ts',
  '!**/__mocks__/**',
  '!src/database/entities/**',
  '!src/database/client.ts',
  '!src/screens/**/*.hook.ts',
  '!src/utils/use_layout_init.hook.ts',
],
```

### Task 11: Update Typed Route Generation

**Files:**
- Modify: `scripts/generate-typed-routes.js`

- [ ] **Step 1: Update script comment**

Change the opening comment to:

```js
/**
 * Generates .expo/types/router.d.ts from the src/app/ directory so tsc --noEmit
 * works without needing to start the Expo dev server first.
 *
 * Called by the "typecheck" npm script. The generated file is gitignored.
 */
```

- [ ] **Step 2: Update appDir**

Change:

```js
const appDir = path.join(root, 'app');
```

to:

```js
const appDir = path.join(root, 'src', 'app');
```

### Task 12: Update Project Documentation

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Update Project Structure**

Replace the application folder block with:

```text
src/app/              ROUTING ONLY — _layout.tsx and index.tsx files only
src/modules/<domain>/ canonical feature code: data, store, screens, components
src/components/ui/    shared UI primitives and wrappers
src/components/       legacy/shared compatibility wrappers only
src/constants/        enums.ts · secure_store_keys.ts · strings.ts · theme.ts
src/store/            backward-compat re-exports; avoid new consumers
src/repositories/     backward-compat re-exports plus shared app settings repo
src/database/         client.ts · migrations/ · compatibility query/entity stubs
src/utils/            responsive.ts · use_zod_form.hook.ts · use_layout_init.hook.ts · onboarding_nav.ts
```

- [ ] **Step 2: Update prose references**

Replace root-path prose references so they point at `src/...`:

```text
New domain work belongs under `src/modules/<domain>/`. Root `src/store/`, `src/repositories/`,
and most `src/database/` domain files are compatibility surfaces for old import
paths; do not add new module consumers to those roots.
```

- [ ] **Step 3: Update app rules heading and examples**

Change `app/ rules (critical)` to `src/app/ rules (critical)` and keep the one-line re-export example unchanged because imports still use `@/...`.

### Task 13: Integrated Verification

**Files:**
- Read-only verification across the full worktree.

- [ ] **Step 1: Check root no longer contains moved app folders**

Run:

```bash
test ! -d app && test ! -d modules && test ! -d components && test ! -d constants && test ! -d database && test ! -d repositories && test ! -d screens && test ! -d store && test ! -d test_helpers && test ! -d utils
```

Expected: exit 0.

- [ ] **Step 2: Check src contains all moved folders**

Run:

```bash
test -d src/app && test -d src/modules && test -d src/components && test -d src/constants && test -d src/database && test -d src/repositories && test -d src/screens && test -d src/store && test -d src/test_helpers && test -d src/utils
```

Expected: exit 0.

- [ ] **Step 3: Run CI parity**

Run:

```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android
```

Expected: exit 0.

- [ ] **Step 4: Commit integrated migration**

Run:

```bash
git add .
git commit -m "refactor: move application source under src"
```
