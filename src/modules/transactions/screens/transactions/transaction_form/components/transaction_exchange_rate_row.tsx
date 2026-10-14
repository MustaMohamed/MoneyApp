import { ExchangeRateRow } from './exchange_rate_row';
import { RateEditorSheet } from './rate_editor_sheet';
import { useRateEditor } from './rate_editor_sheet.hook';

interface RateEditorProps {
  ownerId: string;
  value: string;
  onCommit: (text: string) => boolean;
}

interface Props extends RateEditorProps {
  overrideEnabled: boolean;
  onToggleOverride: () => void;
  rateUpdatedAt: string | null;
}

export function TransactionExchangeRateRow({
  ownerId,
  value,
  onCommit,
  overrideEnabled,
  onToggleOverride,
  rateUpdatedAt,
}: Props): React.ReactElement {
  const editor = useRateEditor(ownerId, value, onCommit);

  return (
    <ExchangeRateRow
      value={value}
      onOpenEditor={editor.open}
      overrideEnabled={overrideEnabled}
      onToggleOverride={onToggleOverride}
      rateUpdatedAt={rateUpdatedAt}
      previewHidden
      previewEgpAmount={undefined}
    />
  );
}

// Mounted with the form body, not the card, so its sheet is in place when a keyboard show arrives before the field's focus.
export function TransactionRateEditor({
  ownerId,
  value,
  onCommit,
}: RateEditorProps): React.ReactElement {
  const editor = useRateEditor(ownerId, value, onCommit);

  return (
    <RateEditorSheet
      isOpen={editor.state.isOpen}
      draft={editor.state.draft}
      error={editor.state.error}
      onChangeText={editor.setDraft}
      onCancel={editor.cancel}
      onDone={editor.done}
    />
  );
}
