import { Accordion, Switch } from 'heroui-native';
import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';

import { FACT_ROW_FONT_SIZE } from '@/components/ui/fact_row.geometry';
import { Text } from '@/components/ui/text';
import { Radius, Size, TouchSize, lineHeightFor } from '@/constants/theme';

interface SwitchCardProps {
  label: string;
  isOn: boolean;
  onIsOnChange: (isOn: boolean) => void;
  testID: string;
  children: ReactNode;
}

/** A card whose label row is one switch control; on, the Accordion expands to `children`. */
export function SwitchCard({
  label,
  isOn,
  onIsOnChange,
  testID,
  children,
}: SwitchCardProps): ReactElement {
  return (
    <View
      testID={testID}
      className="border-separator bg-surface"
      style={{ borderWidth: Size.hairline, borderRadius: Radius.detailCard, overflow: 'hidden' }}
    >
      <Accordion
        selectionMode="single"
        value={isOn ? 'section' : ''}
        onValueChange={(_value: string | undefined) => onIsOnChange(!isOn)}
      >
        <Accordion.Item value="section">
          {/* Spread after the primitive's `role="button"`, so the row reads as the one switch. */}
          <Accordion.Trigger
            className="gap-3 px-4 py-2.5"
            style={{ minHeight: TouchSize.min }}
            role="switch"
            accessibilityLabel={label}
            aria-checked={isOn}
            accessibilityState={{ checked: isOn, expanded: isOn }}
          >
            <Text
              className="font-inter-semibold text-foreground"
              style={{
                flex: 1,
                fontSize: FACT_ROW_FONT_SIZE,
                lineHeight: lineHeightFor(FACT_ROW_FONT_SIZE),
              }}
            >
              {label}
            </Text>
            {/* The trigger is the one switch node: the drawn Switch drops its role, value and focus. */}
            <View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Switch isSelected={isOn} role="none" accessible={false} aria-valuetext="" />
            </View>
          </Accordion.Trigger>
          <Accordion.Content className="p-0" style={{ padding: 0 }}>
            {children}
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </View>
  );
}
