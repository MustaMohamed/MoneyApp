import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GeoIllustration } from '@/components/geo_illustration';
import { ProgressDots } from '@/components/progress_dots';
import { Strings } from '@/constants/strings';
import { FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { useOnboardingStore } from '@/store/onboarding.store';
import { OnboardingStep } from '@/constants/enums';
import { useWelcomeAnim } from './welcome.anim';

export default function WelcomeScreen() {
  const router = useRouter();
  const setStep = useOnboardingStore((s) => s.setStep);
  const { illustrationEntering, headlineEntering, ctaEntering } = useWelcomeAnim();

  const onGetStarted = async () => {
    await setStep(OnboardingStep.O2);
    router.push('/(onboarding)/currency');
  };

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
  );
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
  signIn: {
    marginTop: Spacing.xs,
    textAlign: 'center',
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: '#4A5568',
  },
});
