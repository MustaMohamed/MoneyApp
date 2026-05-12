# §4 Settings — Product & UX Brainstorm
**Author:** Marcus Chen, Senior Product Designer & Strategist
**Date:** 2026-05-12
**Section:** 4 of 9 (Settings) within the HeroUI Native migration initiative
**Status:** Brainstorm (Phase 1) — input for Tariq's Phase 2 design doc synthesis
**Parallel track:** Layla is producing the financial-domain brainstorm simultaneously; open questions for her are flagged explicitly.

---

## What §4 Scope Actually Is

The migration plan at `docs/superpowers/plans/2026-05-11-heroui-native-migration.md` covers the §1 foundation PR specifically. The §4 scope is defined in the broader 9-section initiative as:

> Settings list · Currency sheet · Categories · Security · About

This brainstorm covers all five areas. The primary work is:
1. Migrate the Settings root screen and all sub-screens to HeroUI Native primitives + Cairo Nights tokens.
2. Migrate the two legacy `react-native-actions-sheet` consumers in Settings (`add_edit_category_sheet.tsx`, `reassign_category_sheet.tsx`) to the §3 `Sheet` primitive.
3. Add two net-new screens that don't exist yet in any form: **Security** and **About**.
4. Redesign the root Settings list to use the `SettingsSection` primitive (§3) with proper grouping and iconography.

---

## 1. Settings Root Screen (the list)

### Current state

The existing `screens/settings/index.tsx` is a bare minimum: one group card, two rows (Currency, Categories), hand-rolled StyleSheet. No section headers, no grouping system, no iconography beyond inline icon boxes, no About row, no Security row. The `SettingsSection` primitive built in §3 exists precisely to replace this pattern.

### Proposed section grouping

I am proposing four groups. The rationale follows each.

**Group 1 — Preferences**
- "Currency" · icon: `cash` or `currency-usd` · trailing: `chevron` + value text (e.g., "EGP / USD") · navigates to Currency screen

This group is "how the app behaves for you." Currency is the only preference-level setting we have in M1. It is not app-critical config — the user can change it after onboarding — so it sits in Preferences, not at the top.

**Group 2 — Data**
- "Categories" · icon: `tag-multiple` · trailing: `chevron` · navigates to Categories screen

Data management: things the user has created that the app stores. Categories is the only data-management screen in §4. Commitments and account management belong to §5/§6. I'm calling this group "Data" rather than "Manage" because "Manage" implies admin overhead; "Data" is honest about what you're editing.

**Group 3 — Security**
- "App Lock" · icon: `lock-outline` · trailing: `toggle` (toggleValue from store) · toggles lock-on-resume behavior
- "PIN" · icon: `numeric` · trailing: `chevron` · navigates to PIN setup screen (mocked in v1, see §4 Security below)

Group 3 is intentionally separated from Preferences because users have different mental models for security settings vs. display preferences. N26 and Revolut both make this separation.

**Group 4 — About**
- "About MoneyApp" · icon: `information-outline` · trailing: `chevron` · navigates to About screen

One row. The About group exists so the header label "ABOUT" is visible — this is the iOS Settings convention and tells users "everything below here is informational, not configurable."

### What this looks like in `SettingsSection` terms

Four `SettingsSection` instances, stacked vertically inside a `ScreenScroll`. Each has a `title` prop. No title is omitted — every section in the root settings list has a header.

The existing two-row hand-rolled card is completely replaced. `SafeAreaView` is replaced with `Screen`. `StyleSheet.create` is deleted from this file entirely.

### Currency row value display

The trailing `value` on the Currency row should show the active currency pair (e.g., "EGP" if single-currency, "EGP / USD" if dual-currency with a set rate). This is a display decision, not a formula — [layla] should confirm what the "active currency pair" means in data terms (see Open Questions for Layla #1).

---

## 2. Currency Screen

### Current state

`screens/settings/currency/index.tsx` is already a full-screen stack route (not a sheet). It shows:
- A rate card with the current EGP/USD rate, a "Manual" badge, and last-fetched timestamp
- A "Refresh rate" button
- A collapsible "Manual override" panel with a TextInput and a save CTA

This is honestly a reasonable UX for a rate-management screen. The Cairo Nights migration work here is:
1. Replace `SafeAreaView` with `Screen`
2. Replace `ScrollView` with `ScreenScroll`
3. Replace raw StyleSheet styling with HeroUI Native `Box`/`Text` + className tokens
4. Replace the raw `TextInput` with the `Input` primitive from `components/ui/input.tsx`
5. Replace `LinearGradient` + `Pressable` CTA with the `Button` primitive (`variant="primary"`)

### Should Currency stay a full-screen stack route or become a sheet?

**My position: keep it a full-screen stack route.** The existing navigation is `router.push('/settings/currency')` from a chevron-trailed settings row. That is the correct navigation pattern for a settings sub-screen — it is not a transient overlay. The content (rate card + refresh + manual override) has enough vertical substance to justify a full screen. Using a `Sheet` here would be misaligned with what the content is: a dedicated settings panel, not a quick picker.

If we ever add more currency configuration (display format, decimal separator, thousands separator) this screen will grow — another reason to keep it as a screen with room to breathe.

### Manual override panel

The current collapsible panel (Animated.View expand/collapse on toggle press) works. The animation uses `panelEntering` / `panelExiting` from `currency.anim.ts`. Those files survive unchanged — logic files are untouched in the migration. The UI file replaces the container styles.

**One UX improvement I want to call out:** The current toggle row (the row you press to expand the manual panel) looks like a regular settings row but isn't `SettingsSection` compatible — it has custom subtext. I want to keep it as a standalone custom row (not inside a `SettingsSection` instance) because it drives an inline animated expansion, not navigation. `SettingsSection` does not support inline expansion. This is fine — not every element on a settings screen needs to be a `SettingsSection` row.

### States required

- **Loading:** When `isFetching = true`, the refresh button shows a spinner icon (`loading`) and is disabled. The rate card shows last-known values.
- **Error (fetch failed):** A small inline error message below the refresh button: "Could not update rate. Try again." — copy to `constants/strings.ts`. The rate card continues showing the last saved value.
- **Manual override active:** The "Manual" badge on the rate card is visible. The rate color uses `text-accent` (gold) to signal it is user-controlled, not live.
- **Populated (normal):** Rate card shows value + timestamp.

---

## 3. Categories Screen

### Current state (read carefully before designing)

`screens/settings/categories/index.tsx` currently has:
- A header row with back button
- An Expense / Income tab switcher (pill-style segmented control)
- A `FlashList` rendering a mixed list of section headers and `CategoryRow` components
- The list groups into "Defaults" and "Custom" sections
- A bottom FAB (gold CTA button) to add a new category, or a limit message if at the 30-custom-category cap
- Three sheets/dialogs: `AddEditCategorySheet`, `DeleteConfirmationDialog`, `ReassignCategorySheet`

The structure is correct. The §4 work is:
1. Migrate the screen shell (SafeAreaView → Screen, etc.)
2. Migrate the tab switcher to HeroUI Native styling
3. Keep the `FlashList` — it is not being replaced (high-performance list, still the right call for a potentially long category list)
4. Migrate the bottom CTA to the `Button` primitive
5. Migrate `AddEditCategorySheet` from `react-native-actions-sheet` to the §3 `Sheet` — **this is the main §4 legacy migration task**
6. Migrate `ReassignCategorySheet` from `react-native-actions-sheet` to the §3 `Sheet` — **second §4 legacy migration task**
7. Keep `DeleteConfirmationDialog` as a RN `Modal` — it is already a dialog (not a sheet), and a modal confirm dialog is the correct pattern for a destructive action. Do not convert it to a Sheet.

### Tab switcher design

The current tab switcher is hand-rolled with Pressable + StyleSheet. I want to keep the same two-tab structure (Expense / Income) but style it using HeroUI Native. The active tab uses gold (`bg-accent`) with midnight-blue text (`text-accent-foreground`). The inactive tab uses `bg-surface-secondary` with muted text. This is the Copilot pattern for category filtering — clean, legible, no ambiguity about which tab is active.

The tab switcher is not a `SegmentedControl` from HeroUI Native (if that exists) — I'd rather compose it from `Pressable` + `Box` with `tv()` variants to lock the styling behavior. Tariq should call out whether HeroUI Native has a native segmented control worth using here.

### CategoryRow — keep the existing pattern

The `CategoryRow` component is correct as-is. Icon box with color tint (runtime hex, passed via `style={{ backgroundColor: item.color + '22' }}`), name text, edit/delete action buttons for custom categories, lock icon for defaults. The only change is styling primitive replacement (StyleSheet → className/HeroUI). The prop API is unchanged.

### Empty state

When both `defaultCategories` and `customCategories` are empty for the active tab — this should not normally happen because we ship defaults, but defensive programming demands we handle it. Use the `EmptyState` primitive (§3) with a new `categories` variant. Wait — the §3 `EmptyState` only has `accounts`, `transactions`, `commitments`, `filtered` variants. This is a **gap** (flagged in §8 Primitive Gaps below).

For the "at limit" state (30 custom categories), the existing limit message at the bottom is correct. Replace the raw Text with the `Text` primitive, but keep the placement (below-list footer, not a full EmptyState overlay — the list still has content, the user is just at capacity).

### Add/Edit Category Sheet — migration design

**Before (react-native-actions-sheet):**
- `ActionSheet` component with `ref` + imperative `.show()` / `.hide()`
- `useEffect` watches `visible` prop and calls `sheetRef.current?.show()` or `.hide()`
- `containerStyle` sets background color and border radius
- `indicatorStyle` styles the drag handle
- `ScrollView` imported from `react-native-actions-sheet` (not from react-native)
- `FlatList` from react-native for the icon grid (nested inside the ActionSheet ScrollView, `scrollEnabled={false}`)
- No explicit `size` — the sheet auto-sizes to content

**After (§3 Sheet):**
- `Sheet` component, declarative: `visible={state.showAddSheet}` + `onClose={closeSheet}`
- No ref, no useEffect to drive show/hide — the `Sheet` primitive handles this internally
- `title` prop: `{isEditing ? Strings.categoriesEditSheetTitle : Strings.categoriesAddSheetTitle}`
- `size="lg"` — the content (name field + type pills + 32-icon grid + color swatches + CTA) is tall; 85% viewport is correct
- `Sheet.Body` wrapping a `BottomSheetScrollView` (imported from `@gorhom/bottom-sheet`, NOT from react-native)
- `FlatList` for the icon grid stays but must be scrollEnabled={false} since it lives inside `BottomSheetScrollView`
- Footer via `footer` prop: the gold CTA `Button` pinned above safe area
- The `useEffect` that called `sheetRef.current?.show()` / `.hide()` is deleted entirely
- The `useRef<ActionSheetRef>` is deleted entirely

**UX-visible differences between before and after:**

| Dimension | Before (actions-sheet) | After (§3 Sheet) |
|---|---|---|
| Snap height | Auto-sized to content (variable) | Fixed at 85% viewport (`size="lg"`) |
| Drag handle | Custom `indicatorStyle` (white, 40×4dp) | Sheet primitive handle (40×4dp, `bg-separator`, matches spec) |
| Backdrop | Provided by actions-sheet (semi-transparent) | `BottomSheetBackdrop`, opacity 0.5, same visual effect |
| Keyboard behavior | actions-sheet had `useBottomSafeAreaPadding={false}` | @gorhom sheet handles keyboard avoidance via `keyboardBehavior` prop — Tariq should specify the correct value for this form sheet |
| Dismiss gesture | Swipe down on sheet | Swipe down on sheet (identical from user perspective) |
| Background color | Set via `containerStyle.backgroundColor` | Set via `bg-surface` className on Sheet's container (handled by primitive) |
| Title rendering | Hand-rolled `Text` inside content | Rendered by Sheet `title` prop (Sora SemiBold 17dp, left, close button right) |
| CTA placement | Inside `content` View, styled manually | `footer` prop on Sheet, pinned above safe area automatically |

The only UX change visible to users is that the sheet now opens at a fixed 85% snap point rather than fitting content. For the add/edit sheet this is fine — the content (especially when the icon grid is present) fills close to 85% anyway. We are not losing screen real estate in a meaningful way.

The `useAddEditCategorySheetState.ts` Zustand state file is unchanged. The `useAddEditCategorySheetState.state.ts` Zustand store is unchanged. Only `add_edit_category_sheet.tsx` changes.

### Reassign Category Sheet — migration design

**Before (react-native-actions-sheet):**
- `ActionSheet` with `ref` + `useEffect` watching `visible`
- `FlatList` for the reassignment options list (not scrollEnabled=false — this is a real scrollable list)
- Content is compact: title, body text, option list (max ~10 items), CTA. Auto-sized to content.

**After (§3 Sheet):**
- `Sheet`, declarative: `visible={state.showReassignSheet}` + `onClose={closeDeleteFlow}`
- `title={Strings.categoriesReassignTitle(categoryName)}` — though this is a dynamic title (includes category name). The Sheet `title` prop accepts a string so this works fine.
- `size="sm"` — the content is compact. 50% viewport fits ~5–8 options comfortably. If the user has more than ~6 reassignment candidates the list should scroll, and `BottomSheetFlatList` handles that.
- The existing `FlatList` is replaced with `BottomSheetFlatList` (from `@gorhom/bottom-sheet`) since the list must scroll within the sheet
- Footer via `footer` prop: the "Reassign & Delete" gold CTA
- The `useRef<ActionSheetRef>` and the `useEffect` are deleted

**UX-visible differences:**

| Dimension | Before | After |
|---|---|---|
| Snap height | Auto-sized (~40% typically) | Fixed at 50% (`size="sm"`) |
| Option list scroll | FlatList inside auto-height sheet | BottomSheetFlatList, scrollable within the 50% snap point |
| Dismiss | Swipe down | Swipe down (identical) |
| Title | Hand-rolled `Text` inside content | Sheet `title` prop |
| CTA | Inside content | `footer` prop, pinned |

**One risk to flag for Tariq:** The reassign title is `Strings.categoriesReassignTitle(categoryName)` — a function that returns a string. The Sheet `title` prop accepts a `string`, so this is fine as long as the string is evaluated before being passed: `title={Strings.categoriesReassignTitle(categoryName)}`. Not a dynamic React node — just a formatted string.

**Another risk:** `size="sm"` at 50% may not be enough height if the user has many custom categories to reassign to (e.g., 20+ options). Should we use `size="lg"` defensively? I think yes — bump it to `size="lg"`. Reassigning means you have a lot of categories; cramming 20 options into 50% viewport with a CTA pinned is uncomfortable. Cop out to `size="lg"` (85%) and let the user see their options. This is a corrective UX improvement over the original.

---

## 4. Security Screen

### Business rule context

Business rule #6: "O3 security is UI only — no real PIN/biometric yet." This rule applies to the onboarding step. For the Settings Security screen in §4, the same principle extends: we ship the security UI shell with no backing implementation. The toggle for "App Lock" persists to `expo-secure-store` (a boolean), and if true, a lock screen is shown on resume — but there is no PIN validation. The PIN setup screen is a visual form that accepts and confirms a PIN but does not actually enforce it. We are building the promise, not the enforcement.

### Navigation

Security is a **sub-screen of Settings**, accessed from the Security group's "PIN" row on the Settings root. It is a full-screen stack route at `app/(app)/settings/security/index.tsx`. Not a sheet — this is a dedicated configuration screen.

### Screen anatomy

The Security screen has two sections:

**Section 1 — App Lock**
- Single `SettingsSection` with title "APP LOCK"
- Row 1: "Lock on Resume" · icon: `lock-outline` · trailing: `toggle` (toggleValue from store) · `onPress` toggles the value and writes to secure store
- Row 2 (conditional, shown only when "Lock on Resume" is enabled): "Change PIN" · icon: `numeric` · trailing: `chevron` · navigates to PIN Setup screen

The conditional row is the iOS Settings-style progressive reveal pattern — show "Change PIN" only once locking is enabled, so the user understands the logical dependency. This avoids the confusing situation (in Revolut's old iOS app) where you could see "Change PIN" even when biometric was disabled, and users didn't understand the relationship.

**Section 2 — About Security**
- No `SettingsSection` — this is a plain info card (Box + Text)
- Copy: "MoneyApp stores all your data locally on this device. Nothing is sent to the cloud. Your PIN protects access to the app but is not used to encrypt your data." — [layla] to validate the financial accuracy of this statement given the local-only architecture. (See Open Questions for Layla #2.)
- This copy is important for trust. Local-only finance apps live and die by user trust; being explicit about what the PIN does and doesn't do is the right call. Copilot and YNAB both include this kind of transparency notice in their security screens.

### PIN Setup sub-screen

- Route: `app/(app)/settings/security/pin/index.tsx` (or handled as a stack push from within the Security screen — Tariq to decide routing)
- Screen has two `Input` fields: "New PIN" and "Confirm PIN", both `secureTextEntry`, `keyboardType="number-pad"`, max 6 digits
- Gold CTA: "Set PIN"
- On submit: validate that both fields match. If match, write PIN to `expo-secure-store`. If no match: inline error under the second field: "PINs don't match."
- This is the UI promise only. No actual enforcement of the PIN on app lock. The secure store key should be added to `constants/secure_store_keys.ts` (e.g., `PIN_CODE`).
- Empty state: first visit, both fields blank. No existing PIN indicator.
- Populated state: if a PIN is already set, show a different headline: "Change Your PIN". Add a third field: "Current PIN" (for UX completeness, though v1 does not validate it).

### States

Security root screen:
- Loading: unlikely (reads from secure store synchronously on mount via `expo-secure-store` sync read), but if async: show skeleton rows
- Populated: toggle reflects store value, conditional "Change PIN" row shown/hidden
- Error: if toggling fails (unlikely with local SecureStore), show a toast or inline error

PIN setup screen:
- Empty: two blank fields, disabled CTA
- Partially filled: CTA enabled once both fields have ≥4 digits
- Validation error: "PINs don't match" inline
- Success: navigate back to Security screen, show a success toast or row updates to show "PIN set"

---

## 5. About Screen

### What goes here

About is a full-screen stack route. It is the last group in the Settings root list. The content is:

**App info section (no `SettingsSection` header — pure display card):**
- App logo/icon (the MoneyApp mark, if it exists in assets — check `assets/`)
- App name: "MoneyApp" in Sora Bold
- Version: `{Constants.expoConfig?.version}` from `expo-constants`
- Build: `{Constants.expoConfig?.extra?.buildNumber}` or the EAS build number — Tariq to confirm what is available at runtime

**Links section (`SettingsSection` with title "LINKS" or no title):**
- "Privacy Policy" · icon: `shield-outline` · trailing: `chevron` · opens URL in browser (Linking.openURL)
- "Terms of Service" · icon: `file-document-outline` · trailing: `chevron` · opens URL in browser
- "Open Source Licenses" · icon: `open-source-initiative` · trailing: `chevron` · placeholder screen (TBD in M2b+)

For v1 of §4, the Privacy Policy and Terms of Service URLs can be placeholder (`#`) or omitted if they don't exist yet. The rows should still be built. They can be conditionally disabled or simply navigate nowhere until real URLs exist — I'd leave them enabled and pointing to a simple `Linking.openURL('https://placeholder.moneyapp.io/privacy')` that can be replaced when the URLs are live. **This is an open question for the human** (see §10 Open Questions for Human #2).

**Support section:**
- "Contact Support" · icon: `email-outline` · trailing: `chevron` · opens `mailto:support@moneyapp.io` (or a placeholder — same consideration as URLs above)
- "Rate the App" · icon: `star-outline` · trailing: `chevron` · placeholder for app store rating link (iOS/Android conditional)

**Data section:**
- No `SettingsSection` here — instead, a plain info card
- Copy: "MoneyApp is local-only. All your financial data stays on your device." — reinforces the privacy proposition. Consistent with the Security screen's data notice.

**Attribution (bottom of screen, small print):**
- "Made with care by [team/company name]" — I don't know the company name; this is an open question for the human (§10 Open Questions for Human #3).
- "Built on open source. See licenses for details."

### Navigation

About is a full-screen stack route at `app/(app)/settings/about/index.tsx`. Accessed via chevron from the Settings root "About MoneyApp" row.

---

## 6. Legacy Sheet Migration — Explicit Before/After

Covered in detail in §3 (Categories) above. Summary:

### `add_edit_category_sheet.tsx`

| Item | Before | After |
|---|---|---|
| Import | `from 'react-native-actions-sheet'` | `from '@/components/ui/sheet'` + `from '@gorhom/bottom-sheet'` |
| Component | `<ActionSheet ref={sheetRef} ...>` | `<Sheet visible={...} onClose={...} title={...} size="lg" footer={<Button>}>` |
| Scroll | `<ScrollView>` from actions-sheet | `<BottomSheetScrollView>` from `@gorhom/bottom-sheet` |
| Icon list | `<FlatList scrollEnabled={false}>` from react-native | `<FlatList scrollEnabled={false}>` from react-native (unchanged — non-scrollable grid, does not need BottomSheetFlatList) |
| Imperative control | `useRef<ActionSheetRef>` + `useEffect` calling `.show()`/`.hide()` | Removed entirely. `visible` prop drives Sheet declaratively. |
| CTA | Inside content View, manually styled | Moved to `footer` prop on Sheet |
| Height | Auto-sized to content | Fixed at 85% (`size="lg"`) |

### `reassign_category_sheet.tsx`

| Item | Before | After |
|---|---|---|
| Import | `from 'react-native-actions-sheet'` | `from '@/components/ui/sheet'` + `from '@gorhom/bottom-sheet'` |
| Component | `<ActionSheet ref={sheetRef} ...>` | `<Sheet visible={...} onClose={...} title={...} size="lg" footer={<Button>}>` |
| Option list | `<FlatList>` from react-native | `<BottomSheetFlatList>` from `@gorhom/bottom-sheet` (scrollable list, must use this) |
| Imperative control | `useRef<ActionSheetRef>` + `useEffect` + `.reset()` call | Removed. `visible` prop drives Sheet. `onClose` triggers `closeDeleteFlow`. |
| CTA | Inside content View | `footer` prop on Sheet |
| Height | Auto-sized (~40%) | Fixed at 85% (`size="lg"`) — rationale: many options need room |

After these two migrations, `screens/settings/` will have zero imports from `react-native-actions-sheet`. That means `react-native-actions-sheet` is still present in the project (it has consumers in other screen domains), but the Settings domain is fully clean.

---

## 7. Navigation Architecture — Per Screen Decision

| Screen | Route | Container | Justification |
|---|---|---|---|
| Settings root | `app/(app)/settings/index.tsx` | Full-screen stack route | Configuration hub, not transient. iOS Settings convention. Already exists as a stack push from a non-tab source. |
| Currency | `app/(app)/settings/currency/index.tsx` | Full-screen stack route | Configuration panel with enough content substance for a dedicated screen. Has a form (manual rate input). |
| Categories | `app/(app)/settings/categories/index.tsx` | Full-screen stack route | Data management screen with tabs, long list, and multiple sheet interactions. Must be a screen, not a sheet. |
| Add/Edit Category | Sub-component sheet within Categories | `Sheet` (`size="lg"`) | Transient form over the Categories screen. User doesn't navigate away — they overlay. Correct sheet pattern. |
| Delete Confirmation | Sub-component modal within Categories | RN `Modal` (keep) | Destructive confirmation needs maximum interruptive weight. A centered modal over a dark scrim is the right UI for "are you sure?" Android back button dismissal handled by `onRequestClose`. Do not convert to Sheet. |
| Reassign Category | Sub-component sheet within Categories | `Sheet` (`size="lg"`) | Transient selection overlay. User selects a replacement category and confirms. Sheet pattern, not navigation. |
| Security | `app/(app)/settings/security/index.tsx` | Full-screen stack route | Security config deserves a dedicated screen. Not transient. |
| PIN Setup | `app/(app)/settings/security/pin/index.tsx` | Full-screen stack route | Form entry for a security credential. Full screen signals importance. Not a sheet — you don't want accidental swipe-down dismissal when setting a PIN. |
| About | `app/(app)/settings/about/index.tsx` | Full-screen stack route | Informational screen. Not transient. |

**Why no screens become sheets:** Settings sub-screens are configuration destinations, not transient overlays. A user enters Settings with intent to change something specific. Stack navigation (with a back button) is the correct mental model: I went somewhere, I configured it, I come back. Sheets are for "I'm adding something on top of what I was looking at." These are different use cases.

---

## 8. Primitive Usage Per Screen — and Gap Analysis

### Settings root (`screens/settings/index.tsx`)
- `Screen` — root layout
- `ScreenScroll` — scrollable content
- `SettingsSection` (x4) — one per group (Preferences, Data, Security, About)
- `Text` primitive — no standalone text outside SettingsSection
- No `Sheet`, no `EmptyState`, no `FAB`

### Currency (`screens/settings/currency/index.tsx`)
- `Screen` — root layout
- `ScreenScroll` — scrollable content
- `Box` — rate card container, panel container
- `Text` — rate label, rate value, timestamp
- `Input` — manual rate text field (replaces raw TextInput)
- `Button` (variant="primary") — "Refresh Rate" (secondary style?), "Save" (primary, gold gradient)
- `Pressable` — manual toggle row (custom row not in SettingsSection)
- No `Sheet`, no `EmptyState`, no `FAB`, no `SettingsSection`

Note: the "Refresh Rate" button should probably be `variant="secondary"` (outlined/ghost) and "Save Rate" should be `variant="primary"` (gold gradient CTA). This creates a visual hierarchy that didn't exist before — now the user knows which action is primary.

### Categories (`screens/settings/categories/index.tsx`)
- `Screen` — root layout
- `Box` — tab switcher container, bottom CTA area
- `Text` — section headers in FlashList, limit message
- `Button` (variant="primary") — "Add Category" CTA at bottom (replaces the hand-rolled Pressable)
- `Sheet` (size="lg") — AddEditCategorySheet, ReassignCategorySheet
- `Input` — name field inside AddEditCategorySheet
- `EmptyState` — needed if category list is empty (gap — see below)
- No `SettingsSection` (categories screen uses FlashList, not settings rows)
- No `FAB` (the global FAB is hidden in /settings routes)

**Gap 1: EmptyState needs a `categories` variant.**
The §3 `EmptyState` has `accounts`, `transactions`, `commitments`, `filtered`. There is no `categories` variant. This screen needs one for the state where a category type has zero items (shouldn't happen normally with defaults, but is defensively required). 

Options:
- A) Add a `categories` variant to `EmptyState` in §4. This modifies a §3 component but is purely additive (new variant, no breaking change). My recommendation.
- B) Render a local inline empty state (custom Box + Text) without using `EmptyState`. Avoids touching a §3 component but creates inconsistency.

I recommend Option A. The `EmptyState` component was designed to be extended. Tariq should add the new variant in the §4 PR.

Proposed `categories` variant:
- Icon: `tag-outline`
- Headline: "No categories yet"
- Description: "Your categories will appear here."
- Action: none (categories always have defaults; this is a defensive fallback state, not an activation moment)

### Security (`screens/settings/security/index.tsx`)
- `Screen`
- `ScreenScroll`
- `SettingsSection` — "APP LOCK" group
- `Box` — info card
- `Text` — info card copy
- No `Sheet`, no `EmptyState`, no `FAB`

### PIN Setup (`screens/settings/security/pin/index.tsx`)
- `Screen`
- `Box` — form container
- `Text` — headline, field labels
- `Input` (x2 or x3) — PIN fields, secureTextEntry
- `Button` (variant="primary") — "Set PIN" CTA
- No `Sheet`, no `EmptyState`, no `FAB`, no `SettingsSection`

### About (`screens/settings/about/index.tsx`)
- `Screen`
- `ScreenScroll`
- `Box` — app info card
- `Text` — app name, version, build, attribution copy
- `SettingsSection` — "LINKS" group, optionally "SUPPORT" group
- `Pressable` — each link row (or delegated to SettingsSection via `onPress`)
- No `Sheet`, no `EmptyState`, no `FAB`

### Summary of primitive gaps found in §4:

| Gap | Impact | Recommendation |
|---|---|---|
| `EmptyState` missing `categories` variant | Medium — defensive empty state for Categories list | Add in §4 as additive extension to §3 component |
| `SettingsSection` has no `value` text truncation spec | Low — long currency display (e.g., "Egyptian Pound (EGP)") may overflow | Tariq: add `numberOfLines={1}` + `ellipsizeMode="tail"` to the value Text in SettingsSection |
| No `InfoCard` primitive | Low — About screen and Security screen both have plain info cards (Box + Text). Two instances in §4, likely more in future sections. | Not blocking for §4 (compose inline), but flag as a candidate §5+ primitive to avoid drift |

---

## 9. Open Questions for Layla

These are firmly in Layla's domain. I will not speculate on the answers.

**Q-L1: Currency row trailing value**
The Settings root Currency row should show a trailing value text representing the active currency configuration. What should this display? Options I can see:
- The primary currency code ("EGP")
- The currency pair if a rate exists ("EGP / USD")
- The current rate ("EGP · 0.020 USD")
Is showing the rate here appropriate, or is that too granular for a settings list row? What does the currency store actually expose that is meaningful to show here?

**Q-L2: Security screen data notice**
The proposed copy for the Security screen includes: "MoneyApp stores all your data locally on this device. Nothing is sent to the cloud. Your PIN protects access to the app but is not used to encrypt your data."
Is this accurate given the current architecture? Specifically: does `expo-secure-store` encrypt data at rest on device? Does the SQLite database (`moneyapp.db`) have any at-rest encryption? If it doesn't, that last sentence ("not used to encrypt your data") is important for honesty — but Layla/tech team should validate this claim.

**Q-L3: Category reassignment when transactions exist**
The `handleDeletePress` in `categories.hook.ts` currently has `const hasTransactions = false` (hardcoded — "always false in M2a"). When transactions are implemented (§7), this logic will need to flip. Layla should define: what exactly is reassigned? Only the `category_id` on `transactions`? What about budget entries or commitments that reference the category? Is there a cascade rule I should design the reassignment sheet's UI messaging around?

**Q-L4: Category type change on edit**
The current `AddEditCategorySheet` disables the type picker when editing (it only shows the type picker when `!isEditing`). Is this intentional? What happens to existing transactions if a category's type is changed from expense to income? Is this a known business rule or just a conservative UI decision from M1? This affects whether I should permanently disable type-change-on-edit or add a warning modal before allowing it.

**Q-L5: Default category protection**
Default categories have a lock icon and no edit/delete actions in `CategoryRow`. Is the "default" status purely a UI protection (is_default = 1 → no edit UI) or is it also enforced at the database layer? This affects whether §4 needs a UI guard (show confirmation dialog if somehow edit is triggered on a default) or can rely entirely on the UI hiding the edit controls.

---

## 10. Open Questions for the Human

These are product-direction decisions I cannot make alone.

**Q-H1: Currency change post-onboarding — is it allowed?**
The current Settings > Currency screen lets users change the EGP/USD rate manually or refresh it from a live source. But can the user change the *primary currency* (EGP) post-onboarding? The onboarding flow sets the primary currency and business rule #5 pre-selects EGP. The Settings currency screen today only manages the exchange rate, not the primary currency selection. Is this a deliberate product decision ("you can't change your primary currency after setup") or just an M1 gap? This affects whether the Settings root Currency row description should say "Manage your exchange rate" (narrow) or "Manage your currency" (broad). It also affects the Currency screen design — if primary currency change is eventually supported, I need to design for it now rather than bolt it on later.

**Q-H2: Privacy Policy and Terms of Service URLs**
The About screen should link to a Privacy Policy and Terms of Service. Do these documents exist yet? If yes, what are the URLs? If no, should the rows be hidden until they do, shown as disabled, or shown with a placeholder? Showing a disabled row is the honest approach — it signals "coming soon" without lying that the document exists.

**Q-H3: App Store / company attribution**
The About screen needs an attribution line. What is the company or individual's name to show? What is the support email address? What is the team or brand name ("MoneyApp by ____ ")?

**Q-H4: Security screen — ship or defer?**
Business rule #6 says security is "UI only" in v1. Given that, should the Security group appear in the Settings list with a real-looking UI that doesn't actually enforce anything? Or should it be hidden until the real implementation is ready? The risk of shipping the UI: users may set a PIN and trust it's protecting their data, when it isn't. The risk of deferring: the Settings screen looks sparse without it. My recommendation is to ship it with a prominent disclaimer inside the Security screen itself ("PIN protection coming soon — your data is safe on your device but PIN enforcement is not yet active"), but the human should confirm whether this is acceptable for the target user base.

**Q-H5: PIN length**
If we are shipping the PIN UI (even as a mock), what length? 4 digits (most accessible, fastest to enter) or 6 digits (more secure-feeling, matching iOS default)? This affects the Input fields and validation.

---

## 11. Competitive Reference Notes

**YNAB Settings:** Four clean groups — Account, Preferences, Display, About. Each group uses a standard iOS settings list. No iconography on rows (YNAB is more utilitarian). The currency row shows the active currency name as trailing value text. The Security group is absent from YNAB mobile — they handle security at the account level.

**Copilot Settings:** More complex — 8+ groups. Notably: Copilot puts "Data" options (export, sync) in a dedicated group separate from Preferences. Their Categories screen uses a similar Expense/Income tab structure. The empty state for categories shows a "Create your first category" prompt with icon — this validates my recommendation for an `EmptyState` `categories` variant.

**Monarch Money Settings:** Strong "Privacy & Security" section with explicit statements about data handling. This validates the Security info card copy approach I proposed. Monarch says "all data is synced to our secure servers" (different from us) — we should say the opposite clearly: data stays local.

**Revolut Settings:** Uses a flat list without section groups on some OS versions, which creates confusion about where things belong. Cairo Nights MoneyApp should explicitly use section groups — the `SettingsSection` primitive is the right call. Do not flatten the list.

**N26 Settings (my previous employer):** Security settings are top-level in N26 because it's a banking app. For MoneyApp, which is local-only and has no financial services backing, Security can be third-group rather than first. Users aren't at risk of losing money through our app — they're at risk of losing privacy if someone picks up their phone. The placement in Group 3 is correct.

---

## 12. Screens Added (Net New in §4)

The following screens do not exist today and must be created in §4:

| Screen | Route | Screen folder |
|---|---|---|
| Security | `app/(app)/settings/security/index.tsx` | `screens/settings/security/` |
| PIN Setup | `app/(app)/settings/security/pin/index.tsx` | `screens/settings/security/pin/` |
| About | `app/(app)/settings/about/index.tsx` | `screens/settings/about/` |

Each follows the standard screen anatomy: `index.tsx` + `<name>.hook.ts` + `<name>.state.ts` (if UI state needed) + `components/` (if sub-components needed).

The Security screen will need a `security.state.ts` for the toggle state and a `security.hook.ts` for the SecureStore read/write logic. The About screen has no state — `about.hook.ts` can hold the version/build number reads from `expo-constants`, but a state file is not needed.

---

## 13. Copy Keys Required in `constants/strings.ts`

These must be added to strings.ts before the screens can be built. Tariq and Dev should add these during implementation.

**Settings root:**
- `settingsGroupPreferences` — "PREFERENCES"
- `settingsGroupData` — "DATA"
- `settingsGroupSecurity` — "SECURITY"
- `settingsGroupAbout` — "ABOUT"
- `settingsCurrencyValue` — function: `(pair: string) => string` for the trailing value

**Security screen:**
- `securityTitle` — "Security"
- `securityGroupAppLock` — "APP LOCK"
- `securityLockOnResume` — "Lock on Resume"
- `securityChangePIN` — "Change PIN"
- `securityInfoCard` — "MoneyApp stores all your data locally on this device. Nothing is sent to the cloud. Your PIN protects access to the app but is not used to encrypt your data."

**PIN Setup screen:**
- `pinSetupTitle` — "Set Your PIN" (or "Change Your PIN" dynamically)
- `pinCurrentLabel` — "Current PIN"
- `pinNewLabel` — "New PIN"
- `pinConfirmLabel` — "Confirm PIN"
- `pinSaveCta` — "Set PIN"
- `pinMismatchError` — "PINs don't match. Please try again."

**About screen:**
- `aboutTitle` — "About"
- `aboutGroupLinks` — "LINKS"
- `aboutGroupSupport` — "SUPPORT"
- `aboutPrivacyPolicy` — "Privacy Policy"
- `aboutTermsOfService` — "Terms of Service"
- `aboutLicenses` — "Open Source Licenses"
- `aboutContactSupport` — "Contact Support"
- `aboutRateApp` — "Rate MoneyApp"
- `aboutDataNotice` — "MoneyApp is local-only. All your financial data stays on your device."
- `aboutBuiltWith` — "Built on open source."

**EmptyState (new variant):**
- `emptyStateCategories` — headline: "No categories yet"
- `emptyStateCategoriesDesc` — "Your categories will appear here."

**Currency screen:**
- `currencyFetchError` — "Could not update rate. Try again." (currently missing from strings.ts; the existing screen has no error state)
