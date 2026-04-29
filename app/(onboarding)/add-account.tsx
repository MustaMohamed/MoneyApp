import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MockStatusBar } from '@/components/MockStatusBar';
import { ProgressDots } from '@/components/ProgressDots';
import { Strings } from '@/constants/strings';
import { AccountColors } from '@/constants/theme';
import { type AccountType } from '@/store/accountStore';
import { type Currency } from '@/store/onboardingStore';

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

  const isCreditCard = selectedType === 'credit_card';
  const ctaDisabled = name.trim() === '';

  const onSave = () => {
    // TODO: Day 8 — validation + save
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <MockStatusBar />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <MaterialCommunityIcons name="chevron-left" size={16} color="#6B7F99" />
        </Pressable>
        <Text style={styles.headerTitle}>{Strings.o4Title}</Text>
        <View style={styles.back} />
      </View>

      <ProgressDots activeIndex={3} />

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
            onChangeText={setName}
            placeholder={Strings.o4NamePlaceholder}
            placeholderTextColor="#4A5568"
            maxLength={30}
            style={styles.input}
          />
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
            onChangeText={setBalance}
            placeholder={Strings.o4BalancePlaceholder}
            placeholderTextColor="#4A5568"
            keyboardType="decimal-pad"
            style={styles.input}
          />
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
                onChangeText={setCreditLimit}
                placeholder={Strings.o4CreditLimitPlaceholder}
                placeholderTextColor="#4A5568"
                keyboardType="decimal-pad"
                style={styles.input}
              />
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
                  onChangeText={setApr}
                  placeholder={Strings.o4AprPlaceholder}
                  placeholderTextColor="#4A5568"
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </Animated.View>
            )}
          </Animated.View>
        )}
      </ScrollView>

      <View style={styles.ctaBar}>
        <Pressable
          onPress={onSave}
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
        <MaterialCommunityIcons name={option.icon} size={16} color={iconColor} />
        <Text style={[styles.typePillText, { color: iconColor }]}>{option.label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F1923' },
  header: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  back: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: '#1A2535',
    borderWidth: 1,
    borderColor: '#2A3A4F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 12,
    color: '#F0EBE3',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingBottom: 16 },
  sectionLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: 8,
    color: '#C9973A',
    letterSpacing: 1,
    paddingTop: 6,
    paddingBottom: 7,
    paddingHorizontal: 0,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typePillWrap: {
    borderRadius: 9,
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
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 9,
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
    fontFamily: 'Sora_700Bold',
    fontSize: 10,
  },
  fieldGroup: {
    paddingTop: 4,
  },
  input: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 11,
    color: '#F0EBE3',
    backgroundColor: '#1A2535',
    borderWidth: 1,
    borderColor: '#2A3A4F',
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 9,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 6,
  },
  currencyPill: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 10,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  colorDotWrap: {
    padding: 3,
  },
  colorDot: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
  },
  colorDotSelected: {
    borderWidth: 2,
    borderColor: '#C9973A',
    transform: [{ scale: 1.1 }],
  },
  ccBlock: {
    paddingTop: 2,
  },
  interestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  interestLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#F0EBE3',
  },
  togglePill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 9,
    borderWidth: 1.5,
    minWidth: 48,
    alignItems: 'center',
  },
  toggleText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  ctaBar: {
    borderTopWidth: 1,
    borderTopColor: '#1A2535',
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  ctaPress: {
    width: '100%',
    borderRadius: 13,
    overflow: 'hidden',
  },
  ctaPressDisabled: {
    opacity: 0.5,
  },
  cta: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  ctaText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 12,
    color: '#1B2B4B',
  },
});
