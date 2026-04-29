import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MockStatusBar } from '@/components/MockStatusBar';
import { ProgressDots } from '@/components/ProgressDots';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/store/accountStore';
import { useOnboardingStore } from '@/store/onboardingStore';

type SummaryRow = { label: string; value: string; gold: boolean };

export default function ReadyScreen() {
  const baseCurrency = useOnboardingStore((s) => s.baseCurrency);
  const securityChoice = useOnboardingStore((s) => s.securityChoice);
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const accounts = useAccountStore((s) => s.accounts);

  const total = accounts.reduce((sum, a) => sum + a.opening_balance, 0);
  const formattedTotal = new Intl.NumberFormat('en-US').format(total);

  const securityValue =
    securityChoice === null || securityChoice === 'skip'
      ? Strings.o6SecuritySkipped
      : Strings.o6SecurityEnabled;

  const rows: SummaryRow[] = [
    { label: Strings.o6Currency, value: baseCurrency, gold: true },
    { label: Strings.o6Accounts, value: `${accounts.length} accounts`, gold: false },
    {
      label: Strings.o6TotalBalance,
      value: `${formattedTotal} ${baseCurrency}`,
      gold: true,
    },
    { label: Strings.o6Security, value: securityValue, gold: false },
  ];

  const handleComplete = async () => {
    // Layout subscribes to `complete`; the (onboarding) layout will redirect
    // to /dashboard automatically. Don't call router.replace here.
    await completeOnboarding();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <MockStatusBar />
      <ProgressDots totalSteps={6} currentStep={6} />

      <View style={styles.body}>
        <Animated.View
          entering={ZoomIn.springify().damping(10).stiffness(100)}
          style={styles.checkWrap}
        >
          <MaterialCommunityIcons name="check-circle" size={54} color="#4CAF82" />
        </Animated.View>

        <Animated.Text entering={FadeInUp.delay(200).duration(400)} style={styles.headline}>
          {Strings.o6Title}
        </Animated.Text>

        <Animated.Text entering={FadeInUp.delay(300).duration(350)} style={styles.subtitle}>
          {Strings.o6Subtitle}
        </Animated.Text>

        <View style={styles.summary}>
          {rows.map((row, index) => (
            <Animated.View
              key={row.label}
              entering={FadeInUp.delay(400 + index * 80).duration(300)}
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

      <Animated.View entering={FadeInUp.delay(700).duration(400)} style={styles.ctaBar}>
        <Pressable onPress={handleComplete} style={styles.ctaPress}>
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
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F1923' },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  checkWrap: {
    marginBottom: 14,
  },
  headline: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 17,
    color: '#F0EBE3',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: '#6B7F99',
    textAlign: 'center',
    marginBottom: 14,
  },
  summary: {
    width: '100%',
    backgroundColor: '#1A2535',
    borderWidth: 1,
    borderColor: '#2A3A4F',
    borderRadius: 11,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3.5,
    borderBottomWidth: 1,
    borderBottomColor: '#243044',
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: '#6B7F99',
  },
  summaryValue: {
    fontFamily: 'Sora_700Bold',
    fontSize: 9,
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
