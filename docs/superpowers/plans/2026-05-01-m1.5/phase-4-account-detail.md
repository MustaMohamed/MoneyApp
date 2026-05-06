# M1.5 Phase 4 — Account Detail Screen (U3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** TDD the local `account_detail.store.ts`, then build the full Account Detail screen — hook, animations, three sub-components, and the screen template.

**Depends on:** Phase 1 complete (account store with update/archive/adjustBalance).

**Architecture:** The screen-local store (`account_detail.store.ts`) owns non-form UI toggle state: `isEditing`, `isAdjustVisible`, `isArchiveVisible`. The hook owns async loading states (`isSaving`, `isAdjusting`, `isArchiving`) via `useState` — this is allowed in hooks; only `index.tsx` is `useState`-free. The edit form schema excludes the current account from the duplicate-name check by ID.

**Design:** Cairo Nights v7 — exact UI from Notion U3. Use design tokens from `constants/theme.ts`.

---

### Task 10: Account Detail Store (TDD)

**Files:**
- Create: `app/(app)/accounts/[id]/account_detail.store.ts`
- Create: `__tests__/account_detail.store.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/account_detail.store.test.ts`:

```typescript
import { act } from 'react';
import { create } from 'zustand';

jest.mock('zustand', () => ({ create: jest.requireActual('zustand').create }));

import { createAccountDetailStore } from '@/app/(app)/accounts/[id]/account_detail.store';

describe('accountDetailStore initial state', () => {
  it('starts with all booleans false', () => {
    const store = createAccountDetailStore();
    expect(store.getState().isEditing).toBe(false);
    expect(store.getState().isAdjustVisible).toBe(false);
    expect(store.getState().isArchiveVisible).toBe(false);
  });
});

describe('accountDetailStore.setEditing', () => {
  it('sets isEditing to true', () => {
    const store = createAccountDetailStore();
    store.getState().setEditing(true);
    expect(store.getState().isEditing).toBe(true);
  });

  it('sets isEditing back to false', () => {
    const store = createAccountDetailStore();
    store.getState().setEditing(true);
    store.getState().setEditing(false);
    expect(store.getState().isEditing).toBe(false);
  });
});

describe('accountDetailStore.setAdjustVisible', () => {
  it('toggles isAdjustVisible', () => {
    const store = createAccountDetailStore();
    store.getState().setAdjustVisible(true);
    expect(store.getState().isAdjustVisible).toBe(true);
    store.getState().setAdjustVisible(false);
    expect(store.getState().isAdjustVisible).toBe(false);
  });
});

describe('accountDetailStore.setArchiveVisible', () => {
  it('toggles isArchiveVisible', () => {
    const store = createAccountDetailStore();
    store.getState().setArchiveVisible(true);
    expect(store.getState().isArchiveVisible).toBe(true);
  });
});

describe('accountDetailStore.reset', () => {
  it('resets all state to false', () => {
    const store = createAccountDetailStore();
    store.getState().setEditing(true);
    store.getState().setAdjustVisible(true);
    store.getState().setArchiveVisible(true);
    store.getState().reset();
    expect(store.getState().isEditing).toBe(false);
    expect(store.getState().isAdjustVisible).toBe(false);
    expect(store.getState().isArchiveVisible).toBe(false);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --testPathPattern="account_detail.store" --no-coverage
```

Expected: FAIL — `Cannot find module '@/app/(app)/accounts/[id]/account_detail.store'`

- [ ] **Step 3: Create account_detail.store.ts**

Create `app/(app)/accounts/[id]/account_detail.store.ts`:

```typescript
import { create } from 'zustand';

interface AccountDetailState {
  isEditing: boolean;
  isAdjustVisible: boolean;
  isArchiveVisible: boolean;
  setEditing: (v: boolean) => void;
  setAdjustVisible: (v: boolean) => void;
  setArchiveVisible: (v: boolean) => void;
  reset: () => void;
}

export function createAccountDetailStore() {
  return create<AccountDetailState>((set) => ({
    isEditing: false,
    isAdjustVisible: false,
    isArchiveVisible: false,
    setEditing: (v) => set({ isEditing: v }),
    setAdjustVisible: (v) => set({ isAdjustVisible: v }),
    setArchiveVisible: (v) => set({ isArchiveVisible: v }),
    reset: () => set({ isEditing: false, isAdjustVisible: false, isArchiveVisible: false }),
  }));
}

export const useAccountDetailStore = createAccountDetailStore();
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm test -- --testPathPattern="account_detail.store" --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/accounts/\[id\]/account_detail.store.ts \
  __tests__/account_detail.store.test.ts
git commit -m "feat: account_detail.store — isEditing, isAdjustVisible, isArchiveVisible (TDD)"
```

---

### Task 11: Account Detail Screen (U3)

**Files:**
- Create: `app/(app)/accounts/[id]/account_detail.hook.ts`
- Create: `app/(app)/accounts/[id]/account_detail.anim.ts`
- Create: `app/(app)/accounts/[id]/components/mini_chart.tsx`
- Create: `app/(app)/accounts/[id]/components/adjust_balance_sheet.tsx`
- Create: `app/(app)/accounts/[id]/components/archive_confirmation_dialog.tsx`
- Create: `app/(app)/accounts/[id]/index.tsx`

- [ ] **Step 1: Create account_detail.hook.ts**

```typescript
import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { z } from 'zod';

import { AccountColors } from '@/constants/theme';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/store/account.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import { useAccountDetailStore } from './account_detail.store';

export function useAccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const accounts = useAccountStore((s) => s.accounts);
  const updateAccount = useAccountStore((s) => s.updateAccount);
  const archiveAccount = useAccountStore((s) => s.archiveAccount);
  const adjustBalance = useAccountStore((s) => s.adjustBalance);

  const isEditing = useAccountDetailStore((s) => s.isEditing);
  const setEditing = useAccountDetailStore((s) => s.setEditing);
  const isAdjustVisible = useAccountDetailStore((s) => s.isAdjustVisible);
  const setAdjustVisible = useAccountDetailStore((s) => s.setAdjustVisible);
  const isArchiveVisible = useAccountDetailStore((s) => s.isArchiveVisible);
  const setArchiveVisible = useAccountDetailStore((s) => s.setArchiveVisible);
  const reset = useAccountDetailStore((s) => s.reset);

  const [isSaving, setIsSaving] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  useEffect(() => () => reset(), []);

  const account = accounts.find((a) => a.id === id);

  const editSchema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .min(1, Strings.errNameRequired)
          .max(30, Strings.errNameTooLong)
          .refine(
            (n) =>
              !accounts.some(
                (a) => a.id !== id && a.name.trim().toLowerCase() === n.trim().toLowerCase(),
              ),
            { message: Strings.errNameDuplicate },
          ),
        color: z.string(),
      }),
    [accounts, id],
  );

  const form = useZodForm(editSchema, {
    defaultValues: {
      name: account?.name ?? '',
      color: account?.color ?? AccountColors[0],
    },
  });

  useEffect(() => {
    if (account) {
      form.reset({ name: account.name, color: account.color ?? AccountColors[0] });
    }
  }, [account]);

  const handleSave = form.handleSubmit(async (data) => {
    if (!id) return;
    setIsSaving(true);
    try {
      await updateAccount(id, { name: data.name.trim(), color: data.color });
      setEditing(false);
    } finally {
      setIsSaving(false);
    }
  });

  const handleAdjustBalance = async (newBalance: number) => {
    if (!id) return;
    setIsAdjusting(true);
    try {
      await adjustBalance(id, newBalance);
      setAdjustVisible(false);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleArchive = async () => {
    if (!id) return;
    setIsArchiving(true);
    try {
      await archiveAccount(id);
      setArchiveVisible(false);
      router.back();
    } finally {
      setIsArchiving(false);
    }
  };

  const onBack = () => router.back();

  return {
    account,
    form,
    isEditing,
    setEditing,
    handleSave,
    isSaving,
    isAdjustVisible,
    setAdjustVisible,
    handleAdjustBalance,
    isAdjusting,
    isArchiveVisible,
    setArchiveVisible,
    handleArchive,
    isArchiving,
    onBack,
  };
}
```

- [ ] **Step 2: Create account_detail.anim.ts**

```typescript
import {
  FadeInDown,
  FadeInUp,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export function useAccountDetailAnim() {
  const headerScale = useSharedValue(1);

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
  }));

  const triggerEditToggle = () => {
    headerScale.value = withSequence(
      withTiming(0.97, { duration: 80 }),
      withSpring(1.0, { damping: 10 }),
    );
  };

  return {
    headerStyle,
    triggerEditToggle,
    contentEntering: FadeInUp.duration(300),
    fieldEntering: FadeInDown.duration(200),
    fieldExiting: FadeOutUp.duration(150),
    errorEntering: FadeInDown.duration(150),
    errorExiting: FadeOutUp.duration(100),
  };
}
```

- [ ] **Step 3: Create components/mini_chart.tsx**

In M1.5 there are no transactions, so the chart shows a balance label and a flat visual placeholder. Phase 3 (M2) will replace this with a real chart.

```tsx
import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { formatAmount } from '@/app/(app)/(tabs)/dashboard/dashboard.helpers';
import type { Account } from '@/store/account.store';

interface MiniChartProps {
  account: Account;
}

export function MiniChart({ account }: MiniChartProps) {
  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <View style={[styles.fill, { backgroundColor: account.color ?? Colors.dark.surfaceEl }]} />
      </View>
      <Text style={styles.label}>
        {formatAmount(account.current_balance, 2)} {account.currency}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  bar: {
    height: 4,
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  fill: { width: '100%', height: '100%', borderRadius: 2 },
  label: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.headline,
    color: Colors.dark.text1,
    textAlign: 'center',
  },
});
```

- [ ] **Step 4: Create components/adjust_balance_sheet.tsx**

```tsx
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';

interface AdjustBalanceSheetProps {
  visible: boolean;
  currentBalance: number;
  currency: Currency;
  onClose: () => void;
  onSave: (newBalance: number) => void;
  isLoading: boolean;
}

export function AdjustBalanceSheet({
  visible,
  currentBalance,
  currency,
  onClose,
  onSave,
  isLoading,
}: AdjustBalanceSheetProps) {
  const [input, setInput] = useState(String(currentBalance));
  const [error, setError] = useState('');

  const handleSave = () => {
    const n = parseFloat(input);
    if (!Number.isFinite(n) || n < 0) {
      setError(Strings.errBalanceInvalid);
      return;
    }
    setError('');
    onSave(n);
  };

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>{Strings.adjustBalanceTitle}</Text>

        <Text style={styles.fieldLabel}>{Strings.adjustBalanceLabel}</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={(v) => { setInput(v); setError(''); }}
            keyboardType="decimal-pad"
            style={styles.input}
            placeholderTextColor={Colors.dark.text3}
            autoFocus
          />
          <Text style={styles.currency}>{currency}</Text>
        </View>
        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.ctaBar}>
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>{Strings.adjustBalanceCancel}</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={isLoading}
            style={[styles.savePress, isLoading && styles.disabled]}
          >
            <LinearGradient
              colors={['#C9973A', '#D4A44C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.saveGradient}
            >
              <Text style={styles.saveText}>{Strings.adjustBalanceSave}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    borderTopWidth: 1,
    borderColor: Colors.dark.border,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.dark.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.title,
    color: Colors.dark.text1,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.micro,
    color: Colors.shared.cairoGold,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  input: {
    flex: 1,
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
    backgroundColor: Colors.dark.surfaceEl,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  currency: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.dark.text2,
  },
  error: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.negative,
    marginTop: Spacing.xxs,
  },
  ctaBar: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.lg },
  cancelBtn: {
    flex: 1,
    height: Size.ctaHeight,
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.cta,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cancelText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.dark.text2,
  },
  savePress: { flex: 2, borderRadius: Radius.cta, overflow: 'hidden' },
  disabled: { opacity: 0.5 },
  saveGradient: {
    height: Size.ctaHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.cta,
  },
  saveText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.shared.midnightBlue,
  },
});
```

- [ ] **Step 5: Create components/archive_confirmation_dialog.tsx**

```tsx
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import type { Account } from '@/store/account.store';

interface ArchiveConfirmationDialogProps {
  visible: boolean;
  account: Account | undefined;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function ArchiveConfirmationDialog({
  visible,
  account,
  onClose,
  onConfirm,
  isLoading,
}: ArchiveConfirmationDialogProps) {
  const isCC = account?.type === AccountType.CreditCard;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{Strings.accountDetailArchiveTitle}</Text>
          <Text style={styles.body}>{Strings.accountDetailArchiveBody}</Text>
          {isCC && (
            <Text style={styles.warning}>{Strings.accountDetailArchiveCCWarning}</Text>
          )}
          <View style={styles.btnRow}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>{Strings.accountDetailCancel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={isLoading}
              style={[styles.archiveBtn, isLoading && styles.disabled]}
            >
              <Text style={styles.archiveText}>{Strings.accountDetailArchiveConfirm}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  dialog: {
    width: '100%',
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  title: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.title,
    color: Colors.dark.text1,
    marginBottom: Spacing.sm,
  },
  body: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text2,
    lineHeight: Type.body * 1.5,
    marginBottom: Spacing.sm,
  },
  warning: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.gold,
    marginBottom: Spacing.sm,
  },
  btnRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
  cancelBtn: {
    flex: 1,
    height: Size.ctaHeight,
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.cta,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cancelText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.dark.text2,
  },
  archiveBtn: {
    flex: 1,
    height: Size.ctaHeight,
    backgroundColor: Colors.dark.negative,
    borderRadius: Radius.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archiveText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.dark.text1,
  },
  disabled: { opacity: 0.5 },
});
```

- [ ] **Step 6: Create accounts/[id]/index.tsx**

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Controller } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountColors, Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { Strings } from '@/constants/strings';
import { useAccountDetail } from './account_detail.hook';
import { useAccountDetailAnim } from './account_detail.anim';
import { MiniChart } from './components/mini_chart';
import { AdjustBalanceSheet } from './components/adjust_balance_sheet';
import { ArchiveConfirmationDialog } from './components/archive_confirmation_dialog';

const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 };

export default function AccountDetailScreen() {
  const {
    account,
    form,
    isEditing,
    setEditing,
    handleSave,
    isSaving,
    isAdjustVisible,
    setAdjustVisible,
    handleAdjustBalance,
    isAdjusting,
    isArchiveVisible,
    setArchiveVisible,
    handleArchive,
    isArchiving,
    onBack,
  } = useAccountDetail();
  const { headerStyle, triggerEditToggle, fieldEntering, fieldExiting, errorEntering, errorExiting } =
    useAccountDetailAnim();
  const { control, formState: { errors } } = form;

  if (!account) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <Animated.View style={[styles.header, headerStyle]}>
        <Pressable onPress={onBack} style={styles.iconBtn} hitSlop={hitSlop}>
          <MaterialCommunityIcons name="chevron-left" size={Size.iconBack} color={Colors.dark.text2} />
        </Pressable>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {account.name}
        </Text>

        {isEditing ? (
          <Pressable
            onPress={() => { triggerEditToggle(); handleSave(); }}
            disabled={isSaving}
            style={[styles.iconBtn, styles.saveBtn]}
            hitSlop={hitSlop}
          >
            <Text style={styles.saveBtnText}>{Strings.accountDetailSave}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => { triggerEditToggle(); setEditing(true); }}
            style={styles.iconBtn}
            hitSlop={hitSlop}
          >
            <Text style={styles.editBtnText}>{Strings.accountDetailEdit}</Text>
          </Pressable>
        )}
      </Animated.View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Mini Chart / Balance */}
        <MiniChart account={account} />

        {/* Edit Form */}
        {isEditing && (
          <Animated.View entering={fieldEntering} exiting={fieldExiting} style={styles.editBlock}>
            {/* Name */}
            <Text style={styles.fieldLabel}>{Strings.o4SectionName}</Text>
            <Controller
              control={control}
              name="name"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  maxLength={30}
                  style={styles.input}
                  placeholderTextColor={Colors.dark.text3}
                />
              )}
            />
            {errors.name && (
              <Animated.Text entering={errorEntering} exiting={errorExiting} style={styles.error}>
                {errors.name.message}
              </Animated.Text>
            )}

            {/* Color */}
            <Text style={[styles.fieldLabel, { marginTop: Spacing.sm }]}>{Strings.o4SectionColor}</Text>
            <Controller
              control={control}
              name="color"
              render={({ field: { value, onChange } }) => (
                <View style={styles.colorRow}>
                  {AccountColors.map((c) => (
                    <Pressable key={c} onPress={() => onChange(c)} style={styles.colorDotWrap}>
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: c },
                          value === c && styles.colorDotSelected,
                        ]}
                      />
                    </Pressable>
                  ))}
                </View>
              )}
            />
          </Animated.View>
        )}

        {/* More Actions */}
        {!isEditing && (
          <View style={styles.actionsBlock}>
            <Pressable
              onPress={() => setAdjustVisible(true)}
              style={styles.actionRow}
            >
              <MaterialCommunityIcons name="pencil" size={Size.iconSm} color={Colors.dark.text2} />
              <Text style={styles.actionText}>{Strings.accountDetailAdjustBalance}</Text>
              <MaterialCommunityIcons name="chevron-right" size={Size.iconSm} color={Colors.dark.text2} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              onPress={() => setArchiveVisible(true)}
              style={styles.actionRow}
            >
              <MaterialCommunityIcons name="archive" size={Size.iconSm} color={Colors.dark.negative} />
              <Text style={[styles.actionText, styles.destructive]}>{Strings.accountDetailArchive}</Text>
              <MaterialCommunityIcons name="chevron-right" size={Size.iconSm} color={Colors.dark.negative} />
            </Pressable>
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      <AdjustBalanceSheet
        visible={isAdjustVisible}
        currentBalance={account.current_balance}
        currency={account.currency}
        onClose={() => setAdjustVisible(false)}
        onSave={handleAdjustBalance}
        isLoading={isAdjusting}
      />

      <ArchiveConfirmationDialog
        visible={isArchiveVisible}
        account={account}
        onClose={() => setArchiveVisible(false)}
        onConfirm={handleArchive}
        isLoading={isArchiving}
      />
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
  headerTitle: {
    flex: 1,
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
    textAlign: 'center',
    marginHorizontal: Spacing.xs,
  },
  iconBtn: {
    width: Size.backBtn,
    height: Size.backBtn,
    borderRadius: Spacing.sm,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: { backgroundColor: Colors.shared.cairoGold, borderColor: Colors.shared.cairoGold },
  saveBtnText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.caption,
    color: Colors.shared.midnightBlue,
  },
  editBtnText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.caption,
    color: Colors.shared.cairoGold,
  },
  scroll: { flex: 1 },
  editBlock: { marginHorizontal: Spacing.sm, marginTop: Spacing.md },
  fieldLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.micro,
    color: Colors.shared.cairoGold,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  input: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  error: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.negative,
    marginTop: Spacing.xxs,
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  colorDotWrap: { padding: Spacing.xxs },
  colorDot: { width: Size.colorDot, height: Size.colorDot, borderRadius: Size.colorDot / 2 },
  colorDotSelected: { borderWidth: 2, borderColor: Colors.shared.cairoGold, transform: [{ scale: 1.1 }] },
  actionsBlock: {
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.lg,
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  actionText: {
    flex: 1,
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  destructive: { color: Colors.dark.negative },
  divider: { height: 1, backgroundColor: Colors.dark.border, marginHorizontal: Spacing.md },
  bottomPad: { height: Spacing.xxl },
});
```

- [ ] **Step 7: Commit**

```bash
git add app/\(app\)/accounts/\[id\]/
git commit -m "feat: account detail screen U3 — edit, adjust balance, archive"
```
