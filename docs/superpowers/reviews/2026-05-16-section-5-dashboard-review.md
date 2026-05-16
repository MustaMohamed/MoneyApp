# Section 5 · Dashboard — Code Review

**Date:** 2026-05-16
**Reviewer:** Tariq Mansour (Technical Team Lead)
**Branch:** `feat/section-5-dashboard`
**Git range:** `1b6ac98..2d65011`
**Diff surface:** 27 files · +5,819 / -1 lines
**Build state at review:** 1178 tests passing · TS clean · Working tree clean

---

## 1. Verdict

**APPROVE WITH BLOCKING CHANGES**

One blocking defect: a hardcoded hex literal (`'#D4830A'`) in `account_card.tsx` violates CLAUDE.md's explicit token rule and AC §11.8. The rest of the implementation is high quality — financial logic is correct, store/state shapes comply, animation approach is sound, and the agent deviations are all acceptable. The blocker is surgical (one constant lookup) and does not require re-architecture.

---

## 2. Plan vs Implementation

| Deliverable | Status |
|---|---|
| Task 1 — `computeLiquidityBreakdown` + `computeLiabilitiesBreakdown` in helpers | Landed. Correct tier definitions, archived exclusion, USD conversion, abs() on negative CC balances, descending sort. |
| Task 2 — 13 new string keys in `constants/strings.ts` | Landed. All 13 keys present and correct. |
| Task 3 — V2 `dashboard.store.ts` + `dashboard.anim.ts` + `dashboard.state.ts` | Landed. Store/state shapes match CLAUDE.md conventions exactly. |
| Task 4 — V2 `dashboard.hook.ts` with `liquidity`/`liabilities` memos + segment plumbing | Landed. `useMemo` dependencies correct. `useFocusEffect` resets segment. |
| Task 5 — `SegmentSwitcher` + tests | Landed. 4 tests cover both labels, active state, `onChange` fire, no-op on active. |
| Task 6 — `TotalBalanceStrip` + tests | Landed. 2 tests cover formatted amount and zero case. |
| Task 7 — `HeroCard` V2 re-skin | Landed. Gradient, grid texture, gold glow, manual-override badge, tap handler preserved. |
| Task 8 — `StatCards` V2 re-skin | Landed. Net Worth + Spent cards with split bar, legend, delta chip. |
| Task 9 — `CommitmentsCard` V2 re-skin | Landed. Calendar icon, progress bar, 5-stat row. |
| Task 10 — `SectionHeader` V2 with count chip | Landed. |
| Task 11 — `AccountCard` V2 re-skin | Landed. Per-type info rows, credit progress bar, dynamic accent color. |
| Task 12 — `AddCard` V2 dashed border | Landed. Dashed border, gold `+` glyph, routes to add_account via `onAddPress`. |
| Task 13 — `AccountCarousel` V2 | Landed. Horizontal `ScrollView` with `gap` in `contentContainerStyle`. Type prop accepted but not forwarded to AddCard — noted deviation D5, acceptable. |
| Task 14 — `NetWorthBreakdownSheet` V2 | Landed. `Sheet` primitive, `size="lg"`, `BottomSheetScrollView`, correct section hide/show logic. |
| Task 15 — `DashboardScreenV2` index + smoke test | Landed. Screen is routing-only assembly. 4 smoke tests. |
| Task 16 — Route flag-branch wired | Landed. `FeatureFlags.newDashboard` still `false`. |
| Shared type `types.ts` (Wave 1.5) | Landed. Re-exported from `dashboard.state.ts`. Acceptable process scaffolding — see §8. |
| Tasks 17–19 (QA, promotion, cleanup) | Out of scope for this review pass. |

**Out-of-scope check:** No FAB changes, no Account Detail changes, no Add Account sheet variant, no recent-transactions strip, no sparkline, no multi-currency rollup. Clean.

---

## 3. Risks Revisited

| Risk | Status |
|---|---|
| R1 — Segment swap fade-in conflicts with carousel horizontal scroll | RESOLVED. Cross-fade only (`FadeIn.duration(200)` / `FadeOut.duration(150)`). No horizontal slide. `key={segment}` on the `Animated.View` triggers entering animations per spec. |
| R2 — `newDashboard` flag flip exposes regression | OPEN (by design). Flag is `false`; V2 is behind the flag. Task 17 manual QA gates the promotion. Correct position. |
| R3 — HeroUI re-skin alters subtle visuals | PARTIAL. One hardcoded hex found (BLOCKER-1); the rest of the re-skin correctly uses `Colors.*` tokens. |
| R4 — `Sheet size="lg"` clips content on small phones | RESOLVED. `BottomSheetScrollView` inside `Sheet.Body` provides scrollable surface. Proved out in §4. |
| R5 — `useFocusEffect` segment reset surprises users | ACCEPTABLE. Spec §3.3 explicitly documents this as intentional. |
| R6 — Legacy `net_worth_breakdown_sheet.tsx` accidentally breaks an unsuspected importer | DEFERRED to Task 19 cleanup. No deletion has occurred yet — correct. |
| R7 — Re-skin introduces hex literals or spacing values | PARTIALLY MATERIALISED. One hex literal (`#D4830A`) in `account_card.tsx` and two bare pixel values (`16` / `12`) in `total_balance_strip.tsx`. See Issues §6. |
| R8 — Liquidity/liabilities memos compute on every account list change | RESOLVED. Both helpers are O(n) single-pass. No expensive operations. |

---

## 4. CLAUDE.md Compliance

### app/ routing rules
**PASS.** `app/(app)/(tabs)/dashboard/index.tsx` is a flag-branch component — same pattern §2 used. The file has a default export, contains no `.hook.ts` / `.anim.ts` / `.store.ts` side-cars, and no `_layout.*` trap. No Expo route registration risk. The plan's §3.1 call-out covers the one-liner exception explicitly.

### screens/ anatomy
**PASS.** `screens/dashboard_v2/` follows the anatomy exactly: `index.tsx` (UI, no `useState`/`useSharedValue`) · `dashboard.hook.ts` (logic) · `dashboard.store.ts` (data state) · `dashboard.state.ts` (UI state) · `dashboard.anim.ts` (Reanimated) · `components/` (sub-components). `types.ts` is an addendum — see §8 Recommendations. All files `snake_case`, all TS identifiers `camelCase`.

### Store/state shape
**PASS.** Both stores comply precisely:
- `state: { ... }` wrapper present in both `dashboard.state.ts` and `dashboard.store.ts`.
- Setters spread previous state: `set((s) => ({ state: { ...s.state, x: v } }))`.
- `reset()` is `set({ state: INITIAL_STATE })`.
- Hook returns `{ state: { ...reactiveValues }, ...flatActions }`.
- Consumers destructure `state` from hook return.

### null vs undefined
**PASS.** No inversions observed. `credit_limit` and `statement_due_day` are appropriately `?? 0` or `!= null` guarded.

### Screen layout — `Screen` / `ScreenScroll`
**PASS.** `DashboardScreenV2` uses `<Screen edges={['top']}>` (correct — tab bar handles bottom edge) and `<ScreenScroll>` with `RefreshControl`. No `SafeAreaView` from `react-native-safe-area-context`.

### Bottom sheets — no `react-native-actions-sheet` in new code
**PASS.** Zero imports of `react-native-actions-sheet` in any new file. `NetWorthBreakdownSheet` uses `Sheet` from `@/components/ui/sheet` and `BottomSheetScrollView` from `@gorhom/bottom-sheet`. Scrollable content rule honored.

### Theme tokens — no hardcoded hex/spacing/radius
**FAIL (blocker + nit).** Two violations found:
1. `account_card.tsx:27` — `'#D4830A'` hardcoded. **BLOCKER.**
2. `total_balance_strip.tsx:21` — `paddingHorizontal: 16, paddingVertical: 12` bare pixel values. **Nit.**

All other files use `ms()` for sizing and `Colors.*` for color. No new hardcoded radius values.

### Strings — no hardcoded user-visible copy
**NIT.** Three hardcoded user-visible strings carried from V1 into V2:
- `hero_card.tsx:111` — `"Manual"` (manual override badge label).
- `hero_card.tsx:151` — `" accounts"` (account count chip suffix).
- `hero_card.tsx:144` — `"1 USD = ... EGP"` (rate chip format).
All three exist verbatim in V1 `screens/dashboard/components/hero_card.tsx`. These are pre-existing violations, not regressions introduced by §5. Flag for cleanup task (Task 19) or a follow-up fix commit.

### Expo Dev Client compatibility
**PASS.** All imports are compatible with `expo-dev-client` + `expo prebuild`. No Expo Go-only APIs.

---

## 5. Test Coverage Assessment

**Overall: good, with one notable gap in the screen smoke tests.**

### Helpers (`dashboard_helpers.test.ts`) — Excellent
All plan-specified cases covered: L-01 canonical mix, L-02 zero accounts, L-03 USD conversion, L-05 all liquid / all reserve, L-07 archived exclusion, L-08 multi-CC ordering, single CC, no CC. Additionally: negative CC balance defensive abs() test added (not in plan but covers the impl's `Math.abs()`). 11 tests.

### Hook (`dashboard_hook.test.ts`) — Good
All 5 plan-specified behaviours covered: default segment, `setSelectedSegment` updates state, liquidity memo, liabilities memo, `useFocusEffect` resets segment. Fully-mocked store approach (deviation D1) is acceptable — the specified behaviours are verified. 5 tests.

### SegmentSwitcher (`segment_switcher.test.tsx`) — Good
4 tests: renders both labels, accessibility selected state on active segment, `onChange` fires, no-op on already-active. All plan behaviours covered.

### TotalBalanceStrip (`total_balance_strip.test.tsx`) — Minimal
2 tests: formatted amount + count, and zero case. Coverage is adequate for a display-only component, though a test for the `Strings.dashboardTotalBalance` / `Strings.dashboardAccountsLabel` label presence would improve spec traceability.

### NetWorthBreakdownSheet (`net_worth_breakdown_sheet.test.tsx`) — Good
6 tests: headline (EGP + USD), both legend rows, reserve-hidden when count=0, liquid-hidden when count=0, liabilities section hidden when empty, multiple rows + total. Ordering assertion (cards A/B rendered) is present but relies on render order rather than a position assertion. Acceptable since `computeLiabilitiesBreakdown` is tested for ordering separately in helpers.

### Screen smoke test (`dashboard_screen.test.tsx`) — Adequate but incomplete
4 tests: empty state (no SegmentSwitcher), Overview segment default, Accounts segment body (TotalBalanceStrip visible), settings cog routing.

**Missing from spec §8.4:**
- `HeroCard` tap → `setBreakdownVisible(true)` assertion.

The settings cog test is present. The FAB test was correctly excluded (FAB is owned by tab layout). The missing `HeroCard` tap test is a gap; it's the primary interactive tap on the overview segment. See IMPORTANT-1.

### Coverage thresholds
All 1178 tests pass. CLAUDE.md thresholds (80% lines / 95% functions / 100% branches) are reported passing.

---

## 6. Issues Found

### BLOCKER-1 — Hardcoded hex `#D4830A` in `account_card.tsx`

**File:** `screens/dashboard_v2/components/account_card.tsx`

**Line:** 27

```typescript
// Current (violates CLAUDE.md + AC §11.8)
if (pct >= 0.2) return '#D4830A';
```

**Impact:** CLAUDE.md states "Never hardcode hex/spacing/radius." AC §11.8 explicitly requires "No new hex literals." `#D4830A` is a deep amber — a warning-state color between green and red on the credit utilisation bar. This exact value may not be in `Colors.*` — it appears to be bespoke to this UI state. It needs to be either added to `constants/theme.ts` under `Colors.dark.warning` (or similar) and referenced from there, or mapped to the closest existing semantic token.

**Fix:**

Option A — add to `Colors.dark` in `constants/theme.ts`:
```typescript
// constants/theme.ts — Colors.dark block
warning: '#D4830A',
```
Then in `account_card.tsx`:
```typescript
if (pct >= 0.2) return Colors.dark.warning;
```

Option B — if a suitable semantic token already exists (e.g., `Colors.dark.caution`), use that and delete the literal. Verify visually — the exact hue matters for the utilisation colour band.

---

### IMPORTANT-1 — Missing smoke test: HeroCard tap opens breakdown sheet

**File:** `__tests__/screens/dashboard_v2/dashboard_screen.test.tsx`

**Impact:** Spec §8.4 explicitly required: "HeroCard tap opens breakdown sheet (`isBreakdownVisible` true)." The screen smoke test covers empty state, default Overview body, segment swap, and settings cog routing — but not the primary interactive tap. If a future refactor accidentally removes the `onPress={() => setBreakdownVisible(true)}` wiring from `HeroCard`, no test catches it.

**Fix:**

Add a test to `dashboard_screen.test.tsx`:
```typescript
it('tapping HeroCard calls setBreakdownVisible(true)', () => {
  mockHookReturn = makeHookReturn({ accounts: [mkAccount()] });
  const { getByLabelText } = render(<DashboardScreenV2 />);
  // HeroCard Pressable wraps the card — accessibilityLabel needed, or query by role
  fireEvent.press(getByLabelText('Available to Spend'));
  expect(setBreakdownVisible).toHaveBeenCalledWith(true);
});
```

Note: `HeroCard` currently has no `accessibilityLabel` on its root `Pressable`. Add `accessibilityLabel={Strings.dashAvailableToSpend}` to the `Pressable` in `hero_card.tsx` so the test can target it cleanly and so screen-readers have a meaningful label.

---

### MINOR-1 — Bare pixel values in `TotalBalanceStrip`

**File:** `screens/dashboard_v2/components/total_balance_strip.tsx`

**Line:** 21

```typescript
style={{ ..., paddingHorizontal: 16, paddingVertical: 12 }}
```

**Impact:** CLAUDE.md requires all sizing from `constants/theme.ts` via `ms()`. These should be `ms(16)` and `ms(12)` (or `Spacing.sm` and `Spacing.xs` if the token values match) to participate in the responsive scaling system. On very large Android tablets the fixed 16/12 values will look cramped relative to scaled peers.

**Fix:**
```typescript
paddingHorizontal: ms(16), paddingVertical: ms(12)
```

---

### MINOR-2 — Redundant `is_archived` guard in helpers when accounts are pre-filtered

**File:** `screens/dashboard/dashboard.helpers.ts`

**Lines:** 65, 92

**Impact:** `computeLiquidityBreakdown` and `computeLiabilitiesBreakdown` check `a.is_archived` defensively. In practice, both V1 and V2 hooks pass `accountState.accounts`, which is sourced from `getAccounts(db)` — a query with `WHERE is_archived = 0`. The guard is technically dead code at runtime. It is not a bug (it's defensive), but it creates a false impression that these helpers accept a mixed live/archived array, which could confuse future callers. The existing `computeNetWorth` and `groupAccountsByType` do not guard against `is_archived`.

**Fix (optional):** Either add a JSDoc comment documenting that the guard is defensive, or remove it and let the DB-layer pre-filter guarantee stand. If removed, add a comment explaining the invariant. Either choice is acceptable; decide and be consistent.

---

### MINOR-3 — `useEffect` missing `loadStats` in dependency array

**File:** `screens/dashboard_v2/dashboard.hook.ts`

**Line:** 127

```typescript
useEffect(() => {
  loadStats(accountState.accounts.map((a) => a.id));
}, [accountState.accounts]); // missing: loadStats
```

**Impact:** ESLint `react-hooks/exhaustive-deps` violation. In practice, `loadStats` is stable (wrapped in `useCallback` with `[setStatsMap]` deps), so there is no functional bug today. But the missing dep means a future change that re-creates `loadStats` won't trigger this effect. This is also present identically in V1's `dashboard.hook.ts` — it's a carried-over omission.

**Fix:**
```typescript
useEffect(() => {
  loadStats(accountState.accounts.map((a) => a.id));
}, [accountState.accounts, loadStats]);
```

Apply the same fix to V1's hook in the cleanup task or a separate fix commit.

---

### MINOR-4 — `AddCard` accessibility label reuses `emptyAccountsCta` string

**File:** `screens/dashboard_v2/components/add_card.tsx`

**Line:** 22

```typescript
accessibilityLabel={Strings.emptyAccountsCta}  // "Add Account"
```

**Impact:** Correct from a functional standpoint. However, `emptyAccountsCta` is semantically coupled to the empty-state CTA, not to the carousel add button. Screen-readers will announce "Add Account" which is fine — but if the empty-state CTA copy ever changes to "Create Your First Account", the carousel add button label changes with it unexpectedly. A dedicated `Strings.dashboardAddAccountLabel` or similar would be cleaner.

**Fix (low priority):** Add a `dashboardAddAccountLabel: 'Add account'` key to `constants/strings.ts` and use it here. Not a blocker.

---

### NIT-1 — `types.ts` parallel-execution scaffold should be cleaned up

**File:** `screens/dashboard_v2/types.ts`

**Impact:** As noted in deviation D8, this file was added to allow parallel agents to resolve `DashboardSegment` without a dependency on Agent A's state file. `dashboard.state.ts` re-exports the type so plan-stated import paths still work. Post-cleanup (Task 19), this extra indirection should either be collapsed — move `DashboardSegment` back into `dashboard.state.ts` and delete `types.ts` — or kept with an explicit comment explaining why it lives separately (e.g., if other modules outside `dashboard_v2/` need the type). Currently only `segment_switcher.tsx` imports from `types.ts` directly; the rest use the re-export from `dashboard.state.ts`. No urgent fix; address in Task 19.

---

### NIT-2 — Hardcoded user-visible copy in `hero_card.tsx` (V1-inherited)

**Files:** `screens/dashboard_v2/components/hero_card.tsx`

**Lines:** 111 (`"Manual"`), 144 (`"1 USD = {rate} EGP"`), 151 (`"accounts"`)

Pre-existing in V1. These are not new CLAUDE.md violations introduced by §5, but §5 replicates them. Add to the cleanup task (Task 19) scope so they are fixed when V1 is deleted rather than persisting in V2 indefinitely.

---

### NIT-3 — Section header title is type-only ("BANK"), not "BANK ACCOUNTS"

**File:** `screens/dashboard_v2/index.tsx`

**Lines:** 31–36 (`SECTION_TITLES`)

Spec §4.2 wireframe shows "BANK ACCOUNTS · 2". Implementation renders "BANK" (the type label, uppercased) with the count in a separate chip. The spec wireframe's " ACCOUNTS" suffix is missing. This is a minor visual deviation — the section identity and count are still communicated, just through two separate elements. The spec does not call this out explicitly in a must-fix AC. Flag for Marcus to review in the Task 17 manual QA; if he requires the " ACCOUNTS" suffix, add string keys `Strings.sectionHeaderAccounts: 'Accounts'` and concatenate them in `SECTION_TITLES`.

---

## 7. Recommendations Before Merge

**Must fix (blocking merge):**

1. **BLOCKER-1:** Define `Colors.dark.warning` (or equivalent) in `constants/theme.ts` with the value `'#D4830A'`. Replace the literal in `account_card.tsx:27`. This satisfies AC §11.8 and CLAUDE.md.

**Should fix (ship in same PR before promotion):**

2. **IMPORTANT-1:** Add `accessibilityLabel={Strings.dashAvailableToSpend}` to the root `Pressable` in `hero_card.tsx`. Add the HeroCard tap → `setBreakdownVisible(true)` test to `dashboard_screen.test.tsx`. This is a spec §8.4 requirement and a meaningful behavioural gap.

3. **MINOR-1:** Replace bare `16`/`12` pixel values in `total_balance_strip.tsx:21` with `ms(16)`/`ms(12)`.

4. **MINOR-3:** Add `loadStats` to the `useEffect` dependency array in `dashboard.hook.ts:127`. Apply the same fix to V1's `dashboard.hook.ts` in the same commit.

**Can defer (nits, acceptable for Task 19 cleanup or follow-up):**

5. Clean up `types.ts` vs `dashboard.state.ts` indirection (NIT-1).
6. Fix V1-inherited hardcoded strings in `hero_card.tsx` (NIT-2).
7. Add dedicated `Strings.dashboardAddAccountLabel` for `AddCard` (MINOR-4).
8. Verify section header title format with Marcus during Task 17 manual QA (NIT-3).
9. Clarify or remove the redundant `is_archived` guards in helpers with a comment (MINOR-2).

---

## 8. Assessment

### Deviation acceptability

| Deviation | Assessment |
|---|---|
| D1 — Hook test: fully-mocked stores | Acceptable. The 5 specified behaviours are verified. The mock approach is clean and explicit about the test contract. |
| D2 — SegmentSwitcher: RN `Text` instead of HeroUI `Text` | Acceptable. Visual and semantic equivalence preserved. The test passes and the accessibility structure is correct. |
| D3 — LegendRow: split Text nodes for `{label} ({count})` | Acceptable. RNTL's `getByText` requires exact node text; splitting is the correct RNTL-idiomatic approach. Visual output is identical. |
| D4 — Sheet test: `react-native-gesture-handler` mock added | Acceptable. Infrastructure necessity, not logic. Consistent with how other sheets are tested in the codebase. |
| D5 — AccountCarousel: `type` prop dead | Acceptable for now. The prop exists on the interface, the carousel doesn't need type-awareness for AddCard's current bare-glyph design. Annotate with a `// TODO §9` comment so the §9 sheet variant pick-up is clear. |
| D6 — AccountCard: `marginLeft: ms(4)` per card preserved | Acceptable. Matches V1 fidelity. The carousel's `gap: ms(8)` in `contentContainerStyle` handles inter-card spacing; the per-card `marginLeft` gives the first card a slight indent from the scroll edge. |
| D7 — Screen smoke test: direct hook mock | Acceptable. Hook logic is tested separately and exhaustively in `dashboard_hook.test.ts`. Screen test focuses on wiring. |
| D8 — `types.ts` shared type file | Acceptable as a process artifact. Recommend merging into `dashboard.state.ts` in Task 19 unless other modules outside `dashboard_v2/` end up importing `DashboardSegment` directly. |

### Financial logic verdict

Layla's §5.1 definitions are correctly implemented:

- `computeNetWorth`: assets = all non-CC accounts; liabilities = all CC accounts. Correct.
- `computeLiquidityBreakdown`: Liquid = Bank + SmartWallet + PhysicalWallet; Reserve = PhysicalSavings. Correct. CreditCard excluded from both tiers. Correct.
- `computeLiabilitiesBreakdown`: CC-only, `Math.abs()` on balance, sorted descending. Correct.
- USD conversion: `a.currency === Currency.USD ? a.current_balance * rate : a.current_balance`. Consistent pattern across all three helpers.
- `rate === 0` edge: USD values become 0; callers display `—` via `formatAmount`. Confirmed in helpers test (implicit via L-03 rate usage) and in `computeNetWorth` which has `rate > 0 ? ... : 0` guard. The breakdown sheet shows `≈ {formatAmount(netWorthUsd, 0)} USD` which will display `≈ 0 USD` when rate=0 rather than `—`. Minor UX gap vs spec §5.3 which says "show `—` when `rate === 0`" — the sheet always renders the USD line. See below.

**Rate=0 USD display gap (flagged, not a blocker):** `NetWorthBreakdownSheet` renders `≈ {formatAmount(netWorthUsd, 0)} USD` unconditionally. When `rate === 0`, `netWorthUsd` is 0, so it renders `≈ 0 USD` instead of `—`. Spec §5.3 says USD values should show `—` when `rate === 0`. The HeroCard chip (`{formatAmount(assetsUsd, 0)} USD`) has the same issue. Both are minor and the fix is: `rate > 0 ? formatAmount(val, 0) : '—'`. Flag as MINOR-5; can ship in same PR as the blocker fixes or deferred.

### Architecture verdict

The v1/v2 directory split is cleanly executed. The stores, state, and hook are properly isolated in `screens/dashboard_v2/`. The helpers extension in the V1 helpers file is the right call — pure functions with no V1/V2 divergence. The `Screen`/`ScreenScroll` usage is correct with `edges={['top']}` (tab bar handles bottom). The sheet integration (`Sheet size="lg"` + `BottomSheetScrollView`) is consistent with §4's proven pattern. Performance-wise, both `liquidity` and `liabilities` memos correctly depend on `[accountState.accounts, currencyState.rate]`; no over-triggering.

---

*Tariq Mansour · 2026-05-16*
