import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressDots } from '@/components/progress_dots';
import { Strings } from '@/constants/strings';
import { FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';

import { useReadyAnim } from './ready.anim';
import { useReady } from './ready.hook';

export default function ReadyScreen() {
  const { state, handleComplete } = useReady();
  const { rows, completing } = state;
  const { checkEntering, headlineEntering, subtitleEntering, rowEntering, ctaEntering } =
    useReadyAnim();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ProgressDots totalSteps={6} currentStep={6} />

      <View style={styles.body}>
        <Animated.View entering={checkEntering} style={styles.checkWrap}>
          <MaterialCommunityIcons name="check-circle" size={Size.iconHero} color="#4CAF82" />
        </Animated.View>

        <Animated.Text entering={headlineEntering} style={styles.headline}>
          {Strings.o6Title}
        </Animated.Text>

        <Animated.Text entering={subtitleEntering} style={styles.subtitle}>
          {Strings.o6Subtitle}
        </Animated.Text>

        <View style={styles.summary}>
          {rows.map((row, index) => (
            <Animated.View
              key={row.label}
              entering={rowEntering(index)}
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

      <Animated.View entering={ctaEntering} style={styles.ctaBar}>
        <Pressable onPress={handleComplete} disabled={completing} style={styles.ctaPress}>
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
