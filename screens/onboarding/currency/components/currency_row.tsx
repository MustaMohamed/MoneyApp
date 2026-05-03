import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Radius, Size, Spacing, Type, FontFamily } from '@/constants/theme';
import type { Currency } from '@/constants/enums';
import { useCurrencyRowAnim } from '../currency.anim';

export type RowConfig = {
  code: Currency;
  label: string;
  flag: string;
  flagBg: string;
};

export function CurrencyRow({
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
});
