import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { RadioGroup } from 'heroui-native';
import type { ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { ListCard } from '@/components/ui/list_card';
import { RadioOptionRow } from '@/components/ui/radio_option_row';
import { Sheet } from '@/components/ui/sheet';
import { SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet.helpers';
import { Text } from '@/components/ui/text';
import { LetterSpacing, Radius, Size, Spacing, Type, lineHeightFor } from '@/constants/theme';

import {
  COMMITMENT_CHOICE_SHEET_PADDING_TOP,
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
        paddingTop: COMMITMENT_CHOICE_SHEET_PADDING_TOP,
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

/** One card of radio rows, drawn as the budget picker draws its rows, but the last row takes no separator: the card's border closes it. */
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
          <RadioOptionRow
            key={option.value}
            value={option.value}
            testID={`${testIDPrefix}-${option.value}`}
            accessibilityLabel={option.label}
            separator={index < options.length - 1}
          >
            <Text
              className="font-sora-semibold text-foreground"
              style={{ flex: 1, fontSize: Type.body, lineHeight: lineHeightFor(Type.body) }}
            >
              {option.label}
            </Text>
          </RadioOptionRow>
        ))}
      </RadioGroup>
    </ListCard>
  );
}

interface CommitmentChoiceBlockProps {
  testID: string;
  label: string;
  line?: string;
  children: ReactNode;
}

/** The bordered box under the option rows that holds a choice's own controls, under its overline. */
export function CommitmentChoiceBlock({
  testID,
  label,
  line,
  children,
}: CommitmentChoiceBlockProps): React.ReactElement {
  return (
    <View
      testID={testID}
      className="bg-background border-separator"
      style={{
        marginTop: Spacing.sm,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderWidth: Size.hairline,
        borderRadius: Radius.lg,
      }}
    >
      <Text
        className="font-inter-semibold text-muted uppercase"
        style={{
          marginBottom: Spacing.xs,
          fontSize: Type.overline,
          lineHeight: lineHeightFor(Type.overline),
          letterSpacing: LetterSpacing.eyebrow,
        }}
      >
        {label}
      </Text>
      {children}
      {line === undefined ? null : (
        <Text
          testID={`${testID}-line`}
          className="font-inter text-muted"
          style={{
            marginTop: Spacing.xs,
            fontSize: Type.caption,
            lineHeight: lineHeightFor(Type.caption),
          }}
        >
          {line}
        </Text>
      )}
    </View>
  );
}
