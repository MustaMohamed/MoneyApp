import { Input, PressableFeedback } from 'heroui-native';
import { type RefObject, useCallback } from 'react';
import { type TextInput, View, useWindowDimensions } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { FormErrorText } from '@/components/ui/form_error_text';
import { Sheet, useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { resolveSheetSizeAboveOne } from '@/components/ui/sheet.helpers';
import { Text } from '@/components/ui/text';
import {
  resolveOneLineTextProps,
  scaledTextStyleAboveOne,
} from '@/components/ui/text_scale.geometry';
import { Strings } from '@/constants/strings';
import { TouchSize, Type, lineHeightFor } from '@/constants/theme';
import { formatStoredMoneyText } from '@/utils/money_text';

import { ConvertedAmountLine } from './converted_amount_line';
import { RATE_MESSAGE_SLOT_STYLE, RATE_RESET_SLOT_STYLE } from './form_sheet.geometry';
import { type ConvertedAmount, resolveRateEditorSource } from './form_sheet.helpers';
import { useRateEditor, useRateEditorFocus } from './rate_editor_sheet.hook';
import { RateStaleLine } from './rate_stale_line';

interface RateEditorSheetBodyProps {
  inputRef: RefObject<TextInput | null>;
  draft: string;
  error: string | undefined;
  onChangeText: (text: string) => void;
  sourceLine: string;
  stale: boolean;
  showsReset: boolean;
  onReset: () => void;
  converted: ConvertedAmount | undefined;
}

// Its own component so `useBottomSheetAwareHandlers` runs inside the sheet's context.
function RateEditorSheetBody({
  inputRef,
  draft,
  error,
  onChangeText,
  sourceLine,
  stale,
  showsReset,
  onReset,
  converted,
}: RateEditorSheetBodyProps) {
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();
  const { fontScale } = useWindowDimensions();
  const oneLine = resolveOneLineTextProps(scaledTextStyleAboveOne(Type.micro, fontScale));

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
      <Text
        testID="rate-editor-source-line"
        className="font-inter text-muted mt-1"
        {...oneLine}
        style={{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro), ...oneLine.style }}
      >
        {sourceLine}
      </Text>
      {stale ? <RateStaleLine testID="rate-editor-stale-line" /> : null}
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
      <ConvertedAmountLine
        converted={converted}
        testID="rate-editor-converted-amount"
        textAlign="left"
        oneLine={oneLine}
      />
      <View testID="rate-editor-reset-slot" style={RATE_RESET_SLOT_STYLE}>
        {showsReset ? (
          <PressableFeedback
            testID="rate-editor-reset"
            onPress={onReset}
            accessibilityRole="button"
            accessibilityLabel={Strings.addTxRateResetToStoredAccessibility}
            style={{ minHeight: TouchSize.min, justifyContent: 'center' }}
          >
            <Text
              className="font-inter text-accent"
              style={{ fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) }}
            >
              {Strings.addTxRateResetToStored}
            </Text>
          </PressableFeedback>
        ) : null}
      </View>
    </View>
  );
}

interface RateEditorSheetProps extends Omit<RateEditorSheetBodyProps, 'inputRef'> {
  isOpen: boolean;
  onCancel: () => void;
  onDone: () => void;
  onOpenSettled: () => void;
  onCloseSettled: () => void;
}

export function RateEditorSheet({
  isOpen,
  onCancel,
  onDone,
  onOpenSettled,
  onCloseSettled,
  ...body
}: RateEditorSheetProps): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const { inputRef, focusInput } = useRateEditorFocus();
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
          onPress={onCancel}
        />
      </Box>
      <Box style={{ flex: 1 }}>
        <Button
          testID="rate-editor-done"
          variant="primary"
          flat
          label={Strings.addTxDatePickerDone}
          onPress={onDone}
        />
      </Box>
    </Box>
  );

  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      // A focus on the open flag raises the keyboard before the sheet settles and leaves the body under it.
      onOpenComplete={handleOpenComplete}
      onCloseComplete={onCloseSettled}
      title={Strings.addTxRateLabel}
      size={resolveSheetSizeAboveOne('sm', fontScale)}
      footer={footer}
      liftsAboveKeyboard
    >
      <RateEditorSheetBody inputRef={inputRef} {...body} />
    </Sheet>
  );
}

interface RateEditorProps {
  ownerId: string;
  value: string;
  onCommit: (text: string) => boolean;
  storedRate: number;
  rateUpdatedAt: string | null;
  stale: boolean;
  /** The converted amount for a rate's text, as the owner's resolver derives it. */
  convertedFor: (rateText: string) => ConvertedAmount | undefined;
}

// Mounted with the form body, not the row, so its sheet has seen every keyboard event before the row opens it.
export function RateEditor({
  ownerId,
  value,
  onCommit,
  storedRate,
  rateUpdatedAt,
  stale,
  convertedFor,
}: RateEditorProps): React.ReactElement {
  const editor = useRateEditor(ownerId, value, onCommit, formatStoredMoneyText(storedRate));
  const source = resolveRateEditorSource({
    draftText: editor.state.draft,
    storedRate,
    rateUpdatedAt,
  });

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
      sourceLine={source.line}
      stale={stale}
      showsReset={!source.usesStoredRate}
      onReset={editor.resetToStoredRate}
      converted={convertedFor(editor.state.draft)}
    />
  );
}
