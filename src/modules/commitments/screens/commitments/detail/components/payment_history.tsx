import { useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import { DetailRowsCard } from '@/components/ui/detail_rows_card';
import { SectionHeader } from '@/components/ui/section_header';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Strings } from '@/constants/strings';
import { Type, touchFloorHitSlop } from '@/constants/theme';

import { historyEntering } from '../detail.anim';
import type { CommitmentPaymentRowModel } from '../detail.helpers';
import { PaymentRow } from './payment_row';

interface Props {
  rows: readonly CommitmentPaymentRowModel[];
  onSeeAll: () => void;
}

export function PaymentHistory({ rows, onSeeAll }: Props): React.ReactElement | null {
  const { fontScale } = useWindowDimensions();
  if (rows.length === 0) return null;

  return (
    <Animated.View entering={historyEntering}>
      <SectionHeader
        title={Strings.commitmentsDetailPaymentHistory}
        action={{
          label: Strings.commitmentsDetailSeeAll,
          onPress: onSeeAll,
          hitSlop: touchFloorHitSlop(scaledTextStyle(Type.caption, fontScale).lineHeight),
        }}
      />
      <DetailRowsCard testID="commitment-detail-payments">
        {rows.map((row, index) => (
          <PaymentRow key={row.id} row={row} showDivider={index < rows.length - 1} />
        ))}
      </DetailRowsCard>
    </Animated.View>
  );
}
