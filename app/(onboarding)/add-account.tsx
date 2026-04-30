import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressDots } from '@/components/progress_dots';
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
import { type AccountType, useAccountStore } from '@/store/account_store';
import { type Currency, useOnboardingStore } from '@/store/onboarding_store';
import { backOrReplace } from '@/utils/onboarding_nav';
import { validateAccountForm, type FieldErrors } from '@/utils/validation';

const hitSlop = {
  top: TouchSize.min / 4,
  bottom: TouchSize.min / 4,
  left: TouchSize.min / 4,
  right: TouchSize.min / 4,
};

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type TypeOption = {
  type: AccountType;
  icon: IconName;
  label: string;
  fullWidth?: boolean;
};

const TYPE_OPTIONS: TypeOption[] = [
  { type: 'bank', icon: 'bank', label: Strings.typeBank },
  { type: 'smart_wallet', icon: 'cellphone-nfc', label: Strings.typeSmartWallet },
  { type: 'physical_wallet', icon: 'wallet', label: Strings.typePhysicalWallet },
  { type: 'physical_savings', icon: 'piggy-bank', label: Strings.typePhysicalSavings },
  { type: 'credit_card', icon: 'credit-card', label: Strings.typeCreditCard, fullWidth: true },
];

const CURRENCY_OPTIONS: Currency[] = ['EGP', 'USD'];

export default function AddAccountScreen() {
  const router = useRouter();
  const { isAddingMore } = useLocalSearchParams<{ isAddingMore?: string }>();

  const accounts = useAccountStore((s) => s.accounts);
  const addAccount = useAccountStore((s) => s.addAccount);
  const setStep = useOnboardingStore((s) => s.setStep);

  const [selectedType, setSelectedType] = useState<AccountType>('bank');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<Currency>('EGP');
  const [balance, setBalance] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(AccountColors[0]);
  const [revolvingBalance, setRevolvingBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [minPayment, setMinPayment] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [interestTracking, setInterestTracking] = useState(false);
  const [apr, setApr] = useState('');

  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const isCreditCard = selectedType === 'credit_card';
  const ctaDisabled =
    saving ||
    name.trim() === '' ||
    balance.trim() === '' ||
    (isCreditCard && creditLimit.trim() === '');

  const btnScale = useSharedValue(1);
  const btnAnim = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  // Load accounts on mount so the duplicate-name check works on first entry.
  useEffect(() => {
    useAccountStore.getState().loadAccounts();
  }, []);

  const clearError = (key: keyof FieldErrors) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = async () => {
    if (saving) return;

    btnScale.value = withSequence(
      withTiming(0.97, { duration: 80 }),
      withSpring(1.0, { damping: 10 }),
    );

    const validationErrors = validateAccountForm(
      { name, balance, type: selectedType, creditLimit, interestTracking, apr },
      accounts,
    );

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSaving(true);

    try {
      const isCC = selectedType === 'credit_card';
      const accountData = {
        name: name.trim(),
        type: selectedType,
        currency,
        opening_balance: parseFloat(balance),
        current_balance: parseFloat(balance),
        color: selectedColor,
        interest_tracking: (interestTracking ? 1 : 0) as 0 | 1,
        is_archived: 0 as const,
        sort_order: accounts.length,
        credit_limit: isCC ? parseFloat(creditLimit) : null,
        revolving_balance: isCC ? parseFloat(revolvingBalance) || 0 : null,
        minimum_payment: isCC && minPayment ? parseFloat(minPayment) : null,
        statement_due_day: isCC && dueDay ? parseInt(dueDay, 10) : null,
        apr: isCC && interestTracking && apr ? parseFloat(apr) : null,
      };

      await addAccount(accountData);

      if (isAddingMore) {
        backOrReplace(router, '/(onboarding)/more-accounts');
      } else {
        await setStep('O5');
        router.push('/(onboarding)/more-accounts');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            backOrReplace(
              router,
              isAddingMore ? '/(onboarding)/more-accounts' : '/(onboarding)/security',
            )
          }
          style={styles.back}
          hitSlop={hitSlop}
        >
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
              onSelect={() => setSelectedType(opt.type)}
            />
          ))}
        </View>

        {/* Account Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.sectionLabel}>{Strings.o4SectionName}</Text>
          <TextInput
            value={name}
            onChangeText={(text) => {
              setName(text);
              clearError('name');
            }}
            placeholder={Strings.o4NamePlaceholder}
            placeholderTextColor="#4A5568"
            maxLength={30}
            style={styles.input}
          />
          {errors.name ? (
            <Animated.Text
              entering={FadeInDown.duration(150)}
              exiting={FadeOutUp.duration(100)}
              style={styles.errorText}
            >
              {errors.name}
            </Animated.Text>
          ) : null}
        </View>

        {/* Currency */}
        <View style={styles.fieldGroup}>
          <Text style={styles.sectionLabel}>{Strings.o4SectionCurrency}</Text>
          <View style={styles.currencyRow}>
            {CURRENCY_OPTIONS.map((code) => {
              const isSelected = currency === code;
              return (
                <Pressable
                  key={code}
                  onPress={() => setCurrency(code)}
                  style={[
                    styles.currencyPill,
                    isSelected ? styles.pillActive : styles.pillInactive,
                  ]}
                >
                  <Text
                    style={[styles.currencyText, { color: isSelected ? '#C9973A' : '#6B7F99' }]}
                  >
                    {code === 'EGP' ? Strings.currencyEGPCode : Strings.currencyUSDCode}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Balance */}
        <View style={styles.fieldGroup}>
          <Text style={styles.sectionLabel}>{Strings.o4SectionBalance}</Text>
          <TextInput
            value={balance}
            onChangeText={(text) => {
              setBalance(text);
              clearError('balance');
            }}
            placeholder={Strings.o4BalancePlaceholder}
            placeholderTextColor="#4A5568"
            keyboardType="decimal-pad"
            style={styles.input}
          />
          {errors.balance ? (
            <Animated.Text
              entering={FadeInDown.duration(150)}
              exiting={FadeOutUp.duration(100)}
              style={styles.errorText}
            >
              {errors.balance}
            </Animated.Text>
          ) : null}
        </View>

        {/* Color presets */}
        <View style={styles.fieldGroup}>
          <Text style={styles.sectionLabel}>{Strings.o4SectionColor}</Text>
          <View style={styles.colorRow}>
            {AccountColors.map((color) => {
              const isSelected = selectedColor === color;
              return (
                <Pressable
                  key={color}
                  onPress={() => setSelectedColor(color)}
                  style={styles.colorDotWrap}
                >
                  <View
                    style={[
                      styles.colorDot,
                      { backgroundColor: color },
                      isSelected && styles.colorDotSelected,
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* CC conditional fields */}
        {isCreditCard && (
          <Animated.View
            entering={FadeInDown.duration(250)}
            exiting={FadeOutUp.duration(200)}
            style={styles.ccBlock}
          >
            <View style={styles.fieldGroup}>
              <Text style={styles.sectionLabel}>{Strings.o4SectionRevolving}</Text>
              <TextInput
                value={revolvingBalance}
                onChangeText={setRevolvingBalance}
                placeholder={Strings.o4RevolvingPlaceholder}
                placeholderTextColor="#4A5568"
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.sectionLabel}>{Strings.o4SectionLimit}</Text>
              <TextInput
                value={creditLimit}
                onChangeText={(text) => {
                  setCreditLimit(text);
                  clearError('creditLimit');
                }}
                placeholder={Strings.o4CreditLimitPlaceholder}
                placeholderTextColor="#4A5568"
                keyboardType="decimal-pad"
                style={styles.input}
              />
              {errors.creditLimit ? (
                <Animated.Text
                  entering={FadeInDown.duration(150)}
                  exiting={FadeOutUp.duration(100)}
                  style={styles.errorText}
                >
                  {errors.creditLimit}
                </Animated.Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.sectionLabel}>{Strings.o4SectionMinPayment}</Text>
              <TextInput
                value={minPayment}
                onChangeText={setMinPayment}
                placeholder={Strings.o4MinPaymentPlaceholder}
                placeholderTextColor="#4A5568"
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.sectionLabel}>{Strings.o4SectionDueDay}</Text>
              <TextInput
                value={dueDay}
                onChangeText={setDueDay}
                placeholder={Strings.o4DueDayPlaceholder}
                placeholderTextColor="#4A5568"
                keyboardType="number-pad"
                maxLength={2}
                style={styles.input}
              />
            </View>

            <View style={[styles.fieldGroup, styles.interestRow]}>
              <Text style={styles.interestLabel}>{Strings.o4InterestLabel}</Text>
              <Pressable
                onPress={() => setInterestTracking((v) => !v)}
                style={[
                  styles.togglePill,
                  interestTracking ? styles.pillActive : styles.pillInactive,
                ]}
              >
                <Text
                  style={[styles.toggleText, { color: interestTracking ? '#C9973A' : '#6B7F99' }]}
                >
                  {interestTracking ? Strings.o4InterestOn : Strings.o4InterestOff}
                </Text>
              </Pressable>
            </View>

            {interestTracking && (
              <Animated.View
                entering={FadeInDown.duration(200)}
                exiting={FadeOutUp.duration(150)}
                style={styles.fieldGroup}
              >
                <Text style={styles.sectionLabel}>{Strings.o4SectionApr}</Text>
                <TextInput
                  value={apr}
                  onChangeText={(text) => {
                    setApr(text);
                    clearError('apr');
                  }}
                  placeholder={Strings.o4AprPlaceholder}
                  placeholderTextColor="#4A5568"
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
                {errors.apr ? (
                  <Animated.Text
                    entering={FadeInDown.duration(150)}
                    exiting={FadeOutUp.duration(100)}
                    style={styles.errorText}
                  >
                    {errors.apr}
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
            onPress={handleSave}
            disabled={ctaDisabled}
            style={[styles.ctaPress, ctaDisabled && styles.ctaPressDisabled]}
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
  );
}

function TypePill({
  option,
  isSelected,
  onSelect,
}: {
  option: TypeOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const scale = useSharedValue(1);

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(1.03, { damping: 8, stiffness: 200 }),
      withSpring(1.0, { damping: 12 }),
    );
    onSelect();
  };

  const pillAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconColor = isSelected ? '#C9973A' : '#6B7F99';

  return (
    <Animated.View
      style={[
        styles.typePillWrap,
        option.fullWidth ? styles.typePillFull : styles.typePillHalf,
        pillAnim,
      ]}
    >
      <Pressable
        onPress={handlePress}
        style={[styles.typePill, isSelected ? styles.pillActive : styles.pillInactive]}
      >
        <MaterialCommunityIcons name={option.icon} size={Size.iconSm} color={iconColor} />
        <Text style={[styles.typePillText, { color: iconColor }]}>{option.label}</Text>
      </Pressable>
    </Animated.View>
  );
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
    width: Size.backBtn,
    height: Size.backBtn,
    borderRadius: Spacing.sm,
    backgroundColor: '#1A2535',
    borderWidth: 1,
    borderColor: '#2A3A4F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: '#F0EBE3',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.sm, paddingBottom: Spacing.md },
  sectionLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.micro,
    color: '#C9973A',
    letterSpacing: 1,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
    paddingHorizontal: 0,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  typePillWrap: {
    borderRadius: Radius.md,
  },
  typePillHalf: {
    width: '48.5%',
  },
  typePillFull: {
    width: '100%',
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  pillActive: {
    borderColor: '#C9973A',
    backgroundColor: 'rgba(201,151,58,0.08)',
  },
  pillInactive: {
    borderColor: '#2A3A4F',
    backgroundColor: '#1A2535',
  },
  typePillText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
  },
  fieldGroup: {
    paddingTop: Spacing.xxs,
  },
  input: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: '#F0EBE3',
    backgroundColor: '#1A2535',
    borderWidth: 1,
    borderColor: '#2A3A4F',
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  currencyPill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  colorDotWrap: {
    padding: Spacing.xxs,
  },
  colorDot: {
    width: Size.colorDot,
    height: Size.colorDot,
    borderRadius: Size.colorDot / 2,
  },
  colorDotSelected: {
    borderWidth: 2,
    borderColor: '#C9973A',
    transform: [{ scale: 1.1 }],
  },
  ccBlock: {
    paddingTop: Spacing.xxs,
  },
  interestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
  },
  interestLabel: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: '#F0EBE3',
  },
  togglePill: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    minWidth: Size.backBtn + Spacing.xs,
    alignItems: 'center',
  },
  toggleText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.caption,
    letterSpacing: 0.5,
  },
  ctaBar: {
    borderTopWidth: 1,
    borderTopColor: '#1A2535',
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  ctaPress: {
    width: '100%',
    borderRadius: Radius.cta,
    overflow: 'hidden',
  },
  ctaPressDisabled: {
    opacity: 0.5,
  },
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
  errorText: {
    color: '#E05A42',
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    marginTop: Spacing.xxs,
  },
});
