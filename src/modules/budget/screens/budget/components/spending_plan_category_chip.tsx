import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip } from 'heroui-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Colors, FontFamily, Radius } from '@/constants/theme';
import type { SpendingPlanCardCategoryChipVM } from '@/modules/budget/screens/budget/spending_plans.helpers';
import { toIconName } from '@/utils/icon_name_guard';
import { ms, msFont } from '@/utils/responsive';

interface SpendingPlanCategoryChipProps {
  category: SpendingPlanCardCategoryChipVM;
}

export function SpendingPlanCategoryChip({
  category,
}: SpendingPlanCategoryChipProps): React.ReactElement {
  return (
    <Chip
      size="sm"
      variant="secondary"
      color="default"
      animation="disable-all"
      accessibilityRole="text"
      accessibilityLabel={category.accessibilityLabel}
      style={styles.chip}
    >
      <View style={styles.icon}>
        <MaterialCommunityIcons
          name={toIconName(category.icon, 'tag-outline')}
          size={ms(12)}
          color={category.color}
        />
      </View>
      <Text style={styles.amount} numberOfLines={1}>
        {category.amountLabel}
      </Text>
    </Chip>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: ms(28),
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    borderRadius: Radius.xl,
    backgroundColor: Colors.dark.bg,
    paddingLeft: ms(2),
    paddingRight: ms(6),
    paddingVertical: 0,
  },
  icon: {
    width: ms(20),
    height: ms(20),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.xl,
    backgroundColor: Colors.dark.surfaceEl,
  },
  amount: {
    fontFamily: FontFamily.interSemi,
    fontSize: msFont(9),
    color: Colors.dark.text1,
  },
});
