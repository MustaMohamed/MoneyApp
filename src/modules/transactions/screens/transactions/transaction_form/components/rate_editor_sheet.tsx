import { Input } from 'heroui-native';
import { type RefObject, useCallback } from 'react';
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

import { useRateEditor, useRateEditorFocus } from './rate_editor_sheet.hook';
import { RATE_MESSAGE_SLOT_STYLE } from './transaction_form.geometry';

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
        style={RATE_MESSAGE_SLOT_STYLE}
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
  onOpenSettled: () => void;
  onCloseSettled: () => void;
}

export function RateEditorSheet(props: RateEditorSheetProps): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const { inputRef, focusInput } = useRateEditorFocus();
  const { onOpenSettled, onCloseSettled } = props;
  const handleOpenComplete = useCallback(() => {
    focusInput();
    onOpenSettled();
  }, [focusInput, onOpenSettled]);
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
      onOpenComplete={handleOpenComplete}
      onCloseComplete={onCloseSettled}
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

interface TransactionRateEditorProps {
  ownerId: string;
  value: string;
  onCommit: (text: string) => boolean;
}

// Mounted with the form body, not the card, so its sheet has seen every keyboard event before the card opens it.
export function TransactionRateEditor({
  ownerId,
  value,
  onCommit,
}: TransactionRateEditorProps): React.ReactElement {
  const editor = useRateEditor(ownerId, value, onCommit);

  return (
    <RateEditorSheet
      isOpen={editor.state.isOpen}
      draft={editor.state.draft}
      error={editor.state.error}
      onChangeText={editor.setDraft}
      onCancel={editor.cancel}
      onDone={editor.done}
      onOpenSettled={editor.settleOpen}
      onCloseSettled={editor.settleClose}
    />
  );
}
