# Wave 4 SP-5 Batch 3 — `amount_accordion` shell → HeroUI Accordion

> **For agentic workers:** This is the deferred Batch 3 of SP-5. Design is already signed off in `docs/superpowers/specs/2026-05-25-wave4-sp5-accordions-cards-design.md` (see "Critical Exclusion: amount_accordion.tsx" and "Deferred work"). No new spec sign-off needed — this executes the already-approved SP-5 intent now that the file contention with SP-4-adoption (#116) is cleared.

**Goal:** Convert the last unmigrated filter accordion shell (`amount_accordion.tsx`) from the legacy `Pressable` + conditional-render pattern to HeroUI `Accordion`, resolving the documented temporary 2-of-3 inconsistency.

**Architecture:** Byte-exact mirror of the two already-merged siblings (`account_accordion.tsx`, `category_accordion.tsx`, merged in #114). Controlled single-section expansion via `selectionMode="single"` + `value`/`onValueChange`, static chevron via `Accordion.Indicator isAnimatedStyleActive={false}`.

**Tech Stack:** HeroUI Native `Accordion`, Unistyles 3 / Uniwind, React Native `View`.

---

## Hard invariants (Wave 4)

- **ZERO rendered-text change.** Every visible label byte-identical (`Strings.filterSectionAmount`, the `1` badge, `summary`, currency labels, min/max labels, placeholders). No copy edits.
- **Behavior + a11y parity.** Trigger press toggles the amount section exactly as before. `Accordion.Trigger` supplies the button role + expanded state that the old `accessibilityRole="button"` / `accessibilityState={{ expanded }}` provided — this is the same accepted normalization already shipped on the two siblings.
- **Content sub-tree untouched.** The SegmentedTabs + min/max Input block (current lines 73–117 inner content) landed in #116 and must remain byte-identical; only its wrapper moves from `{expanded ? <View className="mt-3"> : null}` into `<Accordion.Content>`.
- **Local input state untouched.** `minStr`/`maxStr` `useState` + the sync `useEffect` are pre-existing controlled-input state, out of scope — do NOT refactor to a store.
- **Badge stays as-is.** Amount's active badge is `bg-accent/15 items-center rounded-full px-1.5` (no `min-w-[18px]`) because it only ever shows `1`. Do NOT copy the siblings' `min-w-[18px]` — that would be a visual delta.

## Files

- Modify: `screens/transactions/filter/components/amount_accordion.tsx`

## Task 1: Convert the shell

- [ ] **Step 1: Swap imports** — drop `Pressable` (only used by the old header), add `import { Accordion } from 'heroui-native';`. Result (oxfmt will finalize sort order):

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Accordion } from 'heroui-native';
import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
```

- [ ] **Step 2: Replace the `<Pressable>` header + `{expanded ? ... : null}` block** with the `Accordion` structure. The header row content and the content sub-tree are preserved verbatim — only the wrapper changes:

```tsx
return (
  <View className="border-separator bg-surface mb-2 rounded-xl border p-3.5">
    <Accordion
      selectionMode="single"
      value={expanded ? 'section' : undefined}
      onValueChange={(_v: string | undefined) => onToggleSection()}
    >
      <Accordion.Item value="section">
        <Accordion.Trigger className="gap-0 px-0 py-0" style={{ padding: 0, gap: 0 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Text className="font-inter text-[13px] font-semibold">
                {Strings.filterSectionAmount}
              </Text>
              {active ? (
                <View className="bg-accent/15 items-center rounded-full px-1.5">
                  <Text className="font-inter text-accent text-[10px] font-bold">1</Text>
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
        <Accordion.Content className="px-0 pb-0" style={{ padding: 0 }}>
          <View className="mt-3">
            {/* SegmentedTabs + min/max Inputs — UNCHANGED from #116 */}
          </View>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  </View>
);
```

- [ ] **Step 3: Verify content sub-tree byte-identical** — `git diff` must show the SegmentedTabs block and both Input rows unchanged (only re-indented one level deeper inside `Accordion.Content`).

## Task 2: Verify + ship

- [ ] **Step 1: CI parity (JS/TS jobs)** — `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci --maxWorkers=2`. expo-doctor/prebuild left to GitHub CI (no native deps change).
- [ ] **Step 2: Diff gate** — confirm the only structural delta is the `Pressable`→`Accordion` shell swap; no rendered text changed (`git diff` review against the invariants above).
- [ ] **Step 3: Commit + push + open PR.**
- [ ] **Step 4: Independent code review** (`requesting-code-review`).
- [ ] **Step 5: Device QA gate (user)** — walk the filter sheet: amount section expands/collapses with the same spring animation as the account/category siblings, count badge (`1`) appears when min/max set, currency toggle + min/max inputs behave identically, collapsed summary renders. Confirms the 2-of-3 inconsistency is resolved (all three accordions now consistent).
