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

import { ProgressDots } from '@/components/ProgressDots';
import { Strings } from '@/constants/strings';
import { FontFamily, Radius, Size, Spacing, TouchSize, Type } from '@/constants/theme';
import { type SecurityChoice, useOnboardingStore } from '@/store/onboarding_store';
import { backOrReplace } from '@/utils/onboarding_nav';

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

const hitSlop = {
  top: TouchSize.min / 4,
  bottom: TouchSize.min / 4,
  left: TouchSize.min / 4,
  right: TouchSize.min / 4,
};

export default function SecurityScreen() {
  const router = useRouter();
  const setStep = useOnboardingStore((s) => s.setStep);
  const setSecurityChoice = useOnboardingStore((s) => s.setSecurityChoice);
  const savedChoice = useOnboardingStore((s) => s.securityChoice);
  const [selected, setSelected] = useState<SecurityChoice | null>(savedChoice);

  const onContinue = async () => {
    if (selected === null) return;
    await setSecurityChoice(selected);
    await setStep('O4');
    router.push('/(onboarding)/add-account');
  };

  const ctaDisabled = selected === null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => backOrReplace(router, '/(onboarding)/currency')}
          style={styles.back}
          hitSlop={hitSlop}
        >
          <MaterialCommunityIcons name="chevron-left" size={Size.iconBack} color="#6B7F99" />
        </Pressable>
        <Text style={styles.headerTitle}>{Strings.o3Title}</Text>
        <View style={styles.back} />
      </View>

      <ProgressDots totalSteps={6} currentStep={3} />

      <View style={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.shieldWrap}>
            <MaterialCommunityIcons name="shield-account" size={Size.iconLg} color="#C9973A" />
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
          <MaterialCommunityIcons name={pill.icon} size={Size.iconMd} color={pill.iconColor} />
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
  content: { flex: 1, padding: Spacing.sm },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  shieldWrap: {
    width: Size.shieldBox,
    height: Size.shieldBox,
    borderRadius: Spacing.sm,
    backgroundColor: 'rgba(201,151,58,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,151,58,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCardText: { flex: 1, gap: Spacing.xxs },
  headerCardTitle: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: '#F0EBE3',
  },
  headerCardSub: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: '#6B7F99',
  },
  pill: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    marginBottom: Spacing.xs,
  },
  pillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  iconWrap: {
    width: Size.securityIconBox,
    height: Size.securityIconBox,
    borderRadius: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { flex: 1, gap: Spacing.xxs },
  pillLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
  },
  pillSub: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
  },
  badge: {
    backgroundColor: 'rgba(201,151,58,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,151,58,0.30)',
    borderRadius: Radius.sm / 2,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
  },
  badgeText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.micro,
    color: '#D4A44C',
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
});
