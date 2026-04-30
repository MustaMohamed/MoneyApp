import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressDots } from '@/components/progress_dots';
import { Strings } from '@/constants/strings';
import { FontFamily, Radius, Size, Spacing, TouchSize, Type } from '@/constants/theme';
import type { Currency } from '@/store/onboarding.store';

import { useCurrencyRowAnim } from './currency.anim';
import { useCurrency } from './currency.hook';

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
  const { selected, setSelected, onContinue, onBack } = useCurrency();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.back} hitSlop={hitSlop}>
          <MaterialCommunityIcons name="chevron-left" size={Size.iconBack} color="#6B7F99" />
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

const hitSlop = {
  top: TouchSize.min / 4,
  bottom: TouchSize.min / 4,
  left: TouchSize.min / 4,
  right: TouchSize.min / 4,
};

function CurrencyRow({
  row,
  isSelected,
  onSelect,
}: {
  row: RowConfig;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { rowAnim, checkAnim, triggerRowTap } = useCurrencyRowAnim(isSelected);

  const handlePress = () => {
    triggerRowTap();
    onSelect();
  };

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
            <MaterialCommunityIcons name="check" size={Size.iconSm * 0.6} color="#1B2B4B" />
          </Animated.View>
        </View>
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
  content: { flex: 1 },
  heading: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.headline,
    color: '#F0EBE3',
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xxs,
  },
  subtitle: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: '#6B7F99',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    lineHeight: Math.round(Type.body * 1.4),
  },
  rows: { paddingHorizontal: Spacing.sm, gap: Spacing.xs },
  rowAnimated: {
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
  row: {
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2535',
    borderRadius: Radius.pill,
    gap: Spacing.sm,
  },
  flagWrap: {
    width: Size.flagBox,
    height: Size.flagBox,
    borderRadius: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flag: { fontSize: Type.subhead },
  rowText: { flex: 1, gap: Spacing.xxs },
  rowCode: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: '#F0EBE3',
  },
  rowLabel: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: '#6B7F99',
  },
  checkWrap: {
    width: Size.checkCircle,
    height: Size.checkCircle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOutline: {
    position: 'absolute',
    width: Size.checkCircle,
    height: Size.checkCircle,
    borderRadius: Size.checkCircle / 2,
    borderWidth: 1.2,
    borderColor: '#2A3A4F',
  },
  checkFill: {
    width: Size.checkCircle,
    height: Size.checkCircle,
    borderRadius: Size.checkCircle / 2,
    backgroundColor: '#C9973A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
    backgroundColor: '#1A2535',
    borderWidth: 1,
    borderColor: '#2A3A4F',
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  noteText: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: '#6B7F99',
    lineHeight: Math.round(Type.caption * 1.45),
  },
  noteLabel: {
    color: '#D4A44C',
    fontFamily: FontFamily.interSemi,
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
