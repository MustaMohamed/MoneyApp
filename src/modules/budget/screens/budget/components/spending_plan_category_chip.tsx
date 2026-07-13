import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip } from 'heroui-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import type { SpendingPlanCardCategoryChipVM } from '@/modules/budget/screens/budget/spending_plans.helpers';
import { toIconName } from '@/utils/icon_name_guard';

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
          size={Size.iconMicro}
          color={category.color}
        />
      </View>
    </Chip>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: Size.spendingPlanChipHeight,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    borderRadius: Radius.xl,
    backgroundColor: Colors.dark.bg,
    paddingLeft: Spacing.xxxs,
    paddingRight: Spacing.xxxs,
    paddingVertical: 0,
  },
  icon: {
    width: Size.checkCircle,
    height: Size.checkCircle,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.xl,
    backgroundColor: Colors.dark.surfaceEl,
  },
});
