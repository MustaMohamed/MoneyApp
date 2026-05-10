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

### Brand · Cairo Nights Extended palette

All additions are **backwards-compatible** with existing tokens in `constants/theme.ts`. New names are pure additions; existing names unchanged.

**Core (unchanged):** `bg #0F1923` · `surface #1A2535` · `surfaceEl #243044` · `border #2A3A4F` · `text1 #F0EBE3` · `text2 #6B7F99` · `text3 #4A5568`.

**Brand · Gold (4 stops):** `gold-400 #E0B968` (highlight, NEW) · `gold-500 #D4A44C` (default) · `gold-600 #C9973A` (CTA gradient end) · `gold-700 #A47C2C` (pressed, NEW).

**Semantic:** `positive #4CAF82` · `negative #E05A42` · **`warning #E8B130`** (saffron, NEW — fills warning gap) · `info #4A7ABF`.

**Cultural accents (6, NEW):** `nile #2D7D6E` · `spice #C45C2A` · `lapis #185FA5` · `plum #5A2D55` · `sand #C9A876` · `rose #B8526D`. Used for category icons; replaces shadcn-default neutrals.

**Account swatches (24, NEW):** 12 hue families × 2 tonal stops (Rich + Soft):

| Family | Rich | Soft |
|---|---|---|
| Royal Midnight | #1B2B4B | #3D4E73 |
| Cairo Gold | #C9973A | #E0B968 |
| Nile Teal | #2D7D6E | #5BA597 |
| Paprika | #C45C2A | #E08456 |
| Plum | #5A2D55 | #8B5685 |
| Lapis | #185FA5 | #4A88C4 |
| Rose | #B8526D | #D88197 |
| Sand | #C9A876 | #E0C99A |
| Amethyst | #7B3F8C | #A87AB5 |
| Emerald | #4CAF82 | #7AC9A4 |
| Saffron | #D4830A | #E8A848 |
| Steel Blue | #4A6FA5 | #7894C0 |

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
| **1** | **Foundation** ← *this spec* | [tariq] | 1-2 days |
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
2. Configure `tailwind.config.js` with the Cairo Nights Extended palette as Tailwind tokens.
3. Configure `gluestack-ui.config.ts` referencing the same palette via Tailwind tokens.
4. Set up the gluestack `GluestackUIProvider` at app root so any new gluestack component can render.
5. Build 5 base primitives wrapping gluestack with MoneyApp's existing token contracts: `Box · Text · Button · Input · Pressable`.
6. Establish a migration toggle so §2-9 can swap screens one at a time without breaking the build.

## Non-Goals

- No screens migrated.
- No new components beyond the 5 base primitives.
- No removal of existing custom UI components.
- No changes to existing screens, hooks, stores, navigation, or business logic.
- No removal of the patched `react-native-actions-sheet` (still in use until §3 builds the Sheet pattern).
- No removal of existing `constants/theme.ts` tokens (gluestack reads from Tailwind, but the existing custom UI keeps using the original tokens until its screen is migrated).

## Scope · Detailed work items

### 1.1 Install dependencies

Run via `npx expo install` (Expo's compatibility-checked installer) where possible:

```bash
npx expo install nativewind tailwindcss
npm install @gluestack-ui/themed @gluestack-ui/config
npm install --save-dev @gluestack-style/react
```

**Verify:** all packages on Expo SDK 55–compatible versions. If `npx expo install` warns about an incompatible version, pick the closest compatible one and document why in the section's plan.

### 1.2 Configure NativeWind

- Add NativeWind Babel plugin to `babel.config.js` (preserving existing `babel-plugin-react-compiler`).
- Add `nativewind/types.d.ts` reference in `tsconfig.json` so `className` is typed on RN components.
- Create `global.css` at project root with the Tailwind directives.
- Import `global.css` once at the top of `app/_layout.tsx`.

### 1.3 Tailwind config with Cairo Nights Extended

Create `tailwind.config.js` at project root:

```js
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './screens/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0F1923',
        surface: '#1A2535',
        surfaceEl: '#243044',
        border: '#2A3A4F',
        text1: '#F0EBE3',
        text2: '#6B7F99',
        text3: '#4A5568',
        gold: { 400: '#E0B968', 500: '#D4A44C', 600: '#C9973A', 700: '#A47C2C' },
        positive: '#4CAF82',
        negative: '#E05A42',
        warning: '#E8B130',   // NEW
        info: '#4A7ABF',
        // Cultural accents (NEW)
        nile: '#2D7D6E', spice: '#C45C2A', lapis: '#185FA5',
        plum: '#5A2D55', sand: '#C9A876', rose: '#B8526D',
        // Account swatches (NEW · 12 families × Rich/Soft)
        acct: {
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

### 1.4 gluestack-ui.config.ts

Create `gluestack-ui.config.ts` at project root, referencing the same palette via Tailwind class composition where possible. Use gluestack's `createConfig` to define semantic tokens:

```ts
import { createConfig } from '@gluestack-style/react';

export const config = createConfig({
  tokens: {
    colors: { /* mirror the palette above; gluestack does not auto-read tailwind.config */ },
    space:  { /* mirror existing Spacing tokens */ },
    radii:  { /* mirror existing Radius tokens */ },
    fonts:  { /* mirror FontFamily */ },
  },
  // ... aliases, breakpoints, etc.
});

export type ConfigType = typeof config;
declare module '@gluestack-style/react' {
  interface ICustomConfig extends ConfigType {}
}
```

**Note:** mirroring is required because gluestack's design tokens are independent from Tailwind's. Single-source-of-truth: define the palette once in `constants/theme_tokens.ts` and import it into both configs.

### 1.5 Provider wrapping

In `app/_layout.tsx`:

```tsx
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@/gluestack-ui.config';

// ... existing imports

export default function RootLayout() {
  return (
    <GluestackUIProvider config={config}>
      {/* existing layout tree */}
    </GluestackUIProvider>
  );
}
```

The provider is **inert** for the existing custom UI — it only affects components that use gluestack primitives.

### 1.6 Base primitives (5)

Create `components/ui/` (new directory) with:

- **`box.tsx`** — `View` wrapper accepting `className` (NativeWind) for layout. Re-exports gluestack's `Box`.
- **`text.tsx`** — `Text` wrapper. Pre-applied `font-inter` class; variants for `Type.body`, `Type.title`, etc. via `cva` or simple variant prop.
- **`button.tsx`** — `Pressable` wrapper with variants: `primary` (gold gradient, midnight text) · `ghost` (transparent border) · `destructive` (negative coral). Honors `Size.ctaHeight` floor and `TouchSize.min` 44px floor.
- **`input.tsx`** — `TextInput` wrapper with focus ring (gold-500 glow) and error state (negative coral border). RHF-Controller-friendly.
- **`pressable.tsx`** — `Pressable` wrapper with native press feedback (slight opacity dip + optional scale). 44px `hitSlop` for sub-44px targets.

Each primitive must:
- Accept `className` prop (NativeWind).
- Forward refs.
- Be accessibility-correct (role, label, hint per use).
- Render with the Cairo Nights tokens by default — never hardcode hex.

### 1.7 Migration toggle

Add `constants/feature_flags.ts`:

```ts
export const FeatureFlags = {
  /** Per-screen migration toggles. Default false until that screen's section ships. */
  newOnboarding:    false,  // §2
  newSettings:      false,  // §4
  newDashboard:     false,  // §5
  newTransactions:  false,  // §6
  newAddTransaction:false,  // §7 (sheet)
  newCommitments:   false,  // §8
  newAccounts:      false,  // §9
} as const;
```

Each future section's spec specifies which flag to flip when its work lands. During §1, all flags stay `false` — nothing visible changes.

## Acceptance criteria

1. `npm install` completes without errors.
2. `npx expo start` launches the app successfully (Android + iOS Expo Go) with **zero visible UI changes** (existing custom UI renders identically).
3. `npm run typecheck` passes.
4. `npm run test:coverage` passes with thresholds unchanged (80% lines · 95% functions · 100% branches).
5. The 5 base primitives render correctly when used in a throwaway test screen (verified manually; not committed).
6. `tailwind.config.js` and `gluestack-ui.config.ts` both reference a single source of truth for the palette (`constants/theme_tokens.ts`).
7. `GluestackUIProvider` is mounted at app root.
8. `FeatureFlags` constant exists and all flags are `false`.

## Risks

- **R1 · NativeWind v5 + Expo SDK 55 compatibility.** NativeWind v5 changed its setup vs v4. **Mitigation:** verify exact version compatibility with Expo SDK 55 in the planning step. Fall back to NativeWind v4 if v5 has known SDK 55 issues.
- **R2 · gluestack v2 + Expo Go.** gluestack v2 is documented as Expo Go compatible, but verify with a smoke test (one button rendered) before committing the full setup.
- **R3 · Provider performance.** Wrapping the entire tree in `GluestackUIProvider` adds a context. Measure cold-start regression; should be ≤50ms.
- **R4 · Token duplication drift.** Maintaining the palette in both `tailwind.config.js` and `gluestack-ui.config.ts` invites drift. **Mitigation:** single TS source `constants/theme_tokens.ts` imported by both.

## Open questions (to resolve during planning)

1. NativeWind v4 or v5? — research during plan phase.
2. Should `constants/theme_tokens.ts` live as a new file, or extend the existing `constants/theme.ts`? — likely new file to avoid touching the existing tokens-in-use.
3. Do the base primitives go in `components/ui/` (new convention) or `components/` (existing)? — new directory recommended; clean separation between "old custom" and "new gluestack-based".
4. Should the migration toggle be a runtime constant or a real feature-flag service? — runtime constant is sufficient for §1; revisit if §2-9 need richer flagging.

## Hand-off to §2 Onboarding

§2 starts with all of the following in place:
- gluestack v2 + NativeWind installed and configured.
- Cairo Nights Extended palette available as Tailwind tokens AND gluestack tokens.
- `GluestackUIProvider` mounted.
- 5 base primitives ready to compose into screens.
- `FeatureFlags.newOnboarding` exists, currently `false`. §2 flips it to `true` when its work lands.

§2 does not need to install or configure anything; it builds onboarding screens using §1's primitives.

---

## Appendix · Reference Map

- Existing tokens: `constants/theme.ts` (unchanged).
- Existing patches: `patches/react-native-actions-sheet+10.1.2.patch` (kept until §3).
- Existing custom UI: `components/`, `screens/**` (untouched).
- Project rules: `CLAUDE.md` (Expo Go compatibility · app/ rules · screens/ anatomy · null vs undefined · token usage · strings).
- Future section specs: `docs/superpowers/specs/2026-XX-XX-section-N-*-design.md`.
