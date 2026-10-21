import { ConvertedAmountLine } from '@/components/ui/converted_amount_line';
import { RateEditor } from '@/components/ui/rate_editor_sheet';

import { type RatePreviewInput, useTransactionRatePreview } from './transaction_rate_preview.hook';

type ConvertedLineProps = RatePreviewInput & { exchangeRate: string };

// The amount store is read here, not in the body, so typing an amount re-renders only this line.
export function TransactionConvertedAmountLine({
  exchangeRate,
  ...input
}: ConvertedLineProps): React.ReactElement {
  const convertedFor = useTransactionRatePreview(input);
  return <ConvertedAmountLine converted={convertedFor(exchangeRate)} />;
}

type RateEditorProps = RatePreviewInput &
  Omit<React.ComponentProps<typeof RateEditor>, 'convertedFor'>;

export function TransactionRateEditor({
  mode,
  type,
  sourceCurrency,
  destinationCurrency,
  ...editor
}: RateEditorProps): React.ReactElement {
  const convertedFor = useTransactionRatePreview({
    mode,
    type,
    sourceCurrency,
    destinationCurrency,
  });
  return <RateEditor {...editor} convertedFor={convertedFor} />;
}
