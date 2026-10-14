import { ExchangeRateRow } from './exchange_rate_row';
import { openRateEditor } from './rate_editor_sheet.hook';

interface Props {
  ownerId: string;
  value: string;
  overrideEnabled: boolean;
  onToggleOverride: () => void;
  rateUpdatedAt: string | null;
}

export function TransactionExchangeRateRow({
  ownerId,
  value,
  overrideEnabled,
  onToggleOverride,
  rateUpdatedAt,
}: Props): React.ReactElement {
  return (
    <ExchangeRateRow
      value={value}
      onOpenEditor={() => openRateEditor(ownerId, value)}
      overrideEnabled={overrideEnabled}
      onToggleOverride={onToggleOverride}
      rateUpdatedAt={rateUpdatedAt}
      previewHidden
      previewEgpAmount={undefined}
    />
  );
}
