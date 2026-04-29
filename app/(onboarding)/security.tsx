import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
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
import { type SecurityChoice, useOnboardingStore } from '@/store/onboardingStore';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type PillConfig = {
  choice: SecurityChoice;
  icon: IconName;
  iconBg: string;
  iconColor: string;
  label: string;
  sublabel: string;
  labelColor: string;
  sublabelColor: string;
  showBadge: boolean;
};

const PILLS: PillConfig[] = [
  {
    choice: 'pin',
    icon: 'lock',
    iconBg: 'rgba(201,151,58,0.12)',
    iconColor: '#C9973A',
    label: Strings.o3PinLabel,
    sublabel: Strings.o3PinSub,
    labelColor: '#F0EBE3',
    sublabelColor: '#6B7F99',
    showBadge: true,
  },
  {
    choice: 'biometric',
    icon: 'fingerprint',
    iconBg: 'rgba(55,138,221,0.10)',
    iconColor: '#378ADD',
    label: Strings.o3BiometricLabel,
    sublabel: Strings.o3BiometricSub,
    labelColor: '#F0EBE3',
    sublabelColor: '#6B7F99',
    showBadge: false,
  },
  {
    choice: 'skip',
    icon: 'chevron-right',
    iconBg: '#243044',
    iconColor: '#6B7F99',
    label: Strings.o3SkipLabel,
    sublabel: Strings.o3SkipSub,
    labelColor: '#6B7F99',
    sublabelColor: '#4A5568',
    showBadge: false,
  },
];

export default function SecurityScreen() {
  const router = useRouter();
  const setStep = useOnboardingStore((s) => s.setStep);
  const setSecurityChoice = useOnboardingStore((s) => s.setSecurityChoice);
  const [selected, setSelected] = useState<SecurityChoice | null>(null);

  const onContinue = async () => {
    if (selected === null) return;
    await setSecurityChoice(selected);
    await setStep('O4');
    router.push('/(onboarding)/add-account');
  };

  const ctaDisabled = selected === null;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <MockStatusBar />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <MaterialCommunityIcons name="chevron-left" size={16} color="#6B7F99" />
        </Pressable>
        <Text style={styles.headerTitle}>{Strings.o3Title}</Text>
        <View style={styles.back} />
      </View>

      <ProgressDots totalSteps={6} currentStep={3} />

      <View style={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.shieldWrap}>
            <MaterialCommunityIcons name="shield-account" size={22} color="#C9973A" />
          </View>
          <View style={styles.headerCardText}>
            <Text style={styles.headerCardTitle}>{Strings.o3HeaderTitle}</Text>
            <Text style={styles.headerCardSub}>{Strings.o3HeaderSub}</Text>
          </View>
        </View>

        {PILLS.map((pill) => (
          <SecurityPill
            key={pill.choice}
            pill={pill}
            isSelected={selected === pill.choice}
            onSelect={() => setSelected(pill.choice)}
          />
        ))}
      </View>

      <View style={styles.ctaBar}>
        <Pressable
          onPress={onContinue}
          disabled={ctaDisabled}
          style={[styles.ctaPress, ctaDisabled && styles.ctaPressDisabled]}
        >
          <LinearGradient
            colors={['#C9973A', '#D4A44C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>{Strings.o3Cta}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function SecurityPill({
  pill,
  isSelected,
  onSelect,
}: {
  pill: PillConfig;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const borderProgress = useSharedValue(isSelected ? 1 : 0);
  const iconScale = useSharedValue(1);

  useEffect(() => {
    if (isSelected) {
      borderProgress.value = withTiming(1, { duration: 200 });
      iconScale.value = withSequence(
        withSpring(1.08, { damping: 6, stiffness: 200 }),
        withSpring(1.0, { damping: 10 }),
      );
    } else {
      borderProgress.value = withTiming(0, { duration: 150 });
    }
  }, [isSelected, borderProgress, iconScale]);

  const pillAnim = useAnimatedStyle(() => ({
    borderColor: interpolateColor(borderProgress.value, [0, 1], ['#2A3A4F', '#C9973A']),
  }));

  const iconAnim = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <Animated.View style={[styles.pill, pillAnim]}>
      <Pressable onPress={onSelect} style={styles.pillInner}>
        <Animated.View style={[styles.iconWrap, { backgroundColor: pill.iconBg }, iconAnim]}>
          <MaterialCommunityIcons name={pill.icon} size={18} color={pill.iconColor} />
        </Animated.View>
        <View style={styles.pillText}>
          <Text style={[styles.pillLabel, { color: pill.labelColor }]}>{pill.label}</Text>
          <Text style={[styles.pillSub, { color: pill.sublabelColor }]}>{pill.sublabel}</Text>
        </View>
        {pill.showBadge && (
          <Animated.View entering={FadeIn.delay(300).duration(250)} style={styles.badge}>
            <Text style={styles.badgeText}>{Strings.o3BestBadge}</Text>
          </Animated.View>
        )}
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
  content: { flex: 1, padding: 12 },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  shieldWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(201,151,58,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,151,58,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCardText: { flex: 1, gap: 2 },
  headerCardTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 12,
    color: '#F0EBE3',
  },
  headerCardSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: '#6B7F99',
  },
  pill: {
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  pillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { flex: 1, gap: 2 },
  pillLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: 10,
  },
  pillSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 8,
  },
  badge: {
    backgroundColor: 'rgba(201,151,58,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,151,58,0.30)',
    borderRadius: 5,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  badgeText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 8,
    color: '#D4A44C',
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
