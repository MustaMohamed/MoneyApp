import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback, Text as HeroText } from 'heroui-native';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { ms } from '@/utils/responsive';

type ToolIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface BudgetToolRailProps {
  variant?: 'categories' | 'plans';
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

function ToolButton(props: ToolButtonProps) {
  return (
    <PressableFeedback
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel}
      accessibilityState={{ disabled: props.isDisabled }}
      isDisabled={props.isDisabled}
      onPress={() => {
        if (!props.isDisabled) props.onPress();
      }}
      className="bg-default border-border min-h-9 flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border px-2 disabled:opacity-40"
    >
      <MaterialCommunityIcons
        name={props.icon}
        size={ms(15)}
        color={props.isDisabled ? Colors.dark.text3 : props.color}
      />
      <HeroText className="font-inter text-foreground text-[11px] font-semibold">
        {props.label}
      </HeroText>
    </PressableFeedback>
  );
}

export function BudgetToolRail(props: BudgetToolRailProps) {
  if (props.variant === 'plans') {
    return (
      <View className="flex-row items-center gap-2" testID="budget-tool-rail">
        <ToolButton
          label={Strings.budgetToolPlan}
          icon="calendar-plus-outline"
          color={Colors.dark.text2}
          accessibilityLabel={
            props.planDisabled ? Strings.budgetToolPlanComingSoonA11y : Strings.budgetToolPlan
          }
          isDisabled={props.planDisabled}
          onPress={props.onPlan}
        />
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-2" testID="budget-tool-rail">
      <ToolButton
        label={Strings.budgetToolCategory}
        icon="wallet-plus-outline"
        color={Colors.dark.positive}
        accessibilityLabel={Strings.budgetAddCategory}
        isDisabled={props.addCategoryDisabled}
        onPress={props.onAddCategory}
      />
      <ToolButton
        label={Strings.budgetToolCopy}
        icon="content-copy"
        color={Colors.dark.gold}
        accessibilityLabel={Strings.budgetToolCopyA11y}
        isDisabled={props.copyDisabled}
        onPress={props.onCopy}
      />
    </View>
  );
}
