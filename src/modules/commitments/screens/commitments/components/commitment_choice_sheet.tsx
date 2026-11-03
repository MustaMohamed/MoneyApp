import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Radio, RadioGroup, cn } from 'heroui-native';
import type { ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { ListCard } from '@/components/ui/list_card';
import { Sheet } from '@/components/ui/sheet';
import { SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet.helpers';
import { Text } from '@/components/ui/text';
import { Spacing, Type, lineHeightFor } from '@/constants/theme';

import {
  COMMITMENT_FORM_PICKER_GAP,
  resolveCommitmentChoiceSheetSizing,
} from './commitment_form.geometry';

interface CommitmentChoiceSheetProps {
  isOpen: boolean;
  title: string;
  testID: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

/** The Repeats and Ends rows' sheet: the title names the choice, so the picker inside draws no caption. */
export function CommitmentChoiceSheet({
  isOpen,
  title,
  testID,
  onClose,
  footer,
  children,
}: CommitmentChoiceSheetProps): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const sizing = resolveCommitmentChoiceSheetSizing(fontScale, footer !== undefined);
  const body = (
    <View
      testID={testID}
      style={{
        paddingHorizontal: Spacing.md,
        paddingTop: COMMITMENT_FORM_PICKER_GAP,
        paddingBottom: Spacing.xl,
      }}
    >
      {children}
    </View>
  );
  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={title}
      fitContent={sizing.fitContent}
      scrollable={sizing.scrollable}
      size={sizing.size}
      footer={footer}
      blursInputOnClose
    >
      {sizing.scrollable ? (
        <BottomSheetScrollView
          testID={`${testID}-scroll`}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: SHEET_FOOTER_CLEARANCE }}
          showsVerticalScrollIndicator={false}
        >
          {body}
        </BottomSheetScrollView>
      ) : (
        body
      )}
    </Sheet>
  );
}

interface CommitmentChoiceOptionsProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onValueChange: (value: T) => void;
  testIDPrefix: string;
}

/** One card of radio rows, drawn as the transaction sheet's budget picker draws its rows. */
export function CommitmentChoiceOptions<T extends string>({
  options,
  value,
  onValueChange,
  testIDPrefix,
}: CommitmentChoiceOptionsProps<T>): React.ReactElement {
  const handleValueChange = (next: string) => {
    const picked = options.find((option) => option.value === next);
    if (picked !== undefined) onValueChange(picked.value);
  };
  return (
    <ListCard>
      {/* `gap-0`: the root's own gap would open 12 dp between the rows. */}
      <RadioGroup value={value} onValueChange={handleValueChange} className="gap-0">
        {options.map((option, index) => (
          <RadioGroup.Item
            key={option.value}
            value={option.value}
            testID={`${testIDPrefix}-${option.value}`}
            accessibilityLabel={option.label}
            className={cn(
              'min-h-14 gap-3 px-4 py-2.5',
              index < options.length - 1 && 'border-separator border-b',
            )}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <Text
              className="font-inter text-foreground"
              style={{ flex: 1, fontSize: Type.body, lineHeight: lineHeightFor(Type.body) }}
            >
              {option.label}
            </Text>
            <Radio testID={`${testIDPrefix}-${option.value}-selected`} />
          </RadioGroup.Item>
        ))}
      </RadioGroup>
    </ListCard>
  );
}
