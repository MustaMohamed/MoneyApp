import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

interface Props {
  label: string;
  summary: string;
  isActive: boolean;
  onPress: () => void;
}

export function FilterSectionRow({ label, summary, isActive, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.right}>
        <Text style={[styles.summary, isActive && styles.summaryActive]} numberOfLines={1}>
          {summary}
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={ms(20)} color={Colors.dark.text2} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  rowPressed: { opacity: 0.7 },
  label: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 1,
  },
  summary: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    flexShrink: 1,
  },
  summaryActive: {
    color: Colors.shared.cairoGold,
    fontFamily: FontFamily.interSemi,
  },
});
