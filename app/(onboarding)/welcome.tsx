import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GeoIllustration } from '@/components/GeoIllustration';
import { ProgressDots } from '@/components/ProgressDots';
import { Strings } from '@/constants/strings';
import { useOnboardingStore } from '@/store/onboardingStore';

export default function WelcomeScreen() {
  const router = useRouter();
  const setStep = useOnboardingStore((s) => s.setStep);

  const onGetStarted = async () => {
    await setStep('O2');
    router.push('/(onboarding)/currency');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ProgressDots totalSteps={6} currentStep={1} />

      <View style={styles.body}>
        <Animated.View entering={FadeInDown.duration(600)}>
          <GeoIllustration />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(500)} style={styles.headlineWrap}>
          <Text style={styles.headline}>{Strings.o1Headline}</Text>
          <Text style={styles.subtext}>{Strings.o1Subtext}</Text>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.delay(600).duration(400)} style={styles.ctaBar}>
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
    paddingHorizontal: 18,
    gap: 18,
  },
  headlineWrap: { alignItems: 'center', gap: 8 },
  headline: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 18,
    lineHeight: 22,
    color: '#F0EBE3',
    textAlign: 'center',
  },
  subtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#6B7F99',
    textAlign: 'center',
    lineHeight: 14,
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
  signIn: {
    marginTop: 7,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#4A5568',
  },
});
