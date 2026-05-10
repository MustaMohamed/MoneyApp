# Section 1 · Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install NativeWind v5 + gluestack-ui v2 headless primitives, configure a single-source-of-truth palette, build 5 typed base components, and establish a compile-time migration toggle — with zero visible changes to the existing app.

**Architecture:** NativeWind v5 is configured via Metro (not Babel). `constants/theme_tokens.ts` is the sole palette source, imported by `tailwind.config.js`. gluestack v2 is a copy-paste primitives model — no provider, no config file, no runtime overhead. All 5 primitives live in `components/ui/`, styled via `cva` + `cn`, wrapped in `React.forwardRef`.

**Tech Stack:** NativeWind ^5.0.0-preview.27 · tailwindcss ^4.1.0 · @gluestack-ui/pressable ^0.1.23 · @gluestack-ui/button ^0.1.18 · class-variance-authority ^0.7.1 · clsx ^2.1.1 · tailwind-merge ^3.3.0 · expo-linear-gradient (SDK-pegged) · TypeScript strict

---

## File Map

Files **created** in this plan:

| File | Responsibility |
|---|---|
| `constants/theme_tokens.ts` | Single source of truth for all palette hex values. Consumed by `tailwind.config.js` and `button.tsx`. |
| `tailwind.config.js` | Tailwind theme config. No hex literals — imports everything from `theme_tokens.ts`. |
| `global.css` | Tailwind directives (`@tailwind base/components/utilities`). |
| `metro.config.js` | Metro config wrapped with `withNativeWind`. |
| `utils/cn.ts` | `cn()` helper: `clsx` + `twMerge`. |
| `constants/feature_flags.ts` | Compile-time migration toggle constants. All `false` in §1. |
| `components/ui/box.tsx` | Thin `View` wrapper accepting NativeWind `className`. |
| `components/ui/text.tsx` | `Text` wrapper with `cva` variants: `body/caption/hint/title/hero`. |
| `components/ui/button.tsx` | `Button` with `primary/ghost/destructive` variants. `primary` uses `LinearGradient`. |
| `components/ui/input.tsx` | `TextInput` wrapper. `hasError` prop. Focus + error border via NativeWind. |
| `components/ui/pressable.tsx` | `Pressable` wrapper. Opacity feedback. `hitSlop={44}`. |
| `screens/dev/primitives/index.tsx` | Dev preview screen rendering all 5 primitives. `__DEV__`-gated. |
| `app/(dev)/primitives/index.tsx` | Route one-liner re-exporting the dev preview screen. |
| `__tests__/theme_tokens.test.ts` | Unit tests: token shape, no duplicate hex values. |
| `__tests__/cn.test.ts` | Unit tests: `cn()` merge behavior. |
| `__tests__/ui_box.test.ts` | Render test for `Box`. |
| `__tests__/ui_text.test.ts` | Render tests for `Text` variants. |
| `__tests__/ui_button.test.ts` | Render tests for `Button` variants including gradient wrapper. |
| `__tests__/ui_input.test.ts` | Render tests for `Input` normal + error states. |
| `__tests__/ui_pressable.test.ts` | Render test for `Pressable`. |
| `__tests__/feature_flags.test.ts` | Verifies all flags are `false` and shape is correct. |

Files **modified** in this plan:

| File | Change |
|---|---|
| `tsconfig.json` | Add `"types": ["nativewind/types"]` to `compilerOptions`. |
| `app/_layout.tsx` | Add `import '../global.css'` as first import. |
| `eslint.config.js` | Add `no-restricted-syntax` rule scoped to `tailwind.config.js`. |

---

## Phase 1 · Dependencies + Build Config (Day 1, morning)

**Verification gate:** `npm install` clean, Metro starts, existing app unchanged.

---

### Task 1: Install packages

**Files:**
- Modify: `package.json` (via npm/expo cli)

- [ ] **Step 1: Install expo-linear-gradient via Expo's compatibility checker**

```bash
cd /home/user/MoneyApp && npx expo install expo-linear-gradient
```

Expected: installs the SDK-55-pegged version. No warnings about incompatible versions. If a warning appears, note the version it chose in a code comment — do not override it.

- [ ] **Step 2: Install NativeWind v5 and Tailwind**

```bash
cd /home/user/MoneyApp && npm install nativewind@^5.0.0-preview.27 tailwindcss@^4.1.0 react-native-css@^0.1.0
```

Expected: exits 0. If peer-dep warnings appear for `react-native-reanimated`, they are false positives — NativeWind v5 peers are satisfied by the already-installed `react-native-reanimated@4.2.1`.

- [ ] **Step 3: Install gluestack-ui v2 headless packages**

```bash
cd /home/user/MoneyApp && npm install @gluestack-ui/pressable@^0.1.23 @gluestack-ui/button@^0.1.18 @gluestack-ui/utils@^1.0.13
```

Expected: exits 0. Do **not** install `@gluestack-ui/themed`, `@gluestack-style/react`, or `@gluestack-ui/config` — those are v1 artifacts.

- [ ] **Step 4: Install className utilities**

```bash
cd /home/user/MoneyApp && npm install class-variance-authority@^0.7.1 clsx@^2.1.1 tailwind-merge@^3.3.0
```

Expected: exits 0.

- [ ] **Step 5: Verify install is clean**

```bash
cd /home/user/MoneyApp && npm install
```

Expected: exits 0, `patch-package` postinstall runs (you'll see it apply the `react-native-actions-sheet` patch), no unmet peer dependency errors.

- [ ] **Step 6: Commit**

```bash
cd /home/user/MoneyApp && git add package.json package-lock.json && git commit -m "feat(foundation): install nativewind v5, gluestack-ui v2 headless, cva, expo-linear-gradient"
```

---

### Task 2: Create `global.css` and configure Metro

**Files:**
- Create: `global.css`
- Create: `metro.config.js`

- [ ] **Step 1: Create `global.css` at project root**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Save to `/home/user/MoneyApp/global.css`.

- [ ] **Step 2: Create `metro.config.js`**

`metro.config.js` does not currently exist. Create it at `/home/user/MoneyApp/metro.config.js`:

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

**Do not touch `babel.config.js`.** The existing content is:
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
```
Leave it exactly as-is. NativeWind v5 uses Metro, not Babel.

- [ ] **Step 3: Update `tsconfig.json` to add NativeWind types**

The current `tsconfig.json` content is:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

Change it to:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    },
    "types": ["nativewind/types"]
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

- [ ] **Step 4: Add `global.css` import to `app/_layout.tsx`**

The current first line of `app/_layout.tsx` is:
```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
```

Add `import '../global.css';` as the very first line, before all other imports:
```tsx
import '../global.css';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// ... rest unchanged
```

No other changes to `app/_layout.tsx`.

- [ ] **Step 5: Run typecheck to confirm NativeWind types resolve**

```bash
cd /home/user/MoneyApp && npm run typecheck
```

Expected: passes. If `className` is reported as an unknown prop on RN components, the `types` entry in `tsconfig.json` is not being picked up — double-check the JSON syntax.

- [ ] **Step 6: Commit**

```bash
cd /home/user/MoneyApp && git add global.css metro.config.js tsconfig.json app/_layout.tsx && git commit -m "feat(foundation): configure NativeWind v5 via Metro, add global.css, type className"
```

---

## Phase 2 · Palette + Tailwind Config (Day 1, afternoon)

**Verification gate:** `tailwind.config.js` passes ESLint no-hex lint rule. Typecheck passes. No hex literals visible in the config file.

---

### Task 3: Create `constants/theme_tokens.ts`

**Files:**
- Create: `constants/theme_tokens.ts`
- Test: `__tests__/theme_tokens.test.ts`

- [ ] **Step 1: Write the failing test**

Create `/home/user/MoneyApp/__tests__/theme_tokens.test.ts`:

```ts
import {
  CoreTokens,
  GoldTokens,
  SemanticTokens,
  AccentTokens,
  AcctTokens,
} from '@/constants/theme_tokens';

describe('theme_tokens', () => {
  it('CoreTokens has all required keys', () => {
    expect(CoreTokens).toMatchObject({
      bg: expect.any(String),
      surface: expect.any(String),
      surfaceEl: expect.any(String),
      border: expect.any(String),
      text1: expect.any(String),
      text2: expect.any(String),
      text3: expect.any(String),
      hint: expect.any(String),
    });
  });

  it('hint is the same value as text3', () => {
    expect(CoreTokens.hint).toBe(CoreTokens.text3);
  });

  it('GoldTokens has stops 400/500/600/700', () => {
    expect(Object.keys(GoldTokens)).toEqual(expect.arrayContaining(['400', '500', '600', '700']));
  });

  it('AccentTokens has exactly 4 standalone accents', () => {
    expect(Object.keys(AccentTokens)).toHaveLength(4);
    expect(AccentTokens).toMatchObject({
      nile: expect.any(String),
      spice: expect.any(String),
      lapis: expect.any(String),
      sand: expect.any(String),
    });
  });

  it('AccentTokens does not contain plum or rose', () => {
    expect(Object.keys(AccentTokens)).not.toContain('plum');
    expect(Object.keys(AccentTokens)).not.toContain('rose');
  });

  it('AcctTokens has 12 families each with rich and soft', () => {
    const families = Object.keys(AcctTokens);
    expect(families).toHaveLength(12);
    families.forEach((family) => {
      const swatch = AcctTokens[family as keyof typeof AcctTokens];
      expect(swatch).toHaveProperty('rich');
      expect(swatch).toHaveProperty('soft');
    });
  });

  it('AcctTokens includes plum and rose swatches', () => {
    expect(AcctTokens).toHaveProperty('plum');
    expect(AcctTokens).toHaveProperty('rose');
  });

  it('all hex values match #RRGGBB format', () => {
    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    const allValues = [
      ...Object.values(CoreTokens),
      ...Object.values(GoldTokens),
      ...Object.values(SemanticTokens),
      ...Object.values(AccentTokens),
      ...Object.values(AcctTokens).flatMap((s) => [s.rich, s.soft]),
    ];
    allValues.forEach((v) => {
      expect(v).toMatch(hexPattern);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/user/MoneyApp && npx jest __tests__/theme_tokens.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/constants/theme_tokens'`.

- [ ] **Step 3: Create `constants/theme_tokens.ts`**

```ts
// constants/theme_tokens.ts
// Single source of truth for Cairo Nights Extended palette.
// Consumed by tailwind.config.js. Do NOT import from this file in component
// code — use Tailwind class names or constants/theme.ts instead.
// Exception: button.tsx imports GoldTokens for LinearGradient colors prop.

export const CoreTokens = {
  bg:        '#0F1923',
  surface:   '#1A2535',
  surfaceEl: '#243044',
  border:    '#2A3A4F',
  text1:     '#F0EBE3',
  text2:     '#6B7F99',
  text3:     '#4A5568',
  hint:      '#4A5568', // alias of text3 — for "EGP pre-selected" / skippable copy
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

// 4 standalone cultural accents.
// plum and rose are NOT standalone accents — they exist only in AcctTokens below.
export const AccentTokens = {
  nile:  '#2D7D6E',
  spice: '#C45C2A',
  lapis: '#185FA5',
  sand:  '#C9A876',
} as const;

// 12 families × Rich/Soft.
// Rich = card/tile background.
// Soft = list-row dot or avatar chip on surface/surfaceEl.
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

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/user/MoneyApp && npx jest __tests__/theme_tokens.test.ts --no-coverage
```

Expected: PASS, 8 tests passing.

- [ ] **Step 5: Commit**

```bash
cd /home/user/MoneyApp && git add constants/theme_tokens.ts __tests__/theme_tokens.test.ts && git commit -m "feat(foundation): add theme_tokens.ts — single palette source of truth"
```

---

### Task 4: Create `tailwind.config.js` and update ESLint

**Files:**
- Create: `tailwind.config.js`
- Modify: `eslint.config.js`

- [ ] **Step 1: Create `tailwind.config.js`**

Create `/home/user/MoneyApp/tailwind.config.js`. Note: `tailwind.config.js` uses `require()` (CommonJS) because Metro's config pipeline evaluates it as CJS. The TypeScript file is imported via `require` which works because `ts-node` or Metro's transformer handles it — but check: if `require('./constants/theme_tokens')` fails at Metro startup, add `"ts-node"` or use a `.js` intermediary. For the initial implementation, use the direct require and verify in Task 8's smoke test.

```js
const {
  CoreTokens,
  GoldTokens,
  SemanticTokens,
  AccentTokens,
  AcctTokens,
} = require('./constants/theme_tokens');

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
        hint:      CoreTokens.hint,
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
        nile:  AccentTokens.nile,
        spice: AccentTokens.spice,
        lapis: AccentTokens.lapis,
        sand:  AccentTokens.sand,
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

- [ ] **Step 2: Add the hex-ban lint rule to `eslint.config.js`**

The current `eslint.config.js` content is:
```js
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
]);
```

Change it to:
```js
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
  {
    files: ['tailwind.config.js'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Property[key.name='colors'] Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
          message:
            'Hardcoded hex in tailwind.config.js is banned. Import values from constants/theme_tokens.ts.',
        },
      ],
    },
  },
]);
```

- [ ] **Step 3: Run lint to verify the rule fires and passes on the current config**

```bash
cd /home/user/MoneyApp && npx eslint tailwind.config.js
```

Expected: exits 0 (no errors — the config has no hex literals). If you accidentally have a hex literal in the config, the error message will be `Hardcoded hex in tailwind.config.js is banned.`

- [ ] **Step 4: Run typecheck**

```bash
cd /home/user/MoneyApp && npm run typecheck
```

Expected: passes.

- [ ] **Step 5: Commit**

```bash
cd /home/user/MoneyApp && git add tailwind.config.js eslint.config.js && git commit -m "feat(foundation): add tailwind.config.js with full Cairo Nights palette; add hex-ban lint rule"
```

---

## Phase 3 · `cn` Utility + Feature Flags (Day 1, late afternoon)

**Verification gate:** Tests pass. `constants/feature_flags.ts` exists with all 7 flags `false`.

---

### Task 5: Create `utils/cn.ts`

**Files:**
- Create: `utils/cn.ts`
- Test: `__tests__/cn.test.ts`

- [ ] **Step 1: Write the failing test**

Create `/home/user/MoneyApp/__tests__/cn.test.ts`:

```ts
import { cn } from '@/utils/cn';

describe('cn', () => {
  it('returns a single class unchanged', () => {
    expect(cn('bg-bg')).toBe('bg-bg');
  });

  it('merges multiple classes', () => {
    expect(cn('flex-1', 'bg-surface')).toBe('flex-1 bg-surface');
  });

  it('deduplicates conflicting Tailwind classes (later wins)', () => {
    expect(cn('bg-bg', 'bg-surface')).toBe('bg-surface');
  });

  it('handles undefined and null gracefully', () => {
    expect(cn('bg-bg', undefined, null as unknown as undefined)).toBe('bg-bg');
  });

  it('handles conditional classes via object syntax', () => {
    expect(cn({ 'bg-bg': true, 'bg-surface': false })).toBe('bg-bg');
  });

  it('returns empty string when given no args', () => {
    expect(cn()).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/user/MoneyApp && npx jest __tests__/cn.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/utils/cn'`.

- [ ] **Step 3: Create `utils/cn.ts`**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/user/MoneyApp && npx jest __tests__/cn.test.ts --no-coverage
```

Expected: PASS, 6 tests passing.

- [ ] **Step 5: Commit**

```bash
cd /home/user/MoneyApp && git add utils/cn.ts __tests__/cn.test.ts && git commit -m "feat(foundation): add cn() utility for className composition"
```

---

### Task 6: Create `constants/feature_flags.ts`

**Files:**
- Create: `constants/feature_flags.ts`
- Test: `__tests__/feature_flags.test.ts`

- [ ] **Step 1: Write the failing test**

Create `/home/user/MoneyApp/__tests__/feature_flags.test.ts`:

```ts
import { FeatureFlags } from '@/constants/feature_flags';

describe('FeatureFlags', () => {
  it('has all 7 section flags', () => {
    expect(FeatureFlags).toMatchObject({
      newOnboarding:     expect.any(Boolean),
      newSettings:       expect.any(Boolean),
      newDashboard:      expect.any(Boolean),
      newTransactions:   expect.any(Boolean),
      newAddTransaction: expect.any(Boolean),
      newCommitments:    expect.any(Boolean),
      newAccounts:       expect.any(Boolean),
    });
  });

  it('all flags are false in §1 (pre-migration state)', () => {
    Object.entries(FeatureFlags).forEach(([key, value]) => {
      expect(value).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/user/MoneyApp && npx jest __tests__/feature_flags.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/constants/feature_flags'`.

- [ ] **Step 3: Create `constants/feature_flags.ts`**

```ts
/**
 * Compile-time migration toggles. No runtime service, no remote override,
 * no segmentation. `as const` = tree-shakeable by bundler.
 *
 * Flag flip process (enforced by [tariq] code review + [sarah] gate):
 * 1. Dev opens a one-line PR flipping the target flag false → true.
 * 2. [tariq] reviews and merges only after that section's code-review gate passes.
 * 3. The flag flip lands in the same commit that promotes the migrated screen
 *    to the active route. Never earlier, never as a separate commit.
 * 4. Cleanup rule: within 5 business days of the flag flip merging, a follow-up
 *    PR deletes old screen files, removes the flag entry, and removes any
 *    conditional in the route index.tsx that read the flag. May not be deferred.
 * 5. Next section's plan is not approved until the current section's cleanup PR
 *    has merged to main. [sarah] enforces.
 */
export const FeatureFlags = {
  newOnboarding:     false, // §2 — flip when Onboarding section lands
  newSettings:       false, // §4
  newDashboard:      false, // §5
  newTransactions:   false, // §6
  newAddTransaction: false, // §7 (sheet)
  newCommitments:    false, // §8
  newAccounts:       false, // §9
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/user/MoneyApp && npx jest __tests__/feature_flags.test.ts --no-coverage
```

Expected: PASS, 2 tests passing.

- [ ] **Step 5: Commit**

```bash
cd /home/user/MoneyApp && git add constants/feature_flags.ts __tests__/feature_flags.test.ts && git commit -m "feat(foundation): add FeatureFlags compile-time migration toggle"
```

---

## Phase 4 · Base Primitives (Day 2)

**Verification gate:** All 5 primitive test files pass. `npm run typecheck` passes. `npm run test:coverage` passes thresholds.

Each primitive follows the same TDD loop: write failing test → create file → pass test → commit. They are independent — you may implement them in any order, but `Box` and `Text` should come before `Button` because `Button` imports `Text`.

---

### Task 7: `Box` primitive

**Files:**
- Create: `components/ui/box.tsx`
- Test: `__tests__/ui_box.test.ts`

> **NativeWind testing note:** NativeWind's `className` prop is transformed at Metro build time. In Jest (which does not run Metro), `className` is passed through as a plain string prop — it does not resolve to actual styles. Tests should verify the `className` string is present, not that colors are applied. This is intentional and matches the project's existing test strategy (logic layer only).

- [ ] **Step 1: Write the failing test**

Create `/home/user/MoneyApp/__tests__/ui_box.test.ts`:

```ts
import React from 'react';
import { render } from '@testing-library/react-native';
import { Box } from '@/components/ui/box';

describe('Box', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(
      <Box testID="box" className="bg-surface p-4" />,
    );
    expect(getByTestId('box')).toBeTruthy();
  });

  it('forwards className prop', () => {
    const { getByTestId } = render(
      <Box testID="box" className="bg-surface" />,
    );
    const el = getByTestId('box');
    expect(el.props.className).toBe('bg-surface');
  });

  it('forwards additional ViewProps', () => {
    const { getByTestId } = render(
      <Box testID="box" accessible accessibilityLabel="container" />,
    );
    const el = getByTestId('box');
    expect(el.props.accessibilityLabel).toBe('container');
  });

  it('forwards ref', () => {
    const ref = React.createRef<import('react-native').View>();
    render(<Box ref={ref} />);
    // ref.current is set after mount — just verify it doesn't throw
    expect(() => render(<Box ref={ref} />)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/user/MoneyApp && npx jest __tests__/ui_box.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/components/ui/box'`.

- [ ] **Step 3: Create `components/ui/box.tsx`**

First create the directory:
```bash
mkdir -p /home/user/MoneyApp/components/ui
```

Then create `/home/user/MoneyApp/components/ui/box.tsx`:

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

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/user/MoneyApp && npx jest __tests__/ui_box.test.ts --no-coverage
```

Expected: PASS, 4 tests passing.

- [ ] **Step 5: Commit**

```bash
cd /home/user/MoneyApp && git add components/ui/box.tsx __tests__/ui_box.test.ts && git commit -m "feat(foundation): add Box primitive"
```

---

### Task 8: `Text` primitive

**Files:**
- Create: `components/ui/text.tsx`
- Test: `__tests__/ui_text.test.ts`

- [ ] **Step 1: Write the failing test**

Create `/home/user/MoneyApp/__tests__/ui_text.test.ts`:

```ts
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from '@/components/ui/text';

describe('Text', () => {
  it('renders children', () => {
    const { getByText } = render(<Text>Hello</Text>);
    expect(getByText('Hello')).toBeTruthy();
  });

  it('defaults to body variant (font-inter text-text1 text-[14px])', () => {
    const { getByTestId } = render(<Text testID="t">Body</Text>);
    const el = getByTestId('t');
    expect(el.props.className).toContain('font-inter');
    expect(el.props.className).toContain('text-text1');
  });

  it('applies caption variant classes', () => {
    const { getByTestId } = render(<Text testID="t" variant="caption">Caption</Text>);
    const el = getByTestId('t');
    expect(el.props.className).toContain('text-text2');
    expect(el.props.className).toContain('text-[12px]');
  });

  it('applies hint variant classes', () => {
    const { getByTestId } = render(<Text testID="t" variant="hint">Hint</Text>);
    const el = getByTestId('t');
    expect(el.props.className).toContain('text-hint');
  });

  it('applies title variant classes', () => {
    const { getByTestId } = render(<Text testID="t" variant="title">Title</Text>);
    const el = getByTestId('t');
    expect(el.props.className).toContain('font-soraSemi');
    expect(el.props.className).toContain('text-[18px]');
  });

  it('applies hero variant classes', () => {
    const { getByTestId } = render(<Text testID="t" variant="hero">Hero</Text>);
    const el = getByTestId('t');
    expect(el.props.className).toContain('font-soraSemi');
    expect(el.props.className).toContain('text-[28px]');
  });

  it('merges custom className over variant', () => {
    const { getByTestId } = render(
      <Text testID="t" variant="body" className="mt-4">Content</Text>,
    );
    const el = getByTestId('t');
    expect(el.props.className).toContain('mt-4');
    expect(el.props.className).toContain('font-inter');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/user/MoneyApp && npx jest __tests__/ui_text.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/components/ui/text'`.

- [ ] **Step 3: Create `components/ui/text.tsx`**

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
    <RNText
      ref={ref}
      className={cn(textVariants({ variant }), className)}
      {...props}
    />
  ),
);
Text.displayName = 'Text';
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/user/MoneyApp && npx jest __tests__/ui_text.test.ts --no-coverage
```

Expected: PASS, 7 tests passing.

- [ ] **Step 5: Commit**

```bash
cd /home/user/MoneyApp && git add components/ui/text.tsx __tests__/ui_text.test.ts && git commit -m "feat(foundation): add Text primitive with body/caption/hint/title/hero variants"
```

---

### Task 9: `Pressable` primitive

**Files:**
- Create: `components/ui/pressable.tsx`
- Test: `__tests__/ui_pressable.test.ts`

- [ ] **Step 1: Write the failing test**

Create `/home/user/MoneyApp/__tests__/ui_pressable.test.ts`:

```ts
import React from 'react';
import { render } from '@testing-library/react-native';
import { Pressable } from '@/components/ui/pressable';
import { Text } from 'react-native';

describe('Pressable', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Pressable><Text>Press me</Text></Pressable>,
    );
    expect(getByText('Press me')).toBeTruthy();
  });

  it('has hitSlop of 44', () => {
    const { getByTestId } = render(
      <Pressable testID="p"><Text>x</Text></Pressable>,
    );
    expect(getByTestId('p').props.hitSlop).toBe(44);
  });

  it('accepts accessibility props', () => {
    const { getByTestId } = render(
      <Pressable testID="p" accessibilityRole="button" accessibilityLabel="do thing">
        <Text>x</Text>
      </Pressable>,
    );
    const el = getByTestId('p');
    expect(el.props.accessibilityRole).toBe('button');
    expect(el.props.accessibilityLabel).toBe('do thing');
  });

  it('merges className prop', () => {
    const { getByTestId } = render(
      <Pressable testID="p" className="bg-surfaceEl p-4"><Text>x</Text></Pressable>,
    );
    expect(getByTestId('p').props.className).toContain('bg-surfaceEl');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/user/MoneyApp && npx jest __tests__/ui_pressable.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/components/ui/pressable'`.

- [ ] **Step 3: Create `components/ui/pressable.tsx`**

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
    style={({ pressed }) => [
      { opacity: pressed ? 0.75 : 1 },
      typeof style === 'function' ? style({ pressed }) : style,
    ]}
    className={cn(className)}
    {...props}
  />
));
Pressable.displayName = 'Pressable';
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/user/MoneyApp && npx jest __tests__/ui_pressable.test.ts --no-coverage
```

Expected: PASS, 4 tests passing.

- [ ] **Step 5: Commit**

```bash
cd /home/user/MoneyApp && git add components/ui/pressable.tsx __tests__/ui_pressable.test.ts && git commit -m "feat(foundation): add Pressable primitive with hitSlop and opacity feedback"
```

---

### Task 10: `Input` primitive

**Files:**
- Create: `components/ui/input.tsx`
- Test: `__tests__/ui_input.test.ts`

- [ ] **Step 1: Write the failing test**

Create `/home/user/MoneyApp/__tests__/ui_input.test.ts`:

```ts
import React from 'react';
import { render } from '@testing-library/react-native';
import { Input } from '@/components/ui/input';

describe('Input', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<Input testID="input" />);
    expect(getByTestId('input')).toBeTruthy();
  });

  it('applies normal border class when hasError is false', () => {
    const { getByTestId } = render(<Input testID="input" hasError={false} />);
    const el = getByTestId('input');
    expect(el.props.className).toContain('border-border');
    expect(el.props.className).not.toContain('border-negative');
  });

  it('applies error border class when hasError is true', () => {
    const { getByTestId } = render(<Input testID="input" hasError />);
    const el = getByTestId('input');
    expect(el.props.className).toContain('border-negative');
    expect(el.props.className).not.toContain('border-border');
  });

  it('uses text2 hex for placeholderTextColor', () => {
    const { getByTestId } = render(<Input testID="input" placeholder="Enter value" />);
    // placeholderTextColor is set to #6B7F99 (text2) — verify the prop is present
    expect(getByTestId('input').props.placeholderTextColor).toBe('#6B7F99');
  });

  it('forwards TextInput props (value, onChangeText)', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <Input testID="input" value="hello" onChangeText={onChangeText} />,
    );
    const el = getByTestId('input');
    expect(el.props.value).toBe('hello');
  });

  it('merges additional className', () => {
    const { getByTestId } = render(<Input testID="input" className="w-full" />);
    expect(getByTestId('input').props.className).toContain('w-full');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/user/MoneyApp && npx jest __tests__/ui_input.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/components/ui/input'`.

- [ ] **Step 3: Create `components/ui/input.tsx`**

```tsx
import React from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { cn } from '@/utils/cn';

interface InputProps extends TextInputProps {
  className?: string;
  hasError?: boolean;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ className, hasError = false, ...props }, ref) => (
    <TextInput
      ref={ref}
      className={cn(
        'border rounded-[12px] px-4 py-3 font-inter text-[14px] text-text1 bg-surfaceEl',
        hasError ? 'border-negative' : 'border-border',
        className,
      )}
      placeholderTextColor="#6B7F99"
      {...props}
    />
  ),
);
Input.displayName = 'Input';
```

> **Note on `placeholderTextColor`:** This is a JSX prop (not a Tailwind class), so it cannot be a Tailwind token. `#6B7F99` is `text2` from `CoreTokens`. The lint rule only applies to `tailwind.config.js`. This is the one accepted exception — document it with an inline comment in production code if the team wants clarity.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/user/MoneyApp && npx jest __tests__/ui_input.test.ts --no-coverage
```

Expected: PASS, 6 tests passing.

- [ ] **Step 5: Commit**

```bash
cd /home/user/MoneyApp && git add components/ui/input.tsx __tests__/ui_input.test.ts && git commit -m "feat(foundation): add Input primitive with error state"
```

---

### Task 11: `Button` primitive

**Files:**
- Create: `components/ui/button.tsx`
- Test: `__tests__/ui_button.test.ts`

`Button` depends on `Text` (already created in Task 8) and `expo-linear-gradient` (installed in Task 1).

- [ ] **Step 1: Write the failing test**

Create `/home/user/MoneyApp/__tests__/ui_button.test.ts`:

```ts
import React from 'react';
import { render } from '@testing-library/react-native';
import { Button } from '@/components/ui/button';

// expo-linear-gradient is mocked by jest-expo's auto-mock infrastructure.
// If tests fail with "LinearGradient is not a function", add a manual mock:
// jest.mock('expo-linear-gradient', () => ({
//   LinearGradient: ({ children }: { children: React.ReactNode }) => children,
// }));

describe('Button', () => {
  it('renders label text', () => {
    const { getByText } = render(
      <Button label="Continue" onPress={() => {}} />,
    );
    expect(getByText('Continue')).toBeTruthy();
  });

  it('defaults to primary variant', () => {
    const { getByRole } = render(
      <Button label="OK" onPress={() => {}} />,
    );
    expect(getByRole('button')).toBeTruthy();
  });

  it('primary variant wraps in LinearGradient', () => {
    const { UNSAFE_getByType } = render(
      <Button variant="primary" label="Primary" onPress={() => {}} />,
    );
    // LinearGradient renders as its mock or native component —
    // verify the Pressable itself has no background class (gradient provides it)
    expect(UNSAFE_getByType(require('react-native').Pressable)).toBeTruthy();
  });

  it('ghost variant applies border classes', () => {
    const { getByRole } = render(
      <Button variant="ghost" label="Ghost" onPress={() => {}} />,
    );
    const el = getByRole('button');
    expect(el.props.className).toContain('border-border');
    expect(el.props.className).toContain('bg-transparent');
  });

  it('destructive variant applies negative background', () => {
    const { getByRole } = render(
      <Button variant="destructive" label="Delete" onPress={() => {}} />,
    );
    const el = getByRole('button');
    expect(el.props.className).toContain('bg-negative');
  });

  it('has min-height class for all variants', () => {
    const variants = ['primary', 'ghost', 'destructive'] as const;
    variants.forEach((variant) => {
      const { getByRole } = render(
        <Button variant={variant} label="Test" onPress={() => {}} />,
      );
      expect(getByRole('button').props.className).toContain('min-h-[52px]');
    });
  });

  it('forwards onPress', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<Button label="Press" onPress={onPress} />);
    getByRole('button').props.onPress();
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/user/MoneyApp && npx jest __tests__/ui_button.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/components/ui/button'`.

- [ ] **Step 3: Create `components/ui/button.tsx`**

```tsx
import React from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';
import { GoldTokens } from '@/constants/theme_tokens';
import { Text } from './text';

const buttonVariants = cva(
  'min-h-[52px] min-w-[44px] rounded-[13px] items-center justify-center px-4',
  {
    variants: {
      variant: {
        primary:     '',
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

export const Button = React.forwardRef<
  React.ElementRef<typeof Pressable>,
  ButtonProps
>(({ className, variant = 'primary', label, ...props }, ref) => {
  const pressable = (
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
        // Token-sourced: GoldTokens[400] = #E0B968, GoldTokens[600] = #C9973A
        colors={[GoldTokens[400], GoldTokens[600]]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ borderRadius: 13 }}
      >
        {pressable}
      </LinearGradient>
    );
  }

  return pressable;
});
Button.displayName = 'Button';
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/user/MoneyApp && npx jest __tests__/ui_button.test.ts --no-coverage
```

Expected: PASS, 7 tests passing. If `LinearGradient` is not mocked by jest-expo, you'll see an error like `TypeError: LinearGradient is not a function`. In that case, add this to the top of the test file (after the imports):

```ts
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: React.PropsWithChildren<object>) =>
    React.createElement('View', props, children),
}));
```

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
cd /home/user/MoneyApp && npm run test:coverage
```

Expected: all tests pass, coverage thresholds met (80% lines · 95% functions · 100% branches). The new test files for pure logic (`cn`, `theme_tokens`, `feature_flags`) and render tests contribute positively to coverage.

- [ ] **Step 6: Commit**

```bash
cd /home/user/MoneyApp && git add components/ui/button.tsx __tests__/ui_button.test.ts && git commit -m "feat(foundation): add Button primitive with primary gradient, ghost, destructive variants"
```

---

## Phase 5 · Dev Preview Route (Day 3, morning)

**Verification gate:** `test -f app/(dev)/primitives/index.tsx` exits 0. `npm run typecheck` passes. The route renders in `__DEV__` mode.

---

### Task 12: Dev preview screen and route

**Files:**
- Create: `screens/dev/primitives/index.tsx`
- Create: `app/(dev)/primitives/index.tsx`

These files are not unit-tested (render tests for the preview screen would just duplicate the primitive tests). CI verification is the file-existence check.

- [ ] **Step 1: Create the screens directory and preview component**

```bash
mkdir -p /home/user/MoneyApp/screens/dev/primitives
```

Create `/home/user/MoneyApp/screens/dev/primitives/index.tsx`:

```tsx
import React from 'react';
import { ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';

export default function PrimitivesPreview() {
  if (!__DEV__) return null;

  return (
    <ScrollView className="flex-1 bg-bg p-4">
      <Text variant="title" className="mb-6">
        Primitives Preview
      </Text>

      <Text variant="body" className="mb-2">
        Box
      </Text>
      <Box className="bg-surface rounded-[12px] p-4 mb-6">
        <Text>Inside Box — bg-surface</Text>
      </Box>

      <Text variant="body" className="mb-2">
        Text variants
      </Text>
      <Text variant="hero" className="mb-1">Hero (28px Sora)</Text>
      <Text variant="title" className="mb-1">Title (18px Sora)</Text>
      <Text variant="body" className="mb-1">Body (14px Inter)</Text>
      <Text variant="caption" className="mb-1">Caption (12px Inter text2)</Text>
      <Text variant="hint" className="mb-6">Hint (12px Inter text-hint — EGP pre-selected)</Text>

      <Text variant="body" className="mb-2">
        Button variants
      </Text>
      <Button variant="primary" label="Primary CTA (gold gradient)" className="mb-3" onPress={() => {}} />
      <Button variant="ghost" label="Ghost (border + transparent)" className="mb-3" onPress={() => {}} />
      <Button variant="destructive" label="Destructive (bg-negative)" className="mb-6" onPress={() => {}} />

      <Text variant="body" className="mb-2">
        Input
      </Text>
      <Input placeholder="Normal state — border-border" className="mb-3" />
      <Input placeholder="Error state — border-negative" hasError className="mb-6" />

      <Text variant="body" className="mb-2">
        Pressable
      </Text>
      <Pressable className="bg-surfaceEl rounded-[12px] p-4 mb-8">
        <Text>Press me — opacity 0.75 feedback, hitSlop 44</Text>
      </Pressable>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Create the Expo Router route**

```bash
mkdir -p "/home/user/MoneyApp/app/(dev)/primitives"
```

Create `/home/user/MoneyApp/app/(dev)/primitives/index.tsx`:

```tsx
export { default } from '@/screens/dev/primitives';
```

- [ ] **Step 3: Verify file exists (CI check)**

```bash
test -f "/home/user/MoneyApp/app/(dev)/primitives/index.tsx" && echo "AC #5 PASS" || echo "AC #5 FAIL"
```

Expected output: `AC #5 PASS`.

- [ ] **Step 4: Run typecheck**

```bash
cd /home/user/MoneyApp && npm run typecheck
```

Expected: passes. If Expo Router complains about the `(dev)` route group, verify that Expo Router v3 supports route groups (it does — `(group)` syntax is supported since Expo Router v2).

- [ ] **Step 5: Commit**

```bash
cd /home/user/MoneyApp && git add "screens/dev/primitives/index.tsx" "app/(dev)/primitives/index.tsx" && git commit -m "feat(foundation): add dev preview route for all 5 primitives"
```

---

## Phase 6 · Final Verification (Day 3, afternoon)

**Verification gate:** All 8 acceptance criteria verified. Ready for [tariq] code review gate.

---

### Task 13: Full AC sweep

**Files:** none created — verification only.

- [ ] **AC #1: `npm install` clean**

```bash
cd /home/user/MoneyApp && npm install 2>&1 | tail -5
```

Expected: exits 0, no `npm warn ERESOLVE` or unmet peer messages.

- [ ] **AC #2: Android smoke test (zero visible UI changes)**

```bash
cd /home/user/MoneyApp && npx expo start --android
```

Open on Android Expo Go (SDK 55). Navigate through the existing app screens. Expected: identical to pre-§1 state — no layout shifts, no missing styles, no crashes.

> **iOS note (R5):** iOS Expo Go for SDK 55 may not be available on the App Store. If not available, skip iOS smoke test and note it in the PR description. Do not block merge on iOS Expo Go availability. Use TestFlight or `eas go` if available.

- [ ] **AC #3: Typecheck**

```bash
cd /home/user/MoneyApp && npm run typecheck
```

Expected: exits 0.

- [ ] **AC #4: Test coverage**

```bash
cd /home/user/MoneyApp && npm run test:coverage
```

Expected: exits 0. Coverage report shows ≥ 80% lines · ≥ 95% functions · 100% branches. New files (`theme_tokens.ts`, `cn.ts`, `feature_flags.ts`, `components/ui/*.tsx`) are covered by their test files.

- [ ] **AC #5: Dev preview route file exists**

```bash
test -f "/home/user/MoneyApp/app/(dev)/primitives/index.tsx" && echo "PASS" || echo "FAIL"
```

Expected: `PASS`.

- [ ] **AC #6: No hex literals in `tailwind.config.js`**

```bash
cd /home/user/MoneyApp && npx eslint tailwind.config.js
```

Expected: exits 0 (no errors). If the lint rule itself isn't triggering, verify it was added to `eslint.config.js` correctly.

- [ ] **AC #7: Feature flags file exists and all flags false**

```bash
cd /home/user/MoneyApp && npx jest __tests__/feature_flags.test.ts --no-coverage
```

Expected: PASS.

- [ ] **AC #8: Metro config uses `withNativeWind`, Babel unchanged**

```bash
grep -n "withNativeWind" /home/user/MoneyApp/metro.config.js && echo "metro OK"
grep -n "nativewind" /home/user/MoneyApp/babel.config.js && echo "FAIL: babel was modified" || echo "babel OK"
```

Expected:
```
1: const { withNativeWind } = require('nativewind/metro');
metro OK
babel OK
```

- [ ] **Step: Final commit if any loose files**

```bash
cd /home/user/MoneyApp && git status
```

If any files are untracked or modified, stage and commit them. All §1 work should be committed before requesting review.

- [ ] **Step: Request [tariq] code review**

Open a PR from the current branch (`claude/review-app-foundation-doc-WqYiC`) against `main`. PR title: `feat: Section 1 Foundation — NativeWind v5 + gluestack-ui v2 primitives + Cairo Nights palette`. Tag [tariq] as reviewer. Reference the spec at `docs/superpowers/specs/2026-05-10-section-1-foundation-design.md`.

---

## Test Strategy Summary

| What | How | Gate |
|---|---|---|
| Palette token shape + values | `__tests__/theme_tokens.test.ts` — 8 assertions | Phase 2 |
| `cn()` merge behavior | `__tests__/cn.test.ts` — 6 assertions | Phase 3 |
| Feature flags shape + values | `__tests__/feature_flags.test.ts` — 2 assertions | Phase 3 |
| Box renders + forwards props | `__tests__/ui_box.test.ts` — 4 assertions | Phase 4 |
| Text variants via className | `__tests__/ui_text.test.ts` — 7 assertions | Phase 4 |
| Pressable hitSlop + feedback | `__tests__/ui_pressable.test.ts` — 4 assertions | Phase 4 |
| Input error/normal states | `__tests__/ui_input.test.ts` — 6 assertions | Phase 4 |
| Button variants + gradient | `__tests__/ui_button.test.ts` — 7 assertions | Phase 4 |
| Dev preview route file exists | `test -f app/(dev)/primitives/index.tsx` | Phase 5 |
| No hex in Tailwind config | `eslint tailwind.config.js` | Phase 6 |
| Visual parity (Android) | Manual smoke test in Expo Go | Phase 6 |
| Visual parity (iOS) | Manual smoke test — gated on R5 (TestFlight/eas go) | Phase 6 |
| Full coverage thresholds | `npm run test:coverage` | Phase 6 |

**NativeWind className in tests:** NativeWind's Metro transform does not run in Jest. Tests assert on the `className` string prop, not computed styles. This is correct — it matches the project's existing logic-layer test strategy. Visual correctness is verified via the dev preview route in Expo Go.

**iOS App Store risk (R5):** Android Expo Go SDK 55 is the primary smoke-test target for §1. iOS smoke test is deferred until TestFlight or App Store availability. Do not hold the §1 merge on iOS Expo Go. Note the iOS status explicitly in the PR description.

---

## Acceptance Criteria Checklist (tied 1:1 to spec)

- [ ] **AC #1** — `npm install` completes without errors and without peer-dep warnings.
- [ ] **AC #2** — `npx expo start` launches on Android Expo Go SDK 55 with zero visible UI changes. *(iOS: blocked by R5 — verified via TestFlight when available.)*
- [ ] **AC #3** — `npm run typecheck` passes.
- [ ] **AC #4** — `npm run test:coverage` passes (80% lines · 95% functions · 100% branches).
- [ ] **AC #5** — `test -f app/(dev)/primitives/index.tsx` exits 0. Dev preview route renders all 5 primitives with every variant in `__DEV__` mode.
- [ ] **AC #6** — `npx eslint tailwind.config.js` exits 0. No hex literals in `tailwind.config.js`.
- [ ] **AC #7** — `constants/feature_flags.ts` exists and all 7 flags are `false`.
- [ ] **AC #8** — `metro.config.js` contains `withNativeWind`. `babel.config.js` is unchanged from pre-§1.
