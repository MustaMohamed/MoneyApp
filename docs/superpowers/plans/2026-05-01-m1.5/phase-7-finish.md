# M1.5 Phase 7 — Coverage Config + Final Run + PR

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update coverage configuration to include the new logic files, run the full test suite with coverage, verify thresholds pass, then commit and open a PR.

**Depends on:** Phases 1–6 complete.

---

### Task 15: Coverage Config + Full Run + PR

**Files:**
- Modify: `jest.config.js`

- [ ] **Step 1: Update jest.config.js coverage paths**

Add `app/**/*.store.ts` and `app/**/*.helpers.ts` are already covered by `app/**/*.helpers.ts`. Update `collectCoverageFrom` to also include screen-local stores:

Replace the `collectCoverageFrom` block in `jest.config.js`:

```javascript
collectCoverageFrom: [
  'store/**/*.ts',
  'repositories/**/*.ts',
  'database/**/*.ts',
  'utils/responsive.ts',
  'utils/format_amount.ts',
  'app/**/*.helpers.ts',
  'app/**/*.store.ts',
  '!**/__mocks__/**',
  '!database/entities/**',
  '!database/client.ts',
],
```

- [ ] **Step 2: Run full test suite with coverage**

```bash
npm test -- --coverage
```

Expected: PASS — all tests green, coverage thresholds met (80% lines / 95% functions / 100% branches on the logic layer).

If any threshold fails, check which file is below threshold, add missing test cases, re-run.

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any type errors before proceeding.

- [ ] **Step 4: Commit coverage config**

```bash
git add jest.config.js
git commit -m "chore: extend coverage config for format_amount, screen stores, and dashboard helpers"
```

- [ ] **Step 5: Push branch and open PR**

```bash
git push -u origin feat/m1.5-dashboard-account-management
```

Then open a PR targeting `main`:

```
Title: feat: M1.5 — Dashboard + Account Management screens

Body:
## Summary
- Adds (app) group navigation with 5-tab layout (Dashboard, Transactions, Bills, Goals, Budget)
- Dashboard screen (U2): hero card, net worth breakdown, account carousels, empty state
- Account Detail screen (U3): view/edit mode, adjust balance, archive
- Add Account screen (U4): reuses shared schema, navigates back on save
- Settings Main (U23) + Settings Currency (U26): manual rate override + API refresh
- currency.store.ts with DI factory (loadRate, fetchRate, setManualRate)
- Extended account.store and AccountRepository with update, archive, adjustBalance

## Test plan
- [ ] Run `npm test -- --coverage` — all tests pass, thresholds met
- [ ] Run `npx tsc --noEmit` — no type errors
- [ ] Launch app on simulator, complete onboarding, verify redirect lands on Dashboard
- [ ] Tap account card → Account Detail opens; edit name/color → save works
- [ ] Tap "Adjust Balance" → sheet opens, enter value, save updates balance
- [ ] Tap "Archive" → confirmation dialog, confirm → account disappears from dashboard
- [ ] Tap "Add [Type]" card on dashboard → Add Account form; save → back to dashboard
- [ ] Tap settings gear → Settings Main; tap Currency row → Settings Currency
- [ ] Tap "Refresh Rate" → rate updates; toggle Manual Override → enter custom rate → save
```

- [ ] **Step 6: Final verification checklist**

Before marking the PR ready for review:

- [ ] `npm test -- --coverage` passes with zero failing tests
- [ ] `npx tsc --noEmit` exits clean
- [ ] No `console.error` calls in production paths (only in catch blocks)
- [ ] All new store files follow the DI factory pattern (no direct DB calls in stores)
- [ ] `index.tsx` files contain no `useState` or `useSharedValue` calls
- [ ] All commit messages follow the `type: description` convention
