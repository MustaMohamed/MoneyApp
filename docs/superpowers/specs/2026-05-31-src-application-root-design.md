# Src Application Root Design

## Summary

Move MoneyApp's main application code under `src/` so the repository root is reserved for project infrastructure, generated native folders, assets, tests, docs, scripts, and tool configuration. This is a structure-only migration: no runtime behavior, UI behavior, database schema, store semantics, or feature code should change.

## Goals

- Move Expo Router routes from `app/` to `src/app/`.
- Move application source folders from the repository root to `src/`.
- Keep public import style stable as `@/...`.
- Keep tests, mocks, assets, docs, scripts, native folders, and config files at the repository root.
- Update project documentation so new work belongs under `src/`.
- Preserve the existing route-only `app` rules, applied to `src/app`.

## Non-Goals

- Do not migrate Zustand or Signals code.
- Do not remove compatibility re-export files.
- Do not rename modules, screens, stores, repositories, or tests beyond path moves.
- Do not change route behavior, typed route semantics, database behavior, or UI.
- Do not move generated native folders (`android/`, `ios/`) or static assets.

## Target Structure

Application source moves to:

```text
src/
  app/
  modules/
  components/
  constants/
  database/
  repositories/
  screens/
  store/
  test_helpers/
  utils/
```

Root-level infrastructure remains at root:

```text
__mocks__/
__tests__/
assets/
docs/
scripts/
patches/
android/
ios/
app.json
babel.config.js
metro.config.js
jest.config.js
tsconfig.json
global.css
expo-env.d.ts
uniwind.d.ts
```

If a top-level application folder is discovered during implementation and is not listed above, treat it as in-scope only if it contains code imported through `@/...`. Keep purely tooling or generated folders at root.

## Routing

Expo Router should use `src/app` as the route directory. The route anatomy rules do not change:

- `src/app/` is routing only.
- Route files remain `_layout.tsx`, `index.tsx`, and `[id]/index.tsx` exceptions.
- Route `index.tsx` files remain one-line re-exports from canonical module screens.
- No hooks, stores, helpers, or animation files live beside routes.

`src/app/_layout.tsx` continues to own global providers and app startup behavior. Nested route groups move unchanged under `src/app/(app)`, `src/app/(onboarding)`, and `src/app/(dev)`.

## Imports And Aliases

The `@/...` import contract stays the same for code and tests. The implementation changes from repository-root resolution to `src` resolution:

```json
{
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

Jest's `moduleNameMapper` should mirror the same rule:

```js
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
}
```

Do not rewrite `@/...` imports across the codebase except where a file genuinely needs a different relative import after the move. The migration should primarily be directory moves plus config updates.

## Tooling Updates

Update tooling that refers to old root application paths:

- `tsconfig.json`: map `@/*` to `src/*`; keep root tests and declaration files included.
- `jest.config.js`: map `@/*` to `src/*`; update coverage globs from `store/**`, `database/**`, `screens/**`, etc. to `src/store/**`, `src/database/**`, `src/screens/**`, etc.
- Route generation/typecheck scripts: ensure generated typed routes scan `src/app` if they directly reference `app`.
- Agent validation and docs scripts: only update if they reference moved app folders.
- `AGENTS.md`: update project structure, app rules, and examples from `app/` to `src/app/` and root app folders to `src/...`.

Do not change `global.css`, `assets` references in `app.json`, or native project configuration unless verification proves a path break.

## Testing And Verification

The migration is complete only when the local CI parity chain passes:

```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android
```

Focused checks during implementation should include:

- `npm run typecheck` after alias and route moves.
- `npm test -- --runTestsByPath __tests__/ready.store.test.ts __tests__/use_layout_init.test.ts --runInBand` after moving startup code.
- Full Jest once aliases are fixed.

## Risks

- Expo Router may fail to discover routes if `src/app` is not recognized by the installed Expo Router version. Mitigation: run `npm run typecheck`, inspect generated route output, and run the Android prebuild dry-run.
- Jest may fail if `moduleNameMapper` and coverage globs do not match `tsconfig` aliases. Mitigation: update Jest config in the same task as the directory move.
- Documentation can become misleading if `AGENTS.md` still refers to root `app/`, `modules/`, or `components/`. Mitigation: update docs in the same PR.
- Open stacked migration PRs may conflict because this PR moves many files. Mitigation: keep this PR structure-only and avoid behavioral edits so rebases are mechanical.

## Rollout

This should be one dedicated PR from `refactor/src-application-root`. It should not be stacked on the Signals PRs. After merge, active feature branches should rebase and resolve path moves before continuing.
