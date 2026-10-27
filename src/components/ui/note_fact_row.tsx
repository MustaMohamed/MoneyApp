import { Input } from 'heroui-native';
import type { ReactElement } from 'react';
import { useWindowDimensions } from 'react-native';

import { FactRow } from '@/components/ui/fact_row';
import { resolveNoteInputGeometry } from '@/components/ui/form_sheet.geometry';
import { INPUT_NO_FOCUS_BORDER_COLOR } from '@/components/ui/input';
import { useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Type, lineHeightFor } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

interface NoteFactRowProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
  onBlur: () => void;
  testID?: string;
  maxLength?: number;
  inset?: boolean;
}

/** A form card's last row; it renders inside a `Sheet`'s children, where the sheet-aware handlers reach gorhom. */
export function NoteFactRow({
  label,
  placeholder,
  value,
  onChangeText,
  onFocus,
  onBlur,
  testID = 'note-row',
  maxLength,
  inset = true,
}: NoteFactRowProps): ReactElement {
  const { onFocus: onSheetFocus, onBlur: onSheetBlur } = useBottomSheetAwareHandlers();
  const { fontScale } = useWindowDimensions();
  const noteGeometry = resolveNoteInputGeometry(fontScale);
  const handleFocus: typeof onSheetFocus = (event) => {
    onSheetFocus(event);
    onFocus?.();
  };
  const handleBlur: typeof onSheetBlur = (event) => {
    onSheetBlur(event);
    onBlur();
  };

  return (
    <FactRow testID={testID} label={label} showDivider={false} inset={inset}>
      <Input
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        placeholder={placeholder}
        placeholderTextColor={CoreTokens.text2}
        onFocus={handleFocus}
        onBlur={handleBlur}
        // Android: a single-line edit text keeps the parent's touch lock, so a drag that starts on it never scrolls the form.
        multiline
        allowFontScaling={noteGeometry.text === undefined}
        submitBehavior="blurAndSubmit"
        variant="secondary"
        className="font-sora text-foreground rounded-none border-0 bg-transparent p-0 tabular-nums"
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: noteGeometry.minHeight,
          textAlign: 'right',
          borderColor: INPUT_NO_FOCUS_BORDER_COLOR,
          fontSize: Type.body,
          lineHeight: lineHeightFor(Type.body),
          ...noteGeometry.text,
        }}
      />
    </FactRow>
  );
}
