import Animated from 'react-native-reanimated';

import type { DetailFact } from '@/components/ui/detail_fact_row.helpers';
import { DetailFactsCard } from '@/components/ui/detail_facts_card';

import { cardEntering } from '../detail.anim';
import type { CommitmentDetailFactKind } from '../detail.helpers';

interface Props {
  facts: readonly DetailFact<CommitmentDetailFactKind>[];
}

export function DetailsCard({ facts }: Props) {
  return (
    <Animated.View entering={cardEntering}>
      <DetailFactsCard facts={facts} testID="commitment-detail-facts" />
    </Animated.View>
  );
}
