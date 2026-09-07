# MA-025 — List: empty states, no active accounts and no accounts
base: 9b6912f4e3b024d6eb295c60745989a2f308c476 · verify: emulator · flags: none · expected diff: ~140 lines

## Steps
### 1. B2's copy exists in strings
- File: `src/constants/strings.ts` (`// EmptyState component` block, `:1063`)
- Change: add `emptyAccountsArchivedOnlyHeadline: 'No active accounts'` and `emptyAccountsArchivedOnlyDescription: (n: number) => n === 1 ? 'Your 1 archived account is below. Unarchive it, or add a new account.' : \`Your ${n} archived accounts are below. Unarchive one, or add a new account.\`` (house shape, `strings.ts:126`). The CTA is the existing `emptyAccountsCta` ('Add Account'); no duplicate key.
- Test: `__tests__/screens/accounts/accounts_empty_strings.test.ts`, `it.each` over n = 1, 2, 5 asserting the two verbatim bodies and the headline (shape: `__tests__/screens/onboarding_ready.strings.test.ts`).

### 2. The archived count is a query with a repository passthrough
- File: `src/modules/accounts/database/accounts.ts` (beside `getAccounts`, `:7`)
- File: `src/modules/accounts/repositories/account.repository.ts` (`IAccountRepository`, `:28`; `AccountRepository`, `:39`)
- Change: `getArchivedAccountCount(db): Promise<number>` runs `SELECT COUNT(*) AS count FROM accounts WHERE is_archived = 1` through `getAllAsync` and returns `rows[0].count` (the `rows[0]` shape at `:17`, so the repository suite's bridge, which maps `runAsync`/`getAllAsync`/`execAsync` only, covers it). `IAccountRepository` gains `countArchived(): Promise<number>`; `AccountRepository.countArchived` is the `getDb` passthrough. Interface consumers: `account.store.ts:39` and the fake at `__tests__/account.store.test.ts:46`, which gains `countArchived: jest.fn().mockResolvedValue(0)` in this step or typecheck fails.
- Test: `__tests__/account.repository.test.ts`, new `describe('AccountRepository.countArchived')`: 0 on an empty table; 0 with two active rows; 2 with two archived rows and one active; goes 0 to 1 after `archive` on the only account, while `getAll` returns `[]`. Written first.

### 3. The store carries the count and refreshes it with the list
- File: `src/modules/accounts/store/account.store.ts` (`INITIAL_STATE`, `:21`; `loadAccounts`, `:47`)
- Change: `archivedCount: 0` in `INITIAL_STATE`. `loadAccounts` awaits `Promise.all([repo.getAll(), repo.countArchived()])` and publishes `{ accounts, archivedCount, hasLoaded: true, loadError: false }` in the one existing `set` under the request-id guard; the catch path is unchanged (`loadError: true`, rethrow). No new action: every mutation already calls `loadAccounts` (`:85,96,106,116,126`), which is what keeps the count current after an archive on a list mounted earlier. `reset` restores 0 through `INITIAL_STATE`.
- Test: `__tests__/account.store.test.ts`: `loadAccounts` publishes `archivedCount` from `repo.countArchived` (mock 2); a rejecting `countArchived` sets `loadError` and leaves `accounts` untouched; `archiveAccount` publishes the count the reload returns (`countArchived` `mockResolvedValueOnce(0).mockResolvedValueOnce(1)`, assert 1 after archive); the stale-load guard case (`:179`) also asserts the older `archivedCount` never lands; `reset` restores 0.

### 4. The geometry module has a top-placed root for the empty kind
- File: `src/components/ui/state_screen.geometry.ts` (`StateScreenGeometry`, `:16`; `StateScreenLayout`, `:44`; `buildStateScreenLayout`, `:54`)
- Change: `STATE_SCREEN_LAYOUT` gains a shared `inlinePaddingVertical: Spacing.xl` (typed into `StateScreenGeometry`, `satisfies` still holds); `StateScreenLayout` gains `rootInline: Readonly<ViewStyle>` = `{ alignItems: 'center', paddingHorizontal, paddingTop: inlinePaddingVertical, paddingBottom: inlinePaddingVertical }`, no `flex`, no `justifyContent`. Both kinds get it from the builder; only `empty` reads it. Invariant: the guard `scripts/validate-state-screen-geometry.js` bans `ms()` in the two components, so the value lives here and nowhere else.
- Test: `__tests__/components/ui/state_screen_geometry.test.ts`: `rootInline` has no `flex` and no `justifyContent`, `paddingHorizontal` equals `STATE_SCREEN_LAYOUT.paddingHorizontal`, both vertical paddings equal `STATE_SCREEN_LAYOUT.inlinePaddingVertical`; `root` is byte-identical to before (`flex: 1`, centred).

### 5. `EmptyState` has the B2 variant and one flat CTA for every variant
- File: `src/components/ui/empty_state.tsx` (`EmptyStateVariant`, `:16`; `EmptyStateProps`, `:27`; `VARIANT_CONFIG`, `:34`; CTA branch, `:131-147`)
- Change: variant `accountsArchivedOnly` (icon `bank`, headline `Strings.emptyAccountsArchivedOnlyHeadline`, description `Strings.emptyAccountsArchivedOnlyDescription`, ctaLabel `Strings.emptyAccountsCta`, clearLabel null, `placement: 'inline'`); every other entry `placement: 'centered'`. Config `description` widens to `string | ((n: number) => string)`; `EmptyStateProps` becomes the union `{ variant: 'accountsArchivedOnly'; archivedCount: number; onAction?: () => void } | { variant: Exclude<EmptyStateVariant, 'accountsArchivedOnly'>; onAction?: () => void }`, so the nine callers compile unchanged and B2 cannot omit the count. Root style is `LAYOUT.rootInline` for `inline`, `LAYOUT.root` otherwise. The CTA becomes `<View style={styles.ctaWrapper}><Button variant="primary" flat label={config.ctaLabel} accessibilityLabel={config.ctaLabel} onPress={onAction} /></View>`; `ctaWrapper` keeps `LAYOUT.action` and `width: '100%'` and drops `height`, `borderRadius`, `overflow`; delete `ctaGradient`, `ctaLabel`, the `empty-state-cta-gradient` probe, and the `LinearGradient`, `GoldTokens`, `Radius`, `Size` imports (`FontFamily`, `Type`, `lineHeightFor` stay for `clearLabel`). The `resolveStateScreenLayout('empty')` import and call stay verbatim (guard).
- Test: none; component render layer, no new render suites (`.claude/rules/tests.md`). The three suites that mount callers mock this module (`transactions.screen.test.tsx:54`, `commitments.screen.test.tsx:67`, `budget_screen.test.tsx:112`). `npm run lint` runs the geometry guard. Pixels: Screens below and device QA.

### 6. The list's empty branch is a pure resolver
- File: `src/modules/accounts/screens/accounts/list/accounts_list.presentation.ts` (new; shape of `dashboard/screens/dashboard/dashboard.presentation.ts`)
- Change: `export type AccountsListEmptyState = 'none' | 'archivedOnly' | 'noAccounts'`; `resolveAccountsListEmptyState({ activeCount, archivedCount }): AccountsListEmptyState`: `activeCount > 0` → `none`; else `archivedCount > 0` → `archivedOnly`; else `noAccounts`.
- Test: `__tests__/screens/accounts/accounts_list.presentation.test.ts`: the three rows above plus `{ activeCount: 2, archivedCount: 3 }` → `none` (archived rows never shape the active list). Written first.

### 7. The hook exposes the count and the branch
- File: `src/modules/accounts/screens/accounts/list/accounts_list.hook.ts` (`useAccountsList`, `:7`)
- Change: select `archivedCount` beside `accounts`; `state` becomes `{ accounts, archivedCount, emptyState }` with `emptyState = resolveAccountsListEmptyState({ activeCount: accounts.length, archivedCount })`. Actions unchanged.
- Test: `__tests__/screens/accounts/accounts_list.hook.test.ts`: the mock store state gains `archivedCount`; new cases: rows present and `archivedCount: 1` → `emptyState` `'none'`; no rows and `archivedCount: 2` → `'archivedOnly'` with `state.archivedCount` 2; no rows and 0 → `'noAccounts'`. The four shipped cases stay.

### 8. The list renders B2 in the scroll and B3 as shipped
- File: `src/modules/accounts/screens/accounts/list/index.tsx` (`:44-63`)
- Change: three-way on `state.emptyState`. `none`: the shipped `ScreenScroll` list. `archivedOnly`: the same `ScreenScroll` (same `contentContainerStyle`) whose only child is `<EmptyState variant="accountsArchivedOnly" archivedCount={archivedCount} onAction={goToAddAccount} />`; nothing follows it, that is MA-017's slot. `noAccounts`: `<EmptyState variant="accounts" onAction={goToAddAccount} />` as a direct child of `Screen`, as shipped. Header untouched. Delete the `:45` comment. Returning from the add form needs no code: `src/modules/accounts/components/account_form/use_account_form.hook.ts:51` calls `addAccount`, which reloads, and this screen subscribes.
- Test: none; JSX only, the branch is steps 6 and 7.

### 9. The two records that describe the CTA say what it is now
- File: `docs/adr/2026-09-01-empty-error-state-stay-separate.md` (§1, facts 2 and 4)
- File: `.claude/rules/ui.md` (CTA bullet under Design System)
- Change: ADR facts 2 and 4 each get one dated line: the `EmptyState` action is the flat `Button` with no in-flight state since MA-025, and the gradient testID is gone; status stays accepted, the ruling stands. `ui.md`'s CTA bullet gains one clause: `EmptyState`'s CTA is flat on every caller (MA-025, ruling 2026-09-07).
- Test: none; docs.

## Screens
- Accounts list, B2 at n = 1: dashboard → See all → the only account → archive → the list shows the bank glyph, "No active accounts", "Your 1 archived account is below. Unarchive it, or add a new account.", flat "Add Account", block at the top of the scroll with the header's back and + intact.
- Accounts list, B2 at n = 2: with two accounts, archive both from their details; the body reads "Your 2 archived accounts are below. Unarchive one, or add a new account."
- Accounts list, B2 → add: tap "Add Account", the form opens; save an account; the list replaces the block with one row.
- Accounts list, B3: the dashboard hides See all at zero active accounts and onboarding stops at N2, so empty `accounts` in the app database through the `emulator-verify` sqlite access, relaunch, open `moneyapp://accounts`; centred "No accounts yet", flat "Add Account", back square and +.
- The other eight `EmptyState` callers (dashboard, transactions, commitments ×2, budget, goals, categories, onboarding N3) are device QA: same block, flat button.

## Non-goals
- Archived rows, unarchive, the archived section and its card (MA-017, #383); B2 leaves the slot empty.
- The dashboard's zero-active empty state (`dashboard/index.tsx:136`) and `dashboard.presentation.ts`, unchanged.
- The list rows, caption (MA-024) and error state (MA-026); deleting the last account (MA-020, MA-021).
- `Button`'s default gradient primary for non-`EmptyState` callers; only `EmptyState` flattens.
- A `hasLoaded` gate on the list; startup awaits `loadAccounts` before ready (`use_layout_init.hook.ts:42`).
- The dead `Strings.emptyAccountsTitle` / `emptyAccountsSub` (`:342-343`), untouched.
- A migration or index: `is_archived = 1` is a plain column predicate on a table of tens of rows.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- The B2 vertical offset (`inlinePaddingVertical`, step 4) is chosen from the shared `Spacing.xl`, not read from frame B2; a canvas value moves one constant.
- `Button` flat sizes itself from HeroUI's `md` (as the onboarding CTAs do), so the empty CTA drops from `Size.ctaHeight` 52 to HeroUI's height; if the render pass shows a visibly shorter button than the shipped one, add `size="lg"` in step 5 and nowhere else.
- A `flex: 1` child inside `ScreenScroll` centres; B2 depends on `rootInline` carrying no `flex` (step 4). Reintroducing `LAYOUT.root` there re-centres B2.
- The design canvas was unreachable; copy and geometry come from the ticket's Acceptance.
- Amended round 1: step 5 adds `Radius` to the import removals (its two uses, `:182` and `:193`, go with the gradient); step 3 cites the `loadAccounts` stale case at `:179`, not the lookup case at `:100`; step 8 writes the hook's full path.

## Self-assessment
Step 5 is the one I am least sure of. The prop union and the widened `description` are straightforward, but the flat `Button` replaces a hand-sized 52pt gradient Pressable with a HeroUI-sized control, and the ticket's "renders as before except the button shape" is a pixel claim no unit test can hold; whether HeroUI `md` matches the old height is settled only by the render pass, which is why the size fallback sits in Risks rather than in the step.
