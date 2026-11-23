import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';

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

/** The commitments option row's one line: the title names the choice, so the row draws no caption. */
export function CommitmentChoiceLabel({ label }: { label: string }): React.ReactElement {
  return (
    <Text
      className="font-sora-semibold text-foreground"
      style={{ flex: 1, fontSize: Type.body, lineHeight: lineHeightFor(Type.body) }}
    >
      {label}
    </Text>
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
