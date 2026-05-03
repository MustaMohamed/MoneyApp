import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressDots } from '@/components/progress_dots';
import { Strings } from '@/constants/strings';
import { FontFamily, Radius, Size, Spacing, TouchSize, Type } from '@/constants/theme';
import { useSecurity } from './security.hook';
import { SecurityPill, PILLS } from './components/security_pill';

const hitSlop = {
  top: TouchSize.min / 4,
  bottom: TouchSize.min / 4,
  left: TouchSize.min / 4,
  right: TouchSize.min / 4,
};

export default function SecurityScreen() {
  const { selected, setSelected, onContinue, onBack } = useSecurity();
  const ctaDisabled = selected === undefined;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.back} hitSlop={hitSlop}>
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
