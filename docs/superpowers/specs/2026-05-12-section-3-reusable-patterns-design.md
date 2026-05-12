# Section 3 · Reusable Patterns — Design Spec

**Date:** 2026-05-12
**Status:** Draft (pending plan + approval)
**Owners:** [tariq] technical · [marcus] UX · [sarah] sequencing
**Section:** 3 of 9 (Reusable Patterns) within the *Full reset = rebrand + library + IA restructure* mega-initiative.
**Branch:** `feat/section-3-reusable-patterns` (from `claude/start-migration-section-3-PkU9s`)

**Cross-references:**
- §1 Foundation spec: `docs/superpowers/specs/2026-05-10-section-1-foundation-design.md`
- HeroUI Native migration spec: `docs/superpowers/specs/2026-05-11-heroui-native-migration-design.md`
- §2 Onboarding spec: `docs/superpowers/specs/2026-05-11-section-2-onboarding-design.md`

---

# Part A · Initiative Overview

*This part is shared context across all 9 section specs. The library section below reflects the updated foundation from the HeroUI Native migration.*

## The mega-initiative

MoneyApp's existing custom UI accumulated bugs and inconsistencies. Decision: full reset rather than surgical fixes. Three things change at once:

1. **UI library** — swap hand-rolled components for **HeroUI Native v1.0 + Unistyles 3 via Uniwind** (Tailwind classes processed at build time into Unistyles). Replaces the patched `react-native-actions-sheet` over the course of §3-9.
2. **Brand expression** — apply *Cairo Nights Extended* palette (additions to existing tokens, fully backwards-compatible).
3. **Information architecture** — 8 cleanup changes to existing screens. Zero new features, zero new screens, zero new tabs.

Delivery model: **vertical-slice, one section per conversation**. Each section ships a complete migrated screen-group end-to-end. No big-bang rewrite.

## Locked decisions (do not re-open)

### Library
**HeroUI Native v1.0 + Unistyles 3 via Uniwind.** Tailwind classes processed at build time. `cn` utility from `heroui-native`. Requires `expo-dev-client` and New Architecture. Native iOS/Android directories gitignored. Expo Go is not used.

### Brand · Cairo Nights Extended palette

All additions are **backwards-compatible** with existing tokens in `constants/theme.ts`.

**Core (unchanged):** `bg #0F1923` · `surface #1A2535` · `surfaceEl #243044` · `border #2A3A4F` · `text1 #F0EBE3` · `text2 #6B7F99` · `text3 #4A5568`.

**Brand · Gold (4 stops):** `gold-400 #E0B968` · `gold-500 #D4A44C` · `gold-600 #C9973A` (CTA gradient end) · `gold-700 #A47C2C` (pressed).

**Semantic:** `positive #4CAF82` · `negative #E05A42` · `warning #E8B130` · `info #4A7ABF`.

**Cultural accents (4):** `nile #2D7D6E` · `spice #C45C2A` · `lapis #185FA5` · `sand #C9A876`.

### Scope
Pure cleanup — no new features, no new screens, no new tabs.

---

# Part B · §3 Feature Summary

## What §3 delivers

Section 3 builds four shared UI primitives that are consumed by every downstream section (§4–§9). Nothing in §4–§9 can be built without these patterns being correct and stable. §3 ships:

1. **FAB** (`components/ui/fab.tsx`) — floating action button, persistent across tabs, with long-press mini menu.
2. **Sheet** (`components/ui/sheet.tsx`) — declarative bottom sheet primitive wrapping `@gorhom/bottom-sheet`, replacing all usages of `react-native-actions-sheet`.
3. **EmptyState** (`components/ui/empty_state.tsx`) — four-variant zero-data placeholder component.
4. **SettingsSection** (`components/ui/settings_section.tsx`) — iOS Settings-style grouped list primitive.

## Why now

These four patterns appear across every section:
- Every data list screen needs `EmptyState`.
- Every configuration surface needs `SettingsSection`.
- Every sheet-based interaction (Add Transaction, account detail, filter pickers, currency picker) needs `Sheet`.
- The FAB is a root layout element that must exist before any tab screen is shipped.

Building them once in §3, with a stable API, prevents duplication and drift across §4–§9.

## Actions-sheet retirement context

`react-native-actions-sheet@^10.1.2` is currently installed and patched. It is imperative API: `ActionSheetRef` + `.show()` / `.hide()`. The new `Sheet` is declarative: `visible` prop + `onClose` callback. The two APIs are incompatible — migration of each consumer is a deliberate, file-by-file rewrite. See §6 (Open Conflict) for the retirement sequencing decision.

---

# Part C · Product & UX

*Source: Marcus's UX brief. Implementors build from this section — do not abbreviate or reinterpret.*

## Pattern 1 — FAB (Floating Action Button)

### Position and scope

The FAB is a **persistent layer element** — it floats above the tab navigator on every tab. It is not anchored to a specific tab and it is not owned by any screen. The single exception is the Settings area: hide the FAB entirely when the user is in any Settings route (`/settings` prefix). Settings is a configuration space, not a transactional space.

### Visual spec

- **Size:** 56×56dp circle.
- **Fill:** Gold gradient — same gradient used for the CTA button in the design system (start: `gold-500 #D4A44C`, end: `gold-600 #C9973A`).
- **Icon:** MaterialCommunityIcons `plus`, 28dp, color `midnightBlue #1B2B4B`.
- **Elevation:** drop shadow, low opacity — lifts the FAB off the background without overdoing it.
- **Position:** 16dp above the top edge of the tab bar, horizontally centered.

### Tap behavior

Immediately navigate to Add Transaction (§7 sheet entry point). No animation delay — snappy.

### Long-press behavior

The mini menu fans out above the FAB. Three items:

1. "Add Transaction"
2. "Add Account"
3. "Add Commitment"

Each item is a smaller pill containing a label and icon. Items are arranged in a vertical stack above the FAB, positioned bottom-to-top.

**Entrance animation (stagger, per item):**
- Motion: `translateY` from +20dp → 0, opacity from 0 → 1.
- Spring: `withSpring`, low mass, moderate stiffness (see §5e for values).
- Stagger: 40ms delay between items (item 0 animates first, item 2 last).

**While menu is open:**
- FAB rotates 45° — the `+` icon becomes an `×`.
- A semi-transparent dark scrim fades in behind the menu items (does not block the FAB itself).

**Dismissal:** tapping the scrim or tapping the FAB again collapses the menu (reverse animation).

**Menu item tap:** navigate to the corresponding entry point. Menu collapses immediately before navigation.

### Component ownership

- `components/ui/fab.tsx` — the full FAB + mini menu as a single component.
- Consumed by `app/(app)/(tabs)/_layout.tsx` as a sibling rendered after `<Tabs>` (so it paints on top).
- The tab layout passes callbacks. Screens do not own the FAB. Individual screens cannot show or hide the FAB.

---

## Pattern 2 — Sheet (Bottom Sheet)

### Visual anatomy (bottom to top)

1. **Drag handle pill** — 40×4dp, `bg-separator`, centered, 8dp top margin + 8dp bottom margin.
2. **Header row** (optional, present on ~80% of sheets) — title text (Sora SemiBold 17dp, `text-foreground`, left-aligned) + close button (MaterialCommunityIcons `close`, 24dp, `text-muted`, 44×44 touch target).
3. **Scrollable body** — content-driven height, capped at 85% of viewport. Scrollable content inside the sheet **must** use `BottomSheetScrollView` or `BottomSheetFlatList` from `@gorhom/bottom-sheet` (not standard RN components).
4. **Sticky footer** (optional) — CTA pinned above safe area: `border-t border-separator pt-2 px-4 pb-6`.

### Snap points

Two fixed snap points via a `size` prop:
- `"sm"` → 50% of viewport height. For compact content: currency picker, net worth breakdown.
- `"lg"` → 85% of viewport height. For tall content: Add Transaction, filter pickers.

No dynamic content-measuring. The `size` prop is the only way to choose a snap point.

### Sheet-on-sheet stacking

A second sheet may overlay inside a first (e.g., a picker inside Add Transaction). The second sheet renders with a y-offset — card-on-card appearance. **Maximum depth: 2.** Do not nest a third sheet.

### Component API

```typescript
// components/ui/sheet.tsx
interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  size: 'sm' | 'lg';
  footer?: React.ReactNode;
  children: React.ReactNode;
}
```

`visible` toggles the sheet open/closed declaratively. The consumer does not call `.show()` or `.hide()` on a ref.

---

## Pattern 3 — EmptyState

### Layout

Centered vertically and horizontally: `flex: 1`, `justifyContent: center`, `alignItems: center`.

### Shared anatomy (all variants)

- **Icon container:** 80×80dp circle, `bg-surface`, icon centered at 40dp, `text-muted`.
- **Headline:** Sora SemiBold 18dp (`Type.title`), `text-foreground`, 16dp top margin, center-aligned.
- **Description:** Inter Regular 14dp (`Type.body`), `text-muted`, center-aligned, max-width 260dp, 8dp top margin.
- **CTA button** (optional — see variants): gold gradient, full-width, 16dp top margin.

### Variants

| Variant | Icon | Headline | Description | Action |
|---|---|---|---|---|
| `accounts` | `bank` or `wallet` | "No accounts yet" | "Add your first account to start tracking your money." | CTA button: "Add Account" |
| `transactions` | `swap-horizontal` | "No transactions yet" | "Your transactions will appear here once you start adding them." | CTA button: "Add Transaction" |
| `commitments` | `calendar-check` | "No commitments yet" | "Track bills, subscriptions, and recurring payments here." | CTA button: "Add Commitment" |
| `filtered` | `filter-remove` | "No results" | "Try adjusting your filters." | No CTA button; "Clear Filters" text button below description |

All copy lives in `constants/strings.ts`. The component does not hardcode strings.

### Component API

```typescript
// components/ui/empty_state.tsx
type EmptyStateVariant = 'accounts' | 'transactions' | 'commitments' | 'filtered';

interface EmptyStateProps {
  variant: EmptyStateVariant;
  onAction?: () => void;
}
```

The component does not navigate. It calls `onAction` and the caller decides the destination. For the `filtered` variant, `onAction` is the "Clear Filters" callback.

---

## Pattern 4 — SettingsSection

### Section header

Inter Medium 12dp (`Type.caption`), `text-muted`, uppercase, 16dp left padding, 8dp top + 8dp bottom padding. Not pressable.

### Row anatomy

- **Min height:** 52dp.
- **Horizontal padding:** 16dp.
- **Divider:** full-width hairline between rows (`border-separator`), inset 16dp from the left edge. No divider after the last row in a section.
- **Leading icon** (optional): 20dp, color `text-accent` or `text-muted`.
- **Label:** Inter Medium 15dp (`Type.bodyStrong`), `text-foreground`. Destructive rows: `text-danger`, no leading icon.
- **Trailing element:** one of: value text | toggle switch | `chevron-right` icon | none.

### Component API

```typescript
// components/ui/settings_section.tsx
type SettingsTrailing = 'chevron' | 'toggle' | 'none';

interface SettingsSectionItem {
  label: string;
  icon?: string;          // MaterialCommunityIcons name
  value?: string;         // displayed as trailing value text
  onPress: () => void;
  destructive?: boolean;
  trailing?: SettingsTrailing;
  toggleValue?: boolean;  // required when trailing === 'toggle'
}

interface SettingsSectionProps {
  title?: string;         // section header; omit to render rows with no header
  items: SettingsSectionItem[];
}
```

The component renders the full grouped block: optional header + all rows + internal dividers. HeroUI Native `Divider` component is used for the hairline separators.

---

# Part D · Financial Logic

N/A — §3 patterns contain no financial formulas. Financial content (balances, amounts, categories, dates) flows *through* these patterns in §4–§9 as props and children. The patterns themselves are format-agnostic.

---

# Part E · Architecture

## E1 — New dependency: `@gorhom/bottom-sheet`

**Decision: `@gorhom/bottom-sheet@^5.2.8`** — not HeroUI Native Drawer.

**Rationale:** HeroUI Native Drawer is a modal overlay — it has no snap-point system, no gesture-driven dismiss with momentum, and no scrollable-content integration. `@gorhom/bottom-sheet` is purpose-built for the exact behavior specified by Marcus: two snap points, gesture dismiss, scrollable body. The existing `react-native-gesture-handler@~2.30.0` is compatible with @gorhom v5 — no version conflict.

**Install:**
```bash
npm install @gorhom/bottom-sheet@^5.2.8
npx expo prebuild --clean
```

`@gorhom/bottom-sheet` contains native code. `expo prebuild --clean` is required after install before the app can run.

**Scrollable content rule:** Any scrollable content rendered inside a `Sheet` must use `BottomSheetScrollView` or `BottomSheetFlatList` imported from `@gorhom/bottom-sheet`. Standard `ScrollView` and `FlatList` from `react-native` will not scroll correctly inside the sheet — the gesture handler intercepts touch events. This mirrors the same rule that existed for `react-native-actions-sheet`.

## E2 — Component inventory

All four components are created in `components/ui/`. Files follow `snake_case` naming. TypeScript identifiers follow `camelCase`.

### `components/ui/fab.tsx`

```typescript
interface FABMenuItem {
  label: string;
  icon: string;         // MaterialCommunityIcons name
  onPress: () => void;
}

interface FABProps {
  onAddTransaction: () => void;
  onAddAccount: () => void;
  onAddCommitment: () => void;
  hidden?: boolean;     // true while pathname starts with /settings
}
```

Internally owns all Reanimated shared values (rotation, per-item opacity/translateY, scrim opacity). Does not expose animation state to parent.

### `components/ui/sheet.tsx`

```typescript
interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  size: 'sm' | 'lg';
  footer?: React.ReactNode;
  children: React.ReactNode;
}
```

Wraps `@gorhom/bottom-sheet`'s `BottomSheet` component. Snap-point map: `{ sm: ['50%'], lg: ['85%'] }`. Sheet is closed by driving the snap index to `-1`. `onClose` fires when the sheet settles at index `-1` (via `onChange` callback).

### `components/ui/empty_state.tsx`

```typescript
type EmptyStateVariant = 'accounts' | 'transactions' | 'commitments' | 'filtered';

interface EmptyStateProps {
  variant: EmptyStateVariant;
  onAction?: () => void;
}
```

Pure composition: `Box + Text + Pressable` from HeroUI Native. Icon via `MaterialCommunityIcons`. All copy from `constants/strings.ts`. No Reanimated. No external dependencies beyond what is already installed.

### `components/ui/settings_section.tsx`

```typescript
type SettingsTrailing = 'chevron' | 'toggle' | 'none';

interface SettingsSectionItem {
  label: string;
  icon?: string;
  value?: string;
  onPress: () => void;
  destructive?: boolean;
  trailing?: SettingsTrailing;
  toggleValue?: boolean;
}

interface SettingsSectionProps {
  title?: string;
  items: SettingsSectionItem[];
}
```

Pure composition: `Box + Text + Pressable` + HeroUI Native `Divider` for hairline separators. Toggle trailing uses React Native `Switch`. No Reanimated.

## E3 — FAB integration in tab layout

### Mounting

The FAB is rendered as a sibling **after** `<Tabs>` in `app/(app)/(tabs)/_layout.tsx`, wrapped in an absolute-fill `View`:

```tsx
// app/(app)/(tabs)/_layout.tsx (structure only)
<View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
  <FAB
    onAddTransaction={handleAddTransaction}
    onAddAccount={handleAddAccount}
    onAddCommitment={handleAddCommitment}
    hidden={isSettingsRoute}
  />
</View>
```

`pointerEvents="box-none"` on the wrapper ensures only the FAB circle itself captures touches — not the invisible overlay covering the whole screen.

### Tab bar height

`useBottomTabBarHeight` from `@react-navigation/bottom-tabs` provides the dynamic tab bar height at runtime. FAB bottom offset = tab bar height + 16dp.

### Route detection for hide logic

`usePathname()` from `expo-router` is called in `_layout.tsx`. If `pathname.startsWith('/settings')`, `hidden={true}` is passed to FAB, which sets `opacity: 0` and `pointerEvents: 'none'` on the FAB container.

Note: Settings is a stack route under `app/(app)/settings/` — it is NOT a tab. The hide logic checks pathname, not tab identity.

### `useFABActions` hook

```typescript
// app/(app)/(tabs)/_layout.tsx (hook shape — collocated in layout, not in utils/)
function useFABActions() {
  const router = useRouter();
  return {
    handleAddTransaction: () => router.push('/(app)/transaction-form'),
    handleAddAccount: () => router.push('/(app)/account-form'),
    handleAddCommitment: () => router.push('/(app)/commitment-form'),
  };
}
```

The hook is defined inside `_layout.tsx`, not extracted to `utils/`, because it is layout-specific logic with no reuse surface.

## E4 — Sheet internals

### @gorhom BottomSheet config

```typescript
// Inside components/ui/sheet.tsx
const SNAP_POINTS: Record<'sm' | 'lg', string[]> = {
  sm: ['50%'],
  lg: ['85%'],
};

// BottomSheet props
<BottomSheet
  ref={sheetRef}
  index={visible ? 0 : -1}
  snapPoints={SNAP_POINTS[size]}
  enablePanDownToClose
  onClose={onClose}
  backdropComponent={renderBackdrop}
/>
```

### Drag handle

Rendered as the `handleComponent` prop: a centered `Box` (40×4dp, `bg-separator`, Radius 2dp, margin top/bottom 8dp).

### Backdrop

`BottomSheetBackdrop` from `@gorhom/bottom-sheet` with `appearsOnIndex={0}` and `disappearsOnIndex={-1}`. Opacity 0.5.

### Header rendering

If `title` is provided, render a header row inside the sheet body before `children`: `Text` (Sora SemiBold 17dp, left) + close `Pressable` (MaterialCommunityIcons `close`, 24dp, 44×44 touch target).

### Sticky footer

If `footer` is provided, it is rendered outside the `BottomSheetScrollView`, pinned at the bottom of the sheet content area: `border-t border-separator pt-2 px-4 pb-6`. The footer does not scroll with content.

### Sheet stacking

When a second sheet opens inside a first, the second sheet's `BottomSheet` instance receives `style={{ marginTop: 16 }}` — this creates the card-on-card y-offset effect. The two `BottomSheet` instances are siblings in the render tree, not nested. Maximum depth: 2.

### Gesture conflict

`@gorhom/bottom-sheet` v5 requires `GestureHandlerRootView` at the app root. Verify this is already present from the `react-native-gesture-handler` setup. If absent, add it to `app/_layout.tsx` wrapping the root navigator — do not add it a second time if already present.

## E5 — Reanimated animation specs

### FAB rotation

```typescript
const rotation = useSharedValue(0);

// Open:  withTiming(45, { duration: 200 })
// Close: withTiming(0,  { duration: 200 })

const rotateStyle = useAnimatedStyle(() => ({
  transform: [{ rotate: `${rotation.value}deg` }],
}));
```

### Menu item entrance (per item, index 0–2)

```typescript
// Per item:
const translateY = useSharedValue(20);
const opacity = useSharedValue(0);

// Open (staggered by index):
translateY.value = withDelay(index * 40, withSpring(0, { mass: 0.8, stiffness: 180 }));
opacity.value    = withDelay(index * 40, withTiming(1, { duration: 150 }));

// Close (reverse stagger — index 2 first):
const reverseIndex = 2 - index;
translateY.value = withDelay(reverseIndex * 40, withSpring(20, { mass: 0.8, stiffness: 180 }));
opacity.value    = withDelay(reverseIndex * 40, withTiming(0, { duration: 150 }));
```

### Scrim

```typescript
const scrimOpacity = useSharedValue(0);

// Open:  withTiming(0.5, { duration: 200 })
// Close: withTiming(0,   { duration: 200 })
```

The scrim is a full-screen `Animated.View` rendered between the tab navigator overlay and the FAB/menu items. `pointerEvents="auto"` when visible (captures taps for dismissal), `pointerEvents="none"` when hidden.

### Long-press gesture

`LongPressGestureHandler` from `react-native-gesture-handler`, `minDurationMs={500}`. On `ACTIVE` state: open menu. No long-press on mini menu items — tap only.

## E6 — Folder layout

### Files created

```
components/ui/
  fab.tsx                         NEW — FAB + mini menu
  sheet.tsx                       NEW — Sheet primitive wrapping @gorhom
  empty_state.tsx                 NEW — EmptyState (4 variants)
  settings_section.tsx            NEW — SettingsSection grouped list
```

### Files modified

```
app/(app)/(tabs)/_layout.tsx      MODIFIED — mount FAB, add useFABActions, pathname hide logic
constants/strings.ts              MODIFIED — add EmptyState copy keys
```

### Files NOT touched in §3

All 12 `react-native-actions-sheet` consumer files remain unchanged in §3 unless Option A is chosen (see §6). The patch file `patches/react-native-actions-sheet+10.1.2.patch` is not deleted in §3 under Option B.

### Test files created

```
__tests__/components/ui/fab.test.tsx
__tests__/components/ui/sheet.test.tsx
__tests__/components/ui/empty_state.test.tsx
__tests__/components/ui/settings_section.test.tsx
```

## E7 — Test strategy

### What is unit-tested

**EmptyState** — all four variants render correctly; correct icon, headline, description, and CTA presence per variant; `onAction` is called on CTA press; `filtered` variant renders text button not gradient CTA.

**SettingsSection** — section header renders when `title` provided, absent when `title` omitted; all trailing variants render (`chevron`, `toggle`, `none`); `onPress` fires on row press; destructive rows apply `text-danger` and omit leading icon.

**FAB** — `onAddTransaction` / `onAddAccount` / `onAddCommitment` callbacks are called on corresponding mini menu item press; `hidden={true}` prevents rendering or sets opacity/pointerEvents correctly.

**Sheet** — renders children when `visible={true}`; `onClose` is called on backdrop press; `title` renders header; no header rendered when `title` omitted; `footer` renders below content.

### What is not unit-tested

- Reanimated animation timing and interpolated values — these depend on the native animation runtime and are not meaningful in Jest.
- `@gorhom/bottom-sheet` gesture mechanics — the library's internal behavior is not unit-testable; it is verified via manual testing.
- Snap-point positioning — verified manually on device.

### Mock strategy

`@gorhom/bottom-sheet` must be mocked in Jest. The mock renders children directly (no sheet wrapper), ignores `index` prop, and calls `onClose` when `enablePanDownToClose` is triggered by a test event. Add the mock to `__mocks__/@gorhom/bottom-sheet.tsx`.

`react-native-reanimated` is already mocked via `react-native-reanimated/mock` in the jest setup — no additional mock needed for Reanimated primitives used in FAB.

## E8 — Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| `@gorhom/bottom-sheet` v5 has a breaking change from v4 | Medium | Install fresh at `^5.2.8`; no existing @gorhom code to migrate. |
| `GestureHandlerRootView` missing or double-wrapped | Low | Audit `app/_layout.tsx` before wiring FAB; add if absent, skip if present. |
| FAB absolute-fill wrapper captures unintended touches | Medium | `pointerEvents="box-none"` on wrapper; `pointerEvents="auto"` on FAB circle only. |
| Scrim tap not dismissing mini menu on Android | Low | Attach `onPress` to scrim `Animated.View` directly; test on Android emulator. |
| `BottomSheetScrollView` import confusion with old actions-sheet pattern | High | Add a comment in `sheet.tsx` pointing to the correct import path; update code review checklist. |
| Sheet stacking exceeds depth 2 | Low | No programmatic enforcement needed; document max-depth-2 rule in the component file's JSDoc. |
| `usePathname` returns unexpected format for nested routes | Low | Log pathname in dev mode; confirm `/settings` prefix covers `/(app)/settings/` router output. |

---

# Part F · Actions-Sheet Retirement — Open Conflict

## Background

`react-native-actions-sheet@^10.1.2` is patched (`patches/react-native-actions-sheet+10.1.2.patch`). There are **12 screen files** currently importing from it (listed in Part G). The new `Sheet` component replaces it with a declarative API that is incompatible with the imperative ref-based API. Migration is a deliberate rewrite of each consumer.

The §3 directive implies full retirement: §3 builds `Sheet` and retires the old dependency. Tariq identifies two viable interpretations:

---

## Option A — §3 migrates all 12 consumers (full retirement)

**Scope:** §3 builds all four patterns AND migrates all 12 `react-native-actions-sheet` consumer files to the new `Sheet` API. Upon §3 completion: `react-native-actions-sheet` is removed from `package.json`, the patch file is deleted, and the two test mock files are updated.

**Pros:**
- Clean slate for §4–§9 — no legacy dependency anywhere.
- Simpler dependency graph immediately.
- Patch file gone, reducing ongoing maintenance risk.

**Cons:**
- §3 scope balloons significantly. 12 sheet files span 6 screen domains (accounts, commitments, dashboard, settings, transactions). Understanding each sheet's data flow requires domain context that §3 doesn't otherwise touch.
- Higher risk of regressions — migrating sheets that belong to §4–§9 domains without migrating the surrounding screen.
- If §3 is interrupted or needs rollback, partially migrated consumer files create an unstable intermediate state.

---

## Option B — §3 builds Sheet only; consumers migrate in their own section (deferred retirement)

**Scope:** §3 builds all four patterns. The `Sheet` component is ready for use. Existing `react-native-actions-sheet` consumers are **not touched** in §3. Each downstream section (§4–§9) migrates the sheets that fall within its domain. The dep and patch are removed when the last consumer is gone.

**Rule:** No new code in §4–§9 may import from `react-native-actions-sheet`. "Retirement" means "no new usages" from §3 forward, not "dep removed immediately."

**Pros:**
- §3 scope is bounded and focused — build four patterns, wire the FAB, ship.
- Each section migrates sheets it fully understands (data flow, edge cases, existing tests).
- Reduced regression risk — no cross-domain changes in a single PR.
- Easier to roll back §3 if issues arise.

**Cons:**
- `react-native-actions-sheet` dep + patch remain in the project for the duration of §4–§9.
- Test mocks for `react-native-actions-sheet` persist alongside new `@gorhom/bottom-sheet` mocks.
- Teams must track which consumers remain.

---

## Tariq's recommendation

**Option B.**

The 12 consumers span 6 separate screen domains. Migrating them all in §3 without the surrounding screen context inverts the vertical-slice model that this initiative is built on. The risk of regression and incomplete context outweighs the benefit of early clean-up. The rule "no new usages from §3 forward" is sufficient to halt the spread without forcing a premature sweep.

The deferred retirement is bounded — §9 (the final section) will be the last consumer at most — and the patch file's risk profile is low (it applies on `npm install` without conflict).

---

## ⚠️ REQUIRES HUMAN DECISION before the implementation plan is written.

The implementation plan cannot be written until Option A or Option B is chosen. The plan scope (number of files, test migration) differs materially between the two.

---

# Part G · Open Questions

1. **Retirement option choice** — Option A or Option B? (Blocks plan authoring. See §6.)

2. **FAB entry points for §3** — `handleAddTransaction`, `handleAddAccount`, `handleAddCommitment` navigate to routes that may not exist yet in §3 (those screens belong to later sections). Should §3 wire up stub routes, or should the FAB callbacks be no-ops (`console.warn`) until the target screens are built? Tariq recommends no-ops with a `TODO` comment, but the human should confirm.

3. **Sheet `GestureHandlerRootView` audit** — is `GestureHandlerRootView` already wrapping the root navigator in `app/_layout.tsx`? This must be confirmed before the plan is written to determine if a modification to `app/_layout.tsx` is in scope for §3.

4. **SettingsSection toggle** — React Native's built-in `Switch` is used for the `trailing="toggle"` case. Confirm this is acceptable (HeroUI Native does not expose a `Switch` primitive that matches the design spec).

5. **`@gorhom/bottom-sheet` mock depth** — The Jest mock renders children directly. Confirm whether `BottomSheetScrollView` and `BottomSheetFlatList` also need to be mocked (as passthrough wrappers) for existing and new test files that render sheet content.
