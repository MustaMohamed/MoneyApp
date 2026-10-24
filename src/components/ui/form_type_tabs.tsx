import { View, useWindowDimensions } from 'react-native';

import { resolveTypeTabsGeometry } from '@/components/ui/form_sheet.geometry';
import { SegmentedTabs, type TabSegment } from '@/components/ui/tabs';

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
