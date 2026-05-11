# HeroUI Native Migration — Design Spec

> **Revised 2026-05-12: corrected HeroUI Native architecture.**
> The original doc was written on incorrect assumptions about the styling model. See "Revision Notes" below.
>
> **Scope update (2026-05-12, execution-time):** This migration PR ships the **§1 foundation only** (library swap, primitives, theme, build system, CI, docs). The §2 onboarding retarget was deferred to a follow-up PR after discovering the §2 files never landed on `main` (they only existed on the closed `feat/section-2-onboarding` branch). The "targeted retarget" plan was based on a false premise. §2 will be rebuilt fresh atop the merged HeroUI Native foundation in a separate PR.

**Date:** 2026-05-11
**Revised:** 2026-05-12
**Status:** Revised — awaiting re-approval
**Owners:** [tariq] architecture · [sarah] sequencing
**Branch:** `refactor/heroui-native-migration` (to be created from `main`)
**Supersedes:** `docs/superpowers/specs/2026-05-10-section-1-foundation-design.md` (Part B only — Part A's Library locked decision is also updated by this doc)

---

## Revision Notes (2026-05-12)

The original version of this document (2026-05-11) described HeroUI Native as using "Unistyles 3 directly, no className" — meaning Unistyles `StyleSheet.create` style objects as the primary styling mechanism, with no Tailwind class involvement. That was wrong.

**Correct architecture (verified against official docs and npm):**

HeroUI Native uses **Tailwind classes via `className` props**, processed by **Uniwind** — a build-time Tailwind-to-Unistyles 3 compiler made by the same team. The DX is identical to NativeWind: you write `className="flex-1 bg-background text-foreground"` on any component. Uniwind compiles those classes at build time into Unistyles 3 `StyleSheet` calls, which run on the C++/JSI layer. There is no runtime Tailwind parsing.

Consequences for this document:

1. **Package name:** `heroui-native` (not `@heroui/native`). All install commands and imports updated.
2. **Provider:** `HeroUINativeProvider` imported from `heroui-native`. The original doc used `HeroUIProvider` — wrong name. A lighter `HeroUINativeProviderRaw` from `heroui-native/provider-raw` is available (excludes `ToastProvider` and `PortalHost`) — MoneyApp uses this since toast and portal are not needed in §1–§2.
3. **Styling model:** `className` + Tailwind utilities everywhere — same DX as NativeWind. The primitives (`Box`, `Text`, `Button`, `Input`, `Pressable`) are rewritten as `className`-first opinionated wrappers using `tailwind-variants` (`tv`). Unistyles `StyleSheet.create` is still available for components that need runtime hex values (e.g. account color swatches) — but it is not the primary mechanism.
4. **Theme:** There is no `createTheme()` API. Theme lives in `global.css` as CSS variables under `@layer theme { @variant dark { ... } }` blocks, with `@theme inline { --color-x: var(--x); }` for Tailwind to consume. `constants/heroui_theme.ts` is deleted — it was designed around a non-existent API.
5. **`global.css`:** NOT deleted. Rewritten with the required HeroUI Native imports. The old NativeWind content is replaced.
6. **`metro.config.js`:** NOT restored to plain Expo Metro config. Must wrap with both `withUniwindConfig` (from `uniwind/metro`) and `wrapWithReanimatedMetroConfig` (from `react-native-reanimated/metro-config`).
7. **`tailwind.config.js`:** Correctly deleted. Uniwind is CSS-first (Tailwind v4) — no `tailwind.config.js` needed.
8. **Exiting packages:** `tailwind-merge` and `tailwind-variants` are NOT exiting — they are required peer deps of `heroui-native`. `clsx` exits (replaced by `cn` from `heroui-native`). The exact exiting list is revised in the Dependency Inventory section.
9. **`utils/cn.ts`:** Deleted. All existing import sites migrate to `import { cn } from 'heroui-native'`. There are 9 files on `main` with `import { cn } from '@/utils/cn'` — all are rewritten as part of this migration anyway (primitives + §2 screens). No separate import-fix task needed.
10. **Reanimated v3 → v4:** New peer dep `react-native-worklets@^0.5.1` required. Babel plugin changes from `react-native-reanimated/plugin` to `react-native-worklets/plugin`. Entering/exiting layout animation API is **unchanged** (verified against Reanimated migration docs). `withSpring` loses `restDisplacementThreshold`/`restSpeedThreshold` (replaced by `energyThreshold`) — search for usages before upgrading. `useAnimatedGestureHandler` removed — not used in MoneyApp.
11. **§2 screens scope:** Decision revised — targeted retarget instead of full rewrite from scratch. The §2 screens on `main` use `className` DX already. They need: (a) import-source swaps off `react-native-css/components`, (b) token name updates from NativeWind theme keys to HeroUI slot names, (c) `cn` import updated. Logic files (hooks, stores, state, anim) are unchanged.

---

## Context

The gluestack-ui v2 + NativeWind v5 stack was abandoned after multi-day runtime failures:

- `preview.3`'s `globalClassNamePolyfill` drops ScrollView children and breaks Android flex layouts (commit `af00567`).
- §2 shipped with `FeatureFlags.newOnboarding = false` to avoid runtime bugs at merge.
- Two rounds of fixes (switched to `react-native-css/components` wrappers + patched `paddingInline` → `paddingHorizontal`) built but produced persistent UI glitches.

The replacement stack is **HeroUI Native v1.0** (stable, Apache 2.0, from the HeroUI/NextUI team). It uses **Tailwind classes via `className`** processed by **Uniwind** (a build-time Tailwind-to-Unistyles 3 compiler). Unistyles 3 requires `expo-dev-client` and `expo prebuild` — Expo Go is explicitly unsupported by the Unistyles maintainer.

**The human has accepted the Expo Go → `expo-dev-client` trade-off.** Library choice is settled. This doc does not re-litigate it.

---

## Locked Decisions (superseding §1 Foundation locked decisions)

### Library

**HeroUI Native v1.0 + Unistyles 3 (via Uniwind).** Replaces gluestack-ui v2 + NativeWind across all 9 sections. `expo-dev-client` is now required. `expo prebuild` generates native `ios/` and `android/` directories (gitignored). Expo Go is no longer supported.

HeroUI Native provides themed component primitives (Button, Input, Modal, Drawer, etc.) styled via Tailwind classes processed by Uniwind at build time. The underlying style engine is Unistyles 3's C++/JSI layer. DX is `className`-first — identical ergonomics to NativeWind but with a faster, build-time compiler.

### Expo Workflow

`expo-dev-client` + `npx expo prebuild`. Daily dev loop:

```bash
npx expo prebuild --clean          # generate native dirs (run once or after native dep changes)
npx expo run:android               # local build + launch
npx expo run:ios                   # local build + launch
# Cloud builds:
eas build --profile development --platform android
```

`ios/` and `android/` are gitignored.

### Brand

**Cairo Nights Extended palette is unchanged.** All hex values in `constants/theme_tokens.ts` are correct and survive the migration. The hex values are mapped to HeroUI Native's CSS variable slots in `global.css` under `@layer theme { @variant dark { ... } }`. `constants/theme_tokens.ts` is also re-consumed directly by module-level call sites that cannot use hooks.

### Scope

Pure library + toolchain swap. No new features, no new screens, no new tabs. The 8 IA changes and 9-section delivery sequence from the mega-initiative are unchanged.

---

## Strategy

**Single branch from current `main`. Delete the NativeWind world wholesale. Rebuild §1 foundation using HeroUI Native. Retarget §2 onboarding via targeted import-source swaps (not a full rewrite).**

The §2 screens on `main` already use `className` DX — they were committed with NativeWind. The work is: swap primitive imports from the old NativeWind-backed components to the new HeroUI Native-backed ones, update token names that changed (e.g. NativeWind theme keys → HeroUI CSS var names), and update the `cn` import source. Logic files are unchanged.

PR #60 (`feat/section-2-onboarding`) is closed without extraction. The branch remains in git history.

---

## Current State to Unwind

### §1 Foundation (merged, commit `573a80d`, PR #58)

Status: in `main`. Contains NativeWind artifacts that must be replaced, and survivors.

**Survivors (keep as-is):**
- `constants/theme_tokens.ts` — Cairo Nights Extended palette as TS constants. This file is load-bearing at module level: `app/_layout.tsx` calls `SystemUI.setBackgroundColorAsync(Colors.dark.bg)`, `expo-linear-gradient` reads `colors` props, `MaterialCommunityIcons` reads `color` props, and `@react-navigation/native` theme is built from these constants. None of those call sites can use `useTheme()` — they run outside React. `theme_tokens.ts` stays as the plain-JS palette source of truth. It is also the data source for the Cairo Nights → HeroUI CSS variable mapping written into `global.css`.
- `constants/feature_flags.ts` — migration toggle scaffolding. Unchanged.
- `app/(dev)/primitives/index.tsx` + `screens/dev/primitives/index.tsx` — dev preview route structure. Screen contents rewritten to use HeroUI Native primitives.

**To be replaced in the migration PR:**
- `components/ui/box.tsx`, `text.tsx`, `button.tsx`, `input.tsx`, `pressable.tsx` — deleted and rewritten as HeroUI Native className-first wrappers using `tailwind-variants`.
- `metro.config.js` — rewritten with `withUniwindConfig` + `wrapWithReanimatedMetroConfig` wrappers.
- `global.css` — rewritten with HeroUI Native required imports and Cairo Nights CSS variable overrides. NOT deleted.
- `utils/cn.ts` — deleted. All 9 import sites migrate to `import { cn } from 'heroui-native'` as part of the primitive and §2 screen rewrites.
- `constants/heroui_theme.ts` — NOT created. This file was designed for a `createTheme()` API that does not exist in HeroUI Native.

**Decision: forward-fix. Do NOT revert `573a80d`.** The survivors are worth keeping in history. The migration PR replaces NativeWind-specific artifacts cleanly.

### §2 Onboarding (PR #60, branch `feat/section-2-onboarding`)

**Decision: close PR #60 without extraction. No cherry-picking.**

The §2 screens on `main` use `className` already (committed with NativeWind primitives). The retarget work is: swap import sources, update token names, update `cn` import. This is lighter than a full rewrite but still requires touching all 4 screen index files and the `type_pill.tsx` component.

Logic files (`.hook.ts`, `.store.ts`, `.state.ts`, `.anim.ts`) do not reference styling primitives and are unchanged.

The §2 design spec (`docs/superpowers/specs/2026-05-11-section-2-onboarding-design.md`) remains the source of truth for the resulting UI.

**Uncommitted changes on `feat/section-2-onboarding` to discard entirely (not extract):**
- `components/ui/animated.tsx`, `safe_area_view.tsx`, `scroll_view.tsx` — NativeWind workarounds
- `metro.config.js` tweak (`globalClassNamePolyfill: false`)
- 5 UI primitives switched to `react-native-css/components`
- 6 onboarding screen files with AnimatedView/AnimatedText swaps
- `jest.setup.js` mock for `react-native-css/components`
- `patches/react-native-css+3.0.7.patch`
- `FeatureFlags.newOnboarding: true` (local visual test — already `true` on main; verify before assuming change)

All of these are workarounds for a stack being abandoned. Discard without extraction.

### §3–9 (not started)

Unaffected. Continue in original sequence after the migration PR merges.

---

## Confirmed Decisions on Previously Open Questions

**Q2 — `react-native-actions-sheet` removal:** Deferred to §3. §2 Onboarding does not use bottom sheets. The library stays in `package.json` until the §3 Reusable Patterns section, where HeroUI Native Drawer replaces it. Do not remove in the migration PR.

Note: HeroUI Native lists `@gorhom/bottom-sheet@^5.2.8` as an optional peer. Do not install it in this PR — its addition (and the `react-native-actions-sheet` retirement) belongs to §3.

**Q3 — EAS Build:** Already configured. `eas.json` exists with `development`, `preview`, and `production` profiles. The `development` profile has `developmentClient: true`. EAS Build is wired up. No EAS account setup step needed in the plan.

**Q4 — CI pipeline:** `.github/workflows/pr-checks.yml` exists. The `build` job currently runs `npx expo export --platform android`. Under the Reanimated v4 + Unistyles 3 stack, both `expo export` and the metro `typecheck` side-effect will fail without native dirs. Fix: replace the export job with `npx expo prebuild --no-install --platform android` + verify android/ was created. The CI runner needs `actions/setup-java@v4` with `java-version: '17'` for the Android prebuild step. No Android SDK installation needed — `--no-install` skips native build steps that require the full SDK.

**Q5 — PR #60 closure:** Confirmed. Close PR #60. No extraction. Branch stays in git history.

**Q6 — Pre-M2 Hardening:** Runs after the migration PR merges. The hardening plan at `docs/superpowers/plans/2026-05-10-pre-m2-hardening.md` is unblocked only after §1+§2 migration lands on `main`.

---

## Architecture: Styling Model

### How It Works

HeroUI Native styling flow:

```
className="bg-background text-foreground p-4"
    ↓  (build time, Uniwind compiler)
Unistyles 3 StyleSheet (C++/JSI)
    ↓  (runtime)
native StyleSheet.create output
```

Alongside `className`, a `style` prop is always available on HeroUI Native components for runtime values (dynamic hex colors, animated styles). This is the correct integration point for things like account color swatches and Reanimated shared values.

### When to Use `className` vs `style`

| Use case | API |
|---|---|
| Static themed tokens (bg, text, border, padding) | `className` using HeroUI slot names (`bg-background`, `text-foreground`, `border-separator`, etc.) |
| Runtime hex (account color swatch, progress bar fill) | `style={{ backgroundColor: account.color }}` |
| Reanimated animated styles | `style={[animatedStyle]}` via Animated.View |
| Component variant composition | `tv(...)` from `tailwind-variants`, `buttonClassNames.*` from `heroui-native` |

### `cn` Utility

`cn` is re-exported from `heroui-native` directly. Delete `utils/cn.ts`. All 9 existing import sites (`components/ui/*.tsx` + `screens/onboarding_v2/` index files and `type_pill.tsx`) are rewritten as part of this migration.

Decision: **delete `utils/cn.ts`, update all imports to `import { cn } from 'heroui-native'`**. No shim needed — the re-export from `heroui-native` is stable.

---

## Architecture: Theme

### CSS Variables in `global.css`

HeroUI Native's theme system uses CSS custom properties defined in `global.css`. There is no `createTheme()` JavaScript function. The `@layer theme` block is where MoneyApp overrides HeroUI Native's defaults with Cairo Nights values.

`global.css` structure (required sections, in order):

```css
@import 'tailwindcss';
@import 'uniwind';
@import 'heroui-native/styles';
@source './node_modules/heroui-native/lib';

@layer theme {
  @variant dark {
    /* Cairo Nights Extended — override HeroUI Native defaults */
    --background:           #0F1923;
    --foreground:           #F0EBE3;
    --surface:              #1A2535;
    --surface-foreground:   #F0EBE3;
    --surface-secondary:    #243044;
    --surface-secondary-foreground: #F0EBE3;
    --surface-tertiary:     #2A3A4F;
    --surface-tertiary-foreground:  #F0EBE3;
    --overlay:              rgba(0,0,0,0.6);
    --overlay-foreground:   #F0EBE3;
    --accent:               #D4A44C;
    --accent-foreground:    #0F1923;
    --default:              #243044;
    --default-foreground:   #F0EBE3;
    --field-background:     #243044;
    --field-foreground:     #F0EBE3;
    --field-placeholder:    #6B7F99;
    --field-border:         #2A3A4F;
    --success:              #4CAF82;
    --success-foreground:   #0F1923;
    --warning:              #E8B130;
    --warning-foreground:   #0F1923;
    --danger:               #E05A42;
    --danger-foreground:    #F0EBE3;
    --muted:                #4A5568;
    --segment:              #1A2535;
    --border:               #2A3A4F;
    --separator:            #2A3A4F;
    --focus:                #D4A44C;
    --link:                 #D4A44C;
  }

  @variant light {
    /* App is dark-only. Duplicate dark values so Uniwind has a valid light variant. */
    --background:           #0F1923;
    --foreground:           #F0EBE3;
    --surface:              #1A2535;
    --surface-foreground:   #F0EBE3;
    --surface-secondary:    #243044;
    --surface-secondary-foreground: #F0EBE3;
    --surface-tertiary:     #2A3A4F;
    --surface-tertiary-foreground:  #F0EBE3;
    --overlay:              rgba(0,0,0,0.6);
    --overlay-foreground:   #F0EBE3;
    --accent:               #D4A44C;
    --accent-foreground:    #0F1923;
    --default:              #243044;
    --default-foreground:   #F0EBE3;
    --field-background:     #243044;
    --field-foreground:     #F0EBE3;
    --field-placeholder:    #6B7F99;
    --field-border:         #2A3A4F;
    --success:              #4CAF82;
    --success-foreground:   #0F1923;
    --warning:              #E8B130;
    --warning-foreground:   #0F1923;
    --danger:               #E05A42;
    --danger-foreground:    #F0EBE3;
    --muted:                #4A5568;
    --segment:              #1A2535;
    --border:               #2A3A4F;
    --separator:            #2A3A4F;
    --focus:                #D4A44C;
    --link:                 #D4A44C;
  }
}

@theme inline {
  --color-background:               var(--background);
  --color-foreground:               var(--foreground);
  --color-surface:                  var(--surface);
  --color-surface-foreground:       var(--surface-foreground);
  --color-surface-secondary:        var(--surface-secondary);
  --color-surface-secondary-foreground: var(--surface-secondary-foreground);
  --color-surface-tertiary:         var(--surface-tertiary);
  --color-surface-tertiary-foreground: var(--surface-tertiary-foreground);
  --color-overlay:                  var(--overlay);
  --color-overlay-foreground:       var(--overlay-foreground);
  --color-accent:                   var(--accent);
  --color-accent-foreground:        var(--accent-foreground);
  --color-default:                  var(--default);
  --color-default-foreground:       var(--default-foreground);
  --color-field-background:         var(--field-background);
  --color-field-foreground:         var(--field-foreground);
  --color-field-placeholder:        var(--field-placeholder);
  --color-field-border:             var(--field-border);
  --color-success:                  var(--success);
  --color-success-foreground:       var(--success-foreground);
  --color-warning:                  var(--warning);
  --color-warning-foreground:       var(--warning-foreground);
  --color-danger:                   var(--danger);
  --color-danger-foreground:        var(--danger-foreground);
  --color-muted:                    var(--muted);
  --color-segment:                  var(--segment);
  --color-border:                   var(--border);
  --color-separator:                var(--separator);
  --color-focus:                    var(--focus);
  --color-link:                     var(--link);
}
```

**Light variant decision:** The app is dark-only. Uwwind requires all themes to define the same variable set. The `@variant light` block duplicates the dark values exactly — this prevents Uniwind from using its own light defaults if the system is somehow reporting light mode.

**`constants/heroui_theme.ts`:** Deleted. That file was designed for a `createTheme()` API that doesn't exist. The CSS variables in `global.css` are the theme mechanism. `constants/theme_tokens.ts` remains as the plain-JS source of truth for module-level call sites.

### Cairo Nights → HeroUI Native CSS Variable Mapping

| HeroUI slot | Cairo Nights token | Hex value |
|---|---|---|
| `--background` | `CoreTokens.bg` | `#0F1923` |
| `--foreground` | `CoreTokens.text1` | `#F0EBE3` |
| `--surface` | `CoreTokens.surface` | `#1A2535` |
| `--surface-secondary` | `CoreTokens.surfaceEl` | `#243044` |
| `--surface-tertiary` | `CoreTokens.border` (layer 3 approximation) | `#2A3A4F` |
| `--accent` | `GoldTokens[500]` | `#D4A44C` |
| `--accent-foreground` | `CoreTokens.bg` | `#0F1923` |
| `--default` | `CoreTokens.surfaceEl` | `#243044` |
| `--field-background` | `CoreTokens.surfaceEl` | `#243044` |
| `--field-foreground` | `CoreTokens.text1` | `#F0EBE3` |
| `--field-placeholder` | `CoreTokens.text2` | `#6B7F99` |
| `--field-border` | `CoreTokens.border` | `#2A3A4F` |
| `--success` | `SemanticTokens.positive` | `#4CAF82` |
| `--danger` | `SemanticTokens.negative` | `#E05A42` |
| `--warning` | `SemanticTokens.warning` | `#E8B130` |
| `--border` | `CoreTokens.border` | `#2A3A4F` |
| `--separator` | `CoreTokens.border` | `#2A3A4F` |
| `--focus` / `--link` | `GoldTokens[500]` | `#D4A44C` |
| `--muted` | `CoreTokens.text3` | `#4A5568` |

**Gold CTA gradient:** `expo-linear-gradient` wraps the HeroUI Native `Button` for the gold gradient (gold-400 → gold-600, horizontal). Alternatively, the opinionated `Button` wrapper in `components/ui/button.tsx` applies the gradient via `style` override on the root slot using `buttonClassNames.root(...)`.

---

## Architecture: `metro.config.js`

The plain Expo Metro config is replaced with the Uniwind + Reanimated combo:

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(wrapWithReanimatedMetroConfig(config), {
  cssEntryFile: './global.css',
  dtsFile: './uniwind.d.ts',
});
```

`dtsFile` generates TypeScript type definitions for Uniwind CSS classes and themes — commit this file. `extraThemes` is not needed (app is dark-only with no runtime theme switching).

**`tailwind.config.js`:** Deleted. Correct. Uniwind is CSS-first (Tailwind v4) — all theme/config lives in `global.css`. No `tailwind.config.js` needed.

---

## Architecture: Babel Config

Reanimated v4 moves the Babel plugin to `react-native-worklets`. Update `babel.config.js`:

```js
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-worklets/plugin',  // replaces react-native-reanimated/plugin
    ],
  };
};
```

The `react-native-reanimated/plugin` is removed. `react-native-worklets/plugin` is the new entry point. This is a required change for Reanimated v4.

---

## Architecture: Reanimated v3 → v4

**Entering/exiting animation API: unchanged.** Confirmed against Reanimated v4 migration guide. All `Animated.View entering={FadeInDown.delay(80).duration(280)}` patterns in the §2 `.anim.ts` files continue to work without modification.

**Breaking changes that apply to MoneyApp:**

| Change | Impact | Action |
|---|---|---|
| Babel plugin: `react-native-reanimated/plugin` → `react-native-worklets/plugin` | HIGH — build breaks without this | Update `babel.config.js` in migration PR |
| New peer: `react-native-worklets@^0.5.1` | HIGH — required for Reanimated v4 to boot | Install in migration PR |
| `withSpring`: `restDisplacementThreshold`/`restSpeedThreshold` removed, replaced by `energyThreshold` | MEDIUM — if used | Grep for usages before committing |
| Old Architecture (Paper renderer) dropped | LOW — MoneyApp already targets New Architecture (required by Unistyles 3) | No action needed |
| `useAnimatedGestureHandler` removed | NONE — not used in MoneyApp | No action needed |
| `useScrollViewOffset` → `useScrollOffset` (deprecated, not removed) | NONE — not used in MoneyApp | No action needed |

**`react-native-worklets` exports:** Worklet functions are re-exported from `react-native-reanimated` for backward compatibility but marked deprecated. MoneyApp does not directly import `runOnUI`, `runOnJS`, etc. in its own code — they are used internally by Reanimated. No import changes needed in MoneyApp source files.

**New Architecture requirement:** Unistyles 3 already requires New Architecture (Fabric). Reanimated v4 also requires New Architecture. Both constraints align — this is not additive risk.

---

## Architecture: UI Primitives (`components/ui/`)

Decision for each primitive:

| Primitive | Decision | Rationale |
|---|---|---|
| `Box` | (b) thin `className`-forwarding wrapper over `View` | No HeroUI Native `Box` equivalent; keep as layout building block with `className` forwarding via Tailwind. Back-compatible: add `className` prop alongside existing `style`. |
| `Text` | (c) opinionated wrapper using `tv(...)` + font variants | Lock in Sora/Inter font defaults and size scale. Back-compatible: same `variant` prop API. `className` prop for overrides. |
| `Button` | (c) opinionated wrapper using `buttonClassNames` from `heroui-native` + gold gradient for `variant="primary"` | `Button` in HeroUI Native is a full component. MoneyApp wraps it to lock in the gold gradient on primary and enforce `ctaHeight`/`Radius.cta` defaults. External API (`label`, `variant`) unchanged. |
| `Input` | (c) opinionated wrapper using `heroui-native` `Input` component | Lock in Cairo Nights field tokens. `hasError` prop maps to HeroUI `isInvalid`. Back-compatible. |
| `Pressable` | (b) thin wrapper over HeroUI Native `Pressable` | Adds `hitSlop={44}` default and opacity feedback. Back-compatible: `className` + `style` both pass through. |

All 5 primitives maintain back-compatible external APIs because the §2 onboarding screens on `main` import them.

---

## Architecture: §2 Onboarding Retarget Scope

Decision: **targeted retarget, not full rewrite.**

The §2 screens on `main` are committed using `className` syntax already. The retarget work per screen is:

1. Replace `import { Box } from '@/components/ui/box'` etc. — the primitive imports stay the same (same path, new implementation).
2. Update `cn` import: `import { cn } from '@/utils/cn'` → `import { cn } from 'heroui-native'`.
3. Update Tailwind class names that reference NativeWind theme keys to HeroUI slot names:
   - `bg-[#0F1923]` or `bg-bg` → `bg-background`
   - `text-text1` → `text-foreground`
   - `border-border` → `border-border` (same name, but verify it resolves via the CSS var)
   - `bg-surface` → `bg-surface`
   - `bg-surfaceEl` → `bg-surface-secondary`
4. Verify no `from 'react-native-css/components'` imports remain (these are only in uncommitted workarounds, not in `main`'s committed files).

Logic files (`.hook.ts`, `.store.ts`, `.state.ts`, `.anim.ts`) are unchanged. The design spec (`docs/superpowers/specs/2026-05-11-section-2-onboarding-design.md`) is still the source of truth for the resulting UI — verify the retargeted screens match it visually.

---

## Dependency Inventory

### Packages Exiting

| Package | Reason |
|---|---|
| `nativewind` | Stack abandoned |
| `@tailwindcss/postcss` | No longer needed (Tailwind processed by Uniwind, not PostCSS) |
| `lightningcss` | Was pinned for react-native-css compat; no longer needed |
| `react-native-css` | Stack abandoned |
| `class-variance-authority` | Was used for cva() in NativeWind primitives; replaced by `tv()` from `tailwind-variants` |
| `clsx` | Was used in utils/cn.ts; replaced by `cn` re-export from `heroui-native` |
| `tsx` (devDep) | Was used to load tailwind.config.js in Node; no config file needed |
| `@gluestack-ui/pressable` | Stack abandoned |
| `@gluestack-ui/button` | Stack abandoned |

**Packages NOT exiting (corrected from original doc):**

| Package | Reason it stays |
|---|---|
| `tailwindcss` | Required by Uniwind (peer dep); `global.css` still imports it |
| `tailwind-merge` | Required peer dep of `heroui-native` (used internally by `cn`) |
| `tailwind-variants` | Required peer dep of `heroui-native`; MoneyApp uses `tv(...)` for primitive wrappers |

### Packages Entering

| Package | Version | Notes |
|---|---|---|
| `heroui-native` | `^1.0.0` | Main UI library |
| `uniwind` | (peer of heroui-native) | Tailwind→Unistyles compiler; metro plugin required |
| `react-native-unistyles` | `^3.x` | C++/JSI style engine under Uniwind |
| `react-native-reanimated` | `^4.1.1` | Bump from v3; peer dep of heroui-native |
| `react-native-worklets` | `^0.5.1` | New peer required by Reanimated v4; provides Babel plugin |
| `react-native-gesture-handler` | `^2.28.0` | Bump if needed to match peer spec |
| `react-native-safe-area-context` | `^5.6.0` | Bump if needed to match peer spec |
| `react-native-svg` | `^15.12.1` | Bump if needed to match peer spec |
| `expo-dev-client` | latest compatible | Required by Unistyles 3 native module |
| `expo-build-properties` | latest compatible | For `app.json` native build config (Unistyles 3 requires New Architecture flag) |

### Packages Surviving

| Package | Status |
|---|---|
| `expo-linear-gradient` | Kept — gold CTA gradient |
| `react-native-actions-sheet` | Kept — deferred to §3 |
| `patch-package` | Kept |
| `expo-sqlite`, `zustand`, `react-hook-form`, `zod`, `expo-secure-store` | Kept |
| `@expo-google-fonts/sora`, `@expo-google-fonts/inter` | Kept |

### Patch Files

| File | Action |
|---|---|
| `patches/react-native-actions-sheet+10.1.2.patch` | KEEP |
| `patches/react-native-css+3.0.7.patch` | DELETE |

---

## `react-native-actions-sheet` — Deferred

§2 Onboarding does not use bottom sheets. `react-native-actions-sheet` stays in `package.json` and its patch stays in `patches/`. The §3 Reusable Patterns section will replace it with HeroUI Native's `Drawer` component.

HeroUI Native's optional peer `@gorhom/bottom-sheet@^5.2.8` is NOT installed in this migration PR. Its installation belongs to §3.

---

## File-Level Migration Inventory

### Files Deleted (wholesale)

```
tailwind.config.js
postcss.config.js
nativewind-env.d.ts                               — if present
utils/cn.ts
patches/react-native-css+3.0.7.patch
constants/heroui_theme.ts                         — NOT created (createTheme() API does not exist)
components/ui/animated.tsx                        — uncommitted NativeWind workaround, discard
components/ui/safe_area_view.tsx                  — uncommitted NativeWind workaround, discard
components/ui/scroll_view.tsx                     — uncommitted NativeWind workaround, discard
```

### Files Rewritten (old content discarded, new content written from scratch)

```
global.css                                        — REWRITTEN (not deleted): HeroUI Native imports + Cairo Nights CSS vars
metro.config.js                                   — withUniwindConfig + wrapWithReanimatedMetroConfig
babel.config.js                                   — react-native-worklets/plugin replaces react-native-reanimated/plugin
app/_layout.tsx                                   — HeroUINativeProviderRaw + import global.css (kept)
components/ui/box.tsx                             — className-forwarding wrapper
components/ui/text.tsx                            — tv() variant wrapper with Sora/Inter defaults
components/ui/button.tsx                          — buttonClassNames wrapper + LinearGradient CTA
components/ui/input.tsx                           — heroui-native Input wrapper + hasError → isInvalid
components/ui/pressable.tsx                       — thin wrapper, hitSlop=44 default
screens/dev/primitives/index.tsx                  — rewritten to use new primitives

# §2 Onboarding — targeted retarget (UI files only, logic files unchanged):
screens/onboarding_v2/welcome/index.tsx           — import sources + token names + cn import
screens/onboarding_v2/add_account/index.tsx       — import sources + token names + cn import
screens/onboarding_v2/add_account/components/type_pill.tsx  — import sources + token names + cn import
screens/onboarding_v2/more_accounts/index.tsx     — import sources + token names
screens/onboarding_v2/ready/index.tsx             — import sources + token names + cn import
.github/workflows/pr-checks.yml                  — CI updated for prebuild-required stack
```

### Files Created (net new)

```
uniwind.d.ts                                      — generated by withUniwindConfig dtsFile; commit to repo
```

### Files Surviving Unchanged

```
constants/theme_tokens.ts
constants/feature_flags.ts
constants/theme.ts
constants/enums.ts
constants/strings.ts
constants/secure_store_keys.ts
eas.json
patches/react-native-actions-sheet+10.1.2.patch
app/(dev)/primitives/index.tsx
app/(onboarding)/_layout.tsx
app/(onboarding)/welcome/index.tsx
app/(onboarding)/add_account/index.tsx
app/(onboarding)/more_accounts/index.tsx
app/(onboarding)/ready/index.tsx

# §2 logic files — unchanged (no styling references):
screens/onboarding_v2/welcome/welcome.hook.ts
screens/onboarding_v2/welcome/welcome.anim.ts
screens/onboarding_v2/welcome/welcome.state.ts
screens/onboarding_v2/add_account/add_account.hook.ts
screens/onboarding_v2/add_account/add_account.anim.ts
screens/onboarding_v2/more_accounts/more_accounts.hook.ts
screens/onboarding_v2/more_accounts/more_accounts.anim.ts
screens/onboarding_v2/ready/ready.hook.ts
screens/onboarding_v2/ready/ready.anim.ts
screens/onboarding_v2/ready/ready.state.ts
screens/onboarding_v2/ready/ready.helpers.ts
```

### Files Queued for Execution Phase (not preemptive)

```
CLAUDE.md
memory/project_rebrand_initiative.md
docs/superpowers/specs/2026-05-10-section-1-foundation-design.md  — header annotation
```

---

## Sequencing

Single branch: `refactor/heroui-native-migration`, created from current `main`.

### Work Order Within the Single PR

1. Create branch from `main`. Discard all uncommitted changes on `feat/section-2-onboarding`. Close PR #60.
2. Purge NativeWind/gluestack/react-native-css stack: remove exiting deps from `package.json`, delete config files, delete patch file, delete `utils/cn.ts`, discard the three uncommitted UI wrapper files. Keep `tailwindcss`, `tailwind-merge`, `tailwind-variants` — they stay.
3. Install entering packages: `heroui-native`, `react-native-unistyles`, `react-native-reanimated@^4.1.1`, `react-native-worklets@^0.5.1`, `expo-dev-client`, `expo-build-properties`, plus any peer version bumps (`react-native-gesture-handler`, `react-native-safe-area-context`, `react-native-svg`).
4. Rewrite `global.css` with HeroUI Native imports + Cairo Nights CSS variables.
5. Rewrite `metro.config.js` with `withUniwindConfig` + `wrapWithReanimatedMetroConfig`.
6. Update `babel.config.js`: swap `react-native-reanimated/plugin` → `react-native-worklets/plugin`.
7. Update `app/_layout.tsx`: replace `HeroUIProvider` (wrong) with `HeroUINativeProviderRaw`; keep `import './global.css'`.
8. Rewrite 5 primitives in `components/ui/` as HeroUI Native className-first wrappers.
9. Retarget §2 UI files: update import sources, token names, `cn` import. Verify against §2 design spec.
10. Rewrite `screens/dev/primitives/index.tsx`.
11. CI update: modify `.github/workflows/pr-checks.yml`.
12. Update documentation: CLAUDE.md, memory, §1 spec annotation.
13. Final verification: `expo prebuild --clean` succeeds, `expo run:android` boots, `npm run test:coverage` passes, `npm run typecheck` passes.
14. Close PR #60. Open new PR for human Gate 2 review.

---

## Risks and Mitigations (Revised)

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| Reanimated v4 babel plugin change breaks build | HIGH | High (certain — required change) | Update `babel.config.js` in step 6 before any other compile step |
| Unistyles 3 / Expo SDK compatibility (SDK 52 autolinking issue reported) | HIGH | Medium | Run `npx expo-doctor` after install; check `react-native-unistyles` GitHub issues for current SDK version; use `expo-build-properties` to set `newArchEnabled: true` in `app.json` |
| `withSpring` usage with removed thresholds (`restDisplacementThreshold`, `restSpeedThreshold`) | MEDIUM | Low | Grep codebase before committing; no known usages in current MoneyApp code |
| Uniwind CSS class compilation producing wrong styles on first run | MEDIUM | Low-Medium | `expo prebuild --clean` regenerates the Uniwind style cache; first acceptance criterion is a visual check on Android |
| HeroUI Native `Button`/`Input` internal API differs from assumed shape | MEDIUM | Medium | Read the HeroUI Native Styling docs before writing wrappers; use `buttonClassNames.*` API from `heroui-native` |
| `@variant light` required by Uniwind even for dark-only apps | LOW | Medium | Explicitly defined in `global.css` as a duplicate of dark values; see CSS var block above |
| CI prebuild job fails without Android SDK (only JDK installed) | MEDIUM | Medium | `--no-install` flag skips native build; only generates `android/` directory structure. Test on first CI run. |
| Large PR scope (purge + install + §1 rebuild + §2 retarget + CI) | MEDIUM | High | Work order steps 2–14 have discrete commit checkpoints. Gate 2 review after all steps pass. |
| EAS Build cloud minutes budget | LOW | High (it will cost money) | Favor `npx expo run:android` locally. Cloud EAS only for preview/production. |

### Rollback Plan

If HeroUI Native proves untenable after the migration PR merges to `main`:

1. `git revert <migration-merge-commit>` — restores NativeWind stack cleanly.
2. `feat/section-2-onboarding` branch is preserved in git history — PR #60 can be reopened.
3. The §1 Foundation commit `573a80d` is intact in `main`'s history.

---

## Acceptance Criteria for the Migration PR

1. `npx expo prebuild --clean` completes without errors.
2. `npx expo run:android` launches the app. Existing screens (dashboard, transactions, accounts, commitments, settings) render identically to pre-migration.
3. `npm run test:coverage` passes: 80% lines / 95% functions / 100% branches.
4. `npm run typecheck` passes.
5. No reference to `nativewind`, `react-native-css`, `gluestack`, or `clsx` remains in `package.json`, `metro.config.js`, or any `components/ui/*.tsx` file.
6. `constants/theme_tokens.ts` is unchanged from its §1 form.
7. `global.css` exists, contains `@import 'heroui-native/styles'` and the Cairo Nights `@variant dark` block.
8. `metro.config.js` uses `withUniwindConfig` and `wrapWithReanimatedMetroConfig`.
9. `babel.config.js` uses `react-native-worklets/plugin` (not `react-native-reanimated/plugin`).
10. `tailwind.config.js`, `utils/cn.ts`, `constants/heroui_theme.ts` do not exist.
11. `patches/react-native-css+3.0.7.patch` does not exist.
12. `eas.json` unchanged with `development`, `preview`, and `production` profiles.
13. `ios/` and `android/` are listed in `.gitignore`.
14. All 4 §2 onboarding screens render correctly and match the §2 design spec visually.
15. `FeatureFlags.newOnboarding` is `true` (already `true` on `main` — verify, do not change).
16. `.github/workflows/pr-checks.yml` no longer calls `npx expo export --platform android`.
17. CLAUDE.md, `memory/project_rebrand_initiative.md`, and the §1 Foundation spec header are updated.
18. PR #60 is closed.

---

## Documentation Updates (queued for execution phase)

### CLAUDE.md

- Remove "Expo Go Compatibility (critical)" section entirely.
- Add "Expo Dev Client (critical)" section.
- Update `## Tech Stack`: replace `Expo (managed, Expo Go only)` with `Expo (bare workflow via expo-dev-client)`; replace NativeWind references with `HeroUI Native v1.0 + Unistyles 3 (via Uniwind)`.
- Update `## Commands` to reflect prebuild workflow.
- Retain `## Bottom Sheets — react-native-actions-sheet` section until §3.

### `memory/project_rebrand_initiative.md`

- Update Library locked decision: NativeWind → HeroUI Native v1.0 + Unistyles 3.
- Note Expo Go → `expo-dev-client`.
- Update §1 and §2 status.

### `docs/superpowers/specs/2026-05-10-section-1-foundation-design.md`

- Add header annotation: Part B superseded. Part A Library decision updated. File is historical record, do not delete.
