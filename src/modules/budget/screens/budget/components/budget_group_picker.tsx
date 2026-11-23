import { RadioGroup } from 'heroui-native';
import { View } from 'react-native';

import { ListCard } from '@/components/ui/list_card';
import { RadioOptionRow } from '@/components/ui/radio_option_row';
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
  const handleValueChange = (next: string) => {
    const picked = BUDGET_GROUP_OPTIONS.find((option) => String(option.value) === next);
    if (picked !== undefined) onSelect(picked.value);
  };
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
        <ListCard>
          {/* `gap-0`: the root's own gap would open 12 dp between the rows. */}
          <RadioGroup
            value={value ?? undefined}
            onValueChange={handleValueChange}
            className="gap-0"
          >
            {BUDGET_GROUP_OPTIONS.map((option, index) => (
              <RadioOptionRow
                key={option.value}
                value={option.value}
                testID={`budget-group-option-${option.value}`}
                accessibilityLabel={Strings.addTxPickerAccessibility(option.label, option.caption)}
                separator={index < BUDGET_GROUP_OPTIONS.length - 1}
              >
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
              </RadioOptionRow>
            ))}
          </RadioGroup>
        </ListCard>
      </View>
    </Sheet>
  );
}
