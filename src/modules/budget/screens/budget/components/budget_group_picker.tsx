import { View } from 'react-native';

import { RadioChoiceCard } from '@/components/ui/radio_choice_card';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import type { BudgetGroup } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Spacing, Type, lineHeightFor } from '@/constants/theme';

import { BUDGET_GROUP_OPTIONS } from './set_budget_sheet.helpers';

interface BudgetGroupPickerProps {
  isOpen: boolean;
  value: BudgetGroup | null;
  onSelect: (group: BudgetGroup) => void;
  onOpenChange: (open: boolean) => void;
}

/** Frame C2 without its Not grouped row, note and Done button: a month's group is never stored as none, and a choice closes the picker. */
export function BudgetGroupPicker({
  isOpen,
  value,
  onSelect,
  onOpenChange,
}: BudgetGroupPickerProps): React.ReactElement {
  return (
    <Sheet isOpen={isOpen} onOpenChange={onOpenChange} title={Strings.budgetGroupLabel} fitContent>
      <View
        testID="budget-group-picker"
        style={{
          paddingHorizontal: Spacing.md,
          paddingTop: Spacing.xxs,
          paddingBottom: Spacing.xl,
        }}
      >
        <RadioChoiceCard
          options={BUDGET_GROUP_OPTIONS}
          value={value ?? undefined}
          onValueChange={onSelect}
          testIDPrefix="budget-group-option"
          accessibilityLabelOf={(option) =>
            Strings.addTxPickerAccessibility(option.label, option.caption)
          }
          renderLabel={(option) => (
            <View style={{ flex: 1 }}>
              <Text
                className="font-sora-semibold text-foreground"
                style={{ fontSize: Type.body, lineHeight: lineHeightFor(Type.body) }}
              >
                {option.label}
              </Text>
              <Text
                className="font-inter text-muted"
                style={{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) }}
              >
                {option.caption}
              </Text>
            </View>
          )}
        />
      </View>
    </Sheet>
  );
}
