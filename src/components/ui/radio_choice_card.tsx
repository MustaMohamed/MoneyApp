import { RadioGroup } from 'heroui-native';
import type { ReactNode } from 'react';

import { ListCard } from '@/components/ui/list_card';
import { RadioOptionRow } from '@/components/ui/radio_option_row';

interface RadioChoiceCardProps<O extends { value: string; label: string }> {
  options: readonly O[];
  value: O['value'] | undefined;
  onValueChange: (value: O['value']) => void;
  testIDPrefix: string;
  renderLabel: (option: O) => ReactNode;
  accessibilityLabelOf?: (option: O) => string;
}

/** One card of radio rows, drawn as the budget picker draws its rows, but the last row takes no separator: the card's border closes it. */
export function RadioChoiceCard<O extends { value: string; label: string }>({
  options,
  value,
  onValueChange,
  testIDPrefix,
  renderLabel,
  accessibilityLabelOf,
}: RadioChoiceCardProps<O>): React.ReactElement {
  const handleValueChange = (next: string) => {
    const picked = options.find((option) => option.value === next);
    if (picked !== undefined) onValueChange(picked.value);
  };
  return (
    <ListCard>
      {/* `gap-0`: the root's own gap would open 12 dp between the rows. */}
      <RadioGroup value={value} onValueChange={handleValueChange} className="gap-0">
        {options.map((option, index) => (
          <RadioOptionRow
            key={option.value}
            value={option.value}
            testID={`${testIDPrefix}-${option.value}`}
            accessibilityLabel={accessibilityLabelOf?.(option) ?? option.label}
            separator={index < options.length - 1}
          >
            {renderLabel(option)}
          </RadioOptionRow>
        ))}
      </RadioGroup>
    </ListCard>
  );
}
