# IA Restructure (Cycle 1 of 3) — Design Spec

**Date:** 2026-05-10
**Status:** Draft (pending plan + approval)
**Owners:** [marcus] product · [sarah] sequencing · [tariq] technical
**Scope:** Cleanup-only restructure of existing screens. No new features, no new screens.
**Part of:** Mega-initiative *Full reset = rebrand + library swap + IA restructure*. This is **Cycle 1 of 3**:

1. **Cycle 1 (this spec):** UX/IA cleanup — defines target screen structure, sheet vs full-screen rules, FAB behavior, settings shape, onboarding flow.
2. **Cycle 2 (future spec):** gluestack-ui v2 + NativeWind migration with Cairo Nights Extended palette. Implements *against* this spec.
3. **Cycle 3 (future spec):** Reusable component library extracted from Cycle 2 work.

---

## Overview

The current MoneyApp UI works but has accumulated friction in 8 specific places. This spec defines a focused cleanup that:

- Makes "log a transaction" a 1-tap reflex from any tab.
- Compresses onboarding from 6 to 4 steps.
- Establishes 4 reusable IA patterns (Sheet · FAB · SettingsSection · EmptyState) before Cycle 2 builds them in gluestack.

This spec describes the **target IA only**. It does not ship code. Cycle 2 implements these changes during the gluestack migration.

---

## Goals

1. Reduce taps for the most-frequent action (Add Transaction): 3 taps → 1 tap from any tab.
2. Reduce onboarding steps: 6 → 4.
3. Define the 4 reusable IA patterns Cycle 2 must build.
4. Define migration sequencing for Cycle 2 implementation.
5. Stay disciplined: zero new features, zero new screens, zero changes to financial logic or data model.

## Non-Goals

- No new tabs (Accounts, Insights, Budgets all stay deferred).
- No new screens.
- No global Search.
- No restructure of the Commitment ↔ Transaction relationship.
- No changes to data model, business rules, financial formulas, or persistence.
- No theming, color, or component-implementation decisions (those belong to Cycles 2 & 3).
- No tab-bar restructure (3 tabs stay 3 tabs).

---

## The 8 Changes

### 1. Add Transaction → bottom sheet

**Current:** Full-screen route at `screens/transactions/transaction_form/index.tsx`. Reached via `+` on the Transactions tab. 2-3 taps from elsewhere in the app.

**Target:** Bottom sheet that slides up over the current tab. Triggered by the global FAB (#5) or the Transactions tab's `+`. Occupies ~80% of viewport height with the existing fields:

- Type tabs (Expense · Income · Transfer · CC Payment)
- Amount display + custom Numpad component
- Category picker (opens a nested sheet — sheet-on-sheet)
- Account picker (opens a nested sheet)
- For Transfer/CC Payment: To-account picker
- For USD↔EGP: Exchange rate row
- Date · Time
- Note input
- Save CTA

**Interaction notes:**

- Sheet open animation: spring-up from bottom over current tab content, dimmed scrim behind.
- Dismiss: swipe-down handle, scrim tap, or Cancel button in header.
- Form state persists if dismissed without save (existing `add_transaction.store.ts` keeps draft).
- Nested pickers (category, account) open as sheets *over* the transaction sheet. The transaction sheet stays mounted underneath.
- Save: dismisses the sheet, returns user to whatever tab they were on. No separate success screen.

**Accessibility requirements:**

- Sheet must be keyboard-dismissible.
- Focus trap within sheet while open.
- VoiceOver/TalkBack announces "Add transaction" on open.
- All form errors render inline below the affected field, with `accessibilityRole="alert"`.

**Edge cases:**

- Long-press FAB → mini menu (#5) — when user picks "Add transaction" from menu, transaction sheet opens.
- If user is mid-edit on an existing transaction (`screens/transactions/transaction_form/edit_transaction.hook.ts`), edit stays as a full-screen route — only **Add** moves to a sheet.

**Risk:** Medium. Sheet-on-sheet UX needs careful gesture handling; the patched `react-native-actions-sheet` is being replaced by gluestack's `Actionsheet` in Cycle 2 — a spike during Cycle 2 must validate that sheet-on-sheet works on Android before committing. Fallback: keep nested pickers as full-screen routes if Actionsheet stacking proves unreliable.

---

### 2. Add Commitment stays full-screen

**Current:** Full-screen at `screens/commitments/add_commitment/index.tsx`.

**Target:** Unchanged. Stays full-screen.

**Rationale:** 13+ fields with conditional logic (Fixed/Variable amount type, Forever/Until date/After N duration, optional Category and Account). Too dense for a comfortable sheet. Users add commitments rarely (typically once per recurring obligation), so depth and focus matter more than speed.

**Risk:** Low. No change.

---

### 3. Add Account: dual entry — sheet from Dashboard, full-screen from Settings

**Current:** Full-screen at `screens/accounts/add_account/index.tsx`. Reached only via Dashboard empty state CTA or Settings.

**Target:** Two entry paths, two layouts:

- **From Dashboard `+` FAB long-press menu:** opens a bottom sheet (5 fields):
  1. Account type (chip grid: Bank · Wallet · Cash · Savings · Card)
  2. Name
  3. Currency (defaults to user's primary currency, picker opens nested sheet)
  4. Opening balance
  5. Color (compact 6-color row from the 24 swatches; "More" opens a nested sheet showing all 24)
- **From Settings (or future "Manage accounts" screen):** opens the existing full-screen layout with all advanced options (full 24-color picker grid, account-type-specific fields, etc.)

**Rationale:** Quick-add from Dashboard should be fast. Power users in Settings get the full editor.

**Interaction notes:**

- Both entry paths produce the same `Account` row in the database with identical defaults (`is_archived = 0`, `current_balance = opening_balance`, `id = uuidv4()`, etc.).
- The sheet layout omits no required fields — all required fields are present in both layouts.
- Sheet variant uses the existing `add_account.hook.ts` and form schema; only the rendering layer differs.

**Edge cases:**

- First-account scenario (during onboarding O2 — see #4): always full-screen. Onboarding context demands focus, not speed.
- Editing an account: always full-screen (existing detail screen → edit flow). Edit is rare and benefits from depth.

**Risk:** Medium. Maintaining two layouts means two render paths to keep in sync. Mitigation: extract shared form fields into a single `AccountFormFields` component used by both the sheet and the full-screen variant.

---

### 4. Onboarding compressed: 6 → 4 steps

**Current** (`screens/onboarding/`):

1. O1 Welcome
2. O2 Currency
3. O3 Security UI (PIN/biometric — non-functional, UI only per CLAUDE.md business rules)
4. O4 Add Account
5. O5 Optional skip / continue
6. O6 Open Dashboard (sets `OnboardingComplete`)

**Target** (4 steps):

1. **O1 Welcome + Currency** (merged) — wordmark, tagline, currency picker (EGP pre-selected per CLAUDE.md business rule 5), Continue CTA.
2. **O2 Add Account** — first account add (full-screen, see #3 edge case). Required to advance per CLAUDE.md business rule 3.
3. **O3 Add another? (optional)** — "Add another account?" prompt. Skippable per CLAUDE.md business rule 4. Skip → step 4. Add → loops back to step 2 then advances to step 4.
4. **O4 Open Dashboard** — confirmation screen with "Open My Dashboard" CTA. Sets `OnboardingComplete` per CLAUDE.md business rule 1.

**Removed:**

- **Old O3 Security UI** moves to Settings → Account → Security. Stays UI-only per CLAUDE.md business rule 6 until real PIN/biometric backing is built (separate spec).

**Interaction notes:**

- Welcome+Currency animation: wordmark fades in, then currency list reveals below. EGP highlighted by default.
- Step indicator: 4 dots (instead of 6), gold-on-midnight active state per Cairo Nights Extended palette.
- Force-close behavior preserved: per CLAUDE.md business rule, app resumes from the step the user was on at force-close.

**Risk:** Low. Simplifies first-run UX, fewer drop-off points. The Security UI move to Settings preserves the screen but removes its onboarding placement.

---

### 5. Global "+" FAB on every tab

**Current:** No FAB. `+` button only inside the Transactions tab list header.

**Target:** Floating Action Button (FAB) bottom-right on Dashboard, Transactions, and Commitments tabs.

- **Tap:** opens Add Transaction sheet (#1) — the most common action.
- **Long-press:** mini menu with 3 options:
  1. Add Transaction → opens sheet (#1)
  2. Add Commitment → navigates to full-screen Add Commitment (#2)
  3. Add Account → opens Add Account sheet (#3, sheet variant) regardless of tab. The full-screen Add Account variant is reached only from Settings.

**Interaction notes:**

- FAB is `Size.ctaHeight - 4` ≈ 48dp diameter, gold gradient (Cairo Gold 500 → 600), midnight icon.
- FAB hidden when a sheet is already open (avoid stacking confusion).
- Long-press menu uses gluestack's `Menu` (final decision deferred to Cycle 3).
- Position respects bottom safe area + tab bar height.
- On Transactions tab, the existing inline `+` in the list header is removed (FAB replaces it).

**Accessibility requirements:**

- FAB has `accessibilityLabel="Add transaction"` (tap action) and `accessibilityHint="Long-press for more options"`.
- Long-press menu items each have explicit accessibility labels.
- Menu is screen-reader-navigable.

**Edge cases:**

- If user taps FAB while in a modal flow (e.g., editing a transaction full-screen), FAB is hidden.
- On the Commitments tab, FAB tap opens **Add Transaction sheet** (not Add Commitment) for consistency. Long-press is how users reach Add Commitment.

**Risk:** Low. FAB overlaps content slightly on dense lists; standard pattern, low controversy.

---

### 6. Settings restructured into 4 sections

**Current** (`screens/settings/index.tsx`): Flat list of 2 items (Categories, Currency).

**Target:** Sectioned list:

- **Account**
  - Currency (opens sheet, see #7)
  - Categories
  - Security (UI only — moved from Onboarding O3)
- **Appearance**
  - Theme (placeholder for future light/dark toggle; UI only for now)
  - Text size (placeholder)
- **Data**
  - Export (placeholder for future)
  - Reset all data (existing destructive action)
- **About**
  - Version + build number (read from `expo-constants`)

Each section uses the new `SettingsSection` reusable component (see § Component Patterns).

**Rationale:** Current Settings is flat. As features land (theme switcher, real export, real security), section structure now avoids future cleanup.

**Interaction notes:**

- Section headers use the cream `Text2` color, uppercase, letter-spaced — Cairo Nights idiom.
- Destructive rows (Reset all data) use the negative coral accent (`#E05A42`) for the icon and label.
- Tapping a row navigates or opens a sheet, as appropriate.

**Edge cases:**

- Placeholder rows (Theme, Text size, Export) display "Coming soon" trailing label and are non-tappable. Or omitted entirely until functional — to be decided during Cycle 2 implementation.

**Risk:** Low. Pure organizational change.

---

### 7. Currency picker → bottom sheet (in Settings)

**Current:** Full-screen route at `screens/settings/currency/index.tsx`.

**Target:** Tapping Currency in Settings opens a bottom sheet with the existing search + currency list. Tapping a currency selects it and dismisses the sheet.

**Rationale:** Lightweight pick action. Full screen is overkill. Matches the existing sheet pattern used by the transaction form's Category and Account pickers.

**Interaction notes:**

- Active currency shown at top in an "Active" subsection.
- All other currencies in an "All" subsection (alphabetical).
- Search input at top filters both subsections live.
- Selecting a currency: shows brief confirmation (toast or inline check), persists via existing `app_settings` table, dismisses sheet.

**Edge cases:**

- Onboarding O1 currency picker stays as part of the Welcome+Currency screen (not a sheet). Sheet pattern only applies post-onboarding.

**Risk:** Low. Matches established sheet pattern.

---

### 8. Empty states standardized

**Current** (`components/empty_states/`): Variants exist but copy and layout are inconsistent across screens.

**Target:** Single `EmptyState` component used by every empty-state instance:

- Illustration / icon (sized via existing `Size.illustration` token)
- Headline (single sentence, `Type.title`)
- Description (1-2 lines, `Type.body`, `Text2` color)
- Single primary CTA (gold gradient, full-width)

**Variants** (driven by `variant` prop, mapping retained from current implementation):

- `accounts` — "No accounts yet" (Dashboard)
- `transactions` — "No transactions yet" (Transactions tab)
- `commitments` — "No commitments yet" (Commitments tab)
- (Future variants added as needed.)

**Rationale:** Currently inconsistent. A unified component means new screens get good empty states for free, and the look stays coherent.

**Interaction notes:**

- CTA action varies per variant (e.g., `accounts` → opens Add Account sheet; `transactions` → opens Add Transaction sheet).
- Empty state respects safe areas; centered vertically in the available list space.

**Edge cases:**

- Filtered empty state (e.g., "No transactions match your filter") gets a separate copy variant; same component.

**Risk:** Low. Pure consolidation.

---

## Component Patterns Introduced

These 4 patterns are *implied* by the 8 changes. Cycle 3 (Component Library) will build them. Cycle 2 (gluestack migration) will use them.

### Sheet pattern

A bottom-sheet container with consistent behavior across:

- Add Transaction (new, #1)
- Add Account (new, from Dashboard, #3)
- Currency picker (new, in Settings, #7)
- Existing Category Picker (in transaction form)
- Existing Account Picker (in transaction form)
- Existing Net Worth Breakdown (on Dashboard)

**Required behaviors:** swipe-down dismiss, scrim tap dismiss, focus trap, keyboard dismissible, sheet-on-sheet stacking, snap points (e.g., 50%/80%/100% height where applicable).

**Cycle 2 implementation note:** replace patched `react-native-actions-sheet` with gluestack's `Actionsheet`. Validate sheet-on-sheet on Android in a Cycle 2 spike before broad migration.

### FAB pattern

Floating Action Button with two interactions:

- Tap → primary action (default behavior per tab).
- Long-press → menu of related actions.

Used on Dashboard, Transactions, Commitments tabs (#5).

### SettingsSection pattern

Grouped list with:

- Section header (uppercase, letter-spaced, mute color).
- Card container (single radius, hairline divider between rows).
- Optional destructive last row (negative-coral icon + label).

Used in restructured Settings (#6).

### EmptyState pattern

Vertically centered:

- Illustration / icon.
- Headline.
- Description.
- Single primary CTA.

Variant-driven, used everywhere data is empty (#8).

---

## Sequencing for Cycle 2 Implementation

This spec recommends — but does not require — the following order when Cycle 2 implements the IA changes:

1. **Onboarding restructure (#4)** — smallest blast radius, isolated from main app navigation.
2. **Settings restructure + Currency picker as sheet (#6, #7)** — low risk, contained.
3. **Empty states standardized (#8)** — cross-cutting; should land before sheet/FAB work so triggers exist.
4. **Sheet pattern + FAB pattern (#5)** — foundational components landed; FAB now has a sheet to open.
5. **Add Transaction sheet (#1)** — highest-impact, riskiest. Requires sheet pattern, FAB, EmptyState all in place.
6. **Add Account dual entry (#3)** — depends on sheet pattern.

Add Commitment (#2) requires no work — stays unchanged.

Cycle 2 may adjust this order based on its own analysis. The constraint is **dependency order**: Sheet pattern before sheet-using screens; FAB pattern before sheet triggers.

---

## Cross-Spec Dependencies

| This spec depends on | Provides input to |
|---|---|
| Nothing (foundational IA spec) | Cycle 2 (library + brand migration) — consumes target screens, sheet vs full-screen rules, FAB trigger map |
|  | Cycle 3 (component library) — consumes the 4 reusable patterns to extract |

Cycle 2 and Cycle 3 specs MUST reference this spec by date and link.

---

## Success Criteria

1. **Tap-count:** Adding a transaction takes ≤1 tap from any tab. (Verifiable via UX walkthrough.)
2. **Onboarding length:** Completes in ≤4 user actions, excluding form fills. (Verifiable by counting screens in the new flow.)
3. **Settings shape:** 4 visible sections present. New settings can land in any section without restructure. (Verifiable by inspecting the restructured screen.)
4. **Empty-state consistency:** All 3+ empty-state instances (accounts, transactions, commitments) use the same `EmptyState` component. (Verifiable via grep + manual screen review.)
5. **No regressions in:** financial accuracy, data persistence, business rules per CLAUDE.md (1-9), database schema, financial formulas. (Verifiable via existing test suite passing unchanged.)
6. **Patterns documented:** Sheet, FAB, SettingsSection, EmptyState patterns are explicitly defined and referenced in Cycle 2 and Cycle 3 specs. (Verifiable on those specs landing.)

---

## Risks & Open Questions

### Risks

- **Sheet-on-sheet UX (#1):** Add Transaction sheet → Category Picker sheet → Save. Gesture handling on Android can be flaky with stacked sheets. **Mitigation:** Cycle 2 spike validates this with gluestack's `Actionsheet` before committing to the sheet variant. Fallback: keep nested pickers as full-screen routes.
- **Dual entry maintenance (#3):** Two layouts for Add Account = two render paths. **Mitigation:** Extract shared form fields into `AccountFormFields` component used by both layouts.
- **FAB visibility timing (#5):** FAB must hide during sheet/modal flows. Implementation must hook into route/sheet state. **Mitigation:** Cycle 2 design must specify exactly which screens hide the FAB.

### Open questions (non-blocking)

- **FAB long-press menu component:** Build custom or use gluestack's `Menu`? — defer to Cycle 3.
- **Settings placeholder rows:** Show "Coming soon" or omit entirely until functional? — decide during Cycle 2.
- **Onboarding O3 Security:** Keep UI-only as today, or build real PIN/biometric backing as part of this rebrand? — surface to product; not blocking IA work.
- **Sheet snap points:** Single height (~80%) or multi-snap (50%/80%/100%)? — decide during Cycle 2 spike.

---

## Out of Scope (and why)

| Item | Why excluded |
|---|---|
| New screens (Insights, Budgets, Search) | Outside the agreed cleanup scope. Belongs in a separate "MoneyApp v2 features" spec. |
| Tab-bar restructure | Current 3-tab layout works; restructuring it adds risk without clear benefit. |
| Component implementation details | This is the IA spec. Component implementation is Cycle 3. |
| Color, typography, theming decisions | Those are Cycle 2's domain (gluestack + Cairo Nights Extended). |
| Data model or business-rule changes | Out of scope per the "no new features" constraint. |
| Real PIN/biometric security | Onboarding O3 stays UI-only per existing CLAUDE.md business rule 6. |
| Animation choreography (entrance, transitions) | Specified at component level in Cycle 3. |

---

## Appendix · Reference Map

- Existing screens referenced: `screens/onboarding/`, `screens/dashboard/`, `screens/transactions/`, `screens/commitments/`, `screens/accounts/`, `screens/settings/`.
- Existing components referenced: `components/empty_states/`, `react-native-actions-sheet` (patched).
- Existing forms referenced: `screens/transactions/transaction_form/index.tsx`, `screens/commitments/add_commitment/index.tsx`, `screens/accounts/add_account/index.tsx`.
- Existing entities referenced: `database/entities/transaction.entity.ts`, `database/entities/commitment.entity.ts`, `database/entities/account.entity.ts`.
- CLAUDE.md business rules referenced: 1, 2, 3, 4, 5, 6, 7, 8, 9.
