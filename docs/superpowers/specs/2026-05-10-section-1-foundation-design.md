# Section 1 · Foundation — Design Spec

**Date:** 2026-05-10
**Status:** Draft (pending plan + approval)
**Owners:** [tariq] technical · [marcus] design tokens · [sarah] sequencing
**Section:** 1 of 9 (Foundation) within the *Full reset = rebrand + library + IA restructure* mega-initiative.

---

# Part A · Initiative Overview

*This part is shared context across all 9 section specs. It does not change between sections.*

## The mega-initiative

MoneyApp's existing custom UI accumulated bugs and inconsistencies. Decision: full reset rather than surgical fixes. Three things change at once:

1. **UI library** — swap hand-rolled components for `gluestack-ui v2 + NativeWind` (Tailwind for RN). Replaces the patched `react-native-actions-sheet` with gluestack's `Actionsheet`.
2. **Brand expression** — apply *Cairo Nights Extended* palette (additions to existing tokens, fully backwards-compatible).
3. **Information architecture** — 8 cleanup changes to existing screens. Zero new features, zero new screens, zero new tabs.

Delivery model: **vertical-slice, one section per conversation**. Each section ships a complete migrated screen-group end-to-end (IA + library + brand + tests). No big-bang rewrite.

## Locked decisions (do not re-open)

### Library
**gluestack-ui v2 + NativeWind.** Headless component primitives + Tailwind classes. Compatible with Expo Go (no `expo-dev-client`, no `prebuild`). Replaces all hand-rolled components and the patched `react-native-actions-sheet` over the course of §3-9.

gluestack v2 is a **copy-paste primitives model** — there is no `GluestackUIProvider`, no `gluestack-ui.config.ts`, no `@gluestack-style/react`. Headless primitives (`@gluestack-ui/pressable`, `@gluestack-ui/button`) are used as optional foundations; all styling is applied via NativeWind classes and `cva`.

### Brand · Cairo Nights Extended palette

All additions are **backwards-compatible** with existing tokens in `constants/theme.ts`. New names are pure additions; existing names unchanged.

**Core (unchanged):** `bg #0F1923` · `surface #1A2535` · `surfaceEl #243044` · `border #2A3A4F` · `text1 #F0EBE3` · `text2 #6B7F99` · `text3 #4A5568`.

**Brand · Gold (4 stops):** `gold-400 #E0B968` (highlight, NEW) · `gold-500 #D4A44C` (default) · `gold-600 #C9973A` (CTA gradient end) · `gold-700 #A47C2C` (pressed, NEW).

**Semantic:** `positive #4CAF82` · `negative #E05A42` · **`warning #E8B130`** (saffron, NEW — fills warning gap) · `info #4A7ABF`.

**Cultural accents (4, NEW — trimmed from 6):** `nile #2D7D6E` · `spice #C45C2A` · `lapis #185FA5` · `sand #C9A876`. `plum` and `rose` exist only as account swatches (`acct.plum.*` / `acct.rose.*`) and are not standalone accent tokens.

**Account swatches (24, NEW):** 12 hue families × 2 tonal stops (Rich + Soft):

| Family | Rich | Soft | Rich usage | Soft usage |
|---|---|---|---|---|
| Royal Midnight | #1B2B4B | #3D4E73 | Card background | List-row dot / avatar chip |
| Cairo Gold | #C9973A | #E0B968 | Card background | List-row dot / avatar chip |
| Nile Teal | #2D7D6E | #5BA597 | Card background | List-row dot / avatar chip |
| Paprika | #C45C2A | #E08456 | Card background | List-row dot / avatar chip |
| Plum | #5A2D55 | #8B5685 | Card background | List-row dot / avatar chip |
| Lapis | #185FA5 | #4A88C4 | Card background | List-row dot / avatar chip |
| Rose | #B8526D | #D88197 | Card background | List-row dot / avatar chip |
| Sand | #C9A876 | #E0C99A | Card background | List-row dot / avatar chip |
| Amethyst | #7B3F8C | #A87AB5 | Card background | List-row dot / avatar chip |
| Emerald | #4CAF82 | #7AC9A4 | Card background | List-row dot / avatar chip |
| Saffron | #D4830A | #E8A848 | Card background | List-row dot / avatar chip |
| Steel Blue | #4A6FA5 | #7894C0 | Card background | List-row dot / avatar chip |

**Rich/Soft semantics (Marcus, locked):** Rich = card/tile background. Soft = list-row dot or avatar chip rendered on `surface` or `surfaceEl`. Per-family default mapping: every family ships Rich as the primary account card color; Soft is derived from the same hue at higher lightness for use in compact list contexts.

### Scope
Pure cleanup. **No new features, no new screens, no new tabs.** The 8 IA changes (summarized below) are the entire user-facing scope. Polish enhancements per screen may land in their relevant section spec but are bounded by "doesn't add a feature, doesn't add a screen."

### Out of scope (the entire initiative)
- New tabs (Accounts/Insights/Budgets stay deferred)
- Global Search
- Insights/Reports
- Budgets
- Real PIN/biometric (Onboarding O3 stays UI-only per CLAUDE.md business rule 6)
- Data model, business rule, or financial-formula changes

## The 9 sections (sequence may be reordered post-§1)

| # | Section | Owner | Approx duration |
|---|---|---|---|
| **1** | **Foundation** ← *this spec* | [tariq] | 2-3 days |
| 2 | Onboarding (4 screens) | [marcus] + [dev] | 3-5 days |
| 3 | Reusable patterns (Sheet · FAB · EmptyState · SettingsSection) | [tariq] + [dev] | 2-3 days |
| 4 | Settings (list · Currency sheet · Categories · Security · About) | [marcus] + [dev] | 3-5 days |
| 5 | Dashboard (header · hero · stats · commitments card · account carousel · net worth sheet) | [marcus] + [dev] | 4-6 days |
| 6 | Transactions list + detail (list · filter · detail · empty states) | [marcus] + [dev] | 3-5 days |
| 7 | Add Transaction sheet (highest impact, sheet pattern + nested pickers + numpad) | [marcus] + [tariq] + [dev] | 4-6 days |
| 8 | Commitments (list · detail · add/edit full-screen) | [marcus] + [dev] | 4-6 days |
| 9 | Accounts (Add Account dual entry · Account detail) | [marcus] + [dev] | 3-5 days |

## Target IA after all 9 sections (the 8 cleanup changes)

Brief reference. Full detail lives in each section's spec where it is implemented.

1. **Add Transaction → bottom sheet** (implemented in §7; uses Sheet pattern from §3, FAB from §3).
2. **Add Commitment stays full-screen** (no change; §8).
3. **Add Account dual entry** — sheet from Dashboard, full-screen from Settings (implemented in §9; uses Sheet from §3).
4. **Onboarding compressed: 6 → 4 steps** — Welcome+Currency · Add Account · Add Another? · Done (implemented in §2).
5. **Global "+" FAB on every tab** — tap = Add Transaction; long-press = mini menu (implemented in §3, used by §5/§6/§8).
6. **Settings restructured into 4 sections** — Account · Appearance · Data · About (implemented in §4; uses SettingsSection from §3).
7. **Currency picker → bottom sheet (in Settings)** (implemented in §4; uses Sheet from §3).
8. **Empty states standardized** — single `EmptyState` component, variant-driven (implemented in §3, used by §5/§6/§8).

## Cross-cutting component patterns (built in §3, used everywhere)

These four patterns are *defined* by the IA changes (above) and *built* in §3. Every other section (§4-9) consumes them:

- **Sheet pattern** — bottom-sheet container with swipe-down dismiss, scrim tap dismiss, focus trap, sheet-on-sheet stacking. Replaces patched `react-native-actions-sheet` with gluestack `Actionsheet`. Used by Add Transaction (§7), Add Account from Dashboard (§9), Currency picker (§4), Net Worth Breakdown (§5), and the existing Category/Account pickers (§7).
- **FAB pattern** — floating "+" button with tap (default action) and long-press (menu). Used by Dashboard (§5), Transactions (§6), Commitments (§8).
- **EmptyState pattern** — illustration + headline + description + single CTA. Variant-driven (`accounts`, `transactions`, `commitments`, `filtered`). Used by Dashboard (§5), Transactions (§6), Commitments (§8).
- **SettingsSection pattern** — grouped list with section header, divided rows, optional destructive last row. Used by Settings (§4).

## Strangler-fig migration rule

Each section ships its migrated screens **behind the existing routes**. The old custom UI stays alive until parity hits per section. Toggle (feature flag or route swap) controls which version users see during migration. No screen ever has both old and new mounted simultaneously in production.

## Cross-spec references

This spec (§1 Foundation) **provides** to §2-9: installed library, configured palette, base primitives, migration toggle scaffolding.

This spec **depends on** nothing — it's foundational.

---

# Part B · Section 1 · Foundation (this section's spec)

## Goals

1. Install `gluestack-ui v2` and `nativewind` in the Expo Go project without breaking existing custom UI.
2. Configure NativeWind via Metro (no Babel changes).
3. Create `constants/theme_tokens.ts` as the single source of truth for the Cairo Nights Extended palette. Export raw values imported by `tailwind.config.js`. `constants/theme.ts` is unchanged.
4. Configure `tailwind.config.js` consuming `constants/theme_tokens.ts` — the only config file. No gluestack config file, no provider.
5. Build 5 base primitives wrapping headless gluestack primitives (or bare RN when gluestack adds no value) with MoneyApp's token contracts: `Box · Text · Button · Input · Pressable`.
6. Establish a compile-time migration toggle so §2-9 can swap screens one at a time without breaking the build.

## Non-Goals

- No screens migrated.
- No new components beyond the 5 base primitives and `utils/cn.ts`.
- No removal of existing custom UI components.
- No changes to existing screens, hooks, stores, navigation, or business logic.
- No removal of the patched `react-native-actions-sheet` (still in use until §3 builds the Sheet pattern).
- No removal of existing `constants/theme.ts` tokens (existing custom UI keeps using original tokens until its screen is migrated).
- No `GluestackUIProvider`, no `gluestack-ui.config.ts`, no `@gluestack-style/react` — these are v1 artifacts.

## Scope · Detailed work items

### 1.1 Install dependencies

Exact pinned matrix:

```
nativewind                  ^5.0.0-preview.27
tailwindcss                 ^4.1.0
react-native-css            ^0.1.0
@gluestack-ui/pressable     ^0.1.23
@gluestack-ui/button        ^0.1.18
@gluestack-ui/utils         ^1.0.13
class-variance-authority    ^0.7.1
clsx                        ^2.1.1
tailwind-merge              ^3.3.0
expo-linear-gradient        (via npx expo install — version pegged by Expo SDK 55)
```

**Already present — do not reinstall:**
- `react-native-reanimated 4.2.1`
- `react-native-worklets 0.7.4`
- `react-native-safe-area-context ~5.6.2`

These satisfy NativeWind v5 peer deps.

**Why NativeWind v5 (not v4):** the project already runs Reanimated 4. NativeWind v4 has a peer requirement on Reanimated 3; using v4 would force a Reanimated downgrade. NativeWind v5 also eliminates its Babel plugin entirely (Metro-only transform), so the `babel-plugin-react-compiler` ordering question that exists in v4 is moot.

**Install commands:**

```bash
npx expo install expo-linear-gradient
npm install nativewind@^5.0.0-preview.27 tailwindcss@^4.1.0 react-native-css@^0.1.0
npm install @gluestack-ui/pressable@^0.1.23 @gluestack-ui/button@^0.1.18 @gluestack-ui/utils@^1.0.13
npm install class-variance-authority@^0.7.1 clsx@^2.1.1 tailwind-merge@^3.3.0
```

Verify: `npm install` completes without peer-dep errors. If `npx expo install` warns about incompatible versions, document in the plan and pick the closest compatible version.

### 1.2 Configure NativeWind (Metro-based, no Babel changes)

**`metro.config.js`** — update to wrap with NativeWind:

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
```

**`babel.config.js`** — no changes. Keep `babel-plugin-react-compiler` exactly as-is. Do not add any NativeWind Babel plugin.

**`global.css`** — create at project root:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**`app/_layout.tsx`** — add one import at the top (no component changes):

```ts
import '../global.css';
```

**`tsconfig.json`** — add NativeWind types reference so `className` is typed on RN components:

```json
{
  "compilerOptions": {
    "types": ["nativewind/types"]
  }
}
```

### 1.3 Tailwind config and `constants/theme_tokens.ts` (single source of truth)

**Create `constants/theme_tokens.ts`:**

This file is the single source of truth for all Cairo Nights Extended palette values. It exports raw string values only — no `ms()` scaling (Tailwind operates in logical px, not scaled units). `constants/theme.ts` remains unchanged and continues to be used by all existing custom UI.

```ts
// constants/theme_tokens.ts
// Single source of truth for Cairo Nights Extended palette.
// Consumed by tailwind.config.js. Do NOT import from this file in component
// code — use Tailwind class names or constants/theme.ts instead.

export const CoreTokens = {
  bg:        '#0F1923',
  surface:   '#1A2535',
  surfaceEl: '#243044',
  border:    '#2A3A4F',
  text1:     '#F0EBE3',
  text2:     '#6B7F99',
  text3:     '#4A5568',
  hint:      '#4A5568', // alias of text3 — "EGP pre-selected" / skippable copy
} as const;

export const GoldTokens = {
  400: '#E0B968',
  500: '#D4A44C',
  600: '#C9973A',
  700: '#A47C2C',
} as const;

export const SemanticTokens = {
  positive: '#4CAF82',
  negative: '#E05A42',
  warning:  '#E8B130',
  info:     '#4A7ABF',
} as const;

// 4 standalone cultural accents. plum/rose exist only in acct swatches below.
export const AccentTokens = {
  nile:  '#2D7D6E',
  spice: '#C45C2A',
  lapis: '#185FA5',
  sand:  '#C9A876',
} as const;

// 12 families × Rich/Soft. Rich = card background. Soft = list-row dot / avatar chip on surface/surfaceEl.
export const AcctTokens = {
  midnight: { rich: '#1B2B4B', soft: '#3D4E73' },
  gold:     { rich: '#C9973A', soft: '#E0B968' },
  nile:     { rich: '#2D7D6E', soft: '#5BA597' },
  paprika:  { rich: '#C45C2A', soft: '#E08456' },
  plum:     { rich: '#5A2D55', soft: '#8B5685' },
  lapis:    { rich: '#185FA5', soft: '#4A88C4' },
  rose:     { rich: '#B8526D', soft: '#D88197' },
  sand:     { rich: '#C9A876', soft: '#E0C99A' },
  amethyst: { rich: '#7B3F8C', soft: '#A87AB5' },
  emerald:  { rich: '#4CAF82', soft: '#7AC9A4' },
  saffron:  { rich: '#D4830A', soft: '#E8A848' },
  steel:    { rich: '#4A6FA5', soft: '#7894C0' },
} as const;
```

**Create `tailwind.config.js`** at project root. Imports from `constants/theme_tokens.ts` — no hex literals in this file (enforced by lint rule in §1.8 below):

```js
const { CoreTokens, GoldTokens, SemanticTokens, AccentTokens, AcctTokens } = require('./constants/theme_tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './screens/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:        CoreTokens.bg,
        surface:   CoreTokens.surface,
        surfaceEl: CoreTokens.surfaceEl,
        border:    CoreTokens.border,
        text1:     CoreTokens.text1,
        text2:     CoreTokens.text2,
        text3:     CoreTokens.text3,
        hint:      CoreTokens.hint,  // text-hint alias for "EGP pre-selected" / skippable copy
        gold: {
          400: GoldTokens[400],
          500: GoldTokens[500],
          600: GoldTokens[600],
          700: GoldTokens[700],
        },
        positive: SemanticTokens.positive,
        negative: SemanticTokens.negative,
        warning:  SemanticTokens.warning,
        info:     SemanticTokens.info,
        // Standalone cultural accents (4)
        nile:  AccentTokens.nile,
        spice: AccentTokens.spice,
        lapis: AccentTokens.lapis,
        sand:  AccentTokens.sand,
        // Account swatches (12 families × Rich/Soft)
        // Tailwind class form: bg-acct-nile-rich / bg-acct-nile-soft
        // JS camelCase: acctNileRich / acctNileSoft (mechanical transformation)
        acct: {
          midnight: AcctTokens.midnight,
          gold:     AcctTokens.gold,
          nile:     AcctTokens.nile,
          paprika:  AcctTokens.paprika,
          plum:     AcctTokens.plum,
          lapis:    AcctTokens.lapis,
          rose:     AcctTokens.rose,
          sand:     AcctTokens.sand,
          amethyst: AcctTokens.amethyst,
          emerald:  AcctTokens.emerald,
          saffron:  AcctTokens.saffron,
          steel:    AcctTokens.steel,
        },
      },
      fontFamily: {
        sora:        ['Sora_400Regular'],
        soraSemi:    ['Sora_600SemiBold'],
        soraBold:    ['Sora_700Bold'],
        soraExtra:   ['Sora_800ExtraBold'],
        inter:       ['Inter_400Regular'],
        interMedium: ['Inter_500Medium'],
        interSemi:   ['Inter_600SemiBold'],
      },
    },
  },
  plugins: [],
};
```

**Naming convention (Marcus, locked):** Tailwind class form is kebab-case (`bg-acct-nile-rich`). JS/TS camelCase is a mechanical transformation (`acctNileRich`). No aliases, no exceptions.

**Font scale locked (Marcus):** existing `Type.hero/title/body/caption` from `constants/theme.ts`. No new sizes in §1.

**Spacing locked (Marcus):** existing `Spacing.md` (16) gutter, `Spacing.xl` (24) rhythm. No new values in §1.

### 1.4 `utils/cn.ts` — className merge utility

Create `utils/cn.ts`:

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
```

Used by all primitives for conditional and merged className composition.

### 1.5 Base primitives (5)

Create `components/ui/` (new directory). Files in `snake_case` per CLAUDE.md convention.

**Variant API:** `cva` (class-variance-authority) for all variant dispatch.
**Forward-ref:** `React.forwardRef` on all primitives. RN 0.83 host components do not use React 19's ref-as-prop pattern.
**className merge:** `cn` from `utils/cn.ts`.
**No hardcoded hex** in any primitive — Tailwind classes only.

#### `components/ui/box.tsx`

`View` wrapper accepting `className`. Thin — no variants needed. Foundation for layout composition.

```tsx
import React from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '@/utils/cn';

interface BoxProps extends ViewProps {
  className?: string;
}

export const Box = React.forwardRef<View, BoxProps>(
  ({ className, ...props }, ref) => (
    <View ref={ref} className={cn(className)} {...props} />
  ),
);
Box.displayName = 'Box';
```

#### `components/ui/text.tsx`

`Text` wrapper. Default `font-inter text-text1`. Variants via `cva` for type scale.

```tsx
import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const textVariants = cva('font-inter text-text1', {
  variants: {
    variant: {
      body:    'text-[14px]',
      caption: 'text-[12px] text-text2',
      hint:    'text-[12px] text-hint',
      title:   'font-soraSemi text-[18px]',
      hero:    'font-soraSemi text-[28px]',
    },
  },
  defaultVariants: { variant: 'body' },
});

interface TextComponentProps extends TextProps, VariantProps<typeof textVariants> {
  className?: string;
}

export const Text = React.forwardRef<RNText, TextComponentProps>(
  ({ className, variant, ...props }, ref) => (
    <RNText ref={ref} className={cn(textVariants({ variant }), className)} {...props} />
  ),
);
Text.displayName = 'Text';
```

#### `components/ui/button.tsx`

Three variants (Marcus, locked):

- **`primary`** — gold gradient (brand signature). `expo-linear-gradient` wraps `Pressable`. `colors={[gold-400, gold-600]}`, horizontal sweep (`start={[0,0.5]} end={[1,0.5]}`). Text: `text-surfaceEl font-soraSemi`.
- **`ghost`** — transparent + `border border-border` 1px + `text-text1`.
- **`destructive`** — `bg-negative` + `text-text1`.

All variants: `min-h-[52px] min-w-[44px] rounded-[13px]`. Label is Sora SemiBold.

```tsx
import React from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';
import { Text } from './text';

const buttonVariants = cva(
  'min-h-[52px] min-w-[44px] rounded-[13px] items-center justify-center px-4',
  {
    variants: {
      variant: {
        primary:     '',  // gradient applied via LinearGradient wrapper
        ghost:       'border border-border bg-transparent',
        destructive: 'bg-negative',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
);

const labelVariants = cva('font-soraSemi text-[16px]', {
  variants: {
    variant: {
      primary:     'text-surfaceEl',
      ghost:       'text-text1',
      destructive: 'text-text1',
    },
  },
  defaultVariants: { variant: 'primary' },
});

interface ButtonProps extends PressableProps, VariantProps<typeof buttonVariants> {
  className?: string;
  label: string;
}

export const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  ({ className, variant = 'primary', label, ...props }, ref) => {
    const inner = (
      <Pressable
        ref={ref}
        className={cn(buttonVariants({ variant }), className)}
        accessibilityRole="button"
        {...props}
      >
        <Text className={labelVariants({ variant })}>{label}</Text>
      </Pressable>
    );

    if (variant === 'primary') {
      return (
        <LinearGradient
          colors={['#E0B968', '#C9973A']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ borderRadius: 13 }}
        >
          {inner}
        </LinearGradient>
      );
    }

    return inner;
  },
);
Button.displayName = 'Button';
```

**Note on LinearGradient hex literals in `button.tsx`:** The gradient color array in `LinearGradient` is a JSX prop, not a Tailwind class or config file. The lint rule (§1.8) targets `tailwind.config.js` only. However, to remain token-honest, import from `GoldTokens` in `constants/theme_tokens.ts`:

```tsx
import { GoldTokens } from '@/constants/theme_tokens';
// ...
colors={[GoldTokens[400], GoldTokens[600]]}
```

#### `components/ui/input.tsx`

`TextInput` wrapper. Focus ring: `border-gold-500`. Error state: `border-negative`. RHF-Controller-friendly (pass `onChangeText`, `value`, `onBlur`).

```tsx
import React from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { cn } from '@/utils/cn';

interface InputProps extends TextInputProps {
  className?: string;
  hasError?: boolean;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ className, hasError, ...props }, ref) => (
    <TextInput
      ref={ref}
      className={cn(
        'border rounded-[12px] px-4 py-3 font-inter text-[14px] text-text1 bg-surfaceEl',
        hasError ? 'border-negative' : 'border-border',
        'focus:border-gold-500',
        className,
      )}
      placeholderTextColor="#6B7F99"
      {...props}
    />
  ),
);
Input.displayName = 'Input';
```

#### `components/ui/pressable.tsx`

`Pressable` wrapper. Opacity feedback on press. 44px `hitSlop` for sub-44px targets.

```tsx
import React from 'react';
import { Pressable as RNPressable, type PressableProps } from 'react-native';
import { cn } from '@/utils/cn';

interface PressableComponentProps extends PressableProps {
  className?: string;
}

export const Pressable = React.forwardRef<
  React.ElementRef<typeof RNPressable>,
  PressableComponentProps
>(({ className, style, ...props }, ref) => (
  <RNPressable
    ref={ref}
    hitSlop={44}
    style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }, typeof style === 'function' ? style({ pressed }) : style]}
    className={cn(className)}
    {...props}
  />
));
Pressable.displayName = 'Pressable';
```

### 1.6 Migration toggle — `constants/feature_flags.ts`

```ts
/**
 * Compile-time migration toggles. No runtime service, no remote override,
 * no segmentation. `as const` = tree-shakeable by bundler.
 *
 * Flag flip process:
 * 1. Dev opens a one-line PR flipping the target flag false → true.
 * 2. [tariq] reviews and merges only after that section's code-review gate passes.
 * 3. The flag flip lands in the same commit that promotes the migrated screen to the active route.
 *    Never earlier, never as a separate commit.
 * 4. Cleanup rule: within 5 business days of the flag flip merging, a follow-up PR
 *    deletes old screen files, removes the flag entry, and removes any conditional
 *    in the route index.tsx that read the flag. May not be deferred.
 * 5. Next section's plan is not approved until the current section's cleanup PR
 *    has merged to main. [sarah] enforces.
 */
export const FeatureFlags = {
  newOnboarding:    false,  // §2 — flip when Onboarding section lands
  newSettings:      false,  // §4
  newDashboard:     false,  // §5
  newTransactions:  false,  // §6
  newAddTransaction:false,  // §7 (sheet)
  newCommitments:   false,  // §8
  newAccounts:      false,  // §9
} as const;
```

During §1, all flags stay `false`. Nothing visible changes.

### 1.7 Dev preview route — `app/(dev)/primitives/index.tsx`

A persistent dev preview screen that renders all 5 primitives with every variant. This is the verifiable "renders correctly" claim — snapshot tests validate tree structure, not visual correctness.

```tsx
// app/(dev)/primitives/index.tsx
export { default } from '@/screens/dev/primitives';
```

```tsx
// screens/dev/primitives/index.tsx
import React from 'react';
import { ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';

if (!__DEV__) {
  // Production: this module exports null; Metro tree-shakes the entire screen.
  // The route exists in app/ but returns nothing — harmless for prod users.
}

export default function PrimitivesPreview() {
  if (!__DEV__) return null;

  return (
    <ScrollView className="flex-1 bg-bg p-4">
      <Text variant="title" className="mb-4">Primitives Preview</Text>

      <Text variant="body">Box</Text>
      <Box className="bg-surface rounded-[12px] p-4 mb-4">
        <Text>Inside Box</Text>
      </Box>

      <Text variant="body">Text variants</Text>
      <Text variant="hero">Hero</Text>
      <Text variant="title">Title</Text>
      <Text variant="body">Body</Text>
      <Text variant="caption">Caption</Text>
      <Text variant="hint">Hint (EGP pre-selected)</Text>

      <Text variant="body" className="mt-4">Button variants</Text>
      <Button variant="primary" label="Primary CTA" className="mb-2" onPress={() => {}} />
      <Button variant="ghost" label="Ghost" className="mb-2" onPress={() => {}} />
      <Button variant="destructive" label="Destructive" className="mb-4" onPress={() => {}} />

      <Text variant="body">Input</Text>
      <Input placeholder="Normal state" className="mb-2" />
      <Input placeholder="Error state" hasError className="mb-4" />

      <Text variant="body">Pressable</Text>
      <Pressable className="bg-surfaceEl rounded-[12px] p-4">
        <Text>Press me (opacity feedback)</Text>
      </Pressable>
    </ScrollView>
  );
}
```

CI verifies the file `app/(dev)/primitives/index.tsx` exists (grep or `test -f`).

## Acceptance criteria

1. `npm install` completes without errors and without peer-dep warnings.
2. `npx expo start` launches the app on Android Expo Go (SDK 55) with **zero visible UI changes** — existing custom UI renders identically. (iOS Expo Go SDK 55: see R5.)
3. `npm run typecheck` passes.
4. `npm run test:coverage` passes with thresholds unchanged (80% lines · 95% functions · 100% branches).
5. The dev preview route at `app/(dev)/primitives/index.tsx` exists and renders all 5 primitives with every variant in `__DEV__` mode. CI confirms the file exists via `test -f app/(dev)/primitives/index.tsx`.
6. `tailwind.config.js` contains no hex literals — all color values are imported from `constants/theme_tokens.ts`. The lint rule in §1.8 enforces this at CI.
7. `constants/feature_flags.ts` exists and all flags are `false`.
8. `metro.config.js` uses `withNativeWind`; `babel.config.js` is unchanged from pre-§1.

## Risks

- **R1 · NativeWind v5 + Expo SDK 55 compatibility — RESOLVED.** Verified compatible: NativeWind v5.0.0-preview.27 + Expo SDK 55 + Reanimated 4.2.1. Versions in §1.1 are the verified matrix.
- **R2 · gluestack v2 + Expo Go — RESOLVED.** gluestack v2 headless primitives are pure JS — no native code, no prebuild. Expo Go compatible by construction. Smoke-test: render `Button` in the dev preview route as first build verification.
- **R3 · Provider performance — ELIMINATED.** gluestack v2 has no provider. No context overhead. Cold-start impact: zero.
- **R5 · iOS Expo Go for SDK 55 pending App Store approval.** As of 2026-05, Android Expo Go for SDK 55 is available via CLI install; iOS testing requires TestFlight or `eas go`. Does not block §1 implementation. Mitigation: gate iOS AC verification (#2) on TestFlight build availability. Do not block §1 merge on iOS Expo Go availability.

*R4 (token duplication drift) eliminated — with no gluestack config file, there is only one palette config. Single source of truth is `constants/theme_tokens.ts` → `tailwind.config.js`. Drift is structurally impossible.*

## Lint rule — hex literals in `tailwind.config.js`

Add to `eslint.config.js`:

```js
{
  files: ['tailwind.config.js'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: "Property[key.name='colors'] Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
        message: 'Hardcoded hex in tailwind.config.js is banned. Import values from constants/theme_tokens.ts.',
      },
    ],
  },
},
```

This is an acceptance criterion (AC #6). CI runs `eslint tailwind.config.js` as part of the existing lint step.

## Open questions

1. ~~NativeWind v4 or v5?~~ **DECIDED: v5** — peer constraint with Reanimated 4 forces it; no Babel plugin is a bonus.
2. Should `constants/theme_tokens.ts` be a new file or extend `constants/theme.ts`? **DECIDED: new file.** Avoids touching existing in-use tokens; clean separation between "legacy custom UI source" and "Tailwind source".
3. Do the base primitives go in `components/ui/` (new convention) or `components/` (existing)? **DECIDED: `components/ui/`** — clean separation between hand-rolled legacy components and new gluestack-based primitives.
4. ~~Runtime flag service or compile-time constant?~~ **DECIDED: compile-time `as const` constant.** No runtime service, no segmentation, no remote override.

## Hand-off to §2 Onboarding

§2 starts with all of the following in place:

- NativeWind v5 installed and Metro-configured.
- Cairo Nights Extended palette available as Tailwind tokens via `constants/theme_tokens.ts` → `tailwind.config.js`.
- No provider to mount — §2 builds screens directly with NativeWind classes.
- 5 base primitives in `components/ui/` ready to compose.
- `utils/cn.ts` available for className composition.
- `FeatureFlags.newOnboarding` exists and is `false`. §2 flips it per the toggle process in §1.6.
- Marcus's locks for §2: `text-hint` alias available for "EGP pre-selected" copy; font scale and spacing unchanged from §1.

§2 does not need to install or configure anything. It builds onboarding screens using §1's primitives.

---

## Appendix · Reference Map

- Existing tokens: `constants/theme.ts` (unchanged).
- New token source: `constants/theme_tokens.ts` (§1 creates; Tailwind-only consumers).
- Existing patches: `patches/react-native-actions-sheet+10.1.2.patch` (kept until §3).
- Existing custom UI: `components/`, `screens/**` (untouched).
- Project rules: `CLAUDE.md` (Expo Go compatibility · app/ rules · screens/ anatomy · null vs undefined · token usage · strings).
- Future section specs: `docs/superpowers/specs/2026-XX-XX-section-N-*-design.md`.
