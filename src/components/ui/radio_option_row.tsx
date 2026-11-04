import { Radio, RadioGroup } from 'heroui-native';
import type { ReactNode } from 'react';
import { tv } from 'tailwind-variants';

const row = tv({
  base: 'min-h-14 gap-3 px-4',
  variants: {
    density: {
      compact: 'py-2.5',
      roomy: 'py-3',
    },
    separator: {
      true: 'border-separator border-b',
    },
  },
  defaultVariants: {
    density: 'compact',
    separator: true,
  },
});

const ROW_STYLE = { flexDirection: 'row', alignItems: 'center' } as const;

interface RadioOptionMarkProps {
  testID?: string;
}

/** Drawn only, inside a `RadioGroup.Item` that supplies its selection: the row is the one pressable and the one node read aloud. */
export function RadioOptionMark({ testID }: RadioOptionMarkProps) {
  return (
    <Radio
      testID={testID}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    />
  );
}

interface RadioOptionRowProps {
  value: string;
  testID: string;
  accessibilityLabel?: string;
  density?: 'compact' | 'roomy';
  separator?: boolean;
  children: ReactNode;
}

/** Adds no margin, so the parent `RadioGroup` keeps its own gap. */
export function RadioOptionRow({
  value,
  testID,
  accessibilityLabel,
  density,
  separator,
  children,
}: RadioOptionRowProps) {
  return (
    <RadioGroup.Item
      value={value}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      className={row({ density, separator })}
      style={ROW_STYLE}
    >
      {children}
      <RadioOptionMark testID={`${testID}-selected`} />
    </RadioGroup.Item>
  );
}
