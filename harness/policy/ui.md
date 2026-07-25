# User interface

## Styling

HeroUI Native composes Tailwind classes (`className=`) into Unistyles 3 styles at build time via Uniwind. Theme lives in `global.css` as CSS variables under `@layer theme { @variant dark { ... } }`, exposed to Tailwind via `@theme inline`. There is no `tailwind.config.js` — Tailwind v4 is CSS-first.

- `cn(...)` utility: `import { cn } from 'heroui-native'`. There is no `src/utils/cn.ts`.
- Theme color slots: `bg-background`, `text-foreground`, `bg-surface`, `bg-default`, `border-border`, `border-separator`, `text-accent`, `text-muted`, `text-danger`, etc. See `global.css` for the full list.
- Variant composition: `import { tv } from 'tailwind-variants'` for opinionated wrappers in `src/components/ui/`.
- Runtime hex (e.g. account swatches): pass `style={{ backgroundColor: hex }}` — `className` is build-time only.
- Module-level theme access (`SystemUI.setBackgroundColorAsync`, `expo-linear-gradient` colors, `MaterialCommunityIcons` color prop): import `Colors` / `GoldTokens` / `CoreTokens` from `src/constants/theme_tokens.ts` directly (cannot use `useThemeColor` hook outside React).

### Screen layout (critical)

**Use `<Screen>` and `<ScreenScroll>` from `@/components/ui/screen` for every full-screen route.** Do not use `SafeAreaView` from `react-native-safe-area-context` directly.

Uniwind's `flex-1` className does not propagate reliably through `SafeAreaView`'s wrapper on Android Fabric — using it as the root with `className="flex-1"` collapses the flex chain and breaks all child layouts. `Screen` bakes `flex: 1` into the `style` prop instead, fixing the issue.

```tsx
import { Screen, ScreenScroll } from '@/components/ui/screen';

<Screen>
  <Header />
  <ScreenScroll>
    {/* content */}
  </ScreenScroll>
  <Box className="border-t border-separator pt-2 px-4 pb-6">{/* CTA */}</Box>
</Screen>
```

`Screen` defaults: `edges={['top', 'bottom']}`, `bg-background`. Override via `edges`/`className` props.
`ScreenScroll` defaults: `style={{ flex: 1 }}`, `contentContainerStyle={{ flexGrow: 1 }}`.

Same rule for inner flex-row/flex-1 rows: when in doubt, use `style={{ flexDirection: 'row' }}` / `style={{ flex: 1 }}` for layout-critical containers rather than `className="flex-row"` / `className="flex-1"`. Keep `className` for colors, padding, gap, typography.

## Components

**HeroUI Native components are mandatory. Use a HeroUI Native component wherever one exists — never hand-roll or pull a third-party equivalent.** (Binding: Team Law 7.)

Installed catalog (`heroui-native` v1.0.3 — check it before writing anything): Accordion, Alert, Avatar, **BottomSheet**, Button, Card, Checkbox, Chip, CloseButton, Dialog, Input (+ InputGroup, InputOTP, TextField, TextArea, SearchField), Label, LinkButton, ListGroup, Menu (+ SubMenu), Popover, PressableFeedback, Radio (+ RadioGroup), ScrollShadow, Select, Separator, Skeleton (+ SkeletonGroup), Slider, Spinner, Surface, Switch, Tabs, TagGroup, Text, Toast, and form helpers (ControlField, Description, FieldError).

Project wrappers in `src/components/ui/` compose HeroUI: `Screen`, `ScreenScroll`, `Text`, `EmptyState`, `SettingsSection`, `FAB`, `Sheet` (HeroUI-backed — see Bottom Sheets). Compose these.

**Introducing a custom or third-party UI component that a HeroUI primitive could cover is a critical trigger — it needs sign-off + a written "no HeroUI primitive fits" justification.** If a HeroUI primitive almost fits but needs tweaks, compose/wrap it — never build a parallel implementation. The only standing non-HeroUI primitives are layout/effect pieces HeroUI does not provide (`Screen`/`ScreenScroll` full-screen layout, the gold-gradient `HeroShell`, `FAB`, SVG textures); extend that list only with sign-off.

(§5 example: a custom `SegmentSwitcher` was replaced with `Tabs` from `heroui-native` before merge.)

## Bottom Sheets

**Use HeroUI Native's `BottomSheet` (compound component). Do NOT hand-roll a `@gorhom/bottom-sheet` wrapper.**

`BottomSheet` is declarative and controlled via `isOpen` + `onOpenChange`. Always handle close through `onOpenChange` (the inner `Content.onClose` only fires on swipe-down, not on overlay-press / close-button / programmatic close). `@gorhom/bottom-sheet` stays in the tree **only as HeroUI's rendering engine** — `BottomSheet.Content` IS a gorhom sheet, and scrollables are still imported from `@gorhom/bottom-sheet`.

```tsx
import { BottomSheet, Button } from 'heroui-native';

<BottomSheet isOpen={isOpen} onOpenChange={setIsOpen}>
  <BottomSheet.Trigger asChild><Button>{Strings.open}</Button></BottomSheet.Trigger>
  <BottomSheet.Portal>
    <BottomSheet.Overlay />
    <BottomSheet.Content>
      <BottomSheet.Close />
      <BottomSheet.Title>{Strings.title}</BottomSheet.Title>
      <BottomSheet.Description>{Strings.desc}</BottomSheet.Description>
      {/* body */}
    </BottomSheet.Content>
  </BottomSheet.Portal>
</BottomSheet>
```

**Scrollable content:** import `BottomSheetScrollView` / `BottomSheetFlatList` from `@gorhom/bottom-sheet` (NOT `react-native`) and nest inside `BottomSheet.Content`; set `enableOverDrag={false}`, `enableDynamicSizing={false}`, and a fixed height via `contentContainerClassName="h-full"`.
**Keyboard-aware inputs:** wire `useBottomSheetAwareHandlers()` onto the input's `onFocus`/`onBlur` and set `keyboardBehavior="extend"` on `Content`.

**`Sheet` wrapper:** every sheet in the app goes through the HeroUI-backed `Sheet` primitive at `src/components/ui/sheet.tsx` — a thin declarative wrapper (`isOpen`/`onOpenChange`, `size`, `scrollable`, `footer`) composing HeroUI `BottomSheet`. The migration off the old hand-rolled `@gorhom` wrapper is complete; no imperative gorhom-ref wrapper exists anywhere. Build new sheets on `Sheet` (or HeroUI `BottomSheet` directly); never hand-roll a new `@gorhom` wrapper.

## Patches

`patch-package` auto-applies on `npm install` via the `postinstall` script. Patch files live in `patches/`. Never edit a shipped patch — create a new one if the fix needs updating.

## Design System — Cairo Nights

All values in `src/constants/theme.ts`. Never hardcode.

- **Typography:** Sora (numbers, headings, CTAs) · Inter (body, labels, secondary).
- **Numbers:** `Intl.NumberFormat('en-US', { style: 'decimal' })` → `122,300`.
- **CTA:** `Size.ctaHeight` (52) · `Radius.cta` (13) · gold gradient on midnight-blue text.
