---
paths:
  - "**/*.tsx"
  - "global.css"
---

# UI rules

## Styling

HeroUI Native composes Tailwind classes into Unistyles 3 styles at build time via Uniwind. Theme lives in `global.css` as CSS variables (`@theme inline`); Tailwind v4 is CSS-first — no `tailwind.config.js`.

- `cn(...)`: `import { cn } from 'heroui-native'` (no local `cn.ts`). Variants: `tv` from `tailwind-variants`.
- Theme slots: `bg-background`, `text-foreground`, `bg-surface`, `border-separator`, `text-muted`, `text-danger`, … — see `global.css`.
- Runtime hex (account swatches): `style={{ backgroundColor: hex }}` — `className` is build-time only.
- Module-level theme access (outside React) comes from two different files — mixing them up is a type error: `Colors`, `Size`, `Type`, `Spacing`, `Radius` live in `constants/theme.ts`; the raw palette (`CoreTokens`, `GoldTokens`, `SemanticTokens`, `InfoTokens`, `AccentTokens`, `AccentCCTokens`, `AcctTokens`) lives in `constants/theme_tokens.ts`. There is no `Colors` export in `theme_tokens.ts`.
- Font utilities (`font-sora`, `font-inter`) only emit CSS when the matching `--font-*` variable is declared in `global.css`'s `@theme inline` block — a missing variable fails silently on device with green CI (audit H15).

## Screen layout (critical gotcha)

**Every full-screen route uses `<Screen>`/`<ScreenScroll>` from `@/components/ui/screen` — never raw `SafeAreaView`.** Uniwind's `flex-1` className does not propagate reliably through `SafeAreaView` on Android Fabric — it collapses the flex chain and breaks all child layouts. `Screen` bakes `flex: 1` into the `style` prop instead. Same rule inside: use `style={{ flex: 1 }}` / `style={{ flexDirection: 'row' }}` for layout-critical containers; keep `className` for colors, padding, gap, typography.

## Components — Team Law 7

Load the **`heroui-native` skill** before building any UI: it carries the live catalog, the wrapper inventory, the `Sheet` API, and the BottomSheet patterns.

Standing non-HeroUI exceptions (layout/effect pieces HeroUI lacks): `Screen`/`ScreenScroll`, `HeroShell`, `FAB`, SVG textures. Extend that list only with sign-off — a custom component where a primitive fits needs a written "no HeroUI primitive fits" justification.

## Bottom sheets — the gotchas that bite

- `BottomSheet` is declarative (`isOpen` + `onOpenChange`). Handle close via `onOpenChange` — the inner `Content.onClose` only fires on swipe-down, not overlay-press / close-button / programmatic close.
- Scrollables inside sheets come from `@gorhom/bottom-sheet` (`BottomSheetScrollView`/`BottomSheetFlatList`), NOT `react-native`; set `enableOverDrag={false}`, `enableDynamicSizing={false}`, fixed height via `contentContainerClassName="h-full"`.
- Keyboard-aware inputs: `useBottomSheetAwareHandlers()` on `onFocus`/`onBlur` + `keyboardBehavior="extend"` on `Content`.
- Every sheet goes through `components/ui/sheet.tsx` (HeroUI-backed) or HeroUI `BottomSheet` directly. `@gorhom/bottom-sheet` stays in the tree only as HeroUI's rendering engine — never hand-roll a gorhom wrapper.
- HeroUI `Card`/`Dialog.Content` wrap `Surface` — **no border, ever, by default**; see the Card = Surface trap in the `heroui-native` skill before migrating a `View` to `Card`.

## Design System — Cairo Nights

All values in `constants/theme.ts`, scaled with `ms()`/`msFont()`. Never hardcode hex/spacing/radius.

- **Typography:** Sora (numbers, headings, CTAs) · Inter (body, labels, secondary).
- **Numbers:** `Intl.NumberFormat('en-US', { style: 'decimal' })` → `122,300`.
- **CTA:** `Size.ctaHeight` (52) · `Radius.cta` (13) · gold gradient on midnight-blue text.
- **Strings:** all user-visible copy in `constants/strings.ts`.
