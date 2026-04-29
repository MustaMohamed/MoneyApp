import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressDots } from '@/components/ProgressDots';
import { Strings } from '@/constants/strings';
import { FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { useAccountStore } from '@/store/accountStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useFirstMountEntering } from '@/utils/useFirstMountEntering';

type SummaryRow = { label: string; value: string; gold: boolean };

export default function ReadyScreen() {
  const baseCurrency = useOnboardingStore((s) => s.baseCurrency);
  const securityChoice = useOnboardingStore((s) => s.securityChoice);
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const accounts = useAccountStore((s) => s.accounts);
  const playEntering = useFirstMountEntering('ready');

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
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ProgressDots totalSteps={6} currentStep={6} />

      <View style={styles.body}>
        <Animated.View
          entering={playEntering ? ZoomIn.springify().damping(10).stiffness(100) : undefined}
          style={styles.checkWrap}
        >
          <MaterialCommunityIcons name="check-circle" size={Size.iconHero} color="#4CAF82" />
        </Animated.View>

        <Animated.Text
          entering={playEntering ? FadeInUp.delay(200).duration(400) : undefined}
          style={styles.headline}
        >
          {Strings.o6Title}
        </Animated.Text>

        <Animated.Text
          entering={playEntering ? FadeInUp.delay(300).duration(350) : undefined}
          style={styles.subtitle}
        >
          {Strings.o6Subtitle}
        </Animated.Text>

        <View style={styles.summary}>
          {rows.map((row, index) => (
            <Animated.View
              key={row.label}
              entering={playEntering ? FadeInUp.delay(400 + index * 80).duration(300) : undefined}
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

      <Animated.View
        entering={playEntering ? FadeInUp.delay(700).duration(400) : undefined}
        style={styles.ctaBar}
      >
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
    paddingHorizontal: Spacing.sm,
  },
  checkWrap: {
    marginBottom: Spacing.md,
  },
  headline: {
    fontFamily: FontFamily.soraExtra,
    fontSize: Type.headline,
    color: '#F0EBE3',
    textAlign: 'center',
    marginBottom: Spacing.xxs,
  },
  subtitle: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: '#6B7F99',
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: Math.round(Type.body * 1.4),
  },
  summary: {
    width: '100%',
    backgroundColor: '#1A2535',
    borderWidth: 1,
    borderColor: '#2A3A4F',
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#243044',
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: '#6B7F99',
  },
  summaryValue: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
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
});
