import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MockStatusBar } from '@/components/MockStatusBar';
import { ProgressDots } from '@/components/ProgressDots';
import { Strings } from '@/constants/strings';
import { type Currency, useOnboardingStore } from '@/store/onboardingStore';

type RowConfig = {
  code: Currency;
  label: string;
  flag: string;
  flagBg: string;
};

const ROWS: RowConfig[] = [
  {
    code: 'EGP',
    label: Strings.currencyEGP,
    flag: '🇪🇬',
    flagBg: 'rgba(201,151,58,0.12)',
  },
  {
    code: 'USD',
    label: Strings.currencyUSD,
    flag: '🇺🇸',
    flagBg: 'rgba(55,138,221,0.10)',
  },
];

export default function CurrencyScreen() {
  const router = useRouter();
  const setStep = useOnboardingStore((s) => s.setStep);
  const setBaseCurrency = useOnboardingStore((s) => s.setBaseCurrency);
  const baseCurrency = useOnboardingStore((s) => s.baseCurrency);
  const [selected, setSelected] = useState<Currency>(baseCurrency);

  const onContinue = async () => {
    await setBaseCurrency(selected);
    await setStep('O3');
    router.push('/(onboarding)/security');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <MockStatusBar />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <MaterialCommunityIcons name="chevron-left" size={16} color="#6B7F99" />
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
  );
}

function CurrencyRow({
  row,
  isSelected,
  onSelect,
}: {
  row: RowConfig;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const scale = useSharedValue(1);
  const borderProgress = useSharedValue(isSelected ? 1 : 0);
  const checkScale = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    if (isSelected) {
      borderProgress.value = withTiming(1, { duration: 200 });
      checkScale.value = withSpring(1, { damping: 12, stiffness: 180 });
    } else {
      borderProgress.value = withTiming(0, { duration: 150 });
      checkScale.value = withTiming(0, { duration: 120 });
    }
  }, [isSelected, borderProgress, checkScale]);

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(1.02, { duration: 80 }),
      withTiming(1.0, { duration: 120 }),
    );
    onSelect();
  };

  const rowAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: interpolateColor(borderProgress.value, [0, 1], ['#2A3A4F', '#C9973A']),
  }));

  const checkAnim = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <Animated.View style={[styles.rowAnimated, rowAnim]}>
      <Pressable onPress={handlePress} style={styles.row}>
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
            <MaterialCommunityIcons name="check" size={10} color="#1B2B4B" />
          </Animated.View>
        </View>
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
  content: { flex: 1 },
  heading: {
    fontFamily: 'Sora_700Bold',
    fontSize: 13,
    color: '#F0EBE3',
    paddingTop: 6,
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: '#6B7F99',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  rows: { paddingHorizontal: 12, gap: 8 },
  rowAnimated: {
    borderRadius: 11,
    borderWidth: 1.5,
  },
  row: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2535',
    borderRadius: 11,
    gap: 10,
  },
  flagWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flag: { fontSize: 15 },
  rowText: { flex: 1, gap: 2 },
  rowCode: {
    fontFamily: 'Sora_700Bold',
    fontSize: 11,
    color: '#F0EBE3',
  },
  rowLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 8,
    color: '#6B7F99',
  },
  checkWrap: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOutline: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: '#2A3A4F',
  },
  checkFill: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#C9973A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    marginHorizontal: 12,
    marginTop: 12,
    backgroundColor: '#1A2535',
    borderWidth: 1,
    borderColor: '#2A3A4F',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 9,
  },
  noteText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 8.5,
    color: '#6B7F99',
    lineHeight: 13,
  },
  noteLabel: {
    color: '#D4A44C',
    fontFamily: 'Inter_600SemiBold',
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
