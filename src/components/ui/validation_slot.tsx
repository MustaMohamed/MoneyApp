import { View } from 'react-native';

import { FormErrorText } from '@/components/ui/form_error_text';
import { AMOUNT_MESSAGE_TEXT_STYLE } from '@/components/ui/form_sheet.geometry';
import { ms } from '@/utils/responsive';

export const VALIDATION_SLOT_MIN_HEIGHT = ms(16);

interface ValidationSlotProps {
  testID: string;
  liveTestID: string;
  message?: string;
  children?: React.ReactNode;
}

export function ValidationSlot({ testID, liveTestID, message, children }: ValidationSlotProps) {
  return (
    <View
      testID={testID}
      style={{ minHeight: VALIDATION_SLOT_MIN_HEIGHT }}
      className="justify-center px-4"
    >
      {/* collapsable={false} keeps the View: Fabric flattens one whose only prop is the live region. */}
      <View testID={liveTestID} collapsable={false} accessibilityLiveRegion="polite">
        <FormErrorText
          message={message}
          numberOfLines={1}
          disableAnimation
          style={AMOUNT_MESSAGE_TEXT_STYLE}
        />
      </View>
      {children}
    </View>
  );
}
