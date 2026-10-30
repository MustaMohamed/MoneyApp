import Animated from 'react-native-reanimated';

import { DetailRowsCard } from '@/components/ui/detail_rows_card';
import { SectionHeader } from '@/components/ui/section_header';
import { Strings } from '@/constants/strings';

import { historyEntering } from '../detail.anim';
import type { CommitmentPaymentRowModel } from '../detail.helpers';
import { PaymentRow } from './payment_row';

interface Props {
  rows: readonly CommitmentPaymentRowModel[];
}

export function PaymentHistory({ rows }: Props): React.ReactElement | null {
  if (rows.length === 0) return null;

  return (
    <Animated.View entering={historyEntering}>
      <SectionHeader title={Strings.commitmentsDetailPaymentHistory} />
      <DetailRowsCard testID="commitment-detail-payments">
        {rows.map((row, index) => (
          <PaymentRow key={row.id} row={row} showDivider={index < rows.length - 1} />
        ))}
      </DetailRowsCard>
    </Animated.View>
  );
}
