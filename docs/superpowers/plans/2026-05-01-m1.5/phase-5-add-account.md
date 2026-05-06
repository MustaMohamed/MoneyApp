# M1.5 Phase 5 — Add Account Screen (U4) + Empty States

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Add Account screen (U4) in the main app using the shared schema from Phase 1, copy the TypePill component, and create the global Empty States component used by Dashboard and all placeholder tabs.

**Depends on:** Phase 1 complete (shared schema at `utils/schemas/add_account.schema.ts`).

**Architecture:** `add_account.hook.ts` reuses `createAddAccountSchema` from `utils/schemas/`. After save it calls `router.back()` — no onboarding step tracking. The `type_pill.tsx` is copied (not imported) from the onboarding screen to avoid cross-folder coupling. `EmptyState` is global (`components/empty_states/`) used by Dashboard (variant `"accounts"`) and placeholder tabs.

**Design:** Cairo Nights v7 — U4 in Notion.

---

### Task 12: Add Account Screen (U4)

**Files:**
- Create: `app/(app)/accounts/add_account/add_account.hook.ts`
- Create: `app/(app)/accounts/add_account/add_account.anim.ts`
- Create: `app/(app)/accounts/add_account/components/type_pill.tsx`
- Create: `app/(app)/accounts/add_account/index.tsx`

- [ ] **Step 1: Create add_account.hook.ts**

```typescript
import { useMemo } from 'react';
import { useRouter } from 'expo-router';

import { AccountColors } from '@/constants/theme';
import { AccountType, Currency } from '@/constants/enums';
import { useAccountStore } from '@/store/account.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import {
  createAddAccountSchema,
  type AddAccountFormData,
} from '@/utils/schemas/add_account.schema';

export function useAddAccountApp() {
  const router = useRouter();
  const accounts = useAccountStore((s) => s.accounts);
  const addAccount = useAccountStore((s) => s.addAccount);

  const schema = useMemo(() => createAddAccountSchema(accounts), [accounts]);

  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      balance: '',
      selected_type: AccountType.Bank,
      selected_color: AccountColors[0],
      currency: Currency.EGP,
      interest_tracking: false,
      credit_limit: '',
      apr: '',
      revolving_balance: '',
      min_payment: '',
      due_day: '',
    },
  });

  const onSubmit = async (data: AddAccountFormData) => {
    const isCC = data.selected_type === AccountType.CreditCard;
    await addAccount({
      name: data.name.trim(),
      type: data.selected_type,
      currency: data.currency,
      opening_balance: parseFloat(data.balance),
      color: data.selected_color,
      interest_tracking: (data.interest_tracking ? 1 : 0) as 0 | 1,
      sort_order: accounts.length,
      credit_limit: isCC && data.credit_limit?.trim() ? parseFloat(data.credit_limit) : null,
      revolving_balance:
        isCC && data.revolving_balance?.trim() ? parseFloat(data.revolving_balance) || 0 : null,
      minimum_payment: isCC && data.min_payment?.trim() ? parseFloat(data.min_payment) : null,
      statement_due_day: isCC && data.due_day?.trim() ? parseInt(data.due_day, 10) : null,
      apr:
        isCC && data.interest_tracking && data.apr?.trim() ? parseFloat(data.apr) : null,
    });
    router.back();
  };

  const onBack = () => router.back();

  return { form, handleSave: form.handleSubmit(onSubmit), onBack };
}
```

- [ ] **Step 2: Create add_account.anim.ts**

This is identical to the onboarding version — same hook, copied to avoid cross-folder coupling:

```typescript
import {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export function useAddAccountAnim() {
  const btnScale = useSharedValue(1);

  const btnAnim = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const triggerBtnPress = () => {
    btnScale.value = withSequence(
      withTiming(0.97, { duration: 80 }),
      withSpring(1.0, { damping: 10 }),
    );
  };

  return {
    btnAnim,
    triggerBtnPress,
    ccEntering: FadeInDown.duration(250),
    ccExiting: FadeOutUp.duration(200),
    aprEntering: FadeInDown.duration(200),
    aprExiting: FadeOutUp.duration(150),
    errorEntering: FadeInDown.duration(150),
    errorExiting: FadeOutUp.duration(100),
  };
}

export function useTypePillAnim() {
  const scale = useSharedValue(1);

  const pillAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const triggerPillTap = () => {
    scale.value = withSequence(
      withSpring(1.03, { damping: 8, stiffness: 200 }),
      withSpring(1.0, { damping: 12 }),
    );
  };

  return { pillAnim, triggerPillTap };
}
```

- [ ] **Step 3: Create components/type_pill.tsx**

Copied from `app/(onboarding)/add_account/components/type_pill.tsx` — same component, import path updated to use the co-located anim file:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { Strings } from '@/constants/strings';
import { AccountType } from '@/constants/enums';
import { useTypePillAnim } from '../add_account.anim';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export type TypeOption = {
  type: AccountType;
  icon: IconName;
  label: string;
  fullWidth?: boolean;
};

export const TYPE_OPTIONS: TypeOption[] = [
  { type: AccountType.Bank, icon: 'bank', label: Strings.typeBank },
  { type: AccountType.SmartWallet, icon: 'cellphone-nfc', label: Strings.typeSmartWallet },
  { type: AccountType.PhysicalWallet, icon: 'wallet', label: Strings.typePhysicalWallet },
  { type: AccountType.PhysicalSavings, icon: 'piggy-bank', label: Strings.typePhysicalSavings },
  { type: AccountType.CreditCard, icon: 'credit-card', label: Strings.typeCreditCard, fullWidth: true },
];

export function TypePill({
  option,
  isSelected,
  onSelect,
}: {
  option: TypeOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { pillAnim, triggerPillTap } = useTypePillAnim();
  const iconColor = isSelected ? '#C9973A' : '#6B7F99';

  return (
    <Animated.View
      style={[
        styles.wrap,
        option.fullWidth ? styles.full : styles.half,
        pillAnim,
      ]}
    >
      <Pressable
        onPress={() => { triggerPillTap(); onSelect(); }}
        style={[styles.pill, isSelected ? styles.active : styles.inactive]}
      >
        <MaterialCommunityIcons name={option.icon} size={Size.iconSm} color={iconColor} />
        <Text style={[styles.label, { color: iconColor }]}>{option.label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: Radius.md },
  half: { width: '48.5%' },
  full: { width: '100%' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  active: { borderColor: '#C9973A', backgroundColor: 'rgba(201,151,58,0.08)' },
  inactive: { borderColor: '#2A3A4F', backgroundColor: '#1A2535' },
  label: { fontFamily: FontFamily.soraBold, fontSize: Type.body },
});
```

- [ ] **Step 4: Create add_account/index.tsx**

Same UI as the onboarding version but no `ProgressDots`, uses `Strings.u4Title` / `Strings.u4Cta`, and back button uses `router.back()`:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Controller, useWatch } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Strings } from '@/constants/strings';
import {
  AccountColors,
  FontFamily,
  Radius,
  Size,
  Spacing,
  TouchSize,
  Type,
} from '@/constants/theme';
import { AccountType, Currency } from '@/constants/enums';
import { useAddAccountApp } from './add_account.hook';
import { useAddAccountAnim } from './add_account.anim';
import { TypePill, TYPE_OPTIONS } from './components/type_pill';

const CURRENCY_OPTIONS: Currency[] = [Currency.EGP, Currency.USD];

const hitSlop = {
  top: TouchSize.min / 4,
  bottom: TouchSize.min / 4,
  left: TouchSize.min / 4,
  right: TouchSize.min / 4,
};

export default function AddAccountAppScreen() {
  const { form, handleSave, onBack } = useAddAccountApp();
  const {
    btnAnim,
    triggerBtnPress,
    ccEntering,
    ccExiting,
    aprEntering,
    aprExiting,
    errorEntering,
    errorExiting,
  } = useAddAccountAnim();
  const { control, formState: { errors, isSubmitting } } = form;
  const selectedType = useWatch({ control, name: 'selected_type' });
  const selectedColor = useWatch({ control, name: 'selected_color' });
  const selectedCurrency = useWatch({ control, name: 'currency' });
  const interestTracking = useWatch({ control, name: 'interest_tracking' });
  const isCreditCard = selectedType === AccountType.CreditCard;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.back} hitSlop={hitSlop}>
          <MaterialCommunityIcons name="chevron-left" size={Size.iconBack} color="#6B7F99" />
        </Pressable>
        <Text style={styles.headerTitle}>{Strings.u4Title}</Text>
        <View style={styles.back} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
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
          {errors.name && (
            <Animated.Text entering={errorEntering} exiting={errorExiting} style={styles.errorText}>
              {errors.name.message}
            </Animated.Text>
          )}
        </View>

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
                <Text style={[styles.currencyText, { color: selectedCurrency === code ? '#C9973A' : '#6B7F99' }]}>
                  {code === Currency.EGP ? Strings.currencyEGPCode : Strings.currencyUSDCode}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

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
          {errors.balance && (
            <Animated.Text entering={errorEntering} exiting={errorExiting} style={styles.errorText}>
              {errors.balance.message}
            </Animated.Text>
          )}
        </View>

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

        {isCreditCard && (
          <Animated.View entering={ccEntering} exiting={ccExiting} style={styles.ccBlock}>
            <View style={styles.fieldGroup}>
              <Text style={styles.sectionLabel}>{Strings.o4SectionRevolving}</Text>
              <Controller
                control={control}
                name="revolving_balance"
                render={({ field: { value, onChange } }) => (
                  <TextInput value={value} onChangeText={onChange} placeholder={Strings.o4RevolvingPlaceholder} placeholderTextColor="#4A5568" keyboardType="decimal-pad" style={styles.input} />
                )}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.sectionLabel}>{Strings.o4SectionLimit}</Text>
              <Controller
                control={control}
                name="credit_limit"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput value={value} onChangeText={onChange} onBlur={onBlur} placeholder={Strings.o4CreditLimitPlaceholder} placeholderTextColor="#4A5568" keyboardType="decimal-pad" style={styles.input} />
                )}
              />
              {errors.credit_limit && (
                <Animated.Text entering={errorEntering} exiting={errorExiting} style={styles.errorText}>
                  {errors.credit_limit.message}
                </Animated.Text>
              )}
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.sectionLabel}>{Strings.o4SectionMinPayment}</Text>
              <Controller control={control} name="min_payment" render={({ field: { value, onChange } }) => (<TextInput value={value} onChangeText={onChange} placeholder={Strings.o4MinPaymentPlaceholder} placeholderTextColor="#4A5568" keyboardType="decimal-pad" style={styles.input} />)} />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.sectionLabel}>{Strings.o4SectionDueDay}</Text>
              <Controller control={control} name="due_day" render={({ field: { value, onChange } }) => (<TextInput value={value} onChangeText={onChange} placeholder={Strings.o4DueDayPlaceholder} placeholderTextColor="#4A5568" keyboardType="number-pad" maxLength={2} style={styles.input} />)} />
            </View>
            <View style={[styles.fieldGroup, styles.interestRow]}>
              <Text style={styles.interestLabel}>{Strings.o4InterestLabel}</Text>
              <Pressable onPress={() => form.setValue('interest_tracking', !interestTracking)} style={[styles.togglePill, interestTracking ? styles.pillActive : styles.pillInactive]}>
                <Text style={[styles.toggleText, { color: interestTracking ? '#C9973A' : '#6B7F99' }]}>{interestTracking ? Strings.o4InterestOn : Strings.o4InterestOff}</Text>
              </Pressable>
            </View>
            {interestTracking && (
              <Animated.View entering={aprEntering} exiting={aprExiting} style={styles.fieldGroup}>
                <Text style={styles.sectionLabel}>{Strings.o4SectionApr}</Text>
                <Controller control={control} name="apr" render={({ field: { value, onChange, onBlur } }) => (<TextInput value={value} onChangeText={onChange} onBlur={onBlur} placeholder={Strings.o4AprPlaceholder} placeholderTextColor="#4A5568" keyboardType="decimal-pad" style={styles.input} />)} />
                {errors.apr && (
                  <Animated.Text entering={errorEntering} exiting={errorExiting} style={styles.errorText}>{errors.apr.message}</Animated.Text>
                )}
              </Animated.View>
            )}
          </Animated.View>
        )}
      </ScrollView>

      <View style={styles.ctaBar}>
        <Animated.View style={btnAnim}>
          <Pressable
            onPress={() => { triggerBtnPress(); handleSave(); }}
            disabled={isSubmitting}
            style={[styles.ctaPress, isSubmitting && styles.ctaPressDisabled]}
          >
            <LinearGradient colors={['#C9973A', '#D4A44C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
              <Text style={styles.ctaText}>{Strings.u4Cta}</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F1923' },
  header: { height: Size.headerHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.sm },
  back: { width: Size.backBtn, height: Size.backBtn, borderRadius: Spacing.sm, backgroundColor: '#1A2535', borderWidth: 1, borderColor: '#2A3A4F', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FontFamily.soraBold, fontSize: Type.subhead, color: '#F0EBE3' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.sm, paddingBottom: Spacing.md },
  sectionLabel: { fontFamily: FontFamily.soraBold, fontSize: Type.micro, color: '#C9973A', letterSpacing: 1, paddingTop: Spacing.xs, paddingBottom: Spacing.xs },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  pillActive: { borderColor: '#C9973A', backgroundColor: 'rgba(201,151,58,0.08)' },
  pillInactive: { borderColor: '#2A3A4F', backgroundColor: '#1A2535' },
  fieldGroup: { paddingTop: Spacing.xxs },
  input: { fontFamily: FontFamily.soraSemi, fontSize: Type.body, color: '#F0EBE3', backgroundColor: '#1A2535', borderWidth: 1, borderColor: '#2A3A4F', borderRadius: Radius.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm },
  currencyRow: { flexDirection: 'row', gap: Spacing.xs },
  currencyPill: { flex: 1, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, borderRadius: Radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  currencyText: { fontFamily: FontFamily.soraBold, fontSize: Type.body },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  colorDotWrap: { padding: Spacing.xxs },
  colorDot: { width: Size.colorDot, height: Size.colorDot, borderRadius: Size.colorDot / 2 },
  colorDotSelected: { borderWidth: 2, borderColor: '#C9973A', transform: [{ scale: 1.1 }] },
  ccBlock: { paddingTop: Spacing.xxs },
  interestRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.sm },
  interestLabel: { fontFamily: FontFamily.interSemi, fontSize: Type.body, color: '#F0EBE3' },
  togglePill: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, borderRadius: Radius.md, borderWidth: 1.5, minWidth: Size.backBtn + Spacing.xs, alignItems: 'center' },
  toggleText: { fontFamily: FontFamily.soraBold, fontSize: Type.caption, letterSpacing: 0.5 },
  ctaBar: { borderTopWidth: 1, borderTopColor: '#1A2535', paddingTop: Spacing.xs, paddingHorizontal: Spacing.sm, paddingBottom: Spacing.md },
  ctaPress: { width: '100%', borderRadius: Radius.cta, overflow: 'hidden' },
  ctaPressDisabled: { opacity: 0.5 },
  cta: { height: Size.ctaHeight, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.cta },
  ctaText: { fontFamily: FontFamily.soraBold, fontSize: Type.bodyStrong, color: '#1B2B4B' },
  errorText: { color: '#E05A42', fontFamily: FontFamily.interRegular, fontSize: Type.caption, marginTop: Spacing.xxs },
});
```

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/accounts/add_account/
git commit -m "feat: add account screen U4 — reuses shared schema, navigates back on save"
```

---

### Task 13: Empty States Global Component

**Files:**
- Create: `components/empty_states/index.tsx`
- Modify: `app/(app)/(tabs)/transactions/index.tsx`
- Modify: `app/(app)/(tabs)/bills/index.tsx`
- Modify: `app/(app)/(tabs)/goals/index.tsx`
- Modify: `app/(app)/(tabs)/budget/index.tsx`

- [ ] **Step 1: Create components/empty_states/index.tsx**

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';

export type EmptyStateVariant =
  | 'accounts'
  | 'transactions'
  | 'bills'
  | 'goals'
  | 'budget';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const VARIANT_CONFIG: Record<
  EmptyStateVariant,
  { icon: IconName; title: string; sub: string }
> = {
  accounts: {
    icon: 'bank-outline',
    title: Strings.emptyAccountsTitle,
    sub: Strings.emptyAccountsSub,
  },
  transactions: {
    icon: 'swap-horizontal',
    title: Strings.emptyTransactionsTitle,
    sub: Strings.emptyTransactionsSub,
  },
  bills: {
    icon: 'calendar-clock-outline',
    title: Strings.emptyBillsTitle,
    sub: Strings.emptyBillsSub,
  },
  goals: {
    icon: 'target',
    title: Strings.emptyGoalsTitle,
    sub: Strings.emptyGoalsSub,
  },
  budget: {
    icon: 'chart-pie',
    title: Strings.emptyBudgetTitle,
    sub: Strings.emptyBudgetSub,
  },
};

interface EmptyStateProps {
  variant: EmptyStateVariant;
  onAction?: () => void;
}

export function EmptyState({ variant, onAction }: EmptyStateProps) {
  const config = VARIANT_CONFIG[variant];

  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons
          name={config.icon}
          size={Size.iconHero}
          color={Colors.dark.text2}
        />
      </View>
      <Text style={styles.title}>{config.title}</Text>
      <Text style={styles.sub}>{config.sub}</Text>
      {onAction && (
        <Pressable onPress={onAction} style={styles.ctaPress}>
          <LinearGradient
            colors={['#C9973A', '#D4A44C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>Add Account</Text>
          </LinearGradient>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.sm,
  },
  iconBox: {
    width: Size.iconHero * 1.5,
    height: Size.iconHero * 1.5,
    borderRadius: Size.iconHero * 0.75,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.title,
    color: Colors.dark.text1,
    textAlign: 'center',
  },
  sub: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text2,
    textAlign: 'center',
    lineHeight: Type.body * 1.6,
  },
  ctaPress: {
    width: '100%',
    borderRadius: Radius.cta,
    overflow: 'hidden',
    marginTop: Spacing.md,
  },
  cta: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.cta,
  },
  ctaText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.shared.midnightBlue,
  },
});
```

- [ ] **Step 2: Update placeholder tab screens to use EmptyState**

Replace `app/(app)/(tabs)/transactions/index.tsx`:

```tsx
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/empty_states';
import { Colors } from '@/constants/theme';

export default function TransactionsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <EmptyState variant="transactions" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark.bg },
});
```

Replace `app/(app)/(tabs)/bills/index.tsx` — same structure, `variant="bills"`.
Replace `app/(app)/(tabs)/goals/index.tsx` — same structure, `variant="goals"`.
Replace `app/(app)/(tabs)/budget/index.tsx` — same structure, `variant="budget"`.

- [ ] **Step 3: Commit**

```bash
git add components/empty_states/ \
  app/\(app\)/\(tabs\)/transactions/index.tsx \
  app/\(app\)/\(tabs\)/bills/index.tsx \
  app/\(app\)/\(tabs\)/goals/index.tsx \
  app/\(app\)/\(tabs\)/budget/index.tsx
git commit -m "feat: EmptyState component + wire into placeholder tabs"
```
