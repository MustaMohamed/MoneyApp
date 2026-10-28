import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Sheet } from '@/components/ui/sheet';
import { Spacing } from '@/constants/theme';

import { COMMITMENT_FORM_PICKER_GAP } from './commitment_form.geometry';

interface CommitmentChoiceSheetProps {
  isOpen: boolean;
  title: string;
  testID: string;
  onClose: () => void;
  children: ReactNode;
}

/** The Repeats and Ends rows' sheet: the title names the choice, so the picker inside draws no caption. */
export function CommitmentChoiceSheet({
  isOpen,
  title,
  testID,
  onClose,
  children,
}: CommitmentChoiceSheetProps): React.ReactElement {
  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={title}
      fitContent
      blursInputOnClose
    >
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
    </Sheet>
  );
}
