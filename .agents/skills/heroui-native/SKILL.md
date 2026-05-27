---
name: heroui-native
description: >
  MoneyApp HeroUI Native guidance. Use when building, reviewing, or refactoring
  React Native UI in this repository with HeroUI Native, Uniwind, Tailwind v4,
  BottomSheet, Button, Card, Input/TextField, Dialog, Tabs, Chip, Select,
  Switch, ListGroup, Popover, Accordion, PressableFeedback, or when deciding if
  a custom component is justified. This skill is repo-local: read installed
  docs from node_modules/heroui-native/src/components and do not install
  packages or fetch remote HeroUI docs during routine work.
metadata:
  author: moneyapp
  version: "1.0.0"
---

# MoneyApp HeroUI Native Guide

HeroUI Native is already installed and configured in this Expo app. This skill
exists to keep UI work aligned with the local package version and MoneyApp's
design rules.

## Hard Rules

- Do not install `heroui-native`, `uniwind`, Tailwind, Reanimated, Gesture
  Handler, or BottomSheet dependencies from this skill. Dependency changes are
  a critical trigger.
- Do not fetch remote HeroUI docs during routine work. Use local docs for the
  installed version.
- Do not use HeroUI React web patterns or `@heroui/react`.
- Use `onPress`, not `onClick`.
- Use `PressableFeedback` from `heroui-native`, not `Pressable` from
  `react-native`, when a tappable HeroUI-style primitive is needed.
- Use HeroUI `BottomSheet` through the existing shared wrappers. Do not hand-roll
  a new `@gorhom/bottom-sheet` wrapper.
- Use `className` for colors, spacing, typography, and variants; use `style` for
  layout-critical `flex`, `flexDirection`, dynamic dimensions, and runtime
  colors.

## Local Documentation

Before implementing or reviewing a HeroUI component, inspect the installed docs:

```bash
ls node_modules/heroui-native/src/components
sed -n '1,220p' node_modules/heroui-native/src/components/<name>/<name>.md
```

Examples:

```bash
sed -n '1,220p' node_modules/heroui-native/src/components/button/button.md
sed -n '1,220p' node_modules/heroui-native/src/components/bottom-sheet/bottom-sheet.md
sed -n '1,220p' node_modules/heroui-native/src/components/tabs/tabs.md
```

If the exact component docs are absent, inspect the component source under the
same package path and follow existing MoneyApp usage before inventing a wrapper.

## Component Choice

Prefer installed HeroUI primitives for:

- actions: `Button`, `LinkButton`, `CloseButton`, `PressableFeedback`
- structure: `Card`, `Surface`, `ListGroup`, `Accordion`, `Separator`
- inputs: `Input`, `TextField`, `TextArea`, `SearchField`, `Select`, `Switch`,
  `Checkbox`, `RadioGroup`, `Slider`
- overlays: `Dialog`, `Popover`, `BottomSheet`, `Menu`
- status and feedback: `Chip`, `TagGroup`, `Alert`, `Toast`, `Skeleton`,
  `Spinner`

Creating a custom or third-party replacement for an available HeroUI primitive
requires a written justification and user sign-off.

## MoneyApp Patterns

- Full-screen routes use `Screen` / `ScreenScroll` from `@/components/ui/screen`.
- Shared app wrappers live under `components/ui/`.
- Domain-specific components live under `modules/<domain>/`.
- User-visible copy belongs in `constants/strings.ts`.
- Theme tokens belong in `constants/theme.ts` or `constants/theme_tokens.ts`.
- Runtime account/category colors use `style={{ backgroundColor: value }}`.

## Review Checklist

When reviewing UI code:

1. Confirm the relevant local HeroUI doc/source was checked.
2. Confirm no web HeroUI imports or React Native `Pressable` regressions.
3. Confirm route screens use `Screen` / `ScreenScroll`.
4. Confirm bottom sheets use existing shared sheet patterns.
5. Confirm text fits mobile containers and covers empty/loading/error/populated
   states where applicable.
6. Confirm no dependency install, remote doc fetch, or new UI library was added
   without explicit approval.
