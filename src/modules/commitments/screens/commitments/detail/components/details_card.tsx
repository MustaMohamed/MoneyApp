import Animated from 'react-native-reanimated';

import { DetailFactRow } from '@/components/ui/detail_fact_row';
import type { DetailFact } from '@/components/ui/detail_fact_row.helpers';
import { DetailRowsCard } from '@/components/ui/detail_rows_card';

import { cardEntering } from '../detail.anim';
import type { CommitmentDetailFactKind } from '../detail.helpers';

interface Props {
  facts: readonly DetailFact<CommitmentDetailFactKind>[];
}

export function DetailsCard({ facts }: Props) {
  return (
    <Animated.View entering={cardEntering}>
      <DetailRowsCard testID="commitment-detail-facts">
        {facts.map((fact, index) => (
          <DetailFactRow key={fact.kind} fact={fact} showDivider={index < facts.length - 1} />
        ))}
      </DetailRowsCard>
    </Animated.View>
  );
}
