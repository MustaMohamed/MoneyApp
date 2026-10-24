import { View, useWindowDimensions } from 'react-native';

import {
  ACCOUNT_STRIP_WRAPPER_PADDING_Y,
  resolveFormSupportLineProps,
  resolveTypeTabsGeometry,
} from '@/components/ui/form_sheet.geometry';
import { SegmentedTabs, type TabSegment } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';

interface FormTypeTabsProps<T extends string> {
  segments: TabSegment<T>[];
  value: T;
  onValueChange: (value: T) => void;
  accessibilityLabel: string;
  isDisabled?: boolean | undefined;
}

export function FormTypeTabs<T extends string>({
  segments,
  value,
  onValueChange,
  accessibilityLabel,
  isDisabled,
}: FormTypeTabsProps<T>): React.ReactElement {
  const { listHeight, triggerHitSlop } = resolveTypeTabsGeometry(useWindowDimensions().fontScale);

  return (
    <View className="border-separator border-b px-4 py-2">
      <SegmentedTabs<T>
        segments={segments}
        value={value}
        onValueChange={onValueChange}
        variant="solid-gold"
        density="compact"
        corners="form"
        listClassName="w-full"
        listStyle={{ height: listHeight }}
        triggerHitSlop={triggerHitSlop}
        accessibilityLabel={accessibilityLabel}
        isDisabled={isDisabled}
      />
    </View>
  );
}

export function FormSupportLine({
  text,
  wrap,
}: {
  text: string;
  wrap: boolean;
}): React.ReactElement {
  const line = resolveFormSupportLineProps(wrap, useWindowDimensions().fontScale);

  return (
    <View className="min-h-8 justify-center px-4 py-1.5">
      <Text className="font-inter text-muted" {...line}>
        {text}
      </Text>
    </View>
  );
}

export function FormStrip({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <View
      className="border-separator border-b"
      style={{ paddingVertical: ACCOUNT_STRIP_WRAPPER_PADDING_Y }}
    >
      {children}
    </View>
  );
}
