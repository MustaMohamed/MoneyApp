# Post-Ship Review — HeroUI Usage & Codebase Consistency

**Date:** 2026-05-24
**Scope:** All 70 screen components + shared `components/` tree, after §1–§9 rebrand shipped to `main`.
**Lenses:** (1) HeroUI primitives vs. hand-rolled custom components; (2) consistency against `CLAUDE.md` conventions.
**Method:** Four parallel domain agents (shared/onboarding · dashboard/accounts · commitments · transactions/settings); findings deduped and severity-ranked. Dead-code, off-brand-color, and duplicate-file claims verified by grep/diff.
**Status:** Review only — no code changed. User decision: promote V2 / delete V1 for §2 onboarding; fixes to be planned later.

---

## Ground truth: HeroUI catalog utilization

Only **6** of ~25 available `heroui-native@1.0.3` primitives are imported anywhere in the shipped codebase:

> `Accordion`, `Button`, `Card`, `Input`, `ListGroup`, `Tabs`

Confirmed available in v1 but **used nowhere** (and hand-rolled instead): `Chip`, `Surface`, `Dialog`, `Switch`, `Checkbox`, `RadioGroup`, `Skeleton`, `Spinner`, `Avatar`, `Separator`, `SearchField`, `Select`, `Popover`, `Toast`, `Alert`. (Source: official HeroUI Native catalog. Note: there is **no** `Badge` primitive — the custom `TypeBadge` wrapper maps to `Chip`.)

`node_modules` is absent in worktrees, so HeroUI recommendations below are validated against the published catalog, not local introspection.

---

## 🛑 CRITICAL — §2 Onboarding never promoted (high blast radius)

**Verified verdict: V1 (`screens/onboarding/*`) is LIVE; the entire `screens/onboarding_v2/*` tree is DEAD CODE.**

Trace:
- `constants/feature_flags.ts:17` — `newOnboarding: false` (the last surviving flag).
- `app/(onboarding)/{welcome,add_account,more_accounts,ready}/index.tsx:9` each evaluate `FeatureFlags.newOnboarding ? V2 : V1` → render **V1**.
- `app/(onboarding)/currency/index.tsx` & `security/index.tsx` are V1-only re-exports (V2 folds currency into welcome and drops the security step).
- `store/onboarding.store.ts:14` defaults to `OnboardingStep.O1` (V1 namespace); the `N1`–`N4` force-restart at `:99` is flag-guarded and never runs.

The flag's own documented contract (`feature_flags.ts:1-15`) — flip in the promotion commit + cleanup within 5 business days — was never honored for §2. Every other section (§5–§9) did this.

**Decision (user, 2026-05-24): promote V2, delete V1.** Future plan must:
1. Flip `newOnboarding` → true; device-QA the V2 flow.
2. Delete `screens/onboarding/*`; rename `screens/onboarding_v2/*` → `screens/onboarding/*`.
3. Collapse the four flag-branching route files back to one-liner re-exports.
4. Resolve V2 currency/security routes (V2 absorbs currency into welcome, drops security — confirm intent).
5. Remove the `newOnboarding` flag entry, the `N1`–`N4` enum members, and the `n*`/`*V2`-only strings.

Severity: **HIGH**. This is the one section where users still see the pre-rebrand UI.

---

## Lens 1 — HeroUI primitives vs. custom (recurring patterns)

The same primitives are reinvented across slices. Grouped by primitive:

### → HeroUI `Chip` (selectable pill ternary, ~13 copies)
The `border-accent/50 bg-accent/15 rounded-full border` selected/unselected ternary is copy-pasted:
- `screens/commitments/components/status_filter_chips.tsx:36-58`
- `screens/commitments/components/recurrence_picker.tsx:41-67,104-130`
- `screens/commitments/components/duration_picker.tsx:62-88`
- `screens/commitments/components/commitment_form_body.tsx:248-277,326-356` (amount-type + currency)
- `screens/transactions/components/type_chips.tsx:15-23` (also hardcodes labels — see Lens 2 strings)
- `screens/transactions/filter/components/account_accordion.tsx`, `category_accordion.tsx` (chips inside)
- `screens/settings/categories/components/add_edit_category_sheet.tsx:208-229` (type pills)

**Fix:** HeroUI `Chip` (selectable), or one shared `SelectablePill` if `Chip` styling can't match. Highest-leverage dedup in the app.

### → HeroUI `Tabs` (segmented control — the documented §5 precedent)
- `screens/transactions/transaction_form/components/type_tabs.tsx` — custom tab bar w/ absolute active indicator (named "tabs" but isn't `Tabs`).
- `screens/settings/categories/index.tsx:56-95` — inline Expense/Income switcher.
- `screens/transactions/filter/components/amount_accordion.tsx:73-90` — EGP/USD currency toggle.
- `screens/accounts/add_account/index.tsx:114-137` & `screens/onboarding_v2/.../welcome` — currency toggle.

**Fix:** HeroUI `Tabs` with variant coloring. CLAUDE.md §5 explicitly records the `SegmentSwitcher`→`Tabs` correction.

### → HeroUI `Accordion`
- `screens/transactions/filter/components/account_accordion.tsx`, `category_accordion.tsx` (near-identical copy-paste), `amount_accordion.tsx` — all hand-roll header + chevron + expand/collapse.

**Fix:** one generic `<ChipSelectAccordion>` on HeroUI `Accordion` + `Chip`.

### → HeroUI `Dialog` + shared `ConfirmDialog`
- `screens/transactions/detail/components/delete_confirm_dialog.tsx:22` — raw RN `Modal`.
- `screens/settings/categories/components/delete_confirmation_dialog.tsx` — raw RN `Modal`, **structurally near-identical** to the above (transparent fade Modal, `rgba(0,0,0,0.6)` scrim, centered card, title/body, Cancel/Delete row).
- `screens/accounts/detail/components/archive_confirmation_dialog.tsx:29` — same raw `Modal` pattern (scrim `0.65` vs `0.6` drift).

**Fix:** one shared `ConfirmDialog` in `components/ui/` on HeroUI `Dialog` (props: title/body/confirmLabel/destructive/busy). Use `Button isLoading` instead of hand-built spinner.

### → HeroUI `Card`/`Surface`
- `screens/dashboard/components/account_card.tsx:185`, `add_card.tsx:19`, `stat_cards.tsx:73-196`, `commitments_card.tsx:41` — hand-rolled `bg-surface border-border rounded-2xl border` cards. (Commitments slice already standardized on HeroUI `Card`.)

### → HeroUI `ListGroup`
- `screens/transactions/detail/components/detail_rows_card.tsx` + `detail_row.tsx` — reimplement row-with-icon/label/value/trailing (settings/index.tsx already uses `ListGroup` for this).
- `screens/accounts/detail/index.tsx:165-195` — Adjust/Archive action card → `ListGroup`/`SettingsSection`.
- `screens/transactions/transaction_form/transaction_form_body.tsx` account/category selector rows.

### → project `Button` (primary CTA)
Custom gold `Pressable` + manual spinner instead of `Button variant="primary"` (gold gradient + `isLoading`):
- `screens/transactions/transaction_form/components/save_cta.tsx` (also uses *solid* gold, not the gradient — visual drift)
- `screens/settings/categories/components/add_edit_category_sheet.tsx:170-183`
- `screens/settings/categories/components/reassign_category_sheet.tsx:59-75`
- all V1 onboarding CTAs (die with V1 cleanup)
- `components/ui/empty_state.tsx:103-130` — bespoke `LinearGradient` CTA → compose `Button`

### Direct-import bypass of project wrappers
- `screens/transactions/transaction_form/components/exchange_rate_row.tsx:1` imports `Input` from `heroui-native` (should be `@/components/ui/input`).
- `screens/transactions/transaction_form/components/no_accounts_empty.tsx:2` imports `Button` from `heroui-native` (should be `@/components/ui/button`).

### Legitimately custom (no migration)
`numpad.tsx` (but it's dead — see below), `Sheet` (gorhom wrapper by design), `geo_illustration` (SVG), `progress_dots` (no step-indicator primitive), `total_balance_strip` structure, `back_button`.

---

## Lens 2 — Consistency

### Duplication & dead code (verified)
- **`type_pill.tsx` triplicated.** `screens/onboarding_v2/add_account/components/type_pill.tsx` ≡ `screens/accounts/add_account/components/type_pill.tsx` (byte-identical except import order — verified via diff). `screens/onboarding/add_account/components/type_pill.tsx` is an older hardcoded-hex variant. **Fix:** hoist one canonical `TypePill` + `TYPE_OPTIONS` to a shared location; V1 copy dies with V1 cleanup.
- **Duplicate `EmptyState`.** `components/empty_states/index.tsx` (pre-rebrand twin: raw RN + hardcoded hex, exports same `EmptyState`/`EmptyStateVariant`) is still imported by `app/(app)/(tabs)/goals/index.tsx:4` and `app/(app)/(tabs)/budget/index.tsx:4` (verified). Everything else uses `components/ui/empty_state`. **Fix:** add `goals`/`budget` variants to the canonical wrapper, migrate the two tabs, delete `components/empty_states/`.
- **Commitments status maps copied ×3:** `STATUS_COLORS`/`STATUS_LABELS`/`STATUS_ICONS` verbatim in `commitment_row.tsx:18-40`, `current_cycle_card.tsx:20-40`, `payment_row.tsx:11-24`. Amount-resolution logic (`isPaid ? ... : ...` + `showTilde`) in `commitment_row.tsx:56-60`, `current_cycle_card.tsx:54-57`, `detail_hero.tsx:46-50`. **Fix:** extract `commitment_status.ts` constants + `resolveDisplayAmount(payment, commitment)` helper.
- **Near-identical confirm sheets:** `screens/commitments/detail/components/skip_confirm_sheet.tsx` & `edit_commitment/components/deactivate_sheet.tsx` differ only in copy + `busy` handling. **Fix:** shared `ConfirmSheet` in `components/ui/`.
- **Dead code (verified unreferenced):**
  - `screens/transactions/transaction_form/components/numpad.tsx` — replaced by `AmountHero`; no importers. (Also the `handleNumpad` action on `add_transaction.store.ts`/`edit_transaction.store.ts` — verify no test uses it before removing.)
  - `screens/settings/categories/categories.anim.ts` — `useTabAnim` exported, imported nowhere.
- **Three near-identical screen headers** in commitments: `index.tsx:22-26`, `detail/index.tsx:23-50`, `commitment_form_body.tsx:195-204`. Dedupe to one header component.
- **`nextDueDate` reimplemented:** `screens/dashboard/components/account_card.tsx:31-38` has a private copy while `net_worth_breakdown_sheet.tsx:16` imports the shared `@/utils/format_date` version. Use the shared util.

### Token / color drift
- **Off-brand `#D4AF37`** (matches no token; real golds are `cairoGold #C9973A` / `Colors.dark.gold #D4A44C`) hardcoded in 4 files (verified): `transactions/components/transaction_row.tsx:145`, `transactions/detail/components/transfer_flow_card.tsx:46,93`, `transactions/filter/components/account_accordion.tsx:92`, `transactions/filter/components/category_accordion.tsx:93`. **Fix:** `GoldTokens[500]`/`Colors.dark.gold`.
- **Token-source split:** dashboard sources from `@/constants/theme` (`Colors.*`); accounts from `@/constants/theme_tokens` (`CoreTokens`/`GoldTokens`/`SemanticTokens`). CLAUDE.md:149 names `theme_tokens.ts` canonical — and it doesn't export `Colors`. Standardize dashboard on `theme_tokens`.
- **Arbitrary gold-tint class** `bg-[rgba(201,151,58,0.08)]` / `0.12` repeated (accounts `add_account/index.tsx:120-124`, `type_pill.tsx:61`; onboarding_v2 welcome/add_account). **Fix:** named token / `bg-gold-500/8` slot.
- **Scattered hardcoded hex:** `#888` (filter accordions, `detail_hero.tsx:104-120`), `#999` (`search_row.tsx:40`), `#F0EEE6` (`search_row.tsx:50`, `detail_row.tsx:70`, `note_card.tsx:38`), `#FFFFFF`/`rgba(0,0,0,0.6)` (both delete dialogs), SVG hex in `geo_illustration:14-34`, `interpolateColor` hex in `progress_dots.anim.ts:26`. Route through tokens.
- **Magic numbers:** custom-category limit `30` (`categories.hook.ts:68`), header `height: 56`/`paddingHorizontal: 16` (`onboarding_v2/add_account/index.tsx:51,64`), `borderRadius: 13` literal (`components/ui/button.tsx:45` → `Radius.cta`).

### Strings not centralized (existing `Strings.*` re-typed as literals)
- `hero_card.tsx:115-117` `"Manual"` (→ `currencyManualLabel`), `:155` `"accounts"` (→ `o6AccountsUnit`).
- `stat_cards.tsx:192` `"txs"`.
- `search_row.tsx:29,32` `"Search transactions"` + a11y label (→ `searchTransactionsPlaceholder`).
- `type_chips.tsx:15-23` `All/Income/Expense/Transfer/CC Payment` (→ `filterAll`, `addTxType*`).
- `detail_hero.tsx:54-65` type labels (duplicates `detail.hook.ts:33-38` `TYPE_BADGE` map).
- `exchange_rate_row.tsx:75` `"Exchange Rate"` (→ `currencyRateLabel`).
- `filter.helpers.ts:48-49` `"Up to"`/`"From"`.

### Anatomy / store-shape nits (low)
- `transactions.hook.ts:66,70` — `totals` (fetched result) + `customRange` (selection) held in `useState`; belong in `transactions.store.ts`.
- `decimal_amount_input.state.ts:11-27` — per-instance Zustand store via `useRef` (departs from module-level singleton pattern); the bespoke store exists to work around a `useEffect([value])` sync loop (`decimal_amount_input.tsx:20-26`). Collapse to `useState` or migrate to HeroUI `Input`.
- `onboarding_v2/welcome/welcome.hook.ts:21` — `useState<Currency>` for selection data (should be a small store).
- `commitment_form_body.tsx:124` — resets via `getState().reset()` rather than destructured `reset`.
- `total_balance_strip.tsx:3,31-44` — only component bypassing the `Text` wrapper (raw `Text as RNText`); loses Sora/tabular-nums typography.
- `dashboard/index.tsx:95-114` — header uses raw RN `View`/`Pressable` instead of `Box`/`Pressable` wrappers (accounts headers use wrappers).

### Likely real bugs (fix regardless of scope)
- **`pay_sheet.tsx:105`** renders raw ISO `payment.due_date` (unformatted; every other date uses `formatShortDate`). Display bug.
- **`payment_history.tsx:2,27`** inert `FlatList` (`scrollEnabled={false}`) nested inside `ScreenScroll` — RN nested-VirtualizedList footgun. Use `.map()` or `ListGroup`.
- **`transaction_form_body.tsx:241`** raw RN `TextInput` for note inside a Sheet — can fight keyboard/gesture handling (use `Input` wrapper or `BottomSheetTextInput`).
- **`edit_transaction.state.ts:32`** `open(tx)` ignores its parameter (misleading signature).

### Stale documentation
- CLAUDE.md "Bottom Sheets" section calls `screens/accounts/detail/components/adjust_balance_sheet.tsx` the last `react-native-actions-sheet` consumer slated for §9 — but it's **already migrated** to the `Sheet` wrapper, and the dep + patch are already removed from `package.json`/`patches/` (verified). Delete that note.

---

## What's already RIGHT (don't re-flag)
- Store/state shape contract (`state:{}` wrapper, flat spreading setters, `reset()=set({state:INITIAL_STATE})`) followed across all in-scope `.store.ts`/`.state.ts`.
- Sheet migration complete except V1 onboarding: `net_worth_breakdown_sheet`, `pay_sheet`/`skip`/`deactivate`, both transaction picker sheets, `date_range_sheet`, `add_edit_category_sheet`, `reassign_category_sheet`, `adjust_balance_sheet` all use the `Sheet` wrapper + `BottomSheet*` scroll children. No `react-native-actions-sheet` imports remain.
- `Screen`/`ScreenScroll` used correctly; layout-critical flex via `style` not `className`.
- `settings/index.tsx` correctly uses `ListGroup` (the model for detail/category rows).
- `app/` routing files are one-liner re-exports (except the 4 dead onboarding flag-branches).
- snake_case files / camelCase identifiers throughout.

---

## Suggested fix waves (for later planning)
1. **Quick wins (low risk):** delete dead code (`numpad.tsx`, `useTabAnim`); fix off-brand `#D4AF37`; centralize already-existing strings; fix `pay_sheet.tsx:105` date bug; delete stale CLAUDE.md sheet note.
2. **Dedup:** shared `ConfirmDialog` + `ConfirmSheet`; canonical `TypePill`; `commitment_status.ts` helpers; retire duplicate `EmptyState` (migrate goals/budget); dedupe commitment headers.
3. **§2 onboarding promotion** (separate, gated effort — flag flip + V1 deletion + device QA).
4. **Full HeroUI migration:** `Chip`/`Tabs`/`Accordion`/`Dialog`/`Card`/`ListGroup`/`Button` across all slices; token-source standardization on `theme_tokens`.
