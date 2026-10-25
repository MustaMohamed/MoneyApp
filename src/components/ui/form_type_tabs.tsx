import { View, useWindowDimensions } from 'react-native';

import {
  ACCOUNT_STRIP_WRAPPER_PADDING_Y,
  type FormSupportLines,
  resolveFormSupportLineTextProps,
  resolveTypeTabsGeometry,
} from '@/components/ui/form_sheet.geometry';
import { SegmentedTabs, type TabSegment } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';

interface FormTypeTabsProps<T extends string> {
  segments: TabSegment<T>[];
  value: T;
  onValueChange: (value: T) => void;
  accessibilityLabel: string;
  isDisabled?: boolean;
  supportText: string;
  supportLines: FormSupportLines;
  /** The strip, drawn inside `FormStripRow`. */
  children: React.ReactNode;
}

/** A form sheet's top: the type tabs, the support line under them and the strip row, edge to edge. */
export function FormTypeTabs<T extends string>({
  segments,
  value,
  onValueChange,
  accessibilityLabel,
  isDisabled,
  supportText,
  supportLines,
  children,
}: FormTypeTabsProps<T>): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const { listHeight, triggerHitSlop } = resolveTypeTabsGeometry(fontScale);

  return (
    <>
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
      <View className="min-h-8 justify-center px-4 py-1.5">
        <Text
          testID="form-type-tabs-support-line"
          className="font-inter text-muted"
          {...resolveFormSupportLineTextProps(supportLines, fontScale)}
        >
          {supportText}
        </Text>
      </View>
      <FormStripRow>{children}</FormStripRow>
    </>
  );
}

export function FormStripRow({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <View
      testID="form-strip-row"
      className="border-separator border-b"
      style={{ paddingVertical: ACCOUNT_STRIP_WRAPPER_PADDING_Y }}
    >
      {children}
    </View>
  );
}
