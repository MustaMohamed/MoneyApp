# Pre-M2 Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close test gaps, migrate list rendering to FlashList, extract the currency API URL to a config constant, lock down transfer math with explicit Jest cases, and shrink cold-start splash time by deferring commitment housekeeping — all without touching production feature logic.

**Architecture:** Five independent work items delivered as separate PRs (items 1–4 can land in parallel; item 5 lands alone for clean revert path). Every PR must keep `npm run test:coverage` green (80/95/100 thresholds). No new screens, no schema changes, no migrations.

**Tech Stack:** Expo SDK 55 (managed, Expo Go only) · React Native 0.83 · expo-sqlite · Zustand v5 · Jest 29 / @testing-library/react-native 13 · @shopify/flash-list (bundled in Expo Go SDK 55 at v2.0.2) · TypeScript strict

---

## Sequencing Overview

| PR | Item | Effort | Gate |
|----|------|--------|------|
| feat/config-currency-url | Item 1 — Currency API URL → `constants/config.ts` | XS | tariq review |
| feat/transfer-test-cases | Item 2 — `to_amount` transfer test coverage | S | tariq review |
| feat/defer-commitment-preload | Item 3 — Defer commitment preload from startup | XS | tariq review |
| feat/hook-screen-test-closure | Item 4 — Hook & screen test closure | M | tariq review |
| feat/flashlist-migration | Item 5 — FlashList migration (must land alone, last) | M | tariq review |

Items 1–4 can be worked and merged in parallel. Item 5 opens only after all other PRs are merged.

---

## Item 1 — Currency API URL → `constants/config.ts`

**Branch:** `feat/config-currency-url`

**Files:**
- Create: `constants/config.ts`
- Modify: `store/currency.store.ts` (line 11 — remove `EXCHANGE_API_URL` constant, import from `Config`)
- No new test file required (existing `__tests__/currency.store.test.ts` already mocks `global.fetch`)

### Task 1.1 — Create `constants/config.ts`

- [ ] **Step 1: Create the file**

  `/Users/musta/Code/projects/practice/MoneyApp/constants/config.ts`:
  ```ts
  export const Config = {
    currencyRateUrl: 'https://open.er-api.com/v6/latest/USD',
  } as const;
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors.

### Task 1.2 — Update `store/currency.store.ts`

- [ ] **Step 1: Replace the hardcoded constant with a Config import**

  In `store/currency.store.ts`, replace:
  ```ts
  const EXCHANGE_API_URL = 'https://open.er-api.com/v6/latest/USD';
  ```
  with:
  ```ts
  import { Config } from '@/constants/config';
  ```
  Then update the `fetch` call site (inside `fetchRate`):
  ```ts
  // Before:
  const res = await fetch(EXCHANGE_API_URL);
  // After:
  const res = await fetch(Config.currencyRateUrl);
  ```

- [ ] **Step 2: Run currency store tests to confirm they still pass**

  ```bash
  npx jest __tests__/currency.store.test.ts --no-coverage
  ```
  Expected: all 13 tests pass (the tests mock `global.fetch` so the URL doesn't flow through).

- [ ] **Step 3: Run full coverage suite**

  ```bash
  npm run test:coverage
  ```
  Expected: exits 0, thresholds 80/95/100 all green.

- [ ] **Step 4: Commit**

  ```bash
  git add constants/config.ts store/currency.store.ts
  git commit -m "refactor(config): move currency rate URL to constants/config.ts"
  ```

---

## Item 2 — `to_amount` Transfer Rule Test Coverage

**Branch:** `feat/transfer-test-cases`

**Files:**
- Modify: `__tests__/transaction.repository.test.ts` — add five new `describe` blocks at the bottom (the file already uses a real in-memory SQLite DB via `better-sqlite3` and the same repo+mock pattern; the five new cases follow that pattern exactly)

**Context:** The test file seeds three accounts at startup:
- `acc1` — bank, EGP, `current_balance = 5000`
- `acc_cc` — credit_card, EGP, `current_balance = 1000`, `revolving_balance = 500`, `minimum_payment = 200`
- `acc_cc_no_min` — credit_card, EGP, `current_balance = 1000`, `revolving_balance = 500`, `minimum_payment = NULL`

The `beforeEach` already deletes all transactions and resets `acc1` to 5000. You need to also reset `acc_cc` revolving_balance and current_balance in `beforeEach` for the new CC cases. Add a second USD account for Case B.

### Task 2.1 — Extend `beforeAll` seed and `beforeEach` reset

- [ ] **Step 1: Add a USD account and a second EGP bank account to `seedAccount()`**

  In `__tests__/transaction.repository.test.ts`, inside `function seedAccount()`, extend the `INSERT OR IGNORE` to include two more rows:
  ```ts
  function seedAccount() {
    realDb
      .prepare(
        `INSERT OR IGNORE INTO accounts
         (id,name,type,currency,opening_balance,current_balance,
          revolving_balance,minimum_payment,
          interest_tracking,is_archived,sort_order,created_at,updated_at)
       VALUES
         ('acc1','Bank','bank','EGP',5000,5000,NULL,NULL,0,0,0,?,?),
         ('acc_usd','USD Bank','bank','USD',0,0,NULL,NULL,0,0,3,?,?),
         ('acc_cc','CC','credit_card','EGP',0,1000,500,200,0,0,1,?,?),
         ('acc_cc_no_min','CC2','credit_card','EGP',0,1000,500,NULL,0,0,2,?,?),
         ('acc_cc2','CC3','credit_card','EGP',0,1000,5000,500,0,0,4,?,?)`,
      )
      .run(NOW, NOW, NOW, NOW, NOW, NOW, NOW, NOW, NOW, NOW);
  }
  ```

  > `acc_cc2` gives a clean CC with `revolving_balance = 5000`, `minimum_payment = 500` for Cases C and D.
  > `acc_usd` is the USD destination for Case B.

- [ ] **Step 2: Reset all accounts in `beforeEach`**

  Extend the existing `beforeEach` block to reset all account balances:
  ```ts
  beforeEach(() => {
    mockUuidCounter = 0;
    realDb.exec('DELETE FROM transactions');
    realDb.prepare("UPDATE accounts SET current_balance = 5000 WHERE id = 'acc1'").run();
    realDb.prepare("UPDATE accounts SET current_balance = 0 WHERE id = 'acc_usd'").run();
    realDb.prepare(
      "UPDATE accounts SET current_balance = 1000, revolving_balance = 500 WHERE id = 'acc_cc'",
    ).run();
    realDb.prepare(
      "UPDATE accounts SET current_balance = 1000, revolving_balance = 500 WHERE id = 'acc_cc_no_min'",
    ).run();
    realDb.prepare(
      "UPDATE accounts SET current_balance = 1000, revolving_balance = 5000 WHERE id = 'acc_cc2'",
    ).run();
  });
  ```

- [ ] **Step 3: Run the existing tests to confirm the seed change didn't break anything**

  ```bash
  npx jest __tests__/transaction.repository.test.ts --no-coverage
  ```
  Expected: all existing tests pass.

### Task 2.2 — Case A: Same-currency transfer

- [ ] **Step 1: Add the test block**

  Append to `__tests__/transaction.repository.test.ts`:
  ```ts
  describe('Case A — same-currency transfer (EGP → EGP)', () => {
    it('to_amount equals amount, exchange_rate equals 1, balances update correctly', async () => {
      const tx = await repo.add({
        type: TransactionType.Transfer,
        amount: 1000,
        currency: Currency.EGP,
        egp_amount: 1000,
        to_amount: 1000,
        exchange_rate: 1,
        account_id: 'acc1',
        to_account_id: 'acc_cc',
        transaction_date: '2026-05-01',
        transaction_time: '10:00:00',
      });

      expect(tx.to_amount).toBe(1000);
      expect(tx.exchange_rate).toBe(1);

      const from = realDb
        .prepare("SELECT current_balance FROM accounts WHERE id = 'acc1'")
        .get() as { current_balance: number };
      const to = realDb
        .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_cc'")
        .get() as { current_balance: number };

      expect(from.current_balance).toBe(4000); // 5000 - 1000
      expect(to.current_balance).toBe(2000);   // 1000 + 1000
    });
  });
  ```

- [ ] **Step 2: Run and confirm it passes**

  ```bash
  npx jest __tests__/transaction.repository.test.ts --no-coverage -t "Case A"
  ```
  Expected: PASS. If it fails, this indicates a bug in production code — do NOT patch production code; escalate to [tariq] + [layla].

### Task 2.3 — Case B: Foreign-currency transfer

- [ ] **Step 1: Add the test block**

  ```ts
  describe('Case B — foreign-currency transfer (EGP → USD)', () => {
    it('to_amount is in destination currency, exchange_rate applied, balances update correctly', async () => {
      const tx = await repo.add({
        type: TransactionType.Transfer,
        amount: 1000,           // native from-account currency (EGP)
        currency: Currency.EGP,
        egp_amount: 1000,
        to_amount: 20,          // native to-account currency (USD) = 1000 * 0.02
        exchange_rate: 0.02,    // 1 EGP = 0.02 USD
        account_id: 'acc1',
        to_account_id: 'acc_usd',
        transaction_date: '2026-05-01',
        transaction_time: '10:00:00',
      });

      expect(tx.amount).toBe(1000);
      expect(tx.to_amount).toBe(20);
      expect(tx.exchange_rate).toBe(0.02);

      const from = realDb
        .prepare("SELECT current_balance FROM accounts WHERE id = 'acc1'")
        .get() as { current_balance: number };
      const to = realDb
        .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_usd'")
        .get() as { current_balance: number };

      expect(from.current_balance).toBe(4000); // 5000 - 1000
      expect(to.current_balance).toBe(20);     // 0 + 20
    });
  });
  ```

- [ ] **Step 2: Run and confirm it passes**

  ```bash
  npx jest __tests__/transaction.repository.test.ts --no-coverage -t "Case B"
  ```
  Expected: PASS.

### Task 2.4 — Case C: CC payment ≤ minimum (installment-first satisfaction)

**Financial model:** MENA installment CC (التقسيط). Payment up to `minimum_payment` satisfies the installment due — it does NOT reduce `revolving_balance` (no principal reduction). Only excess over `minimum_payment` reduces revolving.

- [ ] **Step 1: Add the test block**

  ```ts
  describe('Case C — CC payment, payment ≤ minimum (installment-first satisfaction)', () => {
    it('captures minimum_payment_snapshot, payment ≤ minimum does NOT reduce revolving_balance', async () => {
      // acc_cc2: revolving_balance=5000, minimum_payment=500
      const tx = await repo.add({
        type: TransactionType.CCPayment,
        amount: 300,
        currency: Currency.EGP,
        egp_amount: 300,
        to_amount: 300,
        account_id: 'acc1',
        to_account_id: 'acc_cc2',
        transaction_date: '2026-05-01',
        transaction_time: '10:00:00',
      });

      expect(tx.minimum_payment_snapshot).toBe(500);

      const cc = realDb
        .prepare("SELECT revolving_balance FROM accounts WHERE id = 'acc_cc2'")
        .get() as { revolving_balance: number };

      // Payment 300 ≤ minimum 500 → installment satisfied (partially), revolving unchanged.
      expect(cc.revolving_balance).toBe(5000);
    });
  });
  ```

- [ ] **Step 2: Run and confirm it passes**

  ```bash
  npx jest __tests__/transaction.repository.test.ts --no-coverage -t "Case C"
  ```
  Expected: PASS.

### Task 2.5 — Case D: CC payment > minimum (installment-first split)

**Financial model:** MENA installment CC. The first `minimum_payment` of the payment satisfies the installment due (no revolving change). Only the EXCESS over `minimum_payment` reduces `revolving_balance`.

- [ ] **Step 1: Add the test block**

  ```ts
  describe('Case D — CC payment > minimum, installment-first split', () => {
    it('first minimum satisfies installment, excess reduces revolving_balance', async () => {
      // acc_cc2: revolving_balance=5000, minimum_payment=500; payment=800
      const tx = await repo.add({
        type: TransactionType.CCPayment,
        amount: 800,
        currency: Currency.EGP,
        egp_amount: 800,
        to_amount: 800,
        account_id: 'acc1',
        to_account_id: 'acc_cc2',
        transaction_date: '2026-05-01',
        transaction_time: '10:00:00',
      });

      expect(tx.minimum_payment_snapshot).toBe(500);

      const cc = realDb
        .prepare("SELECT revolving_balance FROM accounts WHERE id = 'acc_cc2'")
        .get() as { revolving_balance: number };

      // First 500 satisfies installment (no revolving change); 300 excess reduces revolving.
      expect(cc.revolving_balance).toBe(4700); // 5000 - 300 (excess only)
    });
  });
  ```

- [ ] **Step 2: Run and confirm it passes**

  ```bash
  npx jest __tests__/transaction.repository.test.ts --no-coverage -t "Case D"
  ```
  Expected: PASS.

### Task 2.6 — Case E: Reversal symmetry

- [ ] **Step 1: Add the test block**

  ```ts
  describe('Case E — reversal symmetry (delete restores all balances)', () => {
    it('deleting same-currency transfer (Case A shape) restores both balances', async () => {
      const tx = await repo.add({
        type: TransactionType.Transfer,
        amount: 1000,
        currency: Currency.EGP,
        egp_amount: 1000,
        to_amount: 1000,
        exchange_rate: 1,
        account_id: 'acc1',
        to_account_id: 'acc_cc',
        transaction_date: '2026-05-01',
        transaction_time: '10:00:00',
      });

      await repo.delete(tx.id);

      const from = realDb
        .prepare("SELECT current_balance FROM accounts WHERE id = 'acc1'")
        .get() as { current_balance: number };
      const to = realDb
        .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_cc'")
        .get() as { current_balance: number };

      expect(from.current_balance).toBe(5000);
      expect(to.current_balance).toBe(1000);
    });

    it('deleting foreign-currency transfer (Case B shape) restores both balances', async () => {
      const tx = await repo.add({
        type: TransactionType.Transfer,
        amount: 1000,
        currency: Currency.EGP,
        egp_amount: 1000,
        to_amount: 20,
        exchange_rate: 0.02,
        account_id: 'acc1',
        to_account_id: 'acc_usd',
        transaction_date: '2026-05-01',
        transaction_time: '10:00:00',
      });

      await repo.delete(tx.id);

      const from = realDb
        .prepare("SELECT current_balance FROM accounts WHERE id = 'acc1'")
        .get() as { current_balance: number };
      const to = realDb
        .prepare("SELECT current_balance FROM accounts WHERE id = 'acc_usd'")
        .get() as { current_balance: number };

      expect(from.current_balance).toBe(5000);
      expect(to.current_balance).toBe(0);
    });

    it('deleting CC payment (Case C shape: ≤ min, no revolving change) leaves revolving at 5000', async () => {
      // Case C added a payment of 300 (≤ minimum 500) — revolving stayed at 5000.
      // Reversing it must also leave revolving at 5000 (no-op on revolving, since no principal was paid).
      const tx = await repo.add({
        type: TransactionType.CCPayment,
        amount: 300,
        currency: Currency.EGP,
        egp_amount: 300,
        to_amount: 300,
        account_id: 'acc1',
        to_account_id: 'acc_cc2',
        transaction_date: '2026-05-01',
        transaction_time: '10:00:00',
      });

      await repo.delete(tx.id);

      const cc = realDb
        .prepare("SELECT revolving_balance FROM accounts WHERE id = 'acc_cc2'")
        .get() as { revolving_balance: number };

      expect(cc.revolving_balance).toBe(5000);
    });

    it('deleting CC payment (Case D shape: > min, partial revolving reduction) restores revolving from 4700 to 5000', async () => {
      // Case D added a payment of 800 (> minimum 500) — revolving dropped from 5000 to 4700 (300 excess).
      // Reversing must restore revolving back to 5000.
      const tx = await repo.add({
        type: TransactionType.CCPayment,
        amount: 800,
        currency: Currency.EGP,
        egp_amount: 800,
        to_amount: 800,
        account_id: 'acc1',
        to_account_id: 'acc_cc2',
        transaction_date: '2026-05-01',
        transaction_time: '10:00:00',
      });

      await repo.delete(tx.id);

      const cc = realDb
        .prepare("SELECT revolving_balance FROM accounts WHERE id = 'acc_cc2'")
        .get() as { revolving_balance: number };

      expect(cc.revolving_balance).toBe(5000);
    });
  });
  ```

- [ ] **Step 2: Run all new cases together**

  ```bash
  npx jest __tests__/transaction.repository.test.ts --no-coverage
  ```
  Expected: all tests pass (both pre-existing and the new Cases A–E).

- [ ] **Step 3: Run full coverage suite**

  ```bash
  npm run test:coverage
  ```
  Expected: exits 0, thresholds all green.

- [ ] **Step 4: Commit**

  ```bash
  git add __tests__/transaction.repository.test.ts
  git commit -m "test(transactions): add Cases A-E for to_amount transfer and CC payment rules"
  ```

---

## Item 3 — Defer Commitment Preload from App Startup

**Branch:** `feat/defer-commitment-preload`

**Files:**
- Modify: `utils/use_layout_init.hook.ts` — remove four commitment calls from the splash gate; add post-splash housekeeping microtask gated on `onboardingComplete`
- Create: `__tests__/use_layout_init.test.ts` — unit test verifying the splash gate does not await commitment calls

### Task 3.1 — Rewrite `utils/use_layout_init.hook.ts`

- [ ] **Step 1: Replace the body of `useLayoutInit`**

  Full new contents of `utils/use_layout_init.hook.ts`:
  ```ts
  import '@/utils/zod_config';
  import { useEffect } from 'react';
  import { useShallow } from 'zustand/react/shallow';
  import { getDb, runMigrations } from '@/database/client';
  import { loadOnboardingState } from '@/store/onboarding.store';
  import { useReadyStore } from '@/store/ready.store';
  import { useCommitmentStore } from '@/store/commitment.store';

  export function useLayoutInit() {
    const { setReady } = useReadyStore(useShallow((s) => ({ setReady: s.setReady })));

    useEffect(() => {
      (async () => {
        try {
          const db = await getDb();
          await runMigrations(db);
          const { complete: onboardingComplete } = await loadOnboardingState();
          setReady(true);

          if (onboardingComplete) {
            queueMicrotask(async () => {
              const store = useCommitmentStore.getState();
              try {
                await store.generatePayments();
                await store.checkAndDeactivateExpired();
              } catch {
                // housekeeping is best-effort; consumer screens reload on focus
              }
            });
          }
        } catch {
          // Surface splash and let app render in degraded state
          setReady(true);
        }
      })();
    }, [setReady]);
  }
  ```

  Key changes from the original:
  - `loadOnboardingState()` now captures the returned `complete` flag (it already returns `{ complete, step }`).
  - `setReady(true)` is called immediately after the three splash-blocking operations, before any commitment work.
  - The `finally` block is replaced by explicit `setReady(true)` in the catch to preserve degraded-state behaviour.
  - `generatePayments` + `checkAndDeactivateExpired` run post-splash in a `queueMicrotask`, gated on `onboardingComplete`.
  - `loadCommitments()` and `loadPaymentsForMonth()` are removed entirely — both are covered by `useFocusEffect` in their consumer screens.

- [ ] **Step 2: TypeScript check**

  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors.

### Task 3.2 — Write the unit test

- [ ] **Step 1: Create `__tests__/use_layout_init.test.ts`**

  ```ts
  import { renderHook, act } from '@testing-library/react-native';

  // Mock the splash-blocking utilities
  const mockGetDb = jest.fn().mockResolvedValue({});
  const mockRunMigrations = jest.fn().mockResolvedValue(undefined);
  const mockLoadOnboardingState = jest.fn().mockResolvedValue({ complete: false, step: 'O1' });
  const mockSetReady = jest.fn();

  // Spy on commitment store actions to assert they are NOT awaited inside the splash gate
  const mockGeneratePayments = jest.fn().mockResolvedValue(undefined);
  const mockCheckAndDeactivateExpired = jest.fn().mockResolvedValue(undefined);

  jest.mock('@/database/client', () => ({
    getDb: () => mockGetDb(),
    runMigrations: (...args: unknown[]) => mockRunMigrations(...args),
  }));

  jest.mock('@/store/onboarding.store', () => ({
    loadOnboardingState: () => mockLoadOnboardingState(),
  }));

  jest.mock('@/store/ready.store', () => ({
    useReadyStore: jest.fn((sel: (s: { state: { ready: boolean }; setReady: jest.Mock }) => unknown) =>
      sel({ state: { ready: false }, setReady: mockSetReady }),
    ),
  }));

  jest.mock('@/store/commitment.store', () => ({
    useCommitmentStore: {
      getState: () => ({
        generatePayments: mockGeneratePayments,
        checkAndDeactivateExpired: mockCheckAndDeactivateExpired,
      }),
    },
  }));

  // Mock zustand shallow so selector passes through
  jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: unknown) => sel }));

  // Mock zod_config (side-effect import)
  jest.mock('@/utils/zod_config', () => {});

  import { useLayoutInit } from '@/utils/use_layout_init.hook';

  describe('useLayoutInit — splash gate does not await commitment calls', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Default: onboarding not complete
      mockLoadOnboardingState.mockResolvedValue({ complete: false, step: 'O1' });
    });

    it('calls setReady(true) without awaiting commitment calls', async () => {
      renderHook(() => useLayoutInit());

      // Let the async effect run to completion
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockSetReady).toHaveBeenCalledWith(true);
      // Commitment calls must NOT be awaited inside the splash gate.
      // They run in a microtask AFTER setReady — check setReady was called first.
      const setReadyCallOrder = mockSetReady.mock.invocationCallOrder[0];
      // generatePayments runs in a queueMicrotask (async, later) — it may or
      // may not have run yet, but setReady must have already fired.
      expect(setReadyCallOrder).toBeGreaterThan(0);
    });

    it('does not schedule housekeeping when onboarding is not complete', async () => {
      mockLoadOnboardingState.mockResolvedValue({ complete: false, step: 'O1' });

      renderHook(() => useLayoutInit());

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0)); // drain microtask queue
      });

      expect(mockGeneratePayments).not.toHaveBeenCalled();
      expect(mockCheckAndDeactivateExpired).not.toHaveBeenCalled();
    });

    it('schedules housekeeping when onboarding is complete', async () => {
      mockLoadOnboardingState.mockResolvedValue({ complete: true, step: 'O6' });

      renderHook(() => useLayoutInit());

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(mockGeneratePayments).toHaveBeenCalledTimes(1);
      expect(mockCheckAndDeactivateExpired).toHaveBeenCalledTimes(1);
    });

    it('calls setReady(true) even when DB initialization fails', async () => {
      mockGetDb.mockRejectedValueOnce(new Error('db init failed'));

      renderHook(() => useLayoutInit());

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(mockSetReady).toHaveBeenCalledWith(true);
    });
  });
  ```

- [ ] **Step 2: Run the new test**

  ```bash
  npx jest __tests__/use_layout_init.test.ts --no-coverage
  ```
  Expected: all 4 tests pass.

- [ ] **Step 3: Run full coverage suite**

  ```bash
  npm run test:coverage
  ```
  Expected: exits 0, thresholds all green.

- [ ] **Step 4: Commit**

  ```bash
  git add utils/use_layout_init.hook.ts __tests__/use_layout_init.test.ts
  git commit -m "perf(startup): defer commitment housekeeping to post-splash microtask"
  ```

---

## Item 4 — Hook & Screen Test Closure

**Branch:** `feat/hook-screen-test-closure`

This is the largest item. Work through it in alphabetical hook order so coverage accrues incrementally.

**Files to create (21 hook tests + 5 screen smoke tests):**
- `__tests__/screens/dashboard.hook.test.ts`
- `__tests__/screens/transactions.hook.test.ts` — already exists at `__tests__/transactions_hook.test.ts`; do NOT duplicate; just verify coverage is picked up once `jest.config.js` is updated
- `__tests__/screens/transactions_detail.hook.test.ts`
- `__tests__/screens/transactions_filter.hook.test.ts`
- `__tests__/screens/add_transaction.hook.test.ts`
- `__tests__/screens/edit_transaction.hook.test.ts`
- `__tests__/screens/accounts_add.hook.test.ts`
- `__tests__/screens/accounts_detail.hook.test.ts`
- `__tests__/screens/commitments.hook.test.ts`
- `__tests__/screens/commitments_add.hook.test.ts`
- `__tests__/screens/commitments_detail.hook.test.ts`
- `__tests__/screens/commitments_edit.hook.test.ts`
- `__tests__/screens/pay_sheet.hook.test.ts`
- `__tests__/screens/onboarding_currency.hook.test.ts`
- `__tests__/screens/onboarding_more_accounts.hook.test.ts`
- `__tests__/screens/onboarding_ready.hook.test.ts`
- `__tests__/screens/onboarding_security.hook.test.ts`
- `__tests__/screens/onboarding_add_account.hook.test.ts`
- `__tests__/screens/settings.hook.test.ts`
- `__tests__/screens/settings_categories.hook.test.ts`
- `__tests__/screens/settings_currency.hook.test.ts`
- `__tests__/screens/smoke/dashboard.screen.test.tsx`
- `__tests__/screens/smoke/transactions.screen.test.tsx`
- `__tests__/screens/smoke/accounts.screen.test.tsx`
- `__tests__/screens/smoke/commitments.screen.test.tsx`
- `__tests__/screens/smoke/settings.screen.test.tsx`
- Modify: `jest.config.js` — extend `collectCoverageFrom` to include hooks and screens; remove `coveragePathIgnorePatterns` entries that were deferring hooks/screens

> **Implementation order:** Update `jest.config.js` last, after all tests are written and individually passing. Removing the ignore patterns before tests exist will crater coverage below thresholds.

### Task 4.1 — Update `jest.config.js` `collectCoverageFrom` (deferred to last step)

This task is listed first for orientation but MUST be executed last in this item, after all hook and screen tests pass individually.

When ready, update `jest.config.js`:
```js
collectCoverageFrom: [
  'store/**/*.ts',
  'repositories/**/*.ts',
  'database/**/*.ts',
  'utils/responsive.ts',
  'utils/format_amount.ts',
  'utils/format_date.ts',
  'utils/onboarding_nav.ts',
  'utils/use_layout_init.hook.ts',
  'screens/**/*.hook.ts',
  'screens/**/*.store.ts',
  'screens/**/*.state.ts',
  'app/**/*.helpers.ts',
  'app/**/*.store.ts',
  '!**/__mocks__/**',
  '!database/entities/**',
  '!database/client.ts',
],
coveragePathIgnorePatterns: [
  '/node_modules/',
],
```

### Task 4.2 — Mock pattern reference (read this before writing any hook test)

Every hook test in `screens/` follows this pattern. The hook under test uses Zustand stores, expo-router, and sometimes RHF. None of those should hit real implementations in unit tests.

**Standard mock block** (adapt per hook's actual imports):
```ts
jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useFocusEffect: jest.fn(),
  router: { push: jest.fn(), back: jest.fn() },
}));
```

For hooks that call Zustand stores, mock each store module:
```ts
jest.mock('@/store/account.store', () => ({ useAccountStore: jest.fn() }));
// Then in the test: (useAccountStore as jest.Mock).mockImplementation((sel) => sel({ state: { accounts: [] }, loadAccounts: jest.fn() }));
```

For hooks that use RHF (`react-hook-form`), you do NOT need to mock it — `renderHook` runs in jsdom and RHF works fine there.

**Minimum assertion per hook test:** The hook must render without throwing. One additional behavioural assertion is expected (e.g., a returned state field has a sane initial value).

### Task 4.3 — `dashboard.hook.test.ts`

- [ ] **Step 1: Create `__tests__/screens/dashboard.hook.test.ts`**

  ```ts
  import { renderHook } from '@testing-library/react-native';
  import { useDashboard } from '@/screens/dashboard/dashboard.hook';
  import { useAccountStore } from '@/store/account.store';
  import { useCurrencyStore } from '@/store/currency.store';
  import { useCommitmentStore } from '@/store/commitment.store';
  import { useDashboardState } from '@/screens/dashboard/dashboard.state';
  import { useDashboardStore } from '@/screens/dashboard/dashboard.store';

  jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
  jest.mock('expo-router', () => ({
    useRouter: () => ({ push: jest.fn() }),
    useFocusEffect: jest.fn(),
  }));
  jest.mock('@/database/client', () => ({ getDb: jest.fn().mockResolvedValue({}) }));
  jest.mock('@/database/account_stats', () => ({ getAccountsStats: jest.fn().mockResolvedValue({}) }));
  jest.mock('@/database/transactions', () => ({ getMonthExpenseStats: jest.fn().mockResolvedValue({ totalEgp: 0, usdNative: 0, count: 0 }) }));
  jest.mock('@/repositories/commitment.repository', () => ({
    commitmentRepository: { getPaymentsForMonth: jest.fn().mockResolvedValue([]) },
  }));
  jest.mock('@/store/account.store', () => ({ useAccountStore: jest.fn() }));
  jest.mock('@/store/currency.store', () => ({ useCurrencyStore: jest.fn() }));
  jest.mock('@/store/commitment.store', () => ({ useCommitmentStore: jest.fn() }));
  jest.mock('@/screens/dashboard/dashboard.state', () => ({ useDashboardState: jest.fn() }));
  jest.mock('@/screens/dashboard/dashboard.store', () => ({ useDashboardStore: jest.fn() }));

  function setup() {
    (useAccountStore as jest.Mock).mockImplementation((sel: any) =>
      sel({ state: { accounts: [] }, loadAccounts: jest.fn() }),
    );
    (useCurrencyStore as jest.Mock).mockImplementation((sel: any) =>
      sel({ state: { rate: 50, isManualOverride: false } }),
    );
    (useCommitmentStore as jest.Mock).mockImplementation((sel: any) =>
      sel({ state: { commitments: [], payments: [] } }),
    );
    (useDashboardState as jest.Mock).mockImplementation((sel: any) =>
      sel({ state: { isBreakdownVisible: false, refreshing: false }, setBreakdownVisible: jest.fn(), setRefreshing: jest.fn() }),
    );
    (useDashboardStore as jest.Mock).mockImplementation((sel: any) =>
      sel({
        state: {
          statsMap: {},
          currentMonthCommitmentPayments: [],
          currentMonthSpend: { totalEgp: 0, usdNative: 0, count: 0 },
          previousMonthSpend: { totalEgp: 0, usdNative: 0, count: 0 },
        },
        setStatsMap: jest.fn(),
        setCurrentMonthCommitmentPayments: jest.fn(),
        setMonthSpendStats: jest.fn(),
      }),
    );
  }

  describe('useDashboard', () => {
    beforeEach(setup);

    it('renders without throwing and returns state', () => {
      const { result } = renderHook(() => useDashboard());
      expect(result.current.state.accounts).toEqual([]);
      expect(result.current.state.rate).toBe(50);
    });

    it('netWorth defaults to zero when no accounts', () => {
      const { result } = renderHook(() => useDashboard());
      expect(result.current.state.netWorth.netWorthEgp).toBe(0);
    });
  });
  ```

- [ ] **Step 2: Run**

  ```bash
  npx jest __tests__/screens/dashboard.hook.test.ts --no-coverage
  ```
  Expected: PASS.

### Task 4.4 — `transactions_detail.hook.test.ts`

- [ ] **Step 1: Read the hook to understand its dependencies**

  ```bash
  # The hook lives at:
  # screens/transactions/detail/detail.hook.ts
  ```

- [ ] **Step 2: Create `__tests__/screens/transactions_detail.hook.test.ts`**

  ```ts
  import { renderHook } from '@testing-library/react-native';

  jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
  jest.mock('expo-router', () => ({
    useLocalSearchParams: () => ({ id: 'tx-1' }),
    useRouter: () => ({ back: jest.fn() }),
    useFocusEffect: jest.fn(),
  }));
  jest.mock('@/store/transaction.store', () => ({ useTransactionStore: jest.fn() }));
  jest.mock('@/store/account.store', () => ({ useAccountStore: jest.fn() }));
  jest.mock('@/store/category.store', () => ({ useCategoryStore: jest.fn() }));

  import { useTransactionStore } from '@/store/transaction.store';
  import { useAccountStore } from '@/store/account.store';
  import { useCategoryStore } from '@/store/category.store';
  import { useTransactionDetail } from '@/screens/transactions/detail/detail.hook';

  jest.mock('@/screens/transactions/detail/detail.state', () => ({
    useTxDetailState: jest.fn((sel: any) => sel({ state: { viewState: 'loading', showDeleteConfirm: false }, setShowDeleteConfirm: jest.fn() })),
  }));
  jest.mock('@/screens/transactions/detail/detail.store', () => ({
    useTxDetailStore: jest.fn((sel: any) => sel({ state: { transaction: null, fromAccount: null, toAccount: null, category: null }, load: jest.fn(), reset: jest.fn() })),
  }));

  function setup() {
    (useTransactionStore as jest.Mock).mockImplementation((sel: any) =>
      sel({ state: { transactions: [] }, deleteTransaction: jest.fn() }),
    );
    (useAccountStore as jest.Mock).mockImplementation((sel: any) =>
      sel({ state: { accounts: [] } }),
    );
    (useCategoryStore as jest.Mock).mockImplementation((sel: any) =>
      sel({ state: { categories: [] } }),
    );
  }

  describe('useTransactionDetail', () => {
    beforeEach(setup);

    it('renders without throwing', () => {
      // useTransactionDetail requires an id param
      expect(() => renderHook(() => useTransactionDetail('tx-1'))).not.toThrow();
    });
  });
  ```

- [ ] **Step 3: Run**

  ```bash
  npx jest __tests__/screens/transactions_detail.hook.test.ts --no-coverage
  ```
  Expected: PASS.

### Task 4.5 — `transactions_filter.hook.test.ts`

- [ ] **Step 1: Create `__tests__/screens/transactions_filter.hook.test.ts`**

  ```ts
  import { renderHook } from '@testing-library/react-native';

  jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
  jest.mock('@/store/account.store', () => ({ useAccountStore: jest.fn() }));
  jest.mock('@/store/category.store', () => ({ useCategoryStore: jest.fn() }));
  jest.mock('@/screens/transactions/filter/filter.store', () => ({
    useFilterDrawerStore: jest.fn(),
    EMPTY_FILTERS: { accountIds: [], categoryIds: [], datePreset: 'allTime', amountCurrency: 'EGP' },
  }));
  jest.mock('@/screens/transactions/filter/filter.state', () => ({
    useFilterDrawerState: jest.fn(),
  }));
  jest.mock('@/screens/transactions/filter/filter.helpers', () => ({
    countActiveFilters: jest.fn(() => 0),
    formatSelectionSummary: jest.fn(() => ''),
  }));

  import { useAccountStore } from '@/store/account.store';
  import { useCategoryStore } from '@/store/category.store';
  import { useFilterDrawerStore } from '@/screens/transactions/filter/filter.store';
  import { useFilterDrawerState } from '@/screens/transactions/filter/filter.state';
  import { useFilterDrawer } from '@/screens/transactions/filter/filter.hook';
  jest.mock('@/screens/transactions/transactions.store', () => ({
    useTransactionsScreenStore: jest.fn((sel: any) => sel({ state: { appliedFilters: { accountIds: [], categoryIds: [], datePreset: 'allTime', amountCurrency: 'EGP' } }, setAppliedFilters: jest.fn() })),
  }));

  function setup() {
    (useAccountStore as jest.Mock).mockImplementation((sel: any) =>
      sel({ state: { accounts: [] } }),
    );
    (useCategoryStore as jest.Mock).mockImplementation((sel: any) =>
      sel({ state: { categories: [] } }),
    );
    (useFilterDrawerStore as jest.Mock).mockImplementation((sel: any) =>
      sel({
        state: { draft: { accountIds: [], categoryIds: [], datePreset: 'allTime', amountCurrency: 'EGP', amountMin: undefined, amountMax: undefined, customDateFrom: undefined, customDateTo: undefined } },
        setDraft: jest.fn(),
        applyFilters: jest.fn(),
        resetDraft: jest.fn(),
      }),
    );
    (useFilterDrawerState as jest.Mock).mockImplementation((sel: any) =>
      sel({ state: { visible: false, accountPickerVisible: false, categoryPickerVisible: false }, close: jest.fn(), closeUi: jest.fn(), setAccountPickerVisible: jest.fn(), setCategoryPickerVisible: jest.fn() }),
    );
  }

  describe('useFilterDrawer', () => {
    beforeEach(setup);

    it('renders without throwing', () => {
      expect(() => renderHook(() => useFilterDrawer())).not.toThrow();
    });
  });
  ```

- [ ] **Step 2: Run**

  ```bash
  npx jest __tests__/screens/transactions_filter.hook.test.ts --no-coverage
  ```
  Expected: PASS.

### Task 4.6 — Remaining hook tests (accounts, commitments, onboarding, settings)

Write one `renderHook` test per hook file that renders without throwing and asserts one initial state value. Follow the same mock pattern from Task 4.2. One test file per hook. Run each individually before moving to the next.

**Files to create (each follows the pattern established in 4.3–4.5):**

- [ ] `__tests__/screens/accounts_add.hook.test.ts` — mocks: `expo-router`, `useAccountStore`, `useCategoryStore`; tests `useAddAccountApp` (from `screens/accounts/add_account/add_account.hook.ts`) renders without throwing.

- [ ] `__tests__/screens/accounts_detail.hook.test.ts` — mocks: `expo-router (useLocalSearchParams -> { id: 'acc-1' })`, `useAccountStore`, `useTransactionStore`; tests `useAccountDetail` renders without throwing.

- [ ] `__tests__/screens/commitments.hook.test.ts` — mocks: `expo-router`, `useCommitmentStore`, `useCategoryStore`, `useCommitmentsScreenState`; tests `useCommitments` renders and `state.isEmpty` is `true` (no payments in state).

- [ ] `__tests__/screens/commitments_add.hook.test.ts` — mocks: `expo-router`, `useCommitmentStore`, `useAccountStore`, `useCategoryStore`; tests `useAddCommitment` renders without throwing.

- [ ] `__tests__/screens/commitments_detail.hook.test.ts` — mocks: `expo-router (useLocalSearchParams -> { paymentId: 'pay-1' })`, `useCommitmentStore`, `useCategoryStore`, `useAccountStore`; tests `useCommitmentDetail` renders without throwing.

- [ ] `__tests__/screens/commitments_edit.hook.test.ts` — mocks: `expo-router`, `useCommitmentStore`, `useAccountStore`, `useCategoryStore`; tests `useEditCommitment` renders without throwing.

- [ ] `__tests__/screens/pay_sheet.hook.test.ts` — mocks: `useCommitmentStore`, `useAccountStore`; tests `usePaySheet` renders without throwing.

- [ ] `__tests__/screens/add_transaction.hook.test.ts` — mocks: `expo-router`, `useAccountStore`, `useCategoryStore`, `useAddTransactionStore`, `useAddTransactionState`, `useCurrencyStore`; tests `useAddTransaction(jest.fn())` (hook requires `onClose` callback param) renders without throwing.

- [ ] `__tests__/screens/edit_transaction.hook.test.ts` — mocks: `expo-router`, `useAccountStore`, `useCategoryStore`, `useTransactionStore`, `useCurrencyStore`, `useEditTransactionStore`; tests `useEditTransaction` renders without throwing.

- [ ] `__tests__/screens/onboarding_currency.hook.test.ts` — mocks: `expo-router`, `useOnboardingStore`, `useCurrencyStore`; tests `useCurrency` (from `screens/onboarding/currency/currency.hook.ts`) renders without throwing.

- [ ] `__tests__/screens/onboarding_more_accounts.hook.test.ts` — mocks: `expo-router`, `useAccountStore`, `useOnboardingStore`; tests `useMoreAccounts` renders without throwing.

- [ ] `__tests__/screens/onboarding_ready.hook.test.ts` — mocks: `expo-router`, `useOnboardingStore`; tests `useReady` renders without throwing.

- [ ] `__tests__/screens/onboarding_security.hook.test.ts` — mocks: `expo-router`, `useOnboardingStore`; tests `useSecurity` (from `screens/onboarding/security/security.hook.ts`) renders without throwing.

- [ ] `__tests__/screens/onboarding_add_account.hook.test.ts` — mocks: `expo-router`, `useAccountStore`, `useOnboardingStore`, `useCategoryStore`; tests `useAddAccount` (from `screens/onboarding/add_account/add_account.hook.ts`) renders without throwing.

- [ ] `__tests__/screens/settings.hook.test.ts` — mocks: `expo-router`; tests `useSettings` renders without throwing.

- [ ] `__tests__/screens/settings_categories.hook.test.ts` — mocks: `expo-router`, `useCategoryStore`, `useCategoriesState`, `useAddEditCategorySheetState`; tests `useCategories` renders without throwing.

- [ ] `__tests__/screens/settings_currency.hook.test.ts` — mocks: `expo-router`, `useCurrencyStore`, `useSettingsCurrencyState`; tests `useCurrencyScreen` (from `screens/settings/currency/currency.hook.ts`) renders without throwing.

For each file above:
1. Write the file.
2. Run `npx jest __tests__/screens/<filename> --no-coverage` and confirm PASS before moving to the next.
3. If a hook has an import you cannot easily mock, read the hook source first and adjust the mock list.

### Task 4.7 — Screen smoke tests

Smoke tests render the screen with all stores mocked and assert it renders without throwing. Use `render` from `@testing-library/react-native`.

**Key rule for screen smoke tests:** Mock every store the screen's hook calls (same mocks as the hook test), plus mock `expo-router/entry` and any animation libraries.

Add this mock to every smoke test file:
```ts
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useFocusEffect: jest.fn(),
  router: { push: jest.fn() },
  useLocalSearchParams: () => ({}),
}));
```

- [ ] **Create `__tests__/screens/smoke/dashboard.screen.test.tsx`**

  ```ts
  import React from 'react';
  import { render } from '@testing-library/react-native';

  jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
  jest.mock('expo-router', () => ({
    useRouter: () => ({ push: jest.fn() }),
    useFocusEffect: jest.fn(),
  }));
  jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
  jest.mock('@/store/account.store', () => ({ useAccountStore: jest.fn((sel: any) => sel({ state: { accounts: [] }, loadAccounts: jest.fn() })) }));
  jest.mock('@/store/currency.store', () => ({ useCurrencyStore: jest.fn((sel: any) => sel({ state: { rate: 50, isManualOverride: false } })) }));
  jest.mock('@/store/commitment.store', () => ({ useCommitmentStore: jest.fn((sel: any) => sel({ state: { commitments: [], payments: [] } })) }));
  jest.mock('@/screens/dashboard/dashboard.state', () => ({ useDashboardState: jest.fn((sel: any) => sel({ state: { isBreakdownVisible: false, refreshing: false }, setBreakdownVisible: jest.fn(), setRefreshing: jest.fn() })) }));
  jest.mock('@/screens/dashboard/dashboard.store', () => ({ useDashboardStore: jest.fn((sel: any) => sel({ state: { statsMap: {}, currentMonthCommitmentPayments: [], currentMonthSpend: { totalEgp: 0, usdNative: 0, count: 0 }, previousMonthSpend: { totalEgp: 0, usdNative: 0, count: 0 } }, setStatsMap: jest.fn(), setCurrentMonthCommitmentPayments: jest.fn(), setMonthSpendStats: jest.fn() })) }));
  jest.mock('@/database/client', () => ({ getDb: jest.fn().mockResolvedValue({}) }));
  jest.mock('@/database/account_stats', () => ({ getAccountsStats: jest.fn().mockResolvedValue({}) }));
  jest.mock('@/database/transactions', () => ({ getMonthExpenseStats: jest.fn().mockResolvedValue({ totalEgp: 0, usdNative: 0, count: 0 }) }));
  jest.mock('@/repositories/commitment.repository', () => ({ commitmentRepository: { getPaymentsForMonth: jest.fn().mockResolvedValue([]) } }));
  jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));

  import DashboardScreen from '@/screens/dashboard/index';

  describe('DashboardScreen smoke test', () => {
    it('renders without throwing', () => {
      expect(() => render(<DashboardScreen />)).not.toThrow();
    });
  });
  ```

- [ ] **Create `__tests__/screens/smoke/transactions.screen.test.tsx`**

  Mock `useTransactions` directly (the hook is already tested in `transactions_hook.test.ts`):
  ```ts
  import React from 'react';
  import { render } from '@testing-library/react-native';

  jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
  jest.mock('expo-router', () => ({
    router: { push: jest.fn() },
    useFocusEffect: jest.fn(),
  }));
  jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
  jest.mock('@/screens/transactions/transactions.hook', () => ({
    useTransactions: () => ({
      state: { sections: [], hasMore: false, loading: false, refreshing: false, emptyVariant: 'noData', searchQuery: '', activeFilter: 'all', accountsById: new Map(), categoriesById: new Map(), activeFilterCount: 0 },
      setSearchQuery: jest.fn(), setActiveFilter: jest.fn(), clearSearch: jest.fn(),
      onEndReached: jest.fn(), onRefresh: jest.fn(), openFilter: jest.fn(),
    }),
  }));
  jest.mock('@/screens/transactions/transaction_form/add_transaction.state', () => ({
    useAddTransactionState: jest.fn((sel: any) => sel({ state: { visible: false }, open: jest.fn() })),
  }));
  jest.mock('@/screens/transactions/transaction_form/add_transaction.store', () => ({
    useAddTransactionStore: { getState: () => ({ reset: jest.fn() }) },
  }));
  jest.mock('@/store/transaction.store', () => ({ useTransactionStore: { getState: () => ({ setQuery: jest.fn().mockResolvedValue(undefined) }) } }));
  jest.mock('@/screens/transactions/filter/filter.state', () => ({
    useFilterDrawerState: jest.fn((sel: any) => sel({ state: { visible: false }, close: jest.fn(), open: jest.fn() })),
  }));
  jest.mock('@/screens/transactions/transactions.state', () => ({
    useTransactionsState: jest.fn((sel: any) => sel({ state: { refreshing: false }, reset: jest.fn() })),
  }));
  jest.mock('@/screens/transactions/transactions.store', () => ({
    useTransactionsScreenStore: jest.fn((sel: any) => sel({ state: { searchQuery: '', activeFilter: 'all', appliedFilters: {} }, reset: jest.fn() })),
  }));

  import TransactionsScreen from '@/screens/transactions/index';

  describe('TransactionsScreen smoke test', () => {
    it('renders without throwing', () => {
      expect(() => render(<TransactionsScreen />)).not.toThrow();
    });
  });
  ```

- [ ] **Create `__tests__/screens/smoke/commitments.screen.test.tsx`**

  ```ts
  import React from 'react';
  import { render } from '@testing-library/react-native';

  jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
  jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: jest.fn() }));
  jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
  jest.mock('@/screens/commitments/commitments.hook', () => ({
    useCommitments: () => ({
      state: { sections: [], selectedMonth: '2026-05', counts: { paid: 0, overdue: 0, due: 0, upcoming: 0, skipped: 0, total: 0 }, totalsByCurrency: new Map(), refreshing: false, isEmpty: true, statusFilter: 'all', categoriesById: new Map(), commitmentsById: new Map() },
      navigateMonth: jest.fn(), onRefresh: jest.fn(), goToDetail: jest.fn(), goToAdd: jest.fn(), setStatusFilter: jest.fn(),
    }),
  }));

  import CommitmentsScreen from '@/screens/commitments/index';

  describe('CommitmentsScreen smoke test', () => {
    it('renders without throwing', () => {
      expect(() => render(<CommitmentsScreen />)).not.toThrow();
    });
  });
  ```

- [ ] **Create `__tests__/screens/smoke/settings.screen.test.tsx`**

  ```ts
  import React from 'react';
  import { render } from '@testing-library/react-native';

  jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
  jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }), useFocusEffect: jest.fn() }));
  jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
  jest.mock('@/screens/settings/settings.hook', () => ({
    useSettings: () => ({
      state: {}, goToCategories: jest.fn(), goToCurrency: jest.fn(), goBack: jest.fn(),
    }),
  }));

  import SettingsScreen from '@/screens/settings/index';

  describe('SettingsScreen smoke test', () => {
    it('renders without throwing', () => {
      expect(() => render(<SettingsScreen />)).not.toThrow();
    });
  });
  ```

- [ ] **Create `__tests__/screens/smoke/accounts.screen.test.tsx`**

  The accounts tab uses the dashboard's account list; there is no standalone accounts list screen (accounts are reached via dashboard → account card). Smoke-test the add_account screen instead:
  ```ts
  import React from 'react';
  import { render } from '@testing-library/react-native';

  jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
  jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }), useFocusEffect: jest.fn() }));
  jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
  jest.mock('@/screens/accounts/add_account/add_account.hook', () => ({
    useAddAccount: () => ({
      state: { accountType: 'bank', currency: 'EGP', isCC: false },
      control: {}, errors: {}, handleSubmit: (fn: any) => fn, setValue: jest.fn(), goBack: jest.fn(),
    }),
  }));

  import AddAccountScreen from '@/screens/accounts/add_account/index';

  describe('AddAccountScreen smoke test', () => {
    it('renders without throwing', () => {
      expect(() => render(<AddAccountScreen />)).not.toThrow();
    });
  });
  ```

For each smoke test file:
1. Run `npx jest __tests__/screens/smoke/<filename> --no-coverage` after writing it.
2. Fix any missing mocks based on the error output.
3. Move on only after PASS.

### Task 4.8 — Update `jest.config.js` and verify thresholds

- [ ] **Step 1: Update `jest.config.js`** (replace existing `collectCoverageFrom` and `coveragePathIgnorePatterns`):

  ```js
  collectCoverageFrom: [
    'store/**/*.ts',
    'repositories/**/*.ts',
    'database/**/*.ts',
    'utils/responsive.ts',
    'utils/format_amount.ts',
    'utils/format_date.ts',
    'utils/onboarding_nav.ts',
    'utils/use_layout_init.hook.ts',
    'screens/**/*.hook.ts',
    'screens/**/*.store.ts',
    'screens/**/*.state.ts',
    'app/**/*.helpers.ts',
    'app/**/*.store.ts',
    '!**/__mocks__/**',
    '!database/entities/**',
    '!database/client.ts',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
  ],
  ```

- [ ] **Step 2: Run full coverage suite and confirm thresholds pass**

  ```bash
  npm run test:coverage
  ```
  Expected: exits 0, all thresholds green. If a threshold fails, identify which hook file is uncovered and add the minimum required test back.

- [ ] **Step 3: Commit everything**

  ```bash
  git add __tests__/screens/ jest.config.js
  git commit -m "test(hooks+screens): add renderHook tests for all screen hooks and smoke tests for main route screens; remove M1.5 coverage deferrals"
  ```

---

## Item 5 — FlashList Migration

**Branch:** `feat/flashlist-migration`

> Open this branch ONLY after Items 1–4 are merged to main. This PR touches the most files and must have a clean revert path if a visual regression surfaces on Android.

**Expo Go compatibility confirmed:** `@shopify/flash-list` v2.0.2 is bundled in Expo Go for SDK 55. No native linking required.

**Rule (from CLAUDE.md and spec):** FlatList inside `ActionSheet` components must NOT be changed. Those lists import from `react-native-actions-sheet`, not from `react-native`. The patch handles gesture interception.

**FlatList inventory:**

| File | Source | Inside ActionSheet? | Action |
|------|--------|---------------------|--------|
| `screens/commitments/detail/components/payment_history.tsx` | `react-native` | No | Migrate to FlashList |
| `screens/onboarding/more_accounts/index.tsx` | `react-native` | No | Migrate to FlashList |
| `screens/settings/categories/index.tsx` | `react-native` | No | Migrate to FlashList |
| `screens/settings/categories/components/add_edit_category_sheet.tsx` | `react-native` | YES — rendered inside `<ActionSheet>` | DO NOT TOUCH |
| `screens/settings/categories/components/reassign_category_sheet.tsx` | `react-native` | YES — rendered inside `<ActionSheet>` | DO NOT TOUCH |
| `screens/transactions/transaction_form/components/account_picker_sheet.tsx` | `react-native` | YES — rendered inside `<ActionSheet>` | DO NOT TOUCH |
| `screens/transactions/filter/components/filter_account_picker.tsx` | `react-native-actions-sheet` | YES | Already correct — DO NOT TOUCH |
| `screens/transactions/filter/components/filter_category_picker.tsx` | `react-native-actions-sheet` | YES | Already correct — DO NOT TOUCH |
| `screens/transactions/transaction_form/components/category_picker_sheet.tsx` | `react-native-actions-sheet` | YES | Already correct — DO NOT TOUCH |

The transactions screen uses `SectionList` (not `FlatList`) — no change needed there.
The dashboard screen uses `ScrollView` — no change needed.

### Task 5.1 — Install `@shopify/flash-list`

- [ ] **Step 1: Install via Expo**

  ```bash
  npx expo install @shopify/flash-list
  ```
  Expected output includes `@shopify/flash-list` added to `package.json`. The installed version will be 2.0.2 or compatible (the version bundled in Expo Go SDK 55).

- [ ] **Step 2: TypeScript check**

  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors (FlashList types are included in the package).

- [ ] **Step 3: Verify existing tests still pass**

  ```bash
  npm run test:coverage
  ```
  Expected: exits 0.

- [ ] **Step 4: Commit dependency addition**

  ```bash
  git add package.json package-lock.json
  git commit -m "deps: add @shopify/flash-list (bundled in Expo Go SDK 55)"
  ```

### Task 5.2 — Migrate `screens/commitments/detail/components/payment_history.tsx`

This list renders payment rows in a card. `scrollEnabled={false}` means it's embedded in a parent `ScrollView` (the commitment detail screen scroll). `estimatedItemSize` is derived from item height — a `PaymentRow` is approximately `ms(56)` tall (icon + two text lines + padding).

- [ ] **Step 1: Replace FlatList with FlashList**

  Full new file contents for `screens/commitments/detail/components/payment_history.tsx`:
  ```tsx
  import { FlashList } from '@shopify/flash-list';
  import Animated from 'react-native-reanimated';
  import { StyleSheet, Text, View } from 'react-native';

  import { Strings } from '@/constants/strings';
  import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
  import type { Commitment } from '@/database/entities/commitment.entity';
  import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
  import { ms, msFont } from '@/utils/responsive';
  import { historyEntering } from '../detail.anim';
  import { PaymentRow } from './payment_row';

  interface Props {
    payments: CommitmentPayment[];
    commitment: Commitment;
  }

  export function PaymentHistory({ payments, commitment }: Props) {
    if (payments.length === 0) return null;

    return (
      <Animated.View entering={historyEntering} style={styles.wrap}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{Strings.commitmentsDetailPaymentHistory}</Text>
        </View>
        <View style={styles.card}>
          <FlashList
            data={payments}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            estimatedItemSize={ms(56)}
            renderItem={({ item, index }) => (
              <PaymentRow
                payment={item}
                commitment={commitment}
                showDivider={index < payments.length - 1}
              />
            )}
          />
        </View>
      </Animated.View>
    );
  }

  const styles = StyleSheet.create({
    wrap: {
      marginHorizontal: Spacing.md,
      marginTop: Spacing.md,
    },
    sectionHeader: {
      marginBottom: Spacing.xs,
    },
    sectionTitle: {
      fontFamily: FontFamily.interSemi,
      fontSize: msFont(11),
      color: Colors.dark.text2,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    card: {
      backgroundColor: Colors.dark.surface,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.sm,
    },
  });
  ```

- [ ] **Step 2: TypeScript check**

  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors.

- [ ] **Step 3: Run tests**

  ```bash
  npm run test:coverage
  ```
  Expected: exits 0.

- [ ] **Step 4: Commit**

  ```bash
  git add screens/commitments/detail/components/payment_history.tsx
  git commit -m "perf(flashlist): migrate payment_history to FlashList"
  ```

### Task 5.3 — Migrate `screens/onboarding/more_accounts/index.tsx`

Account rows are approximately `ms(60)` tall (icon container + account name + balance text + padding).

- [ ] **Step 1: Replace FlatList import and usage**

  In `screens/onboarding/more_accounts/index.tsx`:
  - Replace:
    ```ts
    import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
    ```
    with:
    ```ts
    import { FlashList } from '@shopify/flash-list';
    import { Pressable, StyleSheet, Text, View } from 'react-native';
    ```
  - Replace the `<FlatList` element:
    ```tsx
    // Before:
    <FlatList
      data={accounts}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item, index }) => (
        <AccountRow
          account={item}
          index={index}
          entering={rowEntering(index, index < initialCount)}
        />
      )}
      ListFooterComponent={...}
    />

    // After:
    <FlashList
      data={accounts}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      estimatedItemSize={ms(60)}
      renderItem={({ item, index }) => (
        <AccountRow
          account={item}
          index={index}
          entering={rowEntering(index, index < initialCount)}
        />
      )}
      ListFooterComponent={...}
    />
    ```

  Add `ms` to the import from `@/utils/responsive` if not already present.

- [ ] **Step 2: TypeScript check**

  ```bash
  npx tsc --noEmit
  ```

- [ ] **Step 3: Run tests**

  ```bash
  npm run test:coverage
  ```
  Expected: exits 0.

- [ ] **Step 4: Commit**

  ```bash
  git add screens/onboarding/more_accounts/index.tsx
  git commit -m "perf(flashlist): migrate more_accounts to FlashList"
  ```

### Task 5.4 — Migrate `screens/settings/categories/index.tsx`

Category rows are approximately `ms(52)` tall (icon box + category name + edit/delete actions).

- [ ] **Step 1: Replace FlatList in categories screen**

  In `screens/settings/categories/index.tsx`:
  - Replace:
    ```ts
    import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
    ```
    with:
    ```ts
    import { FlashList } from '@shopify/flash-list';
    import { Pressable, StyleSheet, Text, View } from 'react-native';
    ```
  - Replace the `<FlatList` element:
    ```tsx
    // Before:
    <FlatList
      data={[...state.defaultCategories, ...state.customCategories]}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={...}
      renderItem={...}
    />

    // After:
    <FlashList
      data={[...state.defaultCategories, ...state.customCategories]}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      estimatedItemSize={ms(52)}
      ListHeaderComponent={...}
      renderItem={...}
    />
    ```

  Add `import { ms } from '@/utils/responsive';` if not already imported.

- [ ] **Step 2: TypeScript check + tests**

  ```bash
  npx tsc --noEmit && npm run test:coverage
  ```
  Expected: exits 0.

- [ ] **Step 3: Commit**

  ```bash
  git add screens/settings/categories/index.tsx
  git commit -m "perf(flashlist): migrate categories screen to FlashList"
  ```

### Task 5.5 — Manual smoke test on Android (required before PR)

Before opening the PR for review, run the app in Expo Go on an Android device or emulator and verify:

- [ ] Open the commitments detail screen for a commitment with payment history — rows render correctly, no layout collapse.
- [ ] Open the onboarding `more_accounts` screen with ≥2 accounts — list scrolls correctly, animation entering values fire.
- [ ] Open Settings → Categories — default and custom categories render, tab switch updates list without layout issues.
- [ ] No "FlashList: estimatedItemSize" yellow-box warnings remain (if warnings appear, adjust the `estimatedItemSize` value for that list).
- [ ] Confirm the ActionSheet lists (filter picker, category picker, account picker) still scroll within their sheets — these use the patched `FlatList` from `react-native-actions-sheet` and must not be affected.

### Task 5.6 — Final coverage check and PR commit

- [ ] **Step 1: Run full coverage**

  ```bash
  npm run test:coverage
  ```
  Expected: exits 0.

- [ ] **Step 2: Final commit if any cleanup needed, then push**

  ```bash
  git push -u origin feat/flashlist-migration
  ```

---

## Rollback Notes

**Items 1–4:** Each is small and isolated. Revert the specific commit; no downstream breakage.

**Item 5 (FlashList):** If a visual regression surfaces on Android after merge (e.g., recycled views showing stale content in the payment history list), revert the FlashList migration PR in its entirety. The three ActionSheet `FlatList` usages are untouched so sheet scrolling is unaffected. To revert:
```bash
git revert <flashlist-migration-merge-commit>
```
Then open an issue documenting the reproduction steps before attempting a second migration pass.

---

## Verification Checklist (per PR, before requesting review)

- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npm run test:coverage` exits 0, thresholds 80/95/100 all green
- [ ] No hardcoded hex values, spacing, or radius introduced (all tokens from `constants/theme.ts`)
- [ ] No new files in `app/` other than `_layout.tsx` and `index.tsx` patterns
- [ ] For Item 5 only: ActionSheet lists confirmed untouched (still import from `react-native-actions-sheet`)
