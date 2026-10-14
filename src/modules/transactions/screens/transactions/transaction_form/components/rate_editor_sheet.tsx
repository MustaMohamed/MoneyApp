import { Input } from 'heroui-native';
import type { RefObject } from 'react';
import { type TextInput, View, useWindowDimensions } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { FormErrorText } from '@/components/ui/form_error_text';
import {
  Sheet,
  resolveSheetSizeAboveOne,
  useBottomSheetAwareHandlers,
} from '@/components/ui/sheet';
import { Strings } from '@/constants/strings';
import { Type, lineHeightFor } from '@/constants/theme';

import { useRateEditorFocus } from './rate_editor_sheet.hook';
import { RATE_EDITOR_MESSAGE_SLOT_STYLE } from './transaction_form.geometry';

interface RateEditorSheetBodyProps {
  inputRef: RefObject<TextInput | null>;
  draft: string;
  error: string | undefined;
  onChangeText: (text: string) => void;
}

// Its own component so `useBottomSheetAwareHandlers` runs inside the sheet's context.
function RateEditorSheetBody({ inputRef, draft, error, onChangeText }: RateEditorSheetBodyProps) {
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();

  return (
    <View className="px-4 pt-2">
      <Input
        ref={inputRef}
        testID="rate-editor-input"
        value={draft}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        keyboardType="decimal-pad"
        placeholder={Strings.addTxRatePlaceholder}
        accessibilityLabel={Strings.addTxRateInputAccessibility}
        isInvalid={error !== undefined}
      />
      <View
        testID="rate-editor-message-slot"
        style={RATE_EDITOR_MESSAGE_SLOT_STYLE}
        accessibilityLiveRegion="polite"
      >
        <FormErrorText
          message={error}
          disableAnimation
          style={{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) }}
        />
      </View>
    </View>
  );
}

interface RateEditorSheetProps {
  isOpen: boolean;
  draft: string;
  error: string | undefined;
  onChangeText: (text: string) => void;
  onCancel: () => void;
  onDone: () => void;
}

export function RateEditorSheet(props: RateEditorSheetProps): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const { inputRef, focusInput } = useRateEditorFocus();
  const footer = (
    <Box style={{ flexDirection: 'row' }} className="gap-2">
      <Box style={{ flex: 1 }}>
        <Button
          testID="rate-editor-cancel"
          variant="secondary"
          flat
          label={Strings.addTxDatePickerCancel}
          onPress={props.onCancel}
        />
      </Box>
      <Box style={{ flex: 1 }}>
        <Button
          testID="rate-editor-done"
          variant="primary"
          flat
          label={Strings.addTxDatePickerDone}
          onPress={props.onDone}
        />
      </Box>
    </Box>
  );

  return (
    <Sheet
      isOpen={props.isOpen}
      onOpenChange={(open) => {
        if (!open) props.onCancel();
      }}
      // A focus on the open flag raises the keyboard before the sheet settles and leaves the body under it.
      onOpenComplete={focusInput}
      title={Strings.addTxRateLabel}
      size={resolveSheetSizeAboveOne('sm', fontScale)}
      footer={footer}
      liftsAboveKeyboard
    >
      <RateEditorSheetBody
        inputRef={inputRef}
        draft={props.draft}
        error={props.error}
        onChangeText={props.onChangeText}
      />
    </Sheet>
  );
}
