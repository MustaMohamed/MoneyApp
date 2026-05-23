import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { SecurityChoice } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';

import { useSecurityPillAnim } from '../security.anim';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export type PillConfig = {
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

export const PILLS: PillConfig[] = [
  {
    choice: SecurityChoice.Pin,
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
    choice: SecurityChoice.Biometric,
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
    choice: SecurityChoice.Skip,
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

export function SecurityPill({
  pill,
  isSelected,
  onSelect,
}: {
  pill: PillConfig;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { pillAnim, iconAnim } = useSecurityPillAnim(isSelected);

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
});
