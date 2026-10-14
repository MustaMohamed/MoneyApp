# MA-190 — Tests take one shared deferred-promise helper
base: b005195bb96b873642d8154d28cf47ad85d9334b · verify: none · flags: none · expected diff: ~3 lines

Base suite, `npx jest --ci --silent --json` at the base sha: 402 suites, 6710 tests, 6710 passed, 0 pending, 0 todo.

## Steps
### 1. One shared helper settles a promise by hand
- File: `src/test_helpers/deferred.ts` (new; sits beside `src/test_helpers/sqlite_drain.ts`, imported as `@/test_helpers/deferred`)
- Change: export `interface Deferred<T> { promise: Promise<T>; resolve: (value: T | PromiseLike<T>) => void; reject: (reason?: unknown) => void }`, no field null or optional, and `function deferred<T = void>(): Deferred<T>`, no arguments, returning a fresh pending promise with its two settlers captured from the executor. `T` defaults to `void`, so `deferred()` gives `resolve()` with no argument, the form `__tests__/screens/budget/income_sheet.hook.test.ts:16` and `__tests__/screens/budget/set_budget_sheet.test.tsx:148` call today. The file is outside the `__tests__/**` override in `.oxlintrc.json:93`, so the strict rule set applies (no `any`, no unsafe assignment).
- Test: `none` · Acceptance pins the suite at 6710 tests, so the helper gets no case of its own; the 38 suites converted in steps 2 to 6 run it.

### 2. Root-level suites drop their own helper
- File: `__tests__/account.store.test.ts:69`, `__tests__/base_currency.store.test.ts:15`, `__tests__/budget.store.5030.test.ts:11`, `__tests__/budget.store.test.ts:61`, `__tests__/category.store.test.ts:35`, `__tests__/commitment.store.test.ts:113`, `__tests__/commitment_payments.query.test.ts:389`, `__tests__/currency.store.test.ts:31`, `__tests__/dashboard.store.test.ts:9`, `__tests__/onboarding.store.test.ts:16`, `__tests__/onboarding_transition.test.ts:6`, `__tests__/transaction.store.test.ts:44`, `__tests__/use_async.hook.test.ts:5`, `__tests__/use_layout_init.test.ts:47`
- Change: delete each local `function deferred`, import `deferred` from `@/test_helpers/deferred`; call sites keep their type arguments. `commitment_payments.query.test.ts:317-318` call `deferredRun()`, which becomes `deferred<{ changes: number; lastInsertRowId: number }>()` and the local `deferredRun` goes.
- Test: `none` · the step edits the tests; gate is Verification's per-file `expect(` count and test total, equal to base.

### 3. Screen suites drop their own helper
- File: `__tests__/screens/accounts/account_activity.store.test.ts:8`, `__tests__/screens/accounts/accounts_list.hook.test.ts:99`, `__tests__/screens/accounts/archived_account_detail.store.test.ts:8`, `__tests__/screens/accounts/edit_account.hook.test.ts:106`, `__tests__/screens/budget/income_sheet.hook.test.ts:16`, `__tests__/screens/budget/set_budget_sheet.test.tsx:148`, `__tests__/screens/commitments_add.hook.test.ts:34`, `__tests__/screens/commitments_detail.hook.test.ts:74`, `__tests__/screens/commitments_edit.hook.test.ts:84`, `__tests__/screens/commitments_pay_sheet_owners.hook.test.ts:90`, `__tests__/screens/onboarding_ready.hook.test.ts:53`, `__tests__/screens/transactions/detail/detail_hook.test.ts:126`
- Change: as step 2. `edit_account.hook.test.ts:770` and `:773` annotate `ReturnType<typeof deferred<void>>`, which becomes `Deferred<void>` imported as a type. `income_sheet.hook.test.ts:170,204` and `set_budget_sheet.test.tsx:372` call `deferred()` with no type argument and keep doing so. `set_budget_sheet.test.tsx` gains an import only, no case, so the Render-suite policy in `.claude/rules/tests.md` is not reached.
- Test: `none` · as step 2.

### 4. Store and hook captures outside transactions take the helper
- File: `__tests__/budget.store.spending_plans.test.ts:113-127,143-149`, `__tests__/screens/accounts/replacement_account_sheet.hook.test.ts:111-117`, `__tests__/screens/budget/set_budget_sheet.hook.test.ts:55-59`, `__tests__/screens/budget/spending_plan_detail_hook.test.ts:110-121`, `__tests__/screens/onboarding_more_accounts.hook.test.ts:118-124,157-163`, `__tests__/use_confirm_action.hook.test.ts:48-54,74-80`, `__tests__/utils/run_after_interactions.test.ts:120-123`
- Change: each `let resolveX`/`rejectX` plus `new Promise` executor becomes `const x = deferred<T>()`, the mock returns `x.promise` (`mockImplementationOnce(() => x.promise)` where it was `mockImplementationOnce`, the same mock call shape otherwise), and the settle call becomes `x.resolve(...)` / `x.reject(...)` with any `?.` dropped. Types: `BudgetMonthSnapshot` (spending_plans, from its `:113-114` annotations), `{ plan: SpendingPlanWithCategories; spend: {} }` (spending_plan_detail, from `:110-112`), `OnboardingStep` (onboarding_more_accounts), `void` for the rest.
- Test: `none` · as step 2.

### 5. Transaction form captures take the helper
- File: `__tests__/screens/transactions/transaction_form/add_transaction.hook.test.ts:133-136,195-198,219-222,481-484`, `__tests__/screens/transactions/transaction_form/edit_transaction.hook.test.ts:170-173,282-285`, `__tests__/screens/transactions/transaction_form/transaction_form_host.test.tsx:286-292`, `__tests__/screens/transactions/transaction_form/transaction_form_prerequisites.test.ts:121-130`
- Change: as step 4. Types: `Budget[]` at add `:134,:196,:220` and edit `:171`; `ReturnType<typeof makeTestTransaction>` at add `:482`; `void` at edit `:283`, host `:289`, prerequisites `:124`. In prerequisites the resolver writes `useAccountStore.setState({ accounts: [account], hasLoaded: true })` before it resolves (`:126-127`): that write moves to the call site at `:140`, inside the same `act`, before `.resolve()`. The never-settling promises at add `:155` and edit `:195` stay.
- Test: `none` · as step 2.

### 6. Transactions hook captures take the helper
- File: `__tests__/screens/transactions/transactions_hook.test.ts:378-385,853-858,879-885,2030-2035,2151-2157,2317-2323,2717-2722,2775-2780,2801-2806,3000-3006`
- Change: as step 4, ten sites. Types: `TransactionMonthAggregate` at `:378,:2030,:2151,:2317`; `boolean` at `:2717,:2775,:2801`; `void` at `:853,:879,:3000`. `:2151` sits inside `failChipTap`, so each call makes its own deferred. At `:378` the deferred is made inside the `rent` branch at `:380` (`const left = deferred<TransactionMonthAggregate>(); resolveLeft = left.resolve; return left.promise;`), so each call still gets its own promise and `let resolveLeft` stays; `:393` (`expect(resolveLeft).toBeDefined()`) and `:401` stay verbatim. The 17 `new Promise(() => {})`, the `settle` helper at `:2496-2502` and every `setTimeout` flush stay.
- Test: `none` · as step 2.

### 7. The testing skill names the helper
- File: `.claude/skills/moneyapp-testing/SKILL.md` (after the `registerOpenDbsDrain()` paragraph, `:33`)
- Change: one paragraph: a test that settles a promise by hand takes `deferred<T>()` from `@/test_helpers/deferred`, which returns `{ promise, resolve, reject }` with `T` defaulting to `void`; a test file defines no deferred helper and captures no settler out of a `new Promise` executor. `scripts/validate-agent-assets.js:117` (`checkPathRefs`) resolves `@/test_helpers/deferred` under `src/`, so this step follows step 1.
- Test: `none` · a skill file; `npm run lint` runs `validate:agent-assets` on it.

## Non-goals
- No lint rule or structural guard against a local deferred helper (Decisions 2026-10-14).
- No change to `new Promise(() => {})`, the `setTimeout` flushes, or the socket wrappers in `__tests__/scripts/board_server.test.ts`.
- No test case or test file for the helper; no case added to or removed from any suite.
- No rewrite of a test beyond the capture it converts: mock call shapes, names of the surrounding variables and assertions stay.

## Untested inputs
- none

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci` (`npm run format` places the new import; `.oxfmtrc.json` sorts imports).
- `git grep -nE 'function deferred|const deferred' -- __tests__`: no output (26 lines at base).
- `git grep -nE 'new Promise' -- __tests__ | grep -vE 'setTimeout|\(\(\) => \{\}\)'`: 4 lines, the three in `__tests__/scripts/board_server.test.ts` and the `settle` helper in `transactions_hook.test.ts` (59 lines at base).
- `git grep -l "from '@/test_helpers/deferred'" -- __tests__ | wc -l`: 38 (0 at base).
- `for f in $(git diff --name-only b005195b -- __tests__); do a=$(git show b005195b:$f | grep -c 'expect('); b=$(grep -c 'expect(' $f); [ "$a" = "$b" ] || echo "$f $a $b"; done`: no output.
- `npx jest --ci --silent --json --outputFile=<scratchpad>/head.json`: 402 suites, 6710 tests, 0 pending, 0 todo, `success: true`.
- `git diff b005195b -- __tests__ | grep -nE '^\+.*\b(it|test|describe)\.(skip|only)\(|^\+.*\b(xit|xtest|xdescribe|fit|fdescribe)\('`: no output.
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- MA-188 (#735), at Defined, edits `__tests__/screens/commitments_edit.hook.test.ts`, whose helper sits at `:84`; whichever merges second rebases that file.
- A capture made inside a mock implementation created one promise per call; a deferred made outside it hands every call the same one. The `mockImplementationOnce` sites in step 4 and `transactions_hook.test.ts:378` (a deferred per call, step 6) are unchanged per call. `transaction_form_host.test.tsx:303` calls its mock a second time and now gets the settled promise where it got a fresh pending one; the case asserts only `toHaveBeenCalledTimes(2)`. `use_confirm_action.hook.test.ts:51`, `transaction_form_prerequisites.test.ts:124`, `transactions_hook.test.ts:882` and `:3003` assert no call count after the settle, so a second call there would also get the settled promise.

## Self-assessment
Step 5's `transaction_form_prerequisites.test.ts` conversion is the one I am least sure of. The resolver at `:125-128` wrote the account store and then resolved. The plan moves that write to the call site at `:140`, still inside the same `act` and still before `.resolve()`. The case asserts one `loadAccounts` call only before the settle. The hook's effect gates on `beginPrerequisites(sessionId, ...)` with the fixed first session id (`transaction_form_prerequisites.hook.ts:54`), which suggests `openEdit` starts no second load, but I read that, I did not run it. If a second load did start, base would settle the second call's promise while the deferred settles the one both calls share. Risks lists the other sites where a mock could hand out a shared promise, and the per-file `expect(` count and the 6710 total catch a dropped case.
