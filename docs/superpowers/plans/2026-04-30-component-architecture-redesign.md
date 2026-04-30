# Component Architecture Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure all onboarding screens and components into per-folder modules, replace useState/useContext with Zustand stores, introduce React Hook Form + Zod v4 for the add_account form, and rename routes `add-account` → `add_account` and `more-accounts` → `more_accounts`.

**Architecture:** Each screen lives in `<name>/index.tsx`. Business logic in `<name>.hook.ts`, local UI state in `<name>.store.ts`, animations in `<name>.anim.ts`. The add_account screen uses a Zod schema wired via a `useZodForm` wrapper. Global stores and utils are renamed to snake_case.

**Tech Stack:** Expo Router v7, Expo SDK 55, Zustand v5, React Hook Form v7.74, Zod v4.4, @hookform/resolvers v5.2, Jest 29

---

## File Map

### Created
- `utils/use_zod_form.ts` — zodResolver wrapper with stable schema ref
- `utils/zod_config.ts` — global `z.config()` side-effect module
- `app/_layout.store.ts` — `{ ready, setReady }` Zustand store
- `app/_layout.hook.ts` — DB init + onboarding rehydration; imports zod_config
- `app/dashboard/index.tsx` — placeholder dashboard (content unchanged)
- `components/geo_illustration/index.tsx` — pure SVG (content unchanged)
- `components/progress_dots/index.tsx` — dots template
- `components/progress_dots/progress_dots.anim.ts` — dot scale + color
- `app/(onboarding)/welcome/index.tsx` + `welcome.anim.ts`
- `app/(onboarding)/currency/index.tsx` + `currency.hook.ts` + `currency.store.ts` + `currency.anim.ts`
- `app/(onboarding)/security/index.tsx` + `security.hook.ts` + `security.store.ts` + `security.anim.ts`
- `app/(onboarding)/add_account/index.tsx` + `add_account.hook.ts` + `add_account.anim.ts`
- `app/(onboarding)/more_accounts/index.tsx` + `more_accounts.hook.ts` + `more_accounts.anim.ts`
- `app/(onboarding)/ready/index.tsx` + `ready.hook.ts` + `ready.store.ts` + `ready.anim.ts`
- `store/onboarding_store.ts` (renamed from onboardingStore.ts)
- `store/account_store.ts` (renamed from accountStore.ts)
- `utils/onboarding_nav.ts` (renamed from onboardingNav.ts)
- `utils/use_first_mount_entering.ts` (renamed from useFirstMountEntering.ts)
- `__tests__/add_account_schema.test.ts` — Zod schema tests (replaces validation.test.ts)

### Modified
- `app/_layout.tsx` — delegate to hook/store
- `app/index.tsx` — update STEP_HREF routes
- `app/(onboarding)/_layout.tsx` — update OnboardingStackParams type
- `__tests__/accountStore.test.ts` — update import path
- `__tests__/onboardingStore.test.ts` — update import path

### Deleted
`app/(onboarding)/welcome.tsx`, `currency.tsx`, `security.tsx`, `add-account.tsx`, `more-accounts.tsx`, `ready.tsx`, `app/dashboard.tsx`, `components/ProgressDots.tsx`, `components/GeoIllustration.tsx`, `store/onboardingStore.ts`, `store/accountStore.ts`, `utils/onboardingNav.ts`, `utils/useFirstMountEntering.ts`, `utils/validation.ts`, `__tests__/validation.test.ts`

---

## Task 1: Install RHF, Zod, and @hookform/resolvers

**Files:** `package.json`

- [ ] **Step 1: Install packages**

```bash
npx expo install react-hook-form@^7.74.0 zod@^4.4.1 @hookform/resolvers@^5.2.2
```

- [ ] **Step 2: Verify installed versions**

```bash
node -e "console.log(require('./node_modules/react-hook-form/package.json').version, require('./node_modules/zod/package.json').version, require('./node_modules/@hookform/resolvers/package.json').version)"
```

Expected: `7.x.x  4.x.x  5.x.x`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install react-hook-form, zod, @hookform/resolvers"
```

---

## Task 2: Scaffold Zod utilities and add generic error string keys

**Files:**
- Modify: `constants/strings.ts`
- Create: `utils/use_zod_form.ts`
- Create: `utils/zod_config.ts`

- [ ] **Step 1: Add generic Zod error keys to `constants/strings.ts`**

Add these four entries after the existing validation error strings (after `errAprRequired`):

```ts
  // Generic Zod error map fallbacks
  errRequired: 'This field is required',
  errTooShort: 'Too short',
  errTooLong: 'Too long',
  errInvalid: 'Invalid value',
```

- [ ] **Step 2: Create `utils/use_zod_form.ts`**

```ts
import { useEffect, useRef } from 'react'
import { useForm, type UseFormProps, type FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { type ZodType } from 'zod'

export function useZodForm<T extends FieldValues>(
  schema: ZodType<T>,
  options?: Omit<UseFormProps<T>, 'resolver'>,
) {
  const schemaRef = useRef(schema)
  useEffect(() => {
    schemaRef.current = schema
  }, [schema])

  return useForm<T>({
    resolver: (values, ctx, opts) => zodResolver(schemaRef.current)(values, ctx, opts),
    ...options,
  })
}
```

- [ ] **Step 3: Create `utils/zod_config.ts`**

```ts
import { z } from 'zod'
import { Strings } from '@/constants/strings'

z.config({
  customErrorMap: (issue) => {
    switch (issue.code) {
      case 'too_small':
        return { message: (issue as { minimum?: number }).minimum === 1 ? Strings.errRequired : Strings.errTooShort }
      case 'too_big':
        return { message: Strings.errTooLong }
      default:
        return { message: Strings.errInvalid }
    }
  },
})
```

- [ ] **Step 4: Run existing tests to confirm nothing broke**

```bash
npx jest --passWithNoTests
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add constants/strings.ts utils/use_zod_form.ts utils/zod_config.ts
git commit -m "feat: add useZodForm wrapper, zod_config global error map, generic error strings"
```

---

## Task 3: Rename store and utility files, update all imports

**Files:**
- Create `store/onboarding_store.ts` (content of `onboardingStore.ts`, unchanged)
- Create `store/account_store.ts` (content of `accountStore.ts`, unchanged)
- Create `utils/onboarding_nav.ts` (content of `onboardingNav.ts`, unchanged)
- Create `utils/use_first_mount_entering.ts` (content of `useFirstMountEntering.ts`, unchanged)
- Delete the four old files
- Update imports in every file that references them

- [ ] **Step 1: Copy store files with new names**

```bash
cp store/onboardingStore.ts store/onboarding_store.ts
cp store/accountStore.ts store/account_store.ts
cp utils/onboardingNav.ts utils/onboarding_nav.ts
cp utils/useFirstMountEntering.ts utils/use_first_mount_entering.ts
```

- [ ] **Step 2: Delete old files**

```bash
rm store/onboardingStore.ts store/accountStore.ts utils/onboardingNav.ts utils/useFirstMountEntering.ts
```

- [ ] **Step 3: Update `app/_layout.tsx`** — change import:

```ts
// Before
import { loadOnboardingState } from '@/store/onboardingStore'
// After
import { loadOnboardingState } from '@/store/onboarding_store'
```

- [ ] **Step 4: Update `app/index.tsx`** — change import:

```ts
// Before
import { type OnboardingStep, useOnboardingStore } from '@/store/onboardingStore'
// After
import { type OnboardingStep, useOnboardingStore } from '@/store/onboarding_store'
```

- [ ] **Step 5: Update `app/(onboarding)/_layout.tsx`** — change import:

```ts
// Before
import { useOnboardingStore } from '@/store/onboardingStore'
// After
import { useOnboardingStore } from '@/store/onboarding_store'
```

- [ ] **Step 6: Update `app/(onboarding)/welcome.tsx`** — change imports:

```ts
// Before
import { useOnboardingStore } from '@/store/onboardingStore'
import { useFirstMountEntering } from '@/utils/useFirstMountEntering'
// After
import { useOnboardingStore } from '@/store/onboarding_store'
import { useFirstMountEntering } from '@/utils/use_first_mount_entering'
```

- [ ] **Step 7: Update `app/(onboarding)/currency.tsx`** — change imports:

```ts
// Before
import { type Currency, useOnboardingStore } from '@/store/onboardingStore'
import { backOrReplace } from '@/utils/onboardingNav'
// After
import { type Currency, useOnboardingStore } from '@/store/onboarding_store'
import { backOrReplace } from '@/utils/onboarding_nav'
```

- [ ] **Step 8: Update `app/(onboarding)/security.tsx`** — change imports:

```ts
// Before
import { type SecurityChoice, useOnboardingStore } from '@/store/onboardingStore'
import { backOrReplace } from '@/utils/onboardingNav'
// After
import { type SecurityChoice, useOnboardingStore } from '@/store/onboarding_store'
import { backOrReplace } from '@/utils/onboarding_nav'
```

- [ ] **Step 9: Update `app/(onboarding)/add-account.tsx`** — change imports:

```ts
// Before
import { type AccountType, useAccountStore } from '@/store/accountStore'
import { type Currency, useOnboardingStore } from '@/store/onboardingStore'
import { backOrReplace } from '@/utils/onboardingNav'
// After
import { type AccountType, useAccountStore } from '@/store/account_store'
import { type Currency, useOnboardingStore } from '@/store/onboarding_store'
import { backOrReplace } from '@/utils/onboarding_nav'
```

Also remove the `import { validateAccountForm, type FieldErrors } from '@/utils/validation'` line and its usages — replace with a local `FieldErrors` type and inline the call stub for now (we'll fully replace in Task 11):

```ts
// Replace validation import with local type
type FieldErrors = Partial<Record<'name' | 'balance' | 'creditLimit' | 'apr', string>>
```

And change the `validateAccountForm` call to keep the existing logic temporarily — actually, just leave it as-is and keep the validation import pointing at `@/utils/validation` (which still exists). We'll delete validation.ts in Task 16.

Correction: keep the `@/utils/validation` import in `add-account.tsx` — it still exists. Only update the store/nav imports.

- [ ] **Step 10: Update `app/(onboarding)/more-accounts.tsx`** — change imports:

```ts
// Before
import { type Account, type AccountType, useAccountStore } from '@/store/accountStore'
import { useOnboardingStore } from '@/store/onboardingStore'
// After
import { type Account, type AccountType, useAccountStore } from '@/store/account_store'
import { useOnboardingStore } from '@/store/onboarding_store'
```

- [ ] **Step 11: Update `app/(onboarding)/ready.tsx`** — change imports:

```ts
// Before
import { useAccountStore } from '@/store/accountStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useFirstMountEntering } from '@/utils/useFirstMountEntering'
// After
import { useAccountStore } from '@/store/account_store'
import { useOnboardingStore } from '@/store/onboarding_store'
import { useFirstMountEntering } from '@/utils/use_first_mount_entering'
```

- [ ] **Step 12: Update `__tests__/accountStore.test.ts`** — change import:

```ts
// Before
import { useAccountStore } from '@/store/accountStore'
// After
import { useAccountStore } from '@/store/account_store'
```

- [ ] **Step 13: Update `__tests__/onboardingStore.test.ts`** — change import:

```ts
// Before
import { useOnboardingStore, loadOnboardingState } from '@/store/onboardingStore'
// After
import { useOnboardingStore, loadOnboardingState } from '@/store/onboarding_store'
```

- [ ] **Step 14: Update `__tests__/validation.test.ts`** — change import:

```ts
// Before
import type { Account } from '@/store/accountStore'
// After
import type { Account } from '@/store/account_store'
```

- [ ] **Step 15: Run tests**

```bash
npx jest
```

Expected: all tests pass.

- [ ] **Step 16: Commit**

```bash
git add -A
git commit -m "refactor: rename store + util files to snake_case, update all imports"
```

---

## Task 4: Extract `_layout.store.ts` and `_layout.hook.ts`

**Files:**
- Create: `app/_layout.store.ts`
- Create: `app/_layout.hook.ts`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Create `app/_layout.store.ts`**

```ts
import { create } from 'zustand'

interface LayoutStore {
  ready: boolean
  setReady: (ready: boolean) => void
}

export const useLayoutStore = create<LayoutStore>((set) => ({
  ready: false,
  setReady: (ready) => set({ ready }),
}))
```

- [ ] **Step 2: Create `app/_layout.hook.ts`**

```ts
import '@/utils/zod_config'
import { useEffect } from 'react'
import { initDatabase } from '@/db/init'
import { loadOnboardingState } from '@/store/onboarding_store'
import { useLayoutStore } from './_layout.store'

export function useLayoutInit() {
  const setReady = useLayoutStore((s) => s.setReady)

  useEffect(() => {
    ;(async () => {
      try {
        await initDatabase()
        await loadOnboardingState()
      } catch {
        // Surface splash and let app render in degraded state
      } finally {
        setReady(true)
      }
    })()
  }, [setReady])
}
```

- [ ] **Step 3: Rewrite `app/_layout.tsx`**

```tsx
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter'
import {
  Sora_400Regular,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'

import { useLayoutStore } from './_layout.store'
import { useLayoutInit } from './_layout.hook'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Sora_400Regular,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
  })

  const ready = useLayoutStore((s) => s.ready)
  useLayoutInit()

  useEffect(() => {
    if (fontsLoaded && ready) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, ready])

  if (!fontsLoaded || !ready) return null

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0F1923' },
        }}
      />
    </>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest
```

- [ ] **Step 5: Commit**

```bash
git add app/_layout.store.ts app/_layout.hook.ts app/_layout.tsx
git commit -m "refactor(_layout): extract store + hook, delegate init to useLayoutInit"
```

---

## Task 5: Move dashboard + components, update all ProgressDots/GeoIllustration imports

**Files:**
- Create: `app/dashboard/index.tsx`
- Create: `components/geo_illustration/index.tsx`
- Create: `components/progress_dots/index.tsx`
- Create: `components/progress_dots/progress_dots.anim.ts`
- Delete: `app/dashboard.tsx`, `components/GeoIllustration.tsx`, `components/ProgressDots.tsx`
- Modify: all existing flat screen files that import these components

- [ ] **Step 1: Create `app/dashboard/index.tsx`** (content identical to `app/dashboard.tsx`)

```tsx
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { FontFamily, Spacing, Type } from '@/constants/theme'

export default function Dashboard() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>MoneyApp</Text>
        <Text style={styles.subtitle}>Onboarding complete. Dashboard coming in M1.5.</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F1923' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  title: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.headline,
    color: '#D4A44C',
  },
  subtitle: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: '#6B7F99',
    marginTop: Spacing.sm,
    textAlign: 'center',
    lineHeight: Math.round(Type.body * 1.4),
  },
})
```

- [ ] **Step 2: Create `components/geo_illustration/index.tsx`** (content identical to `GeoIllustration.tsx`)

```tsx
import { StyleSheet, View } from 'react-native'
import Svg, { Circle, Defs, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg'

import { Size } from '@/constants/theme'

export function GeoIllustration() {
  const s = Size.illustration
  return (
    <View style={[styles.wrapper, { width: s, height: s }]}>
      <Svg width={s} height={s} viewBox="0 0 88 88">
        <Defs>
          <RadialGradient id="orb" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#C9973A" stopOpacity={0.22} />
            <Stop offset="100%" stopColor="#C9973A" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={88} height={88} fill="url(#orb)" />
        <Polygon
          points="44,16 70,62 18,62"
          fill="none"
          stroke="#C9973A"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <Polygon
          points="44,28 60,56 28,56"
          fill="none"
          stroke="#D4A44C"
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
        <Circle cx={44} cy={46} r={10} fill="none" stroke="#C9973A" strokeWidth={1.2} />
        <Circle cx={44} cy={46} r={2} fill="#D4A44C" />
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center' },
})
```

- [ ] **Step 3: Create `components/progress_dots/progress_dots.anim.ts`**

```ts
import { useEffect } from 'react'
import {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

export function useDotAnim(isActive: boolean) {
  const scale = useSharedValue(1)
  const colorProgress = useSharedValue(isActive ? 1 : 0)

  useEffect(() => {
    if (isActive) {
      scale.value = withSequence(
        withSpring(1.3, { damping: 8 }),
        withSpring(1.0, { damping: 12 }),
      )
      colorProgress.value = withTiming(1, { duration: 200 })
    } else {
      colorProgress.value = withTiming(0, { duration: 200 })
    }
  }, [isActive, scale, colorProgress])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(colorProgress.value, [0, 1], ['#243044', '#C9973A']),
  }))

  return { animStyle }
}
```

- [ ] **Step 4: Create `components/progress_dots/index.tsx`**

```tsx
import { StyleSheet, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { Size, Spacing } from '@/constants/theme'
import { useDotAnim } from './progress_dots.anim'

type Props = { totalSteps: number; currentStep: number }

export function ProgressDots({ totalSteps, currentStep }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: totalSteps }).map((_, i) => (
        <Dot key={i} isActive={i < currentStep} />
      ))}
    </View>
  )
}

function Dot({ isActive }: { isActive: boolean }) {
  const { animStyle } = useDotAnim(isActive)
  return <Animated.View style={[styles.dot, animStyle]} />
}

const styles = StyleSheet.create({
  row: {
    height: Size.progressDot * 5,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  dot: {
    flex: 1,
    height: Size.progressDot,
    borderRadius: Size.progressDot / 2,
  },
})
```

- [ ] **Step 5: Update imports in all flat screen files that use the old component paths**

In `app/(onboarding)/welcome.tsx`:
```ts
// Before
import { GeoIllustration } from '@/components/GeoIllustration'
import { ProgressDots } from '@/components/ProgressDots'
// After
import { GeoIllustration } from '@/components/geo_illustration'
import { ProgressDots } from '@/components/progress_dots'
```

In `app/(onboarding)/currency.tsx`, `security.tsx`, `add-account.tsx`, `more-accounts.tsx`, `ready.tsx` — each has:
```ts
// Before
import { ProgressDots } from '@/components/ProgressDots'
// After
import { ProgressDots } from '@/components/progress_dots'
```

- [ ] **Step 6: Delete old flat files**

```bash
rm app/dashboard.tsx components/GeoIllustration.tsx components/ProgressDots.tsx
```

- [ ] **Step 7: Run tests**

```bash
npx jest
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: move dashboard + components into folders, extract progress_dots.anim.ts"
```

---

## Task 6: Move welcome screen into folder + extract anim

**Files:**
- Create: `app/(onboarding)/welcome/welcome.anim.ts`
- Create: `app/(onboarding)/welcome/index.tsx`
- Delete: `app/(onboarding)/welcome.tsx`

- [ ] **Step 1: Create `app/(onboarding)/welcome/welcome.anim.ts`**

```ts
import { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { useFirstMountEntering } from '@/utils/use_first_mount_entering'

export function useWelcomeAnim() {
  const play = useFirstMountEntering('welcome')

  return {
    illustrationEntering: play ? FadeInDown.duration(600) : undefined,
    headlineEntering: play ? FadeInUp.delay(400).duration(500) : undefined,
    ctaEntering: play ? FadeInUp.delay(600).duration(400) : undefined,
  }
}
```

- [ ] **Step 2: Create `app/(onboarding)/welcome/index.tsx`**

```tsx
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { GeoIllustration } from '@/components/geo_illustration'
import { ProgressDots } from '@/components/progress_dots'
import { Strings } from '@/constants/strings'
import { FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme'
import { useOnboardingStore } from '@/store/onboarding_store'
import { useWelcomeAnim } from './welcome.anim'

export default function WelcomeScreen() {
  const router = useRouter()
  const setStep = useOnboardingStore((s) => s.setStep)
  const { illustrationEntering, headlineEntering, ctaEntering } = useWelcomeAnim()

  const onGetStarted = async () => {
    await setStep('O2')
    router.push('/(onboarding)/currency')
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ProgressDots totalSteps={6} currentStep={1} />

      <View style={styles.body}>
        <Animated.View entering={illustrationEntering}>
          <GeoIllustration />
        </Animated.View>

        <Animated.View entering={headlineEntering} style={styles.headlineWrap}>
          <Text style={styles.headline}>{Strings.o1Headline}</Text>
          <Text style={styles.subtext}>{Strings.o1Subtext}</Text>
        </Animated.View>
      </View>

      <Animated.View entering={ctaEntering} style={styles.ctaBar}>
        <Pressable onPress={onGetStarted} style={styles.ctaPress}>
          <LinearGradient
            colors={['#C9973A', '#D4A44C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>{Strings.o1Cta}</Text>
          </LinearGradient>
        </Pressable>
        <Text style={styles.signIn}>{Strings.o1SignIn}</Text>
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F1923' },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  headlineWrap: { alignItems: 'center', gap: Spacing.xs },
  headline: {
    fontFamily: FontFamily.soraExtra,
    fontSize: Type.hero,
    lineHeight: Math.round(Type.hero * 1.2),
    color: '#F0EBE3',
    textAlign: 'center',
  },
  subtext: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: '#6B7F99',
    textAlign: 'center',
    lineHeight: Math.round(Type.body * 1.4),
  },
  ctaBar: {
    borderTopWidth: 1,
    borderTopColor: '#1A2535',
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  ctaPress: { width: '100%', borderRadius: Radius.cta, overflow: 'hidden' },
  cta: {
    height: Size.ctaHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.cta,
  },
  ctaText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: '#1B2B4B',
  },
  signIn: {
    marginTop: Spacing.xs,
    textAlign: 'center',
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: '#4A5568',
  },
})
```

- [ ] **Step 3: Delete `app/(onboarding)/welcome.tsx`**

```bash
rm app/\(onboarding\)/welcome.tsx
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(welcome): move to folder, extract welcome.anim.ts"
```

---

## Task 7: Move currency screen into folder + extract hook/store/anim

**Files:**
- Create: `app/(onboarding)/currency/currency.store.ts`
- Create: `app/(onboarding)/currency/currency.anim.ts`
- Create: `app/(onboarding)/currency/currency.hook.ts`
- Create: `app/(onboarding)/currency/index.tsx`
- Delete: `app/(onboarding)/currency.tsx`

- [ ] **Step 1: Create `app/(onboarding)/currency/currency.store.ts`**

```ts
import { create } from 'zustand'
import type { Currency } from '@/store/onboarding_store'

interface CurrencyStore {
  selected: Currency | null
  setSelected: (currency: Currency) => void
  reset: () => void
}

export const useCurrencyStore = create<CurrencyStore>((set) => ({
  selected: null,
  setSelected: (currency) => set({ selected: currency }),
  reset: () => set({ selected: null }),
}))
```

- [ ] **Step 2: Create `app/(onboarding)/currency/currency.anim.ts`**

```ts
import { useEffect } from 'react'
import {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

export function useCurrencyRowAnim(isSelected: boolean) {
  const scale = useSharedValue(1)
  const borderProgress = useSharedValue(isSelected ? 1 : 0)
  const checkScale = useSharedValue(isSelected ? 1 : 0)

  useEffect(() => {
    if (isSelected) {
      borderProgress.value = withTiming(1, { duration: 200 })
      checkScale.value = withSpring(1, { damping: 12, stiffness: 180 })
    } else {
      borderProgress.value = withTiming(0, { duration: 150 })
      checkScale.value = withTiming(0, { duration: 120 })
    }
  }, [isSelected, borderProgress, checkScale])

  const triggerRowTap = () => {
    scale.value = withSequence(
      withTiming(1.02, { duration: 80 }),
      withTiming(1.0, { duration: 120 }),
    )
  }

  const rowAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: interpolateColor(borderProgress.value, [0, 1], ['#2A3A4F', '#C9973A']),
  }))

  const checkAnim = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }))

  return { rowAnim, checkAnim, triggerRowTap }
}
```

- [ ] **Step 3: Create `app/(onboarding)/currency/currency.hook.ts`**

```ts
import { useRouter } from 'expo-router'
import { useCurrencyStore } from './currency.store'
import { useOnboardingStore } from '@/store/onboarding_store'
import { backOrReplace } from '@/utils/onboarding_nav'
import type { Currency } from '@/store/onboarding_store'

export function useCurrency() {
  const router = useRouter()
  const setStep = useOnboardingStore((s) => s.setStep)
  const setBaseCurrency = useOnboardingStore((s) => s.setBaseCurrency)
  const globalBaseCurrency = useOnboardingStore((s) => s.baseCurrency)
  const storeSelected = useCurrencyStore((s) => s.selected)
  const setSelected = useCurrencyStore((s) => s.setSelected)

  // Fall back to global store value until the user makes a local selection
  const selected: Currency = storeSelected ?? globalBaseCurrency

  const onContinue = async () => {
    await setBaseCurrency(selected)
    await setStep('O3')
    router.push('/(onboarding)/security')
  }

  const onBack = () => backOrReplace(router, '/(onboarding)/welcome')

  return { selected, setSelected, onContinue, onBack }
}
```

- [ ] **Step 4: Create `app/(onboarding)/currency/index.tsx`**

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { LinearGradient } from 'expo-linear-gradient'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ProgressDots } from '@/components/progress_dots'
import { Strings } from '@/constants/strings'
import { FontFamily, Radius, Size, Spacing, TouchSize, Type } from '@/constants/theme'
import type { Currency } from '@/store/onboarding_store'
import { useCurrency } from './currency.hook'
import { useCurrencyRowAnim } from './currency.anim'

type RowConfig = { code: Currency; label: string; flag: string; flagBg: string }

const ROWS: RowConfig[] = [
  { code: 'EGP', label: Strings.currencyEGP, flag: '🇪🇬', flagBg: 'rgba(201,151,58,0.12)' },
  { code: 'USD', label: Strings.currencyUSD, flag: '🇺🇸', flagBg: 'rgba(55,138,221,0.10)' },
]

const hitSlop = {
  top: TouchSize.min / 4, bottom: TouchSize.min / 4,
  left: TouchSize.min / 4, right: TouchSize.min / 4,
}

export default function CurrencyScreen() {
  const { selected, setSelected, onContinue, onBack } = useCurrency()

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.back} hitSlop={hitSlop}>
          <MaterialCommunityIcons name="chevron-left" size={Size.iconBack} color="#6B7F99" />
        </Pressable>
        <Text style={styles.headerTitle}>{Strings.o2Title}</Text>
        <View style={styles.back} />
      </View>

      <ProgressDots totalSteps={6} currentStep={2} />

      <View style={styles.content}>
        <Text style={styles.heading}>{Strings.o2Heading}</Text>
        <Text style={styles.subtitle}>{Strings.o2Subtitle}</Text>

        <View style={styles.rows}>
          {ROWS.map((row) => (
            <CurrencyRow
              key={row.code}
              row={row}
              isSelected={selected === row.code}
              onSelect={() => setSelected(row.code)}
            />
          ))}
        </View>

        <View style={styles.note}>
          <Text style={styles.noteText}>
            <Text style={styles.noteLabel}>{Strings.o2NoteLabel}</Text>
            {Strings.o2NoteBody}
          </Text>
        </View>
      </View>

      <View style={styles.ctaBar}>
        <Pressable onPress={onContinue} style={styles.ctaPress}>
          <LinearGradient
            colors={['#C9973A', '#D4A44C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>{Strings.o2Cta}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

function CurrencyRow({
  row, isSelected, onSelect,
}: { row: RowConfig; isSelected: boolean; onSelect: () => void }) {
  const { rowAnim, checkAnim, triggerRowTap } = useCurrencyRowAnim(isSelected)

  return (
    <Animated.View style={[styles.rowAnimated, rowAnim]}>
      <Pressable onPress={() => { triggerRowTap(); onSelect() }} style={styles.row}>
        <View style={[styles.flagWrap, { backgroundColor: row.flagBg }]}>
          <Text style={styles.flag}>{row.flag}</Text>
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowCode}>{row.code}</Text>
          <Text style={styles.rowLabel}>{row.label}</Text>
        </View>
        <View style={styles.checkWrap}>
          <View style={styles.checkOutline} />
          <Animated.View style={[styles.checkFill, checkAnim]}>
            <MaterialCommunityIcons name="check" size={Size.iconSm * 0.6} color="#1B2B4B" />
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F1923' },
  header: {
    height: Size.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
  },
  back: {
    width: Size.backBtn, height: Size.backBtn,
    borderRadius: Spacing.sm,
    backgroundColor: '#1A2535',
    borderWidth: 1, borderColor: '#2A3A4F',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: FontFamily.soraBold, fontSize: Type.subhead, color: '#F0EBE3' },
  content: { flex: 1 },
  heading: {
    fontFamily: FontFamily.soraBold, fontSize: Type.headline, color: '#F0EBE3',
    paddingTop: Spacing.sm, paddingHorizontal: Spacing.sm, paddingBottom: Spacing.xxs,
  },
  subtitle: {
    fontFamily: FontFamily.interRegular, fontSize: Type.body, color: '#6B7F99',
    paddingHorizontal: Spacing.sm, paddingBottom: Spacing.sm,
    lineHeight: Math.round(Type.body * 1.4),
  },
  rows: { paddingHorizontal: Spacing.sm, gap: Spacing.xs },
  rowAnimated: { borderRadius: Radius.pill, borderWidth: 1.5 },
  row: {
    padding: Spacing.sm, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A2535', borderRadius: Radius.pill, gap: Spacing.sm,
  },
  flagWrap: {
    width: Size.flagBox, height: Size.flagBox, borderRadius: Spacing.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  flag: { fontSize: Type.subhead },
  rowText: { flex: 1, gap: Spacing.xxs },
  rowCode: { fontFamily: FontFamily.soraBold, fontSize: Type.subhead, color: '#F0EBE3' },
  rowLabel: { fontFamily: FontFamily.interRegular, fontSize: Type.caption, color: '#6B7F99' },
  checkWrap: {
    width: Size.checkCircle, height: Size.checkCircle,
    alignItems: 'center', justifyContent: 'center',
  },
  checkOutline: {
    position: 'absolute',
    width: Size.checkCircle, height: Size.checkCircle,
    borderRadius: Size.checkCircle / 2, borderWidth: 1.2, borderColor: '#2A3A4F',
  },
  checkFill: {
    width: Size.checkCircle, height: Size.checkCircle,
    borderRadius: Size.checkCircle / 2, backgroundColor: '#C9973A',
    alignItems: 'center', justifyContent: 'center',
  },
  note: {
    marginHorizontal: Spacing.sm, marginTop: Spacing.sm,
    backgroundColor: '#1A2535', borderWidth: 1, borderColor: '#2A3A4F',
    borderRadius: Radius.sm, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm,
  },
  noteText: {
    fontFamily: FontFamily.interRegular, fontSize: Type.caption, color: '#6B7F99',
    lineHeight: Math.round(Type.caption * 1.45),
  },
  noteLabel: { color: '#D4A44C', fontFamily: FontFamily.interSemi },
  ctaBar: {
    borderTopWidth: 1, borderTopColor: '#1A2535',
    paddingTop: Spacing.xs, paddingHorizontal: Spacing.sm, paddingBottom: Spacing.md,
  },
  ctaPress: { width: '100%', borderRadius: Radius.cta, overflow: 'hidden' },
  cta: {
    height: Size.ctaHeight, alignItems: 'center',
    justifyContent: 'center', borderRadius: Radius.cta,
  },
  ctaText: { fontFamily: FontFamily.soraBold, fontSize: Type.bodyStrong, color: '#1B2B4B' },
})
```

- [ ] **Step 5: Delete `app/(onboarding)/currency.tsx`**

```bash
rm app/\(onboarding\)/currency.tsx
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(currency): move to folder, extract hook/store/anim"
```

---

## Task 8: Move security screen into folder + extract hook/store/anim

**Files:**
- Create: `app/(onboarding)/security/security.store.ts`
- Create: `app/(onboarding)/security/security.anim.ts`
- Create: `app/(onboarding)/security/security.hook.ts`
- Create: `app/(onboarding)/security/index.tsx`
- Delete: `app/(onboarding)/security.tsx`

- [ ] **Step 1: Create `app/(onboarding)/security/security.store.ts`**

```ts
import { create } from 'zustand'
import type { SecurityChoice } from '@/store/onboarding_store'

interface SecurityStore {
  selected: SecurityChoice | null
  setSelected: (choice: SecurityChoice) => void
  reset: () => void
}

export const useSecurityStore = create<SecurityStore>((set) => ({
  selected: null,
  setSelected: (choice) => set({ selected: choice }),
  reset: () => set({ selected: null }),
}))
```

- [ ] **Step 2: Create `app/(onboarding)/security/security.anim.ts`**

```ts
import { useEffect } from 'react'
import {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

export function useSecurityPillAnim(isSelected: boolean) {
  const borderProgress = useSharedValue(isSelected ? 1 : 0)
  const iconScale = useSharedValue(1)

  useEffect(() => {
    if (isSelected) {
      borderProgress.value = withTiming(1, { duration: 200 })
      iconScale.value = withSequence(
        withSpring(1.08, { damping: 6, stiffness: 200 }),
        withSpring(1.0, { damping: 10 }),
      )
    } else {
      borderProgress.value = withTiming(0, { duration: 150 })
    }
  }, [isSelected, borderProgress, iconScale])

  const pillAnim = useAnimatedStyle(() => ({
    borderColor: interpolateColor(borderProgress.value, [0, 1], ['#2A3A4F', '#C9973A']),
  }))

  const iconAnim = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }))

  return { pillAnim, iconAnim }
}
```

- [ ] **Step 3: Create `app/(onboarding)/security/security.hook.ts`**

```ts
import { useRouter } from 'expo-router'
import { useSecurityStore } from './security.store'
import { useOnboardingStore } from '@/store/onboarding_store'
import { backOrReplace } from '@/utils/onboarding_nav'
import type { SecurityChoice } from '@/store/onboarding_store'

export function useSecurity() {
  const router = useRouter()
  const setStep = useOnboardingStore((s) => s.setStep)
  const setSecurityChoice = useOnboardingStore((s) => s.setSecurityChoice)
  const savedChoice = useOnboardingStore((s) => s.securityChoice)
  const storeSelected = useSecurityStore((s) => s.selected)
  const setSelected = useSecurityStore((s) => s.setSelected)

  // Fall back to globally saved choice on cold start / resume
  const selected: SecurityChoice | null = storeSelected ?? savedChoice

  const onContinue = async () => {
    if (selected === null) return
    await setSecurityChoice(selected)
    await setStep('O4')
    router.push('/(onboarding)/add_account')
  }

  const onBack = () => backOrReplace(router, '/(onboarding)/currency')

  return { selected, setSelected, onContinue, onBack }
}
```

- [ ] **Step 4: Create `app/(onboarding)/security/index.tsx`**

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { LinearGradient } from 'expo-linear-gradient'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ProgressDots } from '@/components/progress_dots'
import { Strings } from '@/constants/strings'
import { FontFamily, Radius, Size, Spacing, TouchSize, Type } from '@/constants/theme'
import type { SecurityChoice } from '@/store/onboarding_store'
import { useSecurity } from './security.hook'
import { useSecurityPillAnim } from './security.anim'

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name']

type PillConfig = {
  choice: SecurityChoice
  icon: IconName
  iconBg: string
  iconColor: string
  label: string
  sublabel: string
  labelColor: string
  sublabelColor: string
  showBadge: boolean
}

const PILLS: PillConfig[] = [
  {
    choice: 'pin', icon: 'lock', iconBg: 'rgba(201,151,58,0.12)', iconColor: '#C9973A',
    label: Strings.o3PinLabel, sublabel: Strings.o3PinSub,
    labelColor: '#F0EBE3', sublabelColor: '#6B7F99', showBadge: true,
  },
  {
    choice: 'biometric', icon: 'fingerprint', iconBg: 'rgba(55,138,221,0.10)', iconColor: '#378ADD',
    label: Strings.o3BiometricLabel, sublabel: Strings.o3BiometricSub,
    labelColor: '#F0EBE3', sublabelColor: '#6B7F99', showBadge: false,
  },
  {
    choice: 'skip', icon: 'chevron-right', iconBg: '#243044', iconColor: '#6B7F99',
    label: Strings.o3SkipLabel, sublabel: Strings.o3SkipSub,
    labelColor: '#6B7F99', sublabelColor: '#4A5568', showBadge: false,
  },
]

const hitSlop = {
  top: TouchSize.min / 4, bottom: TouchSize.min / 4,
  left: TouchSize.min / 4, right: TouchSize.min / 4,
}

export default function SecurityScreen() {
  const { selected, setSelected, onContinue, onBack } = useSecurity()
  const ctaDisabled = selected === null

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.back} hitSlop={hitSlop}>
          <MaterialCommunityIcons name="chevron-left" size={Size.iconBack} color="#6B7F99" />
        </Pressable>
        <Text style={styles.headerTitle}>{Strings.o3Title}</Text>
        <View style={styles.back} />
      </View>

      <ProgressDots totalSteps={6} currentStep={3} />

      <View style={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.shieldWrap}>
            <MaterialCommunityIcons name="shield-account" size={Size.iconLg} color="#C9973A" />
          </View>
          <View style={styles.headerCardText}>
            <Text style={styles.headerCardTitle}>{Strings.o3HeaderTitle}</Text>
            <Text style={styles.headerCardSub}>{Strings.o3HeaderSub}</Text>
          </View>
        </View>

        {PILLS.map((pill) => (
          <SecurityPill
            key={pill.choice}
            pill={pill}
            isSelected={selected === pill.choice}
            onSelect={() => setSelected(pill.choice)}
          />
        ))}
      </View>

      <View style={styles.ctaBar}>
        <Pressable
          onPress={onContinue}
          disabled={ctaDisabled}
          style={[styles.ctaPress, ctaDisabled && styles.ctaPressDisabled]}
        >
          <LinearGradient
            colors={['#C9973A', '#D4A44C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>{Strings.o3Cta}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

function SecurityPill({
  pill, isSelected, onSelect,
}: { pill: PillConfig; isSelected: boolean; onSelect: () => void }) {
  const { pillAnim, iconAnim } = useSecurityPillAnim(isSelected)

  return (
    <Animated.View style={[styles.pill, pillAnim]}>
      <Pressable onPress={onSelect} style={styles.pillInner}>
        <Animated.View style={[styles.iconWrap, { backgroundColor: pill.iconBg }, iconAnim]}>
          <MaterialCommunityIcons name={pill.icon} size={Size.iconMd} color={pill.iconColor} />
        </Animated.View>
        <View style={styles.pillText}>
          <Text style={[styles.pillLabel, { color: pill.labelColor }]}>{pill.label}</Text>
          <Text style={[styles.pillSub, { color: pill.sublabelColor }]}>{pill.sublabel}</Text>
        </View>
        {pill.showBadge && (
          <Animated.View entering={FadeIn.delay(300).duration(250)} style={styles.badge}>
            <Text style={styles.badgeText}>{Strings.o3BestBadge}</Text>
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F1923' },
  header: {
    height: Size.headerHeight, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.sm,
  },
  back: {
    width: Size.backBtn, height: Size.backBtn, borderRadius: Spacing.sm,
    backgroundColor: '#1A2535', borderWidth: 1, borderColor: '#2A3A4F',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: FontFamily.soraBold, fontSize: Type.subhead, color: '#F0EBE3' },
  content: { flex: 1, padding: Spacing.sm },
  headerCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md,
  },
  shieldWrap: {
    width: Size.shieldBox, height: Size.shieldBox, borderRadius: Spacing.sm,
    backgroundColor: 'rgba(201,151,58,0.12)', borderWidth: 1,
    borderColor: 'rgba(201,151,58,0.20)', alignItems: 'center', justifyContent: 'center',
  },
  headerCardText: { flex: 1, gap: Spacing.xxs },
  headerCardTitle: { fontFamily: FontFamily.soraBold, fontSize: Type.subhead, color: '#F0EBE3' },
  headerCardSub: { fontFamily: FontFamily.interRegular, fontSize: Type.body, color: '#6B7F99' },
  pill: { borderRadius: Radius.md, borderWidth: 1.5, marginBottom: Spacing.xs },
  pillInner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.sm, borderRadius: Radius.md,
  },
  iconWrap: {
    width: Size.securityIconBox, height: Size.securityIconBox,
    borderRadius: Spacing.sm, alignItems: 'center', justifyContent: 'center',
  },
  pillText: { flex: 1, gap: Spacing.xxs },
  pillLabel: { fontFamily: FontFamily.soraBold, fontSize: Type.bodyStrong },
  pillSub: { fontFamily: FontFamily.interRegular, fontSize: Type.caption },
  badge: {
    backgroundColor: 'rgba(201,151,58,0.12)', borderWidth: 1,
    borderColor: 'rgba(201,151,58,0.30)', borderRadius: Radius.sm / 2,
    paddingVertical: Spacing.xxs, paddingHorizontal: Spacing.xs,
  },
  badgeText: { fontFamily: FontFamily.soraBold, fontSize: Type.micro, color: '#D4A44C' },
  ctaBar: {
    borderTopWidth: 1, borderTopColor: '#1A2535',
    paddingTop: Spacing.xs, paddingHorizontal: Spacing.sm, paddingBottom: Spacing.md,
  },
  ctaPress: { width: '100%', borderRadius: Radius.cta, overflow: 'hidden' },
  ctaPressDisabled: { opacity: 0.5 },
  cta: {
    height: Size.ctaHeight, alignItems: 'center',
    justifyContent: 'center', borderRadius: Radius.cta,
  },
  ctaText: { fontFamily: FontFamily.soraBold, fontSize: Type.bodyStrong, color: '#1B2B4B' },
})
```

- [ ] **Step 5: Delete `app/(onboarding)/security.tsx`**

```bash
rm app/\(onboarding\)/security.tsx
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(security): move to folder, extract hook/store/anim"
```

---

## Task 9: Write failing Zod schema test for add_account (TDD)

**Files:**
- Create: `__tests__/add_account_schema.test.ts`

- [ ] **Step 1: Create `__tests__/add_account_schema.test.ts`**

```ts
// Run zod_config side-effect before any test so the global error map is set
import '@/utils/zod_config'
import { createAddAccountSchema } from '@/app/(onboarding)/add_account/add_account.hook'
import { Strings } from '@/constants/strings'
import type { Account } from '@/store/account_store'

const emptyAccounts: Account[] = []

const accountFixture = (name: string): Account => ({
  id: name, name, type: 'bank', currency: 'EGP',
  opening_balance: 0, current_balance: 0, color: null,
  credit_limit: null, revolving_balance: null, minimum_payment: null,
  statement_due_day: null, interest_tracking: 0, apr: null,
  is_archived: 0, sort_order: 0,
  created_at: '2026-04-29T00:00:00.000Z', updated_at: '2026-04-29T00:00:00.000Z',
})

const baseData = (overrides: Record<string, unknown> = {}) => ({
  name: 'My Account',
  balance: '1000',
  selected_type: 'bank',
  selected_color: '#1B2B4B',
  currency: 'EGP',
  interest_tracking: false,
  credit_limit: '',
  apr: '',
  revolving_balance: '',
  min_payment: '',
  due_day: '',
  ...overrides,
})

function fieldErrors(
  data: Record<string, unknown>,
  accounts: Account[] = emptyAccounts,
): Record<string, string> {
  const result = createAddAccountSchema(accounts).safeParse(data)
  if (result.success) return {}
  return Object.fromEntries(result.error.issues.map((i) => [String(i.path[0]), i.message]))
}

describe('createAddAccountSchema — add_account Zod schema', () => {
  describe('name', () => {
    it('empty name → errRequired', () => {
      expect(fieldErrors(baseData({ name: '' })).name).toBe(Strings.errRequired)
    })

    it('name > 30 chars → errTooLong', () => {
      expect(fieldErrors(baseData({ name: 'a'.repeat(31) })).name).toBe(Strings.errTooLong)
    })

    it('name exactly 30 chars → valid', () => {
      expect(fieldErrors(baseData({ name: 'a'.repeat(30) })).name).toBeUndefined()
    })

    it('duplicate name (case-insensitive) → errNameDuplicate', () => {
      const errs = fieldErrors(baseData({ name: 'CIB SAVINGS' }), [accountFixture('CIB Savings')])
      expect(errs.name).toBe(Strings.errNameDuplicate)
    })

    it('duplicate match ignores surrounding whitespace', () => {
      const errs = fieldErrors(baseData({ name: '  Bank One  ' }), [accountFixture('bank one')])
      expect(errs.name).toBe(Strings.errNameDuplicate)
    })
  })

  describe('balance', () => {
    it('empty balance → errBalanceInvalid', () => {
      expect(fieldErrors(baseData({ balance: '' })).balance).toBe(Strings.errBalanceInvalid)
    })

    it('negative balance → errBalanceInvalid', () => {
      expect(fieldErrors(baseData({ balance: '-1' })).balance).toBe(Strings.errBalanceInvalid)
    })

    it('non-numeric balance → errBalanceInvalid', () => {
      expect(fieldErrors(baseData({ balance: 'abc' })).balance).toBe(Strings.errBalanceInvalid)
    })

    it('balance of 0 → valid', () => {
      expect(fieldErrors(baseData({ balance: '0' })).balance).toBeUndefined()
    })
  })

  describe('credit card fields', () => {
    it('CC type + empty credit_limit → errCreditLimitRequired', () => {
      const errs = fieldErrors(baseData({ selected_type: 'credit_card', credit_limit: '' }))
      expect(errs.credit_limit).toBe(Strings.errCreditLimitRequired)
    })

    it('CC type + non-empty credit_limit → valid', () => {
      const errs = fieldErrors(baseData({ selected_type: 'credit_card', credit_limit: '5000' }))
      expect(errs.credit_limit).toBeUndefined()
    })

    it('non-CC type + empty credit_limit → valid', () => {
      expect(fieldErrors(baseData({ selected_type: 'bank', credit_limit: '' })).credit_limit).toBeUndefined()
    })

    it('CC + interest ON + empty APR → errAprRequired', () => {
      const errs = fieldErrors(baseData({
        selected_type: 'credit_card', credit_limit: '5000',
        interest_tracking: true, apr: '',
      }))
      expect(errs.apr).toBe(Strings.errAprRequired)
    })

    it('CC + interest OFF + empty APR → valid', () => {
      const errs = fieldErrors(baseData({
        selected_type: 'credit_card', credit_limit: '5000',
        interest_tracking: false, apr: '',
      }))
      expect(errs.apr).toBeUndefined()
    })

    it('CC + interest ON + provided APR → valid', () => {
      const errs = fieldErrors(baseData({
        selected_type: 'credit_card', credit_limit: '5000',
        interest_tracking: true, apr: '24.99',
      }))
      expect(errs.apr).toBeUndefined()
    })
  })

  it('all valid → no errors', () => {
    expect(fieldErrors(baseData())).toEqual({})
  })
})
```

- [ ] **Step 2: Run test — confirm it FAILS (module not found)**

```bash
npx jest __tests__/add_account_schema.test.ts
```

Expected: FAIL — `Cannot find module '@/app/(onboarding)/add_account/add_account.hook'`

- [ ] **Step 3: Commit failing test**

```bash
git add __tests__/add_account_schema.test.ts
git commit -m "test(add_account): add failing Zod schema test"
```

---

## Task 10: Create add_account folder — implement schema and hook — make test pass

**Files:**
- Create: `app/(onboarding)/add_account/add_account.hook.ts`
- Create: `app/(onboarding)/add_account/add_account.anim.ts`
- Create: `app/(onboarding)/add_account/index.tsx`
- Delete: `app/(onboarding)/add-account.tsx`
- Modify: `app/index.tsx` (route O4)
- Modify: `app/(onboarding)/_layout.tsx` (param type)

- [ ] **Step 1: Create `app/(onboarding)/add_account/add_account.hook.ts`**

```ts
import { useEffect, useMemo } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { z } from 'zod'
import { useAccountStore } from '@/store/account_store'
import { useOnboardingStore } from '@/store/onboarding_store'
import { useZodForm } from '@/utils/use_zod_form'
import { backOrReplace } from '@/utils/onboarding_nav'
import { AccountColors } from '@/constants/theme'
import { Strings } from '@/constants/strings'
import type { Account, AccountType } from '@/store/account_store'
import type { Currency } from '@/store/onboarding_store'

export function createAddAccountSchema(accounts: Account[]) {
  return z
    .object({
      name: z.string().min(1).max(30),
      balance: z.string().refine(
        (v) => { const n = parseFloat(v); return Number.isFinite(n) && n >= 0 },
        { message: Strings.errBalanceInvalid },
      ),
      selected_type: z.enum([
        'bank', 'smart_wallet', 'physical_wallet', 'physical_savings', 'credit_card',
      ] as [AccountType, ...AccountType[]]),
      selected_color: z.string(),
      currency: z.enum(['EGP', 'USD'] as [Currency, ...Currency[]]),
      interest_tracking: z.boolean(),
      credit_limit: z.string().optional(),
      apr: z.string().optional(),
      revolving_balance: z.string().optional(),
      min_payment: z.string().optional(),
      due_day: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (accounts.some((a) => a.name.trim().toLowerCase() === data.name.trim().toLowerCase())) {
        ctx.addIssue({ code: 'custom', path: ['name'], message: Strings.errNameDuplicate })
      }
      if (data.selected_type === 'credit_card' && !data.credit_limit?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['credit_limit'], message: Strings.errCreditLimitRequired })
      }
      if (data.interest_tracking && !data.apr?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['apr'], message: Strings.errAprRequired })
      }
    })
}

export type AddAccountFormData = z.infer<ReturnType<typeof createAddAccountSchema>>

export function useAddAccount() {
  const router = useRouter()
  const { isAddingMore } = useLocalSearchParams<{ isAddingMore?: string }>()
  const accounts = useAccountStore((s) => s.accounts)
  const addAccount = useAccountStore((s) => s.addAccount)
  const setStep = useOnboardingStore((s) => s.setStep)
  const baseCurrency = useOnboardingStore((s) => s.baseCurrency)

  useEffect(() => {
    useAccountStore.getState().loadAccounts()
  }, [])

  const schema = useMemo(() => createAddAccountSchema(accounts), [accounts])

  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      balance: '',
      selected_type: 'bank' as AccountType,
      selected_color: AccountColors[0],
      currency: baseCurrency as Currency,
      interest_tracking: false,
      credit_limit: '',
      apr: '',
      revolving_balance: '',
      min_payment: '',
      due_day: '',
    },
  })

  const onSubmit = async (data: AddAccountFormData) => {
    const isCC = data.selected_type === 'credit_card'
    await addAccount({
      name: data.name.trim(),
      type: data.selected_type,
      currency: data.currency,
      opening_balance: parseFloat(data.balance),
      current_balance: parseFloat(data.balance),
      color: data.selected_color,
      interest_tracking: (data.interest_tracking ? 1 : 0) as 0 | 1,
      is_archived: 0 as const,
      sort_order: accounts.length,
      credit_limit: isCC && data.credit_limit?.trim() ? parseFloat(data.credit_limit) : null,
      revolving_balance: isCC && data.revolving_balance?.trim() ? parseFloat(data.revolving_balance) || 0 : null,
      minimum_payment: isCC && data.min_payment?.trim() ? parseFloat(data.min_payment) : null,
      statement_due_day: isCC && data.due_day?.trim() ? parseInt(data.due_day, 10) : null,
      apr: isCC && data.interest_tracking && data.apr?.trim() ? parseFloat(data.apr) : null,
    })
    if (isAddingMore) {
      backOrReplace(router, '/(onboarding)/more_accounts')
    } else {
      await setStep('O5')
      router.push('/(onboarding)/more_accounts')
    }
  }

  const onBack = () =>
    backOrReplace(
      router,
      isAddingMore ? '/(onboarding)/more_accounts' : '/(onboarding)/security',
    )

  return { form, handleSave: form.handleSubmit(onSubmit), onBack }
}
```

- [ ] **Step 2: Run the Zod schema test — confirm it PASSES**

```bash
npx jest __tests__/add_account_schema.test.ts
```

Expected: all tests PASS.

- [ ] **Step 3: Create `app/(onboarding)/add_account/add_account.anim.ts`**

```ts
import {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

export function useAddAccountAnim() {
  const btnScale = useSharedValue(1)

  const btnAnim = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }))

  const triggerBtnPress = () => {
    btnScale.value = withSequence(
      withTiming(0.97, { duration: 80 }),
      withSpring(1.0, { damping: 10 }),
    )
  }

  return {
    btnAnim,
    triggerBtnPress,
    ccEntering: FadeInDown.duration(250),
    ccExiting: FadeOutUp.duration(200),
    aprEntering: FadeInDown.duration(200),
    aprExiting: FadeOutUp.duration(150),
    errorEntering: FadeInDown.duration(150),
    errorExiting: FadeOutUp.duration(100),
  }
}

export function useTypePillAnim() {
  const scale = useSharedValue(1)

  const pillAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const triggerPillTap = () => {
    scale.value = withSequence(
      withSpring(1.03, { damping: 8, stiffness: 200 }),
      withSpring(1.0, { damping: 12 }),
    )
  }

  return { pillAnim, triggerPillTap }
}
```

- [ ] **Step 4: Create `app/(onboarding)/add_account/index.tsx`**

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { LinearGradient } from 'expo-linear-gradient'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { Controller, useWatch } from 'react-hook-form'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ProgressDots } from '@/components/progress_dots'
import { Strings } from '@/constants/strings'
import { AccountColors, FontFamily, Radius, Size, Spacing, TouchSize, Type } from '@/constants/theme'
import type { AccountType } from '@/store/account_store'
import type { Currency } from '@/store/onboarding_store'
import { useAddAccount } from './add_account.hook'
import { useAddAccountAnim, useTypePillAnim } from './add_account.anim'

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name']
type TypeOption = { type: AccountType; icon: IconName; label: string; fullWidth?: boolean }

const TYPE_OPTIONS: TypeOption[] = [
  { type: 'bank', icon: 'bank', label: Strings.typeBank },
  { type: 'smart_wallet', icon: 'cellphone-nfc', label: Strings.typeSmartWallet },
  { type: 'physical_wallet', icon: 'wallet', label: Strings.typePhysicalWallet },
  { type: 'physical_savings', icon: 'piggy-bank', label: Strings.typePhysicalSavings },
  { type: 'credit_card', icon: 'credit-card', label: Strings.typeCreditCard, fullWidth: true },
]

const CURRENCY_OPTIONS: Currency[] = ['EGP', 'USD']

const hitSlop = {
  top: TouchSize.min / 4, bottom: TouchSize.min / 4,
  left: TouchSize.min / 4, right: TouchSize.min / 4,
}

export default function AddAccountScreen() {
  const { form, handleSave, onBack } = useAddAccount()
  const {
    btnAnim, triggerBtnPress,
    ccEntering, ccExiting,
    aprEntering, aprExiting,
    errorEntering, errorExiting,
  } = useAddAccountAnim()
  const { control, formState: { errors, isSubmitting } } = form
  const selectedType = useWatch({ control, name: 'selected_type' })
  const selectedColor = useWatch({ control, name: 'selected_color' })
  const selectedCurrency = useWatch({ control, name: 'currency' })
  const interestTracking = useWatch({ control, name: 'interest_tracking' })
  const isCreditCard = selectedType === 'credit_card'

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.back} hitSlop={hitSlop}>
          <MaterialCommunityIcons name="chevron-left" size={Size.iconBack} color="#6B7F99" />
        </Pressable>
        <Text style={styles.headerTitle}>{Strings.o4Title}</Text>
        <View style={styles.back} />
      </View>

      <ProgressDots totalSteps={6} currentStep={4} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Account Type */}
        <Text style={styles.sectionLabel}>{Strings.o4SectionType}</Text>
        <View style={styles.typeGrid}>
          {TYPE_OPTIONS.map((opt) => (
            <TypePill
              key={opt.type}
              option={opt}
              isSelected={selectedType === opt.type}
              onSelect={() => form.setValue('selected_type', opt.type, { shouldValidate: true })}
            />
          ))}
        </View>

        {/* Account Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.sectionLabel}>{Strings.o4SectionName}</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={Strings.o4NamePlaceholder}
                placeholderTextColor="#4A5568"
                maxLength={30}
                style={styles.input}
              />
            )}
          />
          {errors.name ? (
            <Animated.Text entering={errorEntering} exiting={errorExiting} style={styles.errorText}>
              {errors.name.message}
            </Animated.Text>
          ) : null}
        </View>

        {/* Currency */}
        <View style={styles.fieldGroup}>
          <Text style={styles.sectionLabel}>{Strings.o4SectionCurrency}</Text>
          <View style={styles.currencyRow}>
            {CURRENCY_OPTIONS.map((code) => (
              <Pressable
                key={code}
                onPress={() => form.setValue('currency', code)}
                style={[
                  styles.currencyPill,
                  selectedCurrency === code ? styles.pillActive : styles.pillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.currencyText,
                    { color: selectedCurrency === code ? '#C9973A' : '#6B7F99' },
                  ]}
                >
                  {code === 'EGP' ? Strings.currencyEGPCode : Strings.currencyUSDCode}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Balance */}
        <View style={styles.fieldGroup}>
          <Text style={styles.sectionLabel}>{Strings.o4SectionBalance}</Text>
          <Controller
            control={control}
            name="balance"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={Strings.o4BalancePlaceholder}
                placeholderTextColor="#4A5568"
                keyboardType="decimal-pad"
                style={styles.input}
              />
            )}
          />
          {errors.balance ? (
            <Animated.Text entering={errorEntering} exiting={errorExiting} style={styles.errorText}>
              {errors.balance.message}
            </Animated.Text>
          ) : null}
        </View>

        {/* Color presets */}
        <View style={styles.fieldGroup}>
          <Text style={styles.sectionLabel}>{Strings.o4SectionColor}</Text>
          <View style={styles.colorRow}>
            {AccountColors.map((color) => (
              <Pressable
                key={color}
                onPress={() => form.setValue('selected_color', color)}
                style={styles.colorDotWrap}
              >
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorDotSelected,
                  ]}
                />
              </Pressable>
            ))}
          </View>
        </View>

        {/* CC conditional fields */}
        {isCreditCard && (
          <Animated.View entering={ccEntering} exiting={ccExiting} style={styles.ccBlock}>
            <View style={styles.fieldGroup}>
              <Text style={styles.sectionLabel}>{Strings.o4SectionRevolving}</Text>
              <Controller
                control={control}
                name="revolving_balance"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder={Strings.o4RevolvingPlaceholder}
                    placeholderTextColor="#4A5568"
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                )}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.sectionLabel}>{Strings.o4SectionLimit}</Text>
              <Controller
                control={control}
                name="credit_limit"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={Strings.o4CreditLimitPlaceholder}
                    placeholderTextColor="#4A5568"
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                )}
              />
              {errors.credit_limit ? (
                <Animated.Text entering={errorEntering} exiting={errorExiting} style={styles.errorText}>
                  {errors.credit_limit.message}
                </Animated.Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.sectionLabel}>{Strings.o4SectionMinPayment}</Text>
              <Controller
                control={control}
                name="min_payment"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder={Strings.o4MinPaymentPlaceholder}
                    placeholderTextColor="#4A5568"
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                )}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.sectionLabel}>{Strings.o4SectionDueDay}</Text>
              <Controller
                control={control}
                name="due_day"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder={Strings.o4DueDayPlaceholder}
                    placeholderTextColor="#4A5568"
                    keyboardType="number-pad"
                    maxLength={2}
                    style={styles.input}
                  />
                )}
              />
            </View>

            <View style={[styles.fieldGroup, styles.interestRow]}>
              <Text style={styles.interestLabel}>{Strings.o4InterestLabel}</Text>
              <Pressable
                onPress={() => form.setValue('interest_tracking', !interestTracking)}
                style={[styles.togglePill, interestTracking ? styles.pillActive : styles.pillInactive]}
              >
                <Text style={[styles.toggleText, { color: interestTracking ? '#C9973A' : '#6B7F99' }]}>
                  {interestTracking ? Strings.o4InterestOn : Strings.o4InterestOff}
                </Text>
              </Pressable>
            </View>

            {interestTracking && (
              <Animated.View entering={aprEntering} exiting={aprExiting} style={styles.fieldGroup}>
                <Text style={styles.sectionLabel}>{Strings.o4SectionApr}</Text>
                <Controller
                  control={control}
                  name="apr"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder={Strings.o4AprPlaceholder}
                      placeholderTextColor="#4A5568"
                      keyboardType="decimal-pad"
                      style={styles.input}
                    />
                  )}
                />
                {errors.apr ? (
                  <Animated.Text entering={errorEntering} exiting={errorExiting} style={styles.errorText}>
                    {errors.apr.message}
                  </Animated.Text>
                ) : null}
              </Animated.View>
            )}
          </Animated.View>
        )}
      </ScrollView>

      <View style={styles.ctaBar}>
        <Animated.View style={btnAnim}>
          <Pressable
            onPress={() => { triggerBtnPress(); handleSave() }}
            disabled={isSubmitting}
            style={[styles.ctaPress, isSubmitting && styles.ctaPressDisabled]}
          >
            <LinearGradient
              colors={['#C9973A', '#D4A44C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>{Strings.o4Cta}</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  )
}

function TypePill({
  option, isSelected, onSelect,
}: { option: TypeOption; isSelected: boolean; onSelect: () => void }) {
  const { pillAnim, triggerPillTap } = useTypePillAnim()
  const iconColor = isSelected ? '#C9973A' : '#6B7F99'

  return (
    <Animated.View
      style={[
        styles.typePillWrap,
        option.fullWidth ? styles.typePillFull : styles.typePillHalf,
        pillAnim,
      ]}
    >
      <Pressable
        onPress={() => { triggerPillTap(); onSelect() }}
        style={[styles.typePill, isSelected ? styles.pillActive : styles.pillInactive]}
      >
        <MaterialCommunityIcons name={option.icon} size={Size.iconSm} color={iconColor} />
        <Text style={[styles.typePillText, { color: iconColor }]}>{option.label}</Text>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F1923' },
  header: {
    height: Size.headerHeight, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.sm,
  },
  back: {
    width: Size.backBtn, height: Size.backBtn, borderRadius: Spacing.sm,
    backgroundColor: '#1A2535', borderWidth: 1, borderColor: '#2A3A4F',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: FontFamily.soraBold, fontSize: Type.subhead, color: '#F0EBE3' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.sm, paddingBottom: Spacing.md },
  sectionLabel: {
    fontFamily: FontFamily.soraBold, fontSize: Type.micro, color: '#C9973A',
    letterSpacing: 1, paddingTop: Spacing.xs, paddingBottom: Spacing.xs, paddingHorizontal: 0,
  },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  typePillWrap: { borderRadius: Radius.md },
  typePillHalf: { width: '48.5%' },
  typePillFull: { width: '100%' },
  typePill: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md, borderWidth: 1.5,
  },
  pillActive: { borderColor: '#C9973A', backgroundColor: 'rgba(201,151,58,0.08)' },
  pillInactive: { borderColor: '#2A3A4F', backgroundColor: '#1A2535' },
  typePillText: { fontFamily: FontFamily.soraBold, fontSize: Type.body },
  fieldGroup: { paddingTop: Spacing.xxs },
  input: {
    fontFamily: FontFamily.soraSemi, fontSize: Type.body, color: '#F0EBE3',
    backgroundColor: '#1A2535', borderWidth: 1, borderColor: '#2A3A4F',
    borderRadius: Radius.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm,
  },
  currencyRow: { flexDirection: 'row', gap: Spacing.xs },
  currencyPill: {
    flex: 1, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  currencyText: { fontFamily: FontFamily.soraBold, fontSize: Type.body },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  colorDotWrap: { padding: Spacing.xxs },
  colorDot: { width: Size.colorDot, height: Size.colorDot, borderRadius: Size.colorDot / 2 },
  colorDotSelected: { borderWidth: 2, borderColor: '#C9973A', transform: [{ scale: 1.1 }] },
  ccBlock: { paddingTop: Spacing.xxs },
  interestRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingTop: Spacing.sm,
  },
  interestLabel: { fontFamily: FontFamily.interSemi, fontSize: Type.body, color: '#F0EBE3' },
  togglePill: {
    paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md, borderWidth: 1.5,
    minWidth: Size.backBtn + Spacing.xs, alignItems: 'center',
  },
  toggleText: { fontFamily: FontFamily.soraBold, fontSize: Type.caption, letterSpacing: 0.5 },
  ctaBar: {
    borderTopWidth: 1, borderTopColor: '#1A2535',
    paddingTop: Spacing.xs, paddingHorizontal: Spacing.sm, paddingBottom: Spacing.md,
  },
  ctaPress: { width: '100%', borderRadius: Radius.cta, overflow: 'hidden' },
  ctaPressDisabled: { opacity: 0.5 },
  cta: {
    height: Size.ctaHeight, alignItems: 'center',
    justifyContent: 'center', borderRadius: Radius.cta,
  },
  ctaText: { fontFamily: FontFamily.soraBold, fontSize: Type.bodyStrong, color: '#1B2B4B' },
  errorText: {
    color: '#E05A42', fontFamily: FontFamily.interRegular,
    fontSize: Type.caption, marginTop: Spacing.xxs,
  },
})
```

- [ ] **Step 5: Update `app/index.tsx` — change routes O4 and O5**

```ts
// Before
const STEP_HREF: Record<OnboardingStep, string> = {
  O1: '/(onboarding)/welcome',
  O2: '/(onboarding)/currency',
  O3: '/(onboarding)/security',
  O4: '/(onboarding)/add-account',
  O5: '/(onboarding)/more-accounts',
  O6: '/(onboarding)/ready',
}
// After
const STEP_HREF: Record<OnboardingStep, string> = {
  O1: '/(onboarding)/welcome',
  O2: '/(onboarding)/currency',
  O3: '/(onboarding)/security',
  O4: '/(onboarding)/add_account',
  O5: '/(onboarding)/more_accounts',
  O6: '/(onboarding)/ready',
}
```

- [ ] **Step 6: Update `app/(onboarding)/_layout.tsx` — rename param keys**

```ts
// Before
export type OnboardingStackParams = {
  welcome: undefined
  currency: undefined
  security: undefined
  'add-account': { isAddingMore?: boolean }
  'more-accounts': undefined
  ready: undefined
}
// After
export type OnboardingStackParams = {
  welcome: undefined
  currency: undefined
  security: undefined
  add_account: { isAddingMore?: boolean }
  more_accounts: undefined
  ready: undefined
}
```

- [ ] **Step 7: Delete `app/(onboarding)/add-account.tsx`**

```bash
rm "app/(onboarding)/add-account.tsx"
```

- [ ] **Step 8: Run all tests**

```bash
npx jest
```

Expected: all tests pass (including the new `add_account_schema` test).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(add_account): move to folder, RHF+Zod schema, update add_account routes"
```

---

## Task 11: Create more_accounts folder + update more_accounts routes

**Files:**
- Create: `app/(onboarding)/more_accounts/more_accounts.anim.ts`
- Create: `app/(onboarding)/more_accounts/more_accounts.hook.ts`
- Create: `app/(onboarding)/more_accounts/index.tsx`
- Delete: `app/(onboarding)/more-accounts.tsx`

- [ ] **Step 1: Create `app/(onboarding)/more_accounts/more_accounts.anim.ts`**

```ts
import { FadeInRight } from 'react-native-reanimated'

export function useMoreAccountsAnim() {
  return {
    rowEntering: (index: number, isInitialMount: boolean) =>
      isInitialMount
        ? FadeInRight.delay(index * 80).duration(300)
        : FadeInRight.duration(250),
  }
}
```

- [ ] **Step 2: Create `app/(onboarding)/more_accounts/more_accounts.hook.ts`**

```ts
import { useCallback, useRef } from 'react'
import { useFocusEffect, useRouter } from 'expo-router'
import { useAccountStore } from '@/store/account_store'
import { useOnboardingStore } from '@/store/onboarding_store'

export function useMoreAccounts() {
  const router = useRouter()
  const accounts = useAccountStore((s) => s.accounts)
  const setStep = useOnboardingStore((s) => s.setStep)

  const initialCountRef = useRef<number | null>(null)
  if (initialCountRef.current === null) {
    initialCountRef.current = accounts.length
  }
  const initialCount = initialCountRef.current

  useFocusEffect(
    useCallback(() => {
      useAccountStore.getState().loadAccounts()
    }, []),
  )

  const handleAddAnother = () => {
    router.push({
      pathname: '/(onboarding)/add_account',
      params: { isAddingMore: 'true' },
    })
  }

  const handleDone = async () => {
    await setStep('O6')
    router.push('/(onboarding)/ready')
  }

  return { accounts, initialCount, handleAddAnother, handleDone }
}
```

- [ ] **Step 3: Create `app/(onboarding)/more_accounts/index.tsx`**

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { LinearGradient } from 'expo-linear-gradient'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ProgressDots } from '@/components/progress_dots'
import { Strings } from '@/constants/strings'
import { FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme'
import type { Account, AccountType } from '@/store/account_store'
import { useMoreAccounts } from './more_accounts.hook'
import { useMoreAccountsAnim } from './more_accounts.anim'

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name']

const TYPE_ICONS: Record<AccountType, IconName> = {
  bank: 'bank', smart_wallet: 'cellphone-nfc', physical_wallet: 'wallet',
  physical_savings: 'piggy-bank', credit_card: 'credit-card',
}

const TYPE_LABELS: Record<AccountType, string> = {
  bank: Strings.typeBank, smart_wallet: Strings.typeSmartWallet,
  physical_wallet: Strings.typePhysicalWallet, physical_savings: Strings.typePhysicalSavings,
  credit_card: Strings.typeCreditCard,
}

export default function MoreAccountsScreen() {
  const { accounts, initialCount, handleAddAnother, handleDone } = useMoreAccounts()
  const { rowEntering } = useMoreAccountsAnim()

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>{Strings.o5Title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ProgressDots totalSteps={6} currentStep={5} />

      <Text style={styles.subtitle}>
        {accounts.length}
        {Strings.o5SubtitleSuffix}
      </Text>

      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <AccountRow
            account={item}
            index={index}
            entering={rowEntering(index, index < initialCount)}
          />
        )}
        ListFooterComponent={
          <Pressable onPress={handleAddAnother} style={styles.addAnother}>
            <View style={styles.addAnotherPlus}>
              <Text style={styles.addAnotherPlusText}>+</Text>
            </View>
            <Text style={styles.addAnotherLabel}>{Strings.o5AddAnother}</Text>
          </Pressable>
        }
      />

      <Text style={styles.hint}>{Strings.o5SettingsHint}</Text>

      <View style={styles.ctaBar}>
        <Pressable onPress={handleDone} style={styles.ctaPress}>
          <LinearGradient
            colors={['#C9973A', '#D4A44C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>{Strings.o5Cta}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

function AccountRow({
  account, index, entering,
}: { account: Account; index: number; entering: ReturnType<typeof import('react-native-reanimated').FadeInRight.duration> | undefined }) {
  const isFirst = index === 0
  const icon = TYPE_ICONS[account.type]
  const typeLabel = `${TYPE_LABELS[account.type]} · ${account.currency}`
  const formattedBalance = new Intl.NumberFormat('en-US').format(account.opening_balance)

  return (
    <Animated.View entering={entering} style={styles.row}>
      <View
        style={[
          styles.iconContainer,
          isFirst ? styles.iconContainerActive : styles.iconContainerInactive,
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={Size.iconBack}
          color={isFirst ? '#C9973A' : '#6B7F99'}
        />
      </View>
      <View style={styles.rowMiddle}>
        <Text style={styles.rowName} numberOfLines={1}>{account.name}</Text>
        <Text style={styles.rowType}>{typeLabel}</Text>
      </View>
      <Text
        style={[
          styles.rowBalance,
          { color: account.type === 'credit_card' ? '#E05A42' : '#4CAF82' },
        ]}
      >
        {formattedBalance}
      </Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F1923' },
  header: {
    height: Size.headerHeight, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.sm,
  },
  headerSpacer: { width: Size.backBtn, height: Size.backBtn },
  headerTitle: { fontFamily: FontFamily.soraBold, fontSize: Type.subhead, color: '#F0EBE3' },
  subtitle: {
    fontFamily: FontFamily.interRegular, fontSize: Type.body, color: '#6B7F99',
    paddingTop: Spacing.xs, paddingHorizontal: Spacing.sm, paddingBottom: Spacing.sm,
    lineHeight: Math.round(Type.body * 1.4),
  },
  listContent: { paddingHorizontal: Spacing.sm, paddingBottom: Spacing.sm, gap: Spacing.xs },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md, backgroundColor: '#1A2535', borderWidth: 1, borderColor: '#2A3A4F',
  },
  iconContainer: {
    width: Size.typeIconBox, height: Size.typeIconBox, borderRadius: Radius.sm,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  iconContainerActive: { backgroundColor: '#1B2B4B', borderColor: '#C9973A' },
  iconContainerInactive: { backgroundColor: '#1A2535', borderColor: '#2A3A4F' },
  rowMiddle: { flex: 1, gap: Spacing.xxs },
  rowName: { fontFamily: FontFamily.soraBold, fontSize: Type.subhead, color: '#F0EBE3' },
  rowType: { fontFamily: FontFamily.interRegular, fontSize: Type.caption, color: '#6B7F99' },
  rowBalance: { fontFamily: FontFamily.soraBold, fontSize: Type.subhead, marginLeft: 'auto' },
  addAnother: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, padding: Spacing.sm, marginTop: Spacing.xs,
    borderRadius: Radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#2A3A4F',
  },
  addAnotherPlus: {
    width: Size.iconLg, height: Size.iconLg, borderRadius: Radius.sm,
    backgroundColor: 'rgba(201,151,58,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  addAnotherPlusText: {
    fontFamily: FontFamily.soraBold, fontSize: Type.headline,
    color: '#C9973A', lineHeight: Math.round(Type.headline * 1.1),
  },
  addAnotherLabel: { fontFamily: FontFamily.interRegular, fontSize: Type.body, color: '#6B7F99' },
  hint: {
    fontFamily: FontFamily.interRegular, fontSize: Type.micro, color: '#4A5568',
    textAlign: 'center', paddingHorizontal: Spacing.sm, paddingBottom: Spacing.xxs,
  },
  ctaBar: {
    borderTopWidth: 1, borderTopColor: '#1A2535',
    paddingTop: Spacing.xs, paddingHorizontal: Spacing.sm, paddingBottom: Spacing.md,
  },
  ctaPress: { width: '100%', borderRadius: Radius.cta, overflow: 'hidden' },
  cta: {
    height: Size.ctaHeight, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.cta,
  },
  ctaText: { fontFamily: FontFamily.soraBold, fontSize: Type.bodyStrong, color: '#1B2B4B' },
})
```

Note on the `AccountRow` `entering` prop type: replace the verbose import type with just `any` or use the correct Reanimated type. Simplest:

```tsx
function AccountRow({
  account, index, entering,
}: { account: Account; index: number; entering: object | undefined }) {
```

- [ ] **Step 4: Delete `app/(onboarding)/more-accounts.tsx`**

```bash
rm "app/(onboarding)/more-accounts.tsx"
```

- [ ] **Step 5: Run all tests**

```bash
npx jest
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(more_accounts): move to folder, extract hook/anim, update more_accounts routes"
```

---

## Task 12: Move ready screen into folder + extract hook/store/anim

**Files:**
- Create: `app/(onboarding)/ready/ready.store.ts`
- Create: `app/(onboarding)/ready/ready.anim.ts`
- Create: `app/(onboarding)/ready/ready.hook.ts`
- Create: `app/(onboarding)/ready/index.tsx`
- Delete: `app/(onboarding)/ready.tsx`

- [ ] **Step 1: Create `app/(onboarding)/ready/ready.store.ts`**

```ts
import { create } from 'zustand'

interface ReadyStore {
  completing: boolean
  setCompleting: (completing: boolean) => void
  reset: () => void
}

export const useReadyStore = create<ReadyStore>((set) => ({
  completing: false,
  setCompleting: (completing) => set({ completing }),
  reset: () => set({ completing: false }),
}))
```

- [ ] **Step 2: Create `app/(onboarding)/ready/ready.anim.ts`**

```ts
import { FadeInUp, ZoomIn } from 'react-native-reanimated'
import { useFirstMountEntering } from '@/utils/use_first_mount_entering'

export function useReadyAnim() {
  const play = useFirstMountEntering('ready')

  return {
    checkEntering: play ? ZoomIn.springify().damping(10).stiffness(100) : undefined,
    headlineEntering: play ? FadeInUp.delay(200).duration(400) : undefined,
    subtitleEntering: play ? FadeInUp.delay(300).duration(350) : undefined,
    rowEntering: (index: number) =>
      play ? FadeInUp.delay(400 + index * 80).duration(300) : undefined,
    ctaEntering: play ? FadeInUp.delay(700).duration(400) : undefined,
  }
}
```

- [ ] **Step 3: Create `app/(onboarding)/ready/ready.hook.ts`**

```ts
import { useAccountStore } from '@/store/account_store'
import { useOnboardingStore } from '@/store/onboarding_store'
import { useReadyStore } from './ready.store'
import { Strings } from '@/constants/strings'

type SummaryRow = { label: string; value: string; gold: boolean }

export function useReady() {
  const baseCurrency = useOnboardingStore((s) => s.baseCurrency)
  const securityChoice = useOnboardingStore((s) => s.securityChoice)
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding)
  const accounts = useAccountStore((s) => s.accounts)
  const completing = useReadyStore((s) => s.completing)
  const setCompleting = useReadyStore((s) => s.setCompleting)

  const total = accounts.reduce((sum, a) => sum + a.opening_balance, 0)
  const formattedTotal = new Intl.NumberFormat('en-US').format(total)

  const securityValue =
    securityChoice === null || securityChoice === 'skip'
      ? Strings.o6SecuritySkipped
      : Strings.o6SecurityEnabled

  const rows: SummaryRow[] = [
    { label: Strings.o6Currency, value: baseCurrency, gold: true },
    { label: Strings.o6Accounts, value: `${accounts.length} accounts`, gold: false },
    { label: Strings.o6TotalBalance, value: `${formattedTotal} ${baseCurrency}`, gold: true },
    { label: Strings.o6Security, value: securityValue, gold: false },
  ]

  const handleComplete = async () => {
    if (completing) return
    setCompleting(true)
    try {
      await completeOnboarding()
    } finally {
      setCompleting(false)
    }
  }

  return { rows, completing, handleComplete }
}
```

- [ ] **Step 4: Create `app/(onboarding)/ready/index.tsx`**

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { LinearGradient } from 'expo-linear-gradient'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ProgressDots } from '@/components/progress_dots'
import { Strings } from '@/constants/strings'
import { FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme'
import { useReady } from './ready.hook'
import { useReadyAnim } from './ready.anim'

export default function ReadyScreen() {
  const { rows, completing, handleComplete } = useReady()
  const {
    checkEntering, headlineEntering, subtitleEntering, rowEntering, ctaEntering,
  } = useReadyAnim()

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ProgressDots totalSteps={6} currentStep={6} />

      <View style={styles.body}>
        <Animated.View entering={checkEntering} style={styles.checkWrap}>
          <MaterialCommunityIcons name="check-circle" size={Size.iconHero} color="#4CAF82" />
        </Animated.View>

        <Animated.Text entering={headlineEntering} style={styles.headline}>
          {Strings.o6Title}
        </Animated.Text>

        <Animated.Text entering={subtitleEntering} style={styles.subtitle}>
          {Strings.o6Subtitle}
        </Animated.Text>

        <View style={styles.summary}>
          {rows.map((row, index) => (
            <Animated.View
              key={row.label}
              entering={rowEntering(index)}
              style={[styles.summaryRow, index === rows.length - 1 ? styles.summaryRowLast : null]}
            >
              <Text style={styles.summaryLabel}>{row.label}</Text>
              <Text style={[styles.summaryValue, { color: row.gold ? '#D4A44C' : '#F0EBE3' }]}>
                {row.value}
              </Text>
            </Animated.View>
          ))}
        </View>
      </View>

      <Animated.View entering={ctaEntering} style={styles.ctaBar}>
        <Pressable onPress={handleComplete} disabled={completing} style={styles.ctaPress}>
          <LinearGradient
            colors={['#C9973A', '#D4A44C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>{Strings.o6Cta}</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F1923' },
  body: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.sm,
  },
  checkWrap: { marginBottom: Spacing.md },
  headline: {
    fontFamily: FontFamily.soraExtra, fontSize: Type.headline, color: '#F0EBE3',
    textAlign: 'center', marginBottom: Spacing.xxs,
  },
  subtitle: {
    fontFamily: FontFamily.interRegular, fontSize: Type.body, color: '#6B7F99',
    textAlign: 'center', marginBottom: Spacing.md, lineHeight: Math.round(Type.body * 1.4),
  },
  summary: {
    width: '100%', backgroundColor: '#1A2535', borderWidth: 1, borderColor: '#2A3A4F',
    borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: '#243044',
  },
  summaryRowLast: { borderBottomWidth: 0 },
  summaryLabel: { fontFamily: FontFamily.interRegular, fontSize: Type.body, color: '#6B7F99' },
  summaryValue: { fontFamily: FontFamily.soraBold, fontSize: Type.bodyStrong },
  ctaBar: {
    borderTopWidth: 1, borderTopColor: '#1A2535',
    paddingTop: Spacing.xs, paddingHorizontal: Spacing.sm, paddingBottom: Spacing.md,
  },
  ctaPress: { width: '100%', borderRadius: Radius.cta, overflow: 'hidden' },
  cta: {
    height: Size.ctaHeight, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.cta,
  },
  ctaText: { fontFamily: FontFamily.soraBold, fontSize: Type.bodyStrong, color: '#1B2B4B' },
})
```

- [ ] **Step 5: Delete `app/(onboarding)/ready.tsx`**

```bash
rm "app/(onboarding)/ready.tsx"
```

- [ ] **Step 6: Run all tests**

```bash
npx jest
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(ready): move to folder, extract hook/store/anim"
```

---

## Task 13: Delete validation.ts, replace validation.test.ts

**Files:**
- Delete: `utils/validation.ts`
- Delete: `__tests__/validation.test.ts`

- [ ] **Step 1: Delete validation files**

```bash
rm utils/validation.ts __tests__/validation.test.ts
```

- [ ] **Step 2: Run all tests — confirm no references remain**

```bash
npx jest
```

Expected: all tests pass. No "Cannot find module" errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: delete validation.ts, validation.test.ts (replaced by Zod schema)"
```

---

## Task 14: Final typecheck and full test run

- [ ] **Step 1: Run TypeScript compiler**

```bash
npx tsc --noEmit
```

Expected: zero errors. If errors appear, fix them before proceeding.

- [ ] **Step 2: Run full test suite**

```bash
npx jest --verbose
```

Expected: all test suites pass.

- [ ] **Step 3: Run lint**

```bash
npx expo lint
```

Expected: zero errors (warnings are acceptable).

- [ ] **Step 4: Commit if any fixes were made, then tag**

```bash
git add -A
git commit -m "fix: resolve typecheck and lint issues from architecture redesign"
```

---

## Summary of route changes

| Old route | New route | Files updated |
|-----------|-----------|---------------|
| `/(onboarding)/add-account` | `/(onboarding)/add_account` | `app/index.tsx`, `app/(onboarding)/_layout.tsx`, `security/security.hook.ts`, `add_account.hook.ts` |
| `/(onboarding)/more-accounts` | `/(onboarding)/more_accounts` | `app/index.tsx`, `app/(onboarding)/_layout.tsx`, `add_account.hook.ts`, `more_accounts.hook.ts` |

## Summary of removed useState/useContext

| Screen | Removed state | Replaced by |
|--------|--------------|-------------|
| `_layout` | `useState(false)` for `ready` | `useLayoutStore` |
| `currency` | `useState<Currency>` for `selected` | `useCurrencyStore` |
| `security` | `useState<SecurityChoice>` for `selected` | `useSecurityStore` |
| `add_account` | 11 `useState` calls + manual validation | RHF form + Zod schema |
| `ready` | `useState(false)` for `completing` | `useReadyStore` |
