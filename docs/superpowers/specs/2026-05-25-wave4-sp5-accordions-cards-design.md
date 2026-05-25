# Wave 4 · SP-5-NON-CONTESTED — Filter Accordions + Dashboard Heavy Cards Design

**Date:** 2026-05-25
**Author:** @tariq (synthesis)
**Status:** Design — awaiting spec sign-off
**Parent effort:** Wave 4 (Full HeroUI migration) from `docs/superpowers/reviews/2026-05-24-post-ship-heroui-consistency-review.md`, sliced via Approach C (hybrid, wrappers-first, risk-tiered).
**Batch:** Batch 1, concurrent stream alongside SP-2, SP-3, SP-4-wrapper.

---

## Context

Wave 4 decomposes the full HeroUI migration into risk-tiered sub-projects. SP-5 covers the two remaining Tier-3 surfaces: filter accordions and dashboard heavy cards. SP-1 already migrated the inner pill body of the filter accordions (`SelectablePill` via HeroUI `Chip`, chevron color tokenized to `CoreTokens.text2`). This SP's job is the outer accordion shell — the header trigger, expand/collapse animation, count badge row, and chevron — plus adopting HeroUI `Card` as the substrate for the four dashboard cards.

This is the non-contested cut of SP-5. The third filter accordion (`amount_accordion.tsx`) is contested with SP-4's EGP/USD Tabs adoption and is explicitly excluded (see Critical Exclusion section). Account and category accordions are uncontested — SP-4 touches neither file.

---

## Goal

1. Replace the `Pressable` outer shell of `account_accordion.tsx` and `category_accordion.tsx` with HeroUI `Accordion` compound components, keeping the `SelectablePill` body from SP-1 intact and preserving controlled expansion via the existing parent props.
2. Adopt HeroUI `Card` as the substrate for `hero_card.tsx`, `commitments_card.tsx`, `account_card.tsx`, and `add_card.tsx`, preserving all internal layout, gradient, dynamic inline styles, and business logic.
3. Zero rendered-text regressions. Zero behavior regressions.

---

## Hard Invariant

- **Zero rendered-text changes.** Every section label, summary text, count badge value, card figure, and stat label is sourced from `Strings.*` / computed values — all preserved byte-identical.
- **Behavior unchanged.** Controlled expand/collapse via existing `expanded`/`onToggleSection` props, the count badge visibility, the collapsed summary line, the `SelectablePill` multi-select body, and all dashboard card `onPress` callbacks are fully preserved.
- **Accessibility preserved or improved.** `accessibilityRole` and `accessibilityState={{ expanded }}` continue to be reported; HeroUI `Accordion.Trigger` emits these natively from its primitive layer (confirmed in source — see Architecture section).
- **No parallel reimplementation.** HeroUI `Accordion` and `Card` are the substrates. Custom `Pressable` shells are retired, not duplicated.
- Device QA gates the PR.

---

## The Components

### Thread 1: Filter Accordions — HeroUI `Accordion`

**Import:** `import { Accordion } from 'heroui-native'`

HeroUI `Accordion` is a compound component: `Accordion` (Root) · `Accordion.Item` · `Accordion.Trigger` · `Accordion.Indicator` · `Accordion.Content`.

#### API deep-dive

**Controlled expansion.** The primitive `Root` uses `useControllableState`, which supports both controlled and uncontrolled modes:

```ts
// single mode (default): value?: string | undefined; onValueChange?: (value: string | undefined) => void
// multiple mode:         value?: string[];            onValueChange?: (value: string[]) => void
```

The filter sheet opens only one accordion section at a time (`openSection: 'accounts' | 'categories' | 'amount' | null`), which maps cleanly to `selectionMode="single"` with `value` and `onValueChange`. Controlled expansion is fully supported — this is the primary design lever. No uncontrolled defaultValue needed.

**Trigger internals.** `Accordion.Trigger` renders as a `Pressable` internally (via `Slot.Pressable`). It emits:
- `accessibilityState={{ expanded: isExpanded, disabled: isTriggerDisabled }}`
- `role="button"`
- `aria-disabled`

This is a strict improvement over the current `Pressable` with manual `accessibilityRole="button"` + `accessibilityState={{ expanded }}` — it also adds `disabled` reporting.

**Indicator.** `Accordion.Indicator` renders an animated chevron by default (rotates 0→-180 degrees on expand via `react-native-reanimated` spring). The icon color is configurable via `iconProps={{ color, size }}`. The rotation animation is animated-style-driven (Reanimated worklet) — `className` cannot override `transform/rotate`. To use our own chevron (pointing up vs down, matching existing behavior), we have two options:
- Pass `children` to `Accordion.Indicator`, which bypasses the default chevron entirely and renders our content with the Animated wrapper but no rotation.
- Set `isAnimatedStyleActive={false}` and render a custom icon as children with our own `name={expanded ? 'chevron-up' : 'chevron-down'}` logic.

The second option (custom children, `isAnimatedStyleActive={false}`) is preferred: it preserves the explicit `chevron-up`/`chevron-down` icon names that match the existing behavior exactly, avoids the animated rotation (which was not in the original shell), and keeps `CoreTokens.text2` as the color source.

**Content.** `Accordion.Content` renders children only when `isExpanded` is true (matches existing `{expanded ? <View>…</View> : null}` pattern). It wraps children in a `Animated.View` with entering/exiting animations. The default content padding (`px-3 pb-4`) and trigger padding (`py-4 px-3`) are applied by the `tv` variants — these must be overridden via `className` to match our existing `p-3.5` outer shell and `mt-3` body spacing.

**Separator.** The default variant emits a `h-hairline bg-separator` separator between items. Since each accordion is its own standalone card (one `Accordion` per accordion, not a list), `hideSeparator` or a single-item `Accordion` means no separator is needed. Using one `Accordion` root per accordion component (not a shared root for all three filter sections) is the correct structure.

**Variant.** `variant="default"` (the default) adds no surface background or border — correct, since the outer container card styling (`bg-surface border-separator rounded-xl`) stays on the wrapper `View` that is already there, or migrates onto `Card` (see Architecture).

### Thread 2: Dashboard Heavy Cards — HeroUI `Card`

**Import:** `import { Card } from 'heroui-native'`

`Card` is a compound component built on `Surface`: `Card` (Root) · `Card.Header` · `Card.Body` · `Card.Footer` · `Card.Title` · `Card.Description`.

#### API deep-dive

**Root.** `Card` root renders a `Surface` with `variant` prop (`'default' | 'secondary' | 'tertiary' | 'transparent'`). Default Surface styles: `p-4 rounded-3xl shadow-surface overflow-hidden bg-surface`. These are `tv`-based and can be overridden entirely via `className`.

**Key constraint — `Pressable` slot.** `Card` root does not accept an `onPress` prop. It renders a `View` (or `Slot.View` if `asChild` is set). All four dashboard cards are currently `Pressable` (they navigate or trigger actions). The correct pattern is `asChild` on `Card`:

```tsx
<Card asChild className="…override classes…">
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={…}>
    {/* card content */}
  </Pressable>
</Card>
```

`asChild` uses `Slot.View`, which merges the Card's className/style onto the single child element. This lets `Pressable` own the press semantics while `Card` owns the surface styling.

**Alternatively** — and more compositionally correct given how complex these cards are — `Card` is used as a pure styling substrate with no `asChild`, and the `Pressable` wraps the `Card`:

```tsx
<Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={…} className="…shape…">
  <Card className="…override classes…">
    {/* card content */}
  </Card>
</Pressable>
```

This second pattern is preferred for the heavy cards: it keeps the `Pressable` as the outermost interactive element (correct for accessibility — the pressable region equals the full card), avoids the `asChild` Slot merge complexity, and lets `Card` own only background/surface/overflow styling.

**`hero_card.tsx` specifics.** This card uses `LinearGradient` + `GridTexture` SVG as `StyleSheet.absoluteFill` children, plus an absolute-positioned gold halo `View`. The outer shape is `border-border mx-4 mt-4 overflow-hidden rounded-2xl border`. `Card`'s default `rounded-3xl` is incompatible — must override via `className="rounded-2xl border border-border mx-4 mt-4 overflow-hidden p-0"` (reset padding too; content has its own `px-5 pt-5` / `pb-5`). The gradient/texture children require `overflow-hidden` to be clipped, which `Card` via Surface bakes in.

**`commitments_card.tsx` specifics.** Current shape: `bg-surface border-border mx-4 mt-4 rounded-2xl border px-4 py-3`. `Card` default applies `p-4 rounded-3xl bg-surface`. Override to `className="rounded-2xl border border-border mx-4 mt-4 px-4 py-3"`. Internal layout uses inline `style={{ gap: ms(8) }}` — kept as-is since `Card.Body` is optional; content can be direct children.

**`account_card.tsx` specifics.** Current shape: `bg-surface border-border overflow-hidden rounded-2xl border`, sized via `style={{ width, marginLeft: ms(4) }}`. Has a top accent bar (`View` with dynamic `backgroundColor: color`, `height: ms(3)`). The `width` and `marginLeft` are runtime values — must remain in `style` prop. Override Card classes to `className="rounded-2xl border border-border overflow-hidden p-0"` and keep `style={{ width, marginLeft: ms(4) }}`. The accent bar and inner padding layout (`paddingHorizontal: ms(12), paddingVertical: ms(9)`) stay as children.

**`add_card.tsx` specifics.** Current shape: `bg-surface border-border overflow-hidden rounded-2xl border`, `style={{ width, marginLeft: ms(4), alignSelf: 'stretch' }}`. Identical override pattern to `account_card`. Accent bar also present. `alignSelf: 'stretch'` stays in `style`.

---

## Rendering & Styling Contract

### Accordion shell (account + category)

```tsx
// One Accordion root per accordion component.
// selectionMode="single", controlled via value/onValueChange.
// value = expanded ? 'item' : undefined  (single section, single item)
// onValueChange = (v) => { if (v !== undefined) onToggleSection(); else onToggleSection(); }
// Simplest mapping: the item value is a fixed string constant (e.g. 'section').

<View className="border-separator bg-surface mb-2 rounded-xl border p-3.5">
  <Accordion
    selectionMode="single"
    value={expanded ? 'section' : undefined}
    onValueChange={(v) => {
      // HeroUI calls this with the new value string when toggling open,
      // and with undefined when collapsing (isCollapsible=true default).
      // Either way, delegate to onToggleSection — it owns the state.
      onToggleSection();
    }}
  >
    <Accordion.Item value="section">
      <Accordion.Trigger className="py-0 px-0 gap-0">
        {/* Header row — matches existing layout */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="font-inter text-[13px] font-semibold">
              {Strings.filterSectionAccounts /* or Categories */}
            </Text>
            {selectedIds.length > 0 ? (
              <View className="bg-accent/15 min-w-[18px] items-center rounded-full px-1.5">
                <Text className="font-inter text-accent text-[10px] font-bold">
                  {selectedIds.length}
                </Text>
              </View>
            ) : null}
          </View>
          <View className="flex-row items-center gap-1.5">
            <Text className="font-inter text-foreground/60 text-[11px]" numberOfLines={1}>
              {expanded ? '' : summary}
            </Text>
            <Accordion.Indicator isAnimatedStyleActive={false}>
              <MaterialCommunityIcons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={CoreTokens.text2}
              />
            </Accordion.Indicator>
          </View>
        </View>
      </Accordion.Trigger>
      <Accordion.Content className="px-0 pb-0">
        <View className="mt-3 flex-row flex-wrap gap-1.5">
          {/* SelectablePill body — unchanged from SP-1 */}
          {items.map((item) => (
            <SelectablePill … />
          ))}
        </View>
      </Accordion.Content>
    </Accordion.Item>
  </Accordion>
</View>
```

Key overrides:
- `Accordion.Trigger`: `className="py-0 px-0 gap-0"` — zeroes the default `py-4 px-3 gap-4` so our existing header layout is unchanged.
- `Accordion.Content`: `className="px-0 pb-0"` — zeroes default `px-3 pb-4`; our `mt-3` gap is provided by the inner `View`.
- `Accordion.Indicator`: `isAnimatedStyleActive={false}` + children — bypasses the animated rotation, uses our explicit `chevron-up`/`chevron-down` names, and preserves `CoreTokens.text2` color.

### Dashboard Cards

```tsx
// Pattern for all four cards: Pressable wraps Card; Card overrides shape classes.

// hero_card.tsx
<Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={Strings.dashAvailableToSpend}>
  <Card className="rounded-2xl border border-border mx-4 mt-4 overflow-hidden p-0">
    <LinearGradient … style={StyleSheet.absoluteFill} />
    <GridTexture />
    {/* halo View — absolute, inline style */}
    {/* content rows — existing layout intact */}
  </Card>
</Pressable>

// commitments_card.tsx
<Pressable onPress={onPress} className="mx-4 mt-4">
  <Card className="rounded-2xl border border-border px-4 py-3 p-0" style={{ gap: ms(8) }}>
    {/* existing content rows intact */}
  </Card>
</Pressable>

// account_card.tsx
<Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={account.name}
  style={{ width, marginLeft: ms(4) }}>
  <Card className="rounded-2xl border border-border overflow-hidden p-0">
    <View style={{ height: ms(3), width: '100%', backgroundColor: color }} />
    {/* existing inner layout intact */}
  </Card>
</Pressable>

// add_card.tsx
<Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={Strings.emptyAccountsCta}
  style={{ width, marginLeft: ms(4), alignSelf: 'stretch' }}>
  <Card className="rounded-2xl border border-border overflow-hidden p-0">
    <View style={{ height: ms(3), width: '100%', backgroundColor: ACCENT }} />
    {/* existing centered content intact */}
  </Card>
</Pressable>
```

Notes:
- `p-0` in the `className` override zeroes Surface's default `p-4`.
- `rounded-2xl` overrides Surface's default `rounded-3xl`.
- `border border-border` replaces Surface's `shadow-surface` with our explicit border-based elevation.
- Runtime `style` props (`width`, `marginLeft`, `backgroundColor`, `gap`) stay on the wrapping `Pressable` or inner `View` — not on `Card` className, which is build-time only.
- `Card.Header`, `Card.Body`, `Card.Footer`, `Card.Title`, `Card.Description` sub-components are not used — these cards have bespoke internal layouts that would fight the HeroUI content slots. `Card` is used as a pure surface/shape substrate. This is intentional and documented.
- `shadow-surface` token: Surface applies it by default. Our cards use `border-border` border for depth, not shadow. The `className` override order in `tv` must eliminate `shadow-surface` — if `tv` does not let a `className="shadow-none"` override win, pass `style={{ boxShadow: 'none' }}` as a fallback. Verify during implementation.

---

## Critical Exclusion: `amount_accordion.tsx`

**`screens/transactions/filter/components/amount_accordion.tsx` is EXCLUDED from this SP.**

This file is contested with SP-4-adoption: SP-4 migrates its EGP/USD `Pressable` toggle to `Tabs`. Both edits touch the same ~127-line file with incompatible structural intents. SP-4-adoption must land and merge before the accordion shell of `amount_accordion.tsx` can be migrated.

The `amount_accordion.tsx` shell conversion is deferred to Batch 3 (`feat/wave4-sp5-amount-accordion-shell`), which starts from `main` after SP-4-adoption merges.

**Implementer instruction: do not open `amount_accordion.tsx` in this PR.** The file is not in the diff. If you see it in your editor, close it.

### Temporary 2-of-3 Inconsistency

After this SP merges, the filter sheet will have:
- `account_accordion.tsx` — HeroUI `Accordion` shell (migrated)
- `category_accordion.tsx` — HeroUI `Accordion` shell (migrated)
- `amount_accordion.tsx` — legacy `Pressable` shell (intentionally deferred)

This temporary 2-of-3 inconsistency is accepted. It is not a visual regression — the outer shell is visually indistinguishable to users (the main difference is internal: animated layout transition on the migrated pair, static on amount). The inconsistency resolves in Batch 3. The device QA matrix for this SP should note it so QA does not flag it as a bug.

---

## Accepted Visual Normalization

| Surface | Property | Before | After | Perceptibility |
|---|---|---|---|---|
| Account/Category accordion | Expand/collapse animation | Instant (no animation) | HeroUI Reanimated spring layout transition | Perceptible — smooth height animation added. **Positive improvement; not a regression.** |
| Account/Category accordion | Chevron rotation | Static swap (up/down icon name) | Static swap via custom children in `Accordion.Indicator` (`isAnimatedStyleActive=false`) | Unchanged — no rotation animation added |
| Dashboard cards | Corner radius | `rounded-2xl` (custom Pressable) | `rounded-2xl` (Card className override) | Unchanged |
| Dashboard cards | Surface shadow | None (border-only depth) | `shadow-none` override applied (Surface default is `shadow-surface`) | Unchanged if override wins; verify during implementation |
| Dashboard cards | Internal spacing | Existing padding via className/style | Unchanged — `p-0` zeroes Card default; existing layout children unmodified | Unchanged |

No other visual change. All text, icons, colors, and dynamic values are preserved verbatim.

---

## Adoption Set (Exact Files)

### Thread 1 — Filter Accordions

| File | Change | SP-1 body status |
|---|---|---|
| `screens/transactions/filter/components/account_accordion.tsx` | Replace outer `Pressable` header + expand/collapse with `Accordion` compound | SP-1 migrated (SelectablePill body intact) |
| `screens/transactions/filter/components/category_accordion.tsx` | Replace outer `Pressable` header + expand/collapse with `Accordion` compound | SP-1 migrated (SelectablePill body intact) |

### Thread 2 — Dashboard Heavy Cards

| File | Change | Notes |
|---|---|---|
| `screens/dashboard/components/hero_card.tsx` | `Pressable` wraps `Card` substrate; LinearGradient/GridTexture/halo children preserved | Complex — `absoluteFill` children require `overflow-hidden` on Card |
| `screens/dashboard/components/commitments_card.tsx` | `Pressable` wraps `Card` substrate; LinearGradient progress bar and Stat row preserved | `gap: ms(8)` via `style` prop |
| `screens/dashboard/components/account_card.tsx` | `Pressable` (with `style={{ width, marginLeft }}`) wraps `Card` substrate; accent bar + info rows preserved | Dynamic `width` stays on Pressable |
| `screens/dashboard/components/add_card.tsx` | `Pressable` (with `style={{ width, marginLeft, alignSelf }}`) wraps `Card` substrate; accent bar preserved | Simplest card — lowest risk |

### Explicitly Excluded

- `screens/transactions/filter/components/amount_accordion.tsx` — contested with SP-4. See Critical Exclusion.
- All commitments card files (`summary_header.tsx`, `current_cycle_card.tsx`, `payment_history.tsx`) — already use HeroUI `Card` directly (confirmed in parallelization plan). No change needed.
- `screens/transactions/detail/` container cards — SP-3's scope (trivial cards). Disjoint file domain confirmed.

---

## Architecture & Data Flow

### Accordion controlled-expansion mapping

The parent `FilterSheet` manages a single `openSection: 'accounts' | 'categories' | 'amount' | null` state field (in `filter.state.ts` via `useFilterSheet`). Each accordion receives:
- `expanded: boolean` — derived from `openSection === 'accounts'` etc.
- `onToggleSection: () => void` — toggles that section open/closed in the parent state.

HeroUI `Accordion.Root` maps to this as follows:

```ts
value={expanded ? 'section' : undefined}    // controlled: string when open, undefined when closed
onValueChange={(_newVal) => onToggleSection()} // delegate ALL changes to parent; parent owns state
```

The `onValueChange` callback receives either the item value string (toggling open) or `undefined` (collapsing when `isCollapsible=true`, which is the default). In both cases, `onToggleSection()` is the correct delegate — the parent's toggle logic already handles opening/closing correctly. The HeroUI `useControllableState` respects the controlled `value` prop, so the parent's state is always authoritative.

`isCollapsible` defaults to `true` — matching existing behavior where a second tap on an open accordion closes it.

### Card architecture

`Card` is purely presentational in this adoption: it replaces the outer `Pressable`'s surface role (background, border, corner radius, overflow clipping). All business logic (`buildInfoRows`, `availableCreditColor`, `nextDueDate`, `progress` calculation, `LinearGradient` color arrays) is unchanged — it lives in the card component bodies, not in the substrate.

No store, no hook, no state shape is affected. This is a pure render-layer swap.

### Reanimated dependency

HeroUI `Accordion` uses `react-native-reanimated` for the layout transition (spring) and content entering/exiting animations. Reanimated v4 is already in the stack. The layout transition fires on the `Animated.createAnimatedComponent(AccordionPrimitive.Root)` when items expand or collapse. This is additive — no existing animation is removed.

The animated chevron rotation in `Accordion.Indicator` is opt-in via `isAnimatedStyleActive` (default `true`). Setting `isAnimatedStyleActive={false}` with custom children disables the rotation worklet entirely, leaving our static icon swap behavior.

---

## Error Handling

No async, no I/O, no user input parsing. Error-handling surface is the same as before — none applicable at the component level.

---

## Testing

Per the project's **logic-only test policy** (no `.tsx` render tests), purely presentational changes get no new unit tests.

Verification:

1. **CI parity (6 jobs):** `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci && npx --yes expo-doctor && npx expo prebuild --no-install --platform android`. The filter sheet's existing hook/state tests (`filter.hook.ts`, `filter.state.ts`) and dashboard screen's hook tests must stay green — proving that controlled-expansion callbacks and card data logic are unaffected.
2. **TypeScript typecheck:** The HeroUI `Accordion` props (`value: string | undefined`, `onValueChange: (v: string | undefined) => void`, `selectionMode="single"`) must typecheck cleanly with strict mode. The `Accordion.Indicator` `isAnimatedStyleActive` prop must be accepted. The `Card` `asChild` prop (if used) or plain `Card` usage must typecheck. Verify no `@ts-ignore` is needed.
3. **Device QA gate (user):** Walk the filter sheet on a real device — confirm account and category accordions expand/collapse with the new spring animation, count badges appear correctly, selected pills display with dot+check, summary text renders in collapsed state. Confirm `amount_accordion` is unchanged (still on legacy `Pressable` shell). Confirm dashboard cards render identically: net-worth figure, commitments progress bar, account info rows, add-account card. Confirm all four cards are still pressable (navigate to correct destinations).

---

## Scope & Sequencing

**One PR: `feat/wave4-sp5-accordions-dashcards`**

Files created: 0
Files modified: 6

- `screens/transactions/filter/components/account_accordion.tsx`
- `screens/transactions/filter/components/category_accordion.tsx`
- `screens/dashboard/components/hero_card.tsx`
- `screens/dashboard/components/commitments_card.tsx`
- `screens/dashboard/components/account_card.tsx`
- `screens/dashboard/components/add_card.tsx`

Cut from `main` at the same time as SP-2, SP-3, SP-4-wrapper (Batch 1 parallel streams). No file overlaps with those streams confirmed in the parallelization plan.

After this PR merges, `amount_accordion.tsx`'s shell conversion waits for SP-4-adoption to merge, then proceeds as `feat/wave4-sp5-amount-accordion-shell` (Batch 3).

---

## Open Questions / Risks

1. **`shadow-surface` override.** HeroUI `Card` inherits Surface's `shadow-surface` default class. The dashboard cards do not use a shadow — they use a border. Whether `className="shadow-none"` in `tv` overrides the base `shadow-surface` depends on Unistyles/Taiwilwind v4 class merge order. If the override does not win, the cards will show an unexpected shadow. **Risk level: low-medium.** Mitigation: if `className` override fails, add `style={{ elevation: 0, shadowOpacity: 0 }}` on the Card.

2. **Accordion layout transition in BottomSheet.** HeroUI `Accordion` uses Reanimated `LinearTransition.springify()` (layout prop on `AnimatedRootView`). Inside `@gorhom/bottom-sheet`'s `BottomSheetScrollView`, layout animations can occasionally conflict with the sheet's own gesture handler. **Risk level: low** — the layout transition fires on the scroll container's children, not on the sheet itself. If animation artifacts appear (jank, layout jump), the mitigation is `animation="disable-all"` on the `Accordion.Root`, which disables the layout transition while keeping everything else.

3. **`Accordion.Trigger` default padding override.** The trigger's default `py-4 px-3 gap-4` is applied via `tv` base classes. Whether `className="py-0 px-0 gap-0"` on `Accordion.Trigger` wins depends on `tv`'s class merge strategy. If the override does not apply, the trigger will have extra top/bottom padding, making the accordion header taller than the current design. **Risk level: low-medium.** Mitigation: fall back to `style={{ padding: 0, gap: 0 }}` on `Accordion.Trigger`.

4. **`isAnimatedStyleActive={false}` type availability.** This prop is declared in `AccordionIndicatorProps` in the HeroUI source (confirmed). Verify it is exported in the compiled `lib/typescript/` types — if not, it was added in a patch or is only in source. Check the `.d.ts` during implementation.

---

## Out of Scope

- Token-source migration (dropped — see SP-1 Context).
- Any change to `amount_accordion.tsx` in this PR (Critical Exclusion).
- The `Accordion` filter sheet root grouping — each filter accordion is its own standalone `Accordion` root (one item each). A shared multi-item `Accordion` root for all three sections is explicitly out of scope because it would require merging the three components into one and fighting the controlled-state mapping through a shared `openSection` string.
- `Card.Header`, `Card.Body`, `Card.Footer` slot usage for dashboard cards — bespoke internal layouts are preserved as-is inside the `Card` surface substrate.
- Tabs/Dialog/Button/Chip/ListGroup migrations (other SPs).
- Batch 3 (`amount_accordion.tsx` shell) — separate PR after SP-4-adoption.
