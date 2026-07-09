import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

type ToolIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface BudgetToolRailProps {
  onCopy: () => void;
  onAddCategory: () => void;
  onPlan: () => void;
  copyDisabled: boolean;
  addCategoryDisabled: boolean;
  planDisabled: boolean;
}

interface ToolButtonProps {
  label: string;
  icon: ToolIcon;
  color: string;
  accessibilityLabel: string;
  isDisabled: boolean;
  onPress: () => void;
}

function ToolButton({
  label,
  icon,
  color,
  accessibilityLabel,
  isDisabled,
  onPress,
}: ToolButtonProps) {
  return (
    <PressableFeedback
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled }}
      onPress={() => {
        if (!isDisabled) onPress();
      }}
      style={[styles.tool, isDisabled && styles.toolDisabled]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={ms(15)}
        color={isDisabled ? Colors.dark.text3 : color}
      />
      <Text style={[styles.toolLabel, isDisabled && styles.toolLabelDisabled]} numberOfLines={1}>
        {label}
      </Text>
    </PressableFeedback>
  );
}

export function BudgetToolRail({
  onCopy,
  onAddCategory,
  onPlan,
  copyDisabled,
  addCategoryDisabled,
  planDisabled,
}: BudgetToolRailProps) {
  return (
    <View style={styles.rail} testID="budget-tool-rail">
      <ToolButton
        label={Strings.budgetToolCopy}
        icon="content-copy"
        color={Colors.dark.gold}
        accessibilityLabel={Strings.budgetToolCopyA11y}
        isDisabled={copyDisabled}
        onPress={onCopy}
      />
      <ToolButton
        label={Strings.budgetToolCategory}
        icon="wallet-plus-outline"
        color={Colors.dark.positive}
        accessibilityLabel={Strings.budgetAddCategory}
        isDisabled={addCategoryDisabled}
        onPress={onAddCategory}
      />
      <ToolButton
        label={Strings.budgetToolPlan}
        icon="calendar-star"
        color={Colors.dark.text2}
        accessibilityLabel={
          planDisabled ? Strings.budgetToolPlanComingSoonA11y : Strings.budgetToolPlan
        }
        isDisabled={planDisabled}
        onPress={onPlan}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  tool: {
    flex: 1,
    minHeight: ms(38),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(5),
    borderRadius: Radius.md,
    backgroundColor: Colors.dark.surfaceEl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    paddingHorizontal: Spacing.xs,
  },
  toolDisabled: {
    opacity: 0.48,
  },
  toolLabel: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.micro,
    color: Colors.dark.text1,
  },
  toolLabelDisabled: {
    color: Colors.dark.text3,
  },
});
