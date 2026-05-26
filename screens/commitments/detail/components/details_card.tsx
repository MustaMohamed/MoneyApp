import Animated from 'react-native-reanimated';

import { Strings } from '@/constants/strings';
import type { Account } from '@/database/entities/account.entity';
import type { Commitment } from '@/database/entities/commitment.entity';
import { DetailRow } from '@/modules/transactions/screens/transactions/detail/components/detail_row';
import { DetailRowsCard } from '@/modules/transactions/screens/transactions/detail/components/detail_rows_card';
import { formatLongDate } from '@/utils/format_date';

import { cardEntering } from '../detail.anim';

interface Props {
  commitment: Commitment;
  account: Account | undefined;
  recurrenceLabel: string;
  durationLabel: string;
}

export function DetailsCard({ commitment, account, recurrenceLabel, durationLabel }: Props) {
  const hasNotes = commitment.notes != null;

  return (
    <Animated.View entering={cardEntering}>
      <DetailRowsCard>
        <DetailRow
          icon="repeat"
          label={Strings.commitmentsDetailRecurrence}
          value={recurrenceLabel}
        />
        <DetailRow
          icon="calendar-start"
          label={Strings.commitmentsDetailStartDate}
          value={formatLongDate(commitment.start_date)}
        />
        <DetailRow
          icon="bank-outline"
          label={Strings.commitmentsDetailDefaultAccount}
          value={account?.name ?? Strings.commitmentsDetailNone}
        />
        <DetailRow
          icon="timer-sand"
          label={Strings.commitmentsDetailDuration}
          value={durationLabel}
        />
        <DetailRow
          icon="currency-usd"
          label={Strings.commitmentsDetailCurrency}
          value={commitment.currency}
          showDivider={hasNotes}
        />
        {hasNotes ? (
          <DetailRow
            icon="text"
            label={Strings.commitmentsDetailNotes}
            value={commitment.notes!}
            showDivider={false}
          />
        ) : null}
      </DetailRowsCard>
    </Animated.View>
  );
}
