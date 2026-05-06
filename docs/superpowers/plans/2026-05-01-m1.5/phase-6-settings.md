# M1.5 Phase 6 — Settings Screens (U23 + U26)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Settings Main (U23) — a pure navigation screen — and Settings Currency (U26) — which surfaces the global `useCurrencyStore` and lets the user refresh the rate or set a manual override.

**Depends on:** Phase 1 complete (currency store).

**Architecture:**
- `settings/index.tsx` — no store needed, pure navigation. `settings.hook.ts` provides navigation handlers only.
- `settings/currency/currency.store.ts` — local Zustand for `isManualPanelOpen` (the only non-form UI toggle).
- `settings/currency/currency.hook.ts` — reads global `useCurrencyStore` for data + actions; reads local store for panel toggle; owns `isFetching` and `isSaving` loading states via `useState`.
- `settings/currency/currency.anim.ts` — animation for the manual rate input panel slide-in.

**Design:** Cairo Nights v7 — Notion U23, U26.

---

### Task 14: Settings Main (U23) + Settings Currency (U26)

**Files:**
- Create: `app/(app)/settings/settings.hook.ts`
- Create: `app/(app)/settings/index.tsx`
- Create: `app/(app)/settings/currency/currency.store.ts`
- Create: `app/(app)/settings/currency/currency.hook.ts`
- Create: `app/(app)/settings/currency/currency.anim.ts`
- Create: `app/(app)/settings/currency/index.tsx`

- [ ] **Step 1: Create settings.hook.ts**

```typescript
import { useRouter } from 'expo-router';

export function useSettings() {
  const router = useRouter();

  const goToCurrency = () => router.push('/settings/currency');
  const goBack = () => router.back();

  return { goToCurrency, goBack };
}
```

- [ ] **Step 2: Create settings/index.tsx**

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { useSettings } from './settings.hook';

export default function SettingsScreen() {
  const { goToCurrency, goBack } = useSettings();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <MaterialCommunityIcons name="chevron-left" size={Size.iconBack} color="#6B7F99" />
        </Pressable>
        <Text style={styles.title}>{Strings.settingsTitle}</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.group}>
        <Pressable onPress={goToCurrency} style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons
                name="currency-usd"
                size={Size.iconSm}
                color={Colors.shared.cairoGold}
              />
            </View>
            <View>
              <Text style={styles.rowTitle}>{Strings.settingsCurrencyRow}</Text>
              <Text style={styles.rowSub}>{Strings.settingsCurrencyDesc}</Text>
            </View>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={Size.iconSm}
            color={Colors.dark.text2}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    height: Size.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
  },
  backBtn: {
    width: Size.backBtn,
    height: Size.backBtn,
    borderRadius: Spacing.sm,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
  },
  group: {
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.md,
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconBox: {
    width: Size.typeIconBox,
    height: Size.typeIconBox,
    borderRadius: Radius.sm,
    backgroundColor: Colors.dark.surfaceEl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  rowSub: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    marginTop: 2,
  },
});
```

- [ ] **Step 3: Create currency/currency.store.ts**

```typescript
import { create } from 'zustand';

interface CurrencyScreenState {
  isManualPanelOpen: boolean;
  setManualPanelOpen: (v: boolean) => void;
  reset: () => void;
}

export const useCurrencyScreenStore = create<CurrencyScreenState>((set) => ({
  isManualPanelOpen: false,
  setManualPanelOpen: (v) => set({ isManualPanelOpen: v }),
  reset: () => set({ isManualPanelOpen: false }),
}));
```

- [ ] **Step 4: Create currency/currency.hook.ts**

```typescript
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { z } from 'zod';

import { Strings } from '@/constants/strings';
import { useCurrencyStore } from '@/store/currency.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import { useCurrencyScreenStore } from './currency.store';

export function useCurrencyScreen() {
  const router = useRouter();
  const rate = useCurrencyStore((s) => s.rate);
  const lastFetched = useCurrencyStore((s) => s.lastFetched);
  const isManualOverride = useCurrencyStore((s) => s.isManualOverride);
  const fetchRate = useCurrencyStore((s) => s.fetchRate);
  const setManualRate = useCurrencyStore((s) => s.setManualRate);

  const isManualPanelOpen = useCurrencyScreenStore((s) => s.isManualPanelOpen);
  const setManualPanelOpen = useCurrencyScreenStore((s) => s.setManualPanelOpen);
  const resetStore = useCurrencyScreenStore((s) => s.reset);

  const [isFetching, setFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => () => resetStore(), []);

  const manualSchema = z.object({
    rate: z.string().refine(
      (v) => {
        const n = parseFloat(v);
        return Number.isFinite(n) && n > 0;
      },
      { message: Strings.errBalanceInvalid },
    ),
  });

  const form = useZodForm(manualSchema, {
    defaultValues: { rate: String(rate) },
  });

  const handleFetchRate = async () => {
    setFetching(true);
    try {
      await fetchRate();
    } finally {
      setFetching(false);
    }
  };

  const handleSaveManualRate = form.handleSubmit(async (data) => {
    setIsSaving(true);
    try {
      await setManualRate(parseFloat(data.rate));
      setManualPanelOpen(false);
    } finally {
      setIsSaving(false);
    }
  });

  const goBack = () => router.back();

  return {
    rate,
    lastFetched,
    isManualOverride,
    isManualPanelOpen,
    setManualPanelOpen,
    form,
    handleFetchRate,
    isFetching,
    handleSaveManualRate,
    isSaving,
    goBack,
  };
}
```

- [ ] **Step 5: Create currency/currency.anim.ts**

```typescript
import { FadeInDown, FadeOutUp } from 'react-native-reanimated';

export function useCurrencyScreenAnim() {
  return {
    panelEntering: FadeInDown.duration(250),
    panelExiting: FadeOutUp.duration(200),
  };
}
```

- [ ] **Step 6: Create currency/index.tsx**

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Controller } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { useCurrencyScreen } from './currency.hook';
import { useCurrencyScreenAnim } from './currency.anim';

export default function CurrencyScreen() {
  const {
    rate,
    lastFetched,
    isManualOverride,
    isManualPanelOpen,
    setManualPanelOpen,
    form,
    handleFetchRate,
    isFetching,
    handleSaveManualRate,
    isSaving,
    goBack,
  } = useCurrencyScreen();
  const { panelEntering, panelExiting } = useCurrencyScreenAnim();
  const { control, formState: { errors } } = form;

  const formattedDate = lastFetched
    ? new Date(lastFetched).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : Strings.currencyNeverFetched;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <MaterialCommunityIcons name="chevron-left" size={Size.iconBack} color="#6B7F99" />
        </Pressable>
        <Text style={styles.title}>{Strings.currencyScreenTitle}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Current Rate Card */}
        <View style={styles.rateCard}>
          <Text style={styles.rateLabel}>{Strings.currencyRateLabel}</Text>
          <Text style={styles.rateValue}>{rate.toFixed(2)}</Text>
          <Text style={styles.rateSub}>{Strings.currencyRateSub}</Text>
          {isManualOverride && (
            <View style={styles.manualBadge}>
              <Text style={styles.manualBadgeText}>{Strings.currencyManualLabel}</Text>
            </View>
          )}
          <Text style={styles.fetchedAt}>
            {Strings.currencyLastFetched}: {formattedDate}
          </Text>
        </View>

        {/* Refresh Rate */}
        <Pressable
          onPress={handleFetchRate}
          disabled={isFetching}
          style={[styles.refreshBtn, isFetching && styles.disabled]}
        >
          <MaterialCommunityIcons
            name={isFetching ? 'loading' : 'refresh'}
            size={Size.iconSm}
            color={Colors.shared.cairoGold}
          />
          <Text style={styles.refreshText}>{Strings.currencyFetchCta}</Text>
        </Pressable>

        {/* Manual Override Toggle */}
        <Pressable
          onPress={() => setManualPanelOpen(!isManualPanelOpen)}
          style={styles.manualToggleRow}
        >
          <View>
            <Text style={styles.manualLabel}>{Strings.currencyManualLabel}</Text>
            <Text style={styles.manualSub}>{Strings.currencyManualSub}</Text>
          </View>
          <MaterialCommunityIcons
            name={isManualPanelOpen ? 'chevron-up' : 'chevron-down'}
            size={Size.iconSm}
            color={Colors.dark.text2}
          />
        </Pressable>

        {/* Manual Rate Input Panel */}
        {isManualPanelOpen && (
          <Animated.View entering={panelEntering} exiting={panelExiting} style={styles.manualPanel}>
            <Text style={styles.fieldLabel}>{Strings.currencyRateLabel}</Text>
            <Controller
              control={control}
              name="rate"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="decimal-pad"
                  style={styles.input}
                  placeholderTextColor={Colors.dark.text3}
                />
              )}
            />
            {errors.rate && (
              <Text style={styles.error}>{errors.rate.message}</Text>
            )}
            <Pressable
              onPress={handleSaveManualRate}
              disabled={isSaving}
              style={[styles.savePress, isSaving && styles.disabled]}
            >
              <LinearGradient
                colors={['#C9973A', '#D4A44C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveGradient}
              >
                <Text style={styles.saveText}>{Strings.currencySaveCta}</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark.bg },
  header: { height: Size.headerHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.sm },
  backBtn: { width: Size.backBtn, height: Size.backBtn, borderRadius: Spacing.sm, backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FontFamily.soraBold, fontSize: Type.subhead, color: Colors.dark.text1 },
  scroll: { flex: 1 },
  rateCard: { marginHorizontal: Spacing.sm, marginTop: Spacing.md, backgroundColor: Colors.dark.surface, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.dark.border },
  rateLabel: { fontFamily: FontFamily.interMedium, fontSize: Type.caption, color: Colors.dark.text2, letterSpacing: 0.5, marginBottom: Spacing.xs },
  rateValue: { fontFamily: FontFamily.soraBold, fontSize: Type.hero, color: Colors.dark.gold },
  rateSub: { fontFamily: FontFamily.interRegular, fontSize: Type.caption, color: Colors.dark.text2, marginTop: Spacing.xxs },
  manualBadge: { alignSelf: 'flex-start', marginTop: Spacing.xs, backgroundColor: Colors.dark.surfaceEl, borderRadius: Radius.pill, paddingVertical: Spacing.xxs, paddingHorizontal: Spacing.xs, borderWidth: 1, borderColor: Colors.shared.cairoGold },
  manualBadgeText: { fontFamily: FontFamily.soraSemi, fontSize: Type.micro, color: Colors.shared.cairoGold },
  fetchedAt: { fontFamily: FontFamily.interRegular, fontSize: Type.micro, color: Colors.dark.text2, marginTop: Spacing.sm },
  refreshBtn: { marginHorizontal: Spacing.sm, marginTop: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.dark.surface, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border },
  refreshText: { fontFamily: FontFamily.interMedium, fontSize: Type.body, color: Colors.shared.cairoGold },
  manualToggleRow: { marginHorizontal: Spacing.sm, marginTop: Spacing.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.dark.surface, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border },
  manualLabel: { fontFamily: FontFamily.interMedium, fontSize: Type.body, color: Colors.dark.text1 },
  manualSub: { fontFamily: FontFamily.interRegular, fontSize: Type.caption, color: Colors.dark.text2, marginTop: 2 },
  manualPanel: { marginHorizontal: Spacing.sm, marginTop: Spacing.xs, backgroundColor: Colors.dark.surface, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border },
  fieldLabel: { fontFamily: FontFamily.soraBold, fontSize: Type.micro, color: Colors.shared.cairoGold, letterSpacing: 1, marginBottom: Spacing.xs },
  input: { fontFamily: FontFamily.soraSemi, fontSize: Type.body, color: Colors.dark.text1, backgroundColor: Colors.dark.surfaceEl, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: Radius.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm },
  error: { fontFamily: FontFamily.interRegular, fontSize: Type.caption, color: Colors.dark.negative, marginTop: Spacing.xxs },
  savePress: { marginTop: Spacing.md, borderRadius: Radius.cta, overflow: 'hidden' },
  disabled: { opacity: 0.5 },
  saveGradient: { height: Size.ctaHeight, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.cta },
  saveText: { fontFamily: FontFamily.soraBold, fontSize: Type.bodyStrong, color: Colors.shared.midnightBlue },
  bottomPad: { height: Spacing.xxl },
});
```

- [ ] **Step 7: Commit**

```bash
git add app/\(app\)/settings/
git commit -m "feat: settings main U23 + settings currency U26 — manual override, fetch rate"
```
