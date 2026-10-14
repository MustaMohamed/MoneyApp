import { Input, PressableFeedback } from 'heroui-native';
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
import { Text } from '@/components/ui/text';
import {
  resolveOneLineTextProps,
  scaledTextStyleAboveOne,
} from '@/components/ui/text_scale.geometry';
import { Strings } from '@/constants/strings';
import { TouchSize, Type, lineHeightFor } from '@/constants/theme';
import { formatStoredMoneyText } from '@/utils/money_text';

import { isRateStale, resolveRateEditorSource } from '../transaction_form.helpers';
import { ConvertedAmountLine } from './converted_amount_line';
import { useRateEditor, useRateEditorFocus } from './rate_editor_sheet.hook';
import { RATE_MESSAGE_SLOT_STYLE, RATE_RESET_SLOT_STYLE } from './transaction_form.geometry';
import type { RatePreviewInput } from './transaction_rate_preview.hook';

type RatePreviewContext = Omit<RatePreviewInput, 'exchangeRate'>;

interface RateEditorSheetBodyProps {
  inputRef: RefObject<TextInput | null>;
  draft: string;
  error: string | undefined;
  onChangeText: (text: string) => void;
  sourceLine: string;
  stale: boolean;
  showsReset: boolean;
  onReset: () => void;
  preview: RatePreviewContext;
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
  preview,
}: RateEditorSheetBodyProps) {
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();
  const { fontScale } = useWindowDimensions();
  const oneLine = resolveOneLineTextProps(scaledTextStyleAboveOne(Type.micro, fontScale));
  const lineStyle = {
    fontSize: Type.micro,
    lineHeight: lineHeightFor(Type.micro),
    ...oneLine.style,
  };

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
        style={lineStyle}
      >
        {sourceLine}
      </Text>
      {stale ? (
        <Text
          testID="rate-editor-stale-line"
          className="font-inter text-warning"
          {...oneLine}
          style={lineStyle}
        >
          {Strings.addTxRateStale}
        </Text>
      ) : null}
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
        {...preview}
        exchangeRate={draft}
        testID="rate-editor-converted-amount"
        textAlign="left"
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

interface RateEditorSheetProps {
  isOpen: boolean;
  draft: string;
  error: string | undefined;
  onChangeText: (text: string) => void;
  onCancel: () => void;
  onDone: () => void;
  onOpenSettled: () => void;
  onCloseSettled: () => void;
  sourceLine: string;
  stale: boolean;
  showsReset: boolean;
  onReset: () => void;
  preview: RatePreviewContext;
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
        sourceLine={props.sourceLine}
        stale={props.stale}
        showsReset={props.showsReset}
        onReset={props.onReset}
        preview={props.preview}
      />
    </Sheet>
  );
}

interface TransactionRateEditorProps extends RatePreviewContext {
  ownerId: string;
  value: string;
  onCommit: (text: string) => boolean;
  storedRate: number;
  rateUpdatedAt: string | null;
}

// Mounted with the form body, not the row, so its sheet has seen every keyboard event before the row opens it.
export function TransactionRateEditor({
  ownerId,
  value,
  onCommit,
  storedRate,
  rateUpdatedAt,
  ...preview
}: TransactionRateEditorProps): React.ReactElement {
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
      stale={isRateStale(rateUpdatedAt, Date.now())}
      showsReset={!source.usesStoredRate}
      onReset={editor.resetToStoredRate}
      preview={preview}
    />
  );
}
