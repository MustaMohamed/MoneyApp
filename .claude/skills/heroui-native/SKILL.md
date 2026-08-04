---
name: heroui-native
description: "Use when building or changing any MoneyApp UI — screens, sheets, forms, cards, buttons, lists, badges, dialogs — or when choosing between a HeroUI Native primitive, an existing project wrapper, and a custom component. Keywords: HeroUI Native, heroui-native, component, sheet, BottomSheet, Card, Surface, Uniwind, Tailwind class, wrapper."
metadata:
  owner: moneyapp
  targets: heroui-native@1.0.8
---

# HeroUI Native in MoneyApp

MoneyApp runs **heroui-native 1.0.8** on Uniwind (Tailwind v4 for React Native). This skill is the mechanics of Team Law 7 (stated in CLAUDE.md) — how to find the right primitive and use it correctly.

## The docs that are true for this project

**`node_modules/heroui-native/src/components/<name>/<name>.md` is the source of truth.** It ships with the installed version — exact props, anatomy, and examples for the code actually in the bundle. Read the doc for a component before you use it. A few dirs have no doc; `npm run ui:inventory` names them, so trust that output over any list written down here.

**heroui.com serves 2.x docs.** The site and the `scripts/*.mjs` helpers in this skill folder describe a newer major than the one installed — APIs there may not exist here. Treat them as upstream reference only, never as the spec for a change. (Those scripts also run from this skill's directory, not the repo root.)

## Before building anything: print the inventory

```bash
npm run ui:inventory
```

Lists the installed HeroUI catalog and every wrapper in `src/components/ui/` with its exported symbol, read from disk at the moment you run it. Building a component the repo already has is the most common wasted change here, and a written catalog would go stale on the next `npm i` — so check the output, not a list in a document.

Compose or extend an existing wrapper; don't bypass one for the role it covers.

**Two catalog entries are not usable as-is.** `GlassView` and the `blur` overlay variant need `expo-blur`, an optional peer this project does not install — the library catches the missing module and silently falls back to a solid backdrop (and only ever blurs on iOS anyway), so a `GlassView` renders as nothing you asked for rather than failing loudly. Adding `expo-blur` is a new dependency, i.e. critical trigger 4. `ThemeBackground` ships no local doc; read its source before using it.

## API shape

- **Compound components, always.** `Card.Header` / `Card.Body` / `Card.Title` / `Card.Description` / `Card.Footer` — Title and Description go *inside* Body. Don't flatten to props.
- **Text is called `Typography`.** `import { Typography } from 'heroui-native'` — `Text` is a deprecated alias of the same component and fails type-aware lint. Distinct from `@/components/ui/text`, the project's Cairo Nights wrapper over React Native `Text`; both exist and both are current.
- **Semantic variants** (exact set in 1.0.8): `primary`, `secondary`, `tertiary`, `danger`, `danger-soft`, `ghost`, `outline`. One `primary` per context. Never raw colours.
- **`onPress`, not `onClick`.** This is React Native — HeroUI React (web) patterns, `@heroui/react` imports, and oklch colours do not apply.
- `cn` comes from `heroui-native`. Variants come from `tailwind-variants`.

## Sheets

Every sheet goes through `src/components/ui/sheet.tsx` (`isOpen` / `onOpenChange` / `size` / `scrollable` / `footer`) or HeroUI `BottomSheet` directly. `@gorhom/bottom-sheet` is in the tree **only** as HeroUI's rendering engine — never hand-roll a gorhom wrapper.

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

- Close handling: `onOpenChange` only — `Content.onClose` fires solely on swipe-down, so overlay-press, close-button, and programmatic closes silently skip it.
- Scrollables: `BottomSheetScrollView` / `BottomSheetFlatList` from `@gorhom/bottom-sheet` (NOT `react-native`), with `enableOverDrag={false}`, `enableDynamicSizing={false}`, fixed height via `contentContainerClassName="h-full"`.
- Keyboard: `useBottomSheetAwareHandlers()` on `onFocus`/`onBlur` + `keyboardBehavior="extend"` on `Content`.

## Card = Surface trap (device-QA-only bug class)

HeroUI `Card` wraps `Surface`, whose base resolves to `p-4 rounded-3xl shadow-surface overflow-hidden` with `bg-surface` from the default variant. `Dialog.Content` does not wrap `Surface` — it carries its own `bg-overlay p-5 rounded-3xl shadow-overlay` — but lands in the same trap. **Neither has a border, ever.** Migrating a `View` to `Card` therefore needs `border border-separator`, `rounded-2xl`, and `p-0` passed explicitly, plus `style={{ elevation: 0, shadowOpacity: 0 }}` to kill the shadow — className `shadow-none` will NOT override the custom shadow token. CI stays green on all of this; only device QA catches it.

Since 1.0.7 those defaults are defined in `node_modules/heroui-native/src/styles/components/<name>.css` (`.surface__root`, `.dialog__content`) rather than as Tailwind strings in `<name>.styles.ts`, which now only name the class. Resolved values are unchanged — read the CSS when you need to know what a primitive actually paints.

## Common mistakes

| Mistake | Reality |
|---|---|
| Fetching heroui.com docs for an API | That's 2.x. Read `node_modules/heroui-native/src/components/<name>/<name>.md`. |
| Building a component `src/components/ui/` already has | Run `npm run ui:inventory` first — this is the most common wasted change here. |
| `shadow-none` on a Card | Custom shadow token wins. Use the `style` override. |
| Handling sheet close via `Content.onClose` | Fires only on swipe-down. Use `onOpenChange`. |
| Importing scrollables from `react-native` inside a sheet | Gesture conflict. Use the `@gorhom/bottom-sheet` variants. |
