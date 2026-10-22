import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { type ReactNode } from 'react';

import { Strings } from '@/constants/strings';

import { Box } from './box';
import { Button } from './button';
import { Sheet } from './sheet';
import { SHEET_FOOTER_CLEARANCE } from './sheet.helpers';

export const FILTER_SHEET_ACTION_STYLE = { flex: 1 } as const;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  testIDPrefix: string;
  canReset: boolean;
  canApply: boolean;
  draftCount: number;
  onReset: () => void;
  onApply: () => void;
  children: ReactNode;
}

export function FilterSheetFrame({
  isOpen,
  onClose,
  testIDPrefix,
  canReset,
  canApply,
  draftCount,
  onReset,
  onApply,
  children,
}: Props): React.ReactElement {
  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      snapPoints={['45%', '92%']}
      scrollable
      blursInputOnClose
      title={Strings.filterTitle}
      footer={
        <Box style={{ flexDirection: 'row' }} className="gap-2">
          <Box testID={`${testIDPrefix}-reset-action`} style={FILTER_SHEET_ACTION_STYLE}>
            <Button
              variant="secondary"
              flat
              label={Strings.filterReset}
              onPress={onReset}
              isDisabled={!canReset}
            />
          </Box>
          <Box testID={`${testIDPrefix}-apply-action`} style={FILTER_SHEET_ACTION_STYLE}>
            <Button
              variant="primary"
              flat
              label={
                draftCount > 0 ? Strings.filterApplyWithCount(draftCount) : Strings.filterApply
              }
              onPress={onApply}
              isDisabled={!canApply}
            />
          </Box>
        </Box>
      }
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: SHEET_FOOTER_CLEARANCE }}
      >
        {children}
      </BottomSheetScrollView>
    </Sheet>
  );
}
