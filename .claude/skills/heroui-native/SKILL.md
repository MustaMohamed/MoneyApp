---
name: heroui-native
description: "HeroUI Native component library for React Native (Tailwind v4 via Uniwind). Use when building mobile UIs with HeroUI Native — creating Buttons, Cards, TextFields, Dialogs; installing heroui-native; configuring dark/light themes; or fetching component docs. Keywords: HeroUI Native, heroui-native, React Native UI, Uniwind, mobile components."
metadata:
  author: heroui
  version: "2.0.1"
---

# HeroUI Native Development Guide

HeroUI Native is a component library built on **Uniwind (Tailwind CSS for React Native)** and **React Native**, providing accessible, customizable UI components for mobile applications.

---

## Installation

```bash
curl -fsSL https://heroui.com/install | bash -s heroui-native
```

---

## CRITICAL: Native Only - Do Not Use Web Patterns

**This guide is for HeroUI Native ONLY.** Do NOT apply HeroUI React (web) patterns — the package, styling engine, and color format all differ:

| Feature      | React (Web)          | Native (Mobile)                     |
| ------------ | -------------------- | ----------------------------------- |
| **Styling**  | Tailwind CSS v4      | Uniwind (Tailwind for React Native) |
| **Colors**   | oklch format         | HSL format                          |
| **Package**  | `@heroui/react` 	  | `heroui-native`                     |
| **Platform** | Web browsers         | iOS & Android                       |

```tsx
// CORRECT — Native pattern
import { Button } from "heroui-native";

<Button variant="primary" onPress={() => console.log("Pressed!")}>
	Click me
</Button>;
```

**Always fetch Native docs before implementing.**

---

## Core Principles

- Semantic variants (`primary`, `secondary`, `tertiary`) over visual descriptions
- Composition over configuration (compound components)
- Theme variables with HSL color format
- React Native StyleSheet patterns with Uniwind utilities

---

## Accessing Documentation & Component Information

**For component details, examples, props, and implementation patterns, always fetch documentation:**

### Using Scripts

```bash
# List all available components
node scripts/list_components.mjs

# Get component documentation (MDX)
node scripts/get_component_docs.mjs Button
node scripts/get_component_docs.mjs Button Card TextField

# Get theme variables
node scripts/get_theme.mjs

# Get non-component docs (guides, releases)
node scripts/get_docs.mjs /docs/native/getting-started/theming
```

### Direct MDX URLs

Component docs: `https://heroui.com/docs/native/components/{component-name}.mdx`

Examples:

- Button: `https://heroui.com/docs/native/components/button.mdx`
- Dialog: `https://heroui.com/docs/native/components/dialog.mdx`
- TextField: `https://heroui.com/docs/native/components/text-field.mdx`

Getting started guides: `https://heroui.com/docs/native/getting-started/{topic}.mdx`

**Important:** Always fetch component docs before implementing. The MDX docs include complete examples, props, anatomy, and API references.

---

## Installation Essentials

### Quick Install

```bash
npm i heroui-native react-native-reanimated react-native-gesture-handler react-native-safe-area-context @gorhom/bottom-sheet react-native-svg react-native-worklets tailwind-merge tailwind-variants
```

### Framework Setup (Expo - Recommended)

1. **Install dependencies:**

```bash
npx create-expo-app MyApp
cd MyApp
npm i heroui-native uniwind tailwindcss
npm i react-native-reanimated react-native-gesture-handler react-native-safe-area-context @gorhom/bottom-sheet react-native-svg react-native-worklets tailwind-merge tailwind-variants
```

2. **Create `global.css`:**

```css
@import "tailwindcss";
@import "uniwind";
@import "heroui-native/styles";

@source "./node_modules/heroui-native/lib";
```

3. **Wrap app with providers:**

```tsx
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { HeroUINativeProvider } from "heroui-native";
import "./global.css";

export default function Layout() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<HeroUINativeProvider>
				<App />
			</HeroUINativeProvider>
		</GestureHandlerRootView>
	);
}
```

### Critical Setup Requirements

1. **Uniwind is Required** - HeroUI Native uses Uniwind (Tailwind CSS for React Native)
2. **HeroUINativeProvider Required** - Wrap your app with `HeroUINativeProvider`
3. **GestureHandlerRootView Required** - Wrap with `GestureHandlerRootView` from react-native-gesture-handler
4. **Use Compound Components** - Components use compound structure (e.g., `Card.Header`, `Card.Body`)
5. **Use onPress, not onClick** - React Native uses `onPress` event handlers
6. **Platform-Specific Code** - Use `Platform.OS` for iOS/Android differences

---

## Component Patterns

HeroUI Native uses **compound component patterns**. Each component has subcomponents accessed via dot notation.

**Example - Card:**

```tsx
<Card>
	<Card.Header>{/* Icons, badges */}</Card.Header>
	<Card.Body>
		<Card.Title>Title</Card.Title>
		<Card.Description>Description</Card.Description>
	</Card.Body>
	<Card.Footer>{/* Actions */}</Card.Footer>
</Card>
```

**Key Points:**

- Always use compound structure - don't flatten to props
- Subcomponents are accessed via dot notation (e.g., `Card.Header`)
- Native Card uses `Card.Body` (not `Card.Content`); Title and Description go inside Body
- **Fetch component docs for complete anatomy and examples**

---

## Semantic Variants

HeroUI uses semantic naming to communicate functional intent:

| Variant       | Purpose                           | Usage          |
| ------------- | --------------------------------- | -------------- |
| `primary`     | Main action to move forward       | 1 per context  |
| `secondary`   | Alternative actions               | Multiple       |
| `tertiary`    | Dismissive actions (cancel, skip) | Sparingly      |
| `danger`      | Destructive actions               | When needed    |
| `danger-soft` | Soft destructive actions          | Less prominent |
| `ghost`       | Low-emphasis actions              | Minimal weight |
| `outline`     | Secondary actions                 | Bordered style |

**Don't use raw colors** - semantic variants adapt to themes and accessibility.

---

## Theming

HeroUI Native uses CSS variables via Tailwind/Uniwind for theming. Theme colors are defined in `global.css`:

```css
@theme {
	--color-accent: hsl(260, 100%, 70%);
	--color-accent-foreground: hsl(0, 0%, 100%);
}
```

**Get current theme variables:**

```bash
node scripts/get_theme.mjs
```

**Access theme colors programmatically:**

```tsx
import { useThemeColor } from "heroui-native";

const accentColor = useThemeColor("accent");
```

**Theme switching (Light/Dark Mode):**

```tsx
import { Uniwind, useUniwind } from "uniwind";

const { theme } = useUniwind();
Uniwind.setTheme(theme === "light" ? "dark" : "light");
```

For detailed theming, fetch: `https://heroui.com/docs/native/getting-started/theming.mdx`

---

# MoneyApp Project Addendum

<!-- MAINTENANCE: everything below this line is project-owned, NOT part of the upstream
     heroui vendor skill (metadata above says author: heroui). If you refresh the vendor
     skill content, re-append this addendum — deleting it orphans the HeroUI catalog and
     sheet patterns that CLAUDE.md deliberately evicted here. -->

Project-specific HeroUI usage. This section is the single source for the installed catalog and sheet patterns (evicted from CLAUDE.md per progressive disclosure).

## Installed catalog (heroui-native v1.0.3 — check before writing anything)

Accordion, Alert, Avatar, **BottomSheet**, Button, Card, Checkbox, Chip, CloseButton, Dialog, Input (+ InputGroup, InputOTP, TextField, TextArea, SearchField), Label, LinkButton, ListGroup, Menu (+ SubMenu), Popover, PressableFeedback, Radio (+ RadioGroup), ScrollShadow, Select, Separator, Skeleton (+ SkeletonGroup), Slider, Spinner, Surface, Switch, Tabs, TagGroup, Text, Toast, and form helpers (ControlField, Description, FieldError).

Component docs: `node_modules/heroui-native/src/components/<name>/<name>.md`.

## Project wrappers (`src/components/ui/`)

`Screen`, `ScreenScroll`, `Text`, `EmptyState`, `FAB`, `Sheet` — compose these; never bypass them for their covered roles.

## `Sheet` wrapper — every sheet in the app

`src/components/ui/sheet.tsx` — thin declarative wrapper (`isOpen`/`onOpenChange`, `size`, `scrollable`, `footer`) composing HeroUI `BottomSheet`. Build new sheets on `Sheet` (or HeroUI `BottomSheet` directly). Never hand-roll a `@gorhom/bottom-sheet` wrapper — gorhom exists in the tree only as HeroUI's rendering engine.

## BottomSheet — full pattern

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

- Close handling: `onOpenChange` only — `Content.onClose` fires solely on swipe-down.
- Scrollables: `BottomSheetScrollView` / `BottomSheetFlatList` from `@gorhom/bottom-sheet` (NOT `react-native`), with `enableOverDrag={false}`, `enableDynamicSizing={false}`, fixed height via `contentContainerClassName="h-full"`.
- Keyboard: `useBottomSheetAwareHandlers()` on `onFocus`/`onBlur` + `keyboardBehavior="extend"` on `Content`.

## Card = Surface trap (device-QA-only bug class)

HeroUI `Card` / `Dialog.Content` wrap `Surface`: base is `bg-surface p-4 rounded-3xl shadow-surface overflow-hidden`; the default variant adds ONLY `bg-surface`. **No border, ever.** When migrating a `View` to `Card`, pass `border border-separator`, `rounded-2xl`, and `p-0` explicitly, and kill the shadow via `style={{ elevation: 0, shadowOpacity: 0 }}` — className `shadow-none` will NOT override the custom shadow token. These are runtime visual deltas: CI stays green; only device QA or a visual diff catches them.
