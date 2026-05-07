import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, FontFamily, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

interface MonthNavigatorProps {
  yearMonth: string; // 'YYYY-MM'
  onPrev: () => void;
  onNext: () => void;
}

export function MonthNavigator({ yearMonth, onPrev, onNext }: MonthNavigatorProps) {
  const [year, month] = yearMonth.split('-').map(Number);
  const label = `${MONTH_NAMES[month - 1]} ${year}`;
  return (
    <View style={styles.container}>
      <Pressable onPress={onPrev} style={styles.btn} hitSlop={ms(8)}>
        <MaterialCommunityIcons name="chevron-left" size={ms(24)} color={Colors.dark.text1} />
      </Pressable>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={onNext} style={styles.btn} hitSlop={ms(8)}>
        <MaterialCommunityIcons name="chevron-right" size={ms(24)} color={Colors.dark.text1} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  btn: { padding: Spacing.xs },
  label: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
    minWidth: ms(120),
    textAlign: 'center',
  },
});
