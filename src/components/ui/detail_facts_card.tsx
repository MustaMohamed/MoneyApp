import React from 'react';

import { DetailFactRow } from '@/components/ui/detail_fact_row';
import type { DetailFact } from '@/components/ui/detail_fact_row.helpers';
import { DetailRowsCard } from '@/components/ui/detail_rows_card';

interface Props {
  facts: readonly DetailFact[];
  testID?: string;
}

/** Canvas `.facts`: one row per fact, a divider under every row but the last. */
export function DetailFactsCard({ facts, testID }: Props): React.ReactElement {
  return (
    <DetailRowsCard testID={testID}>
      {facts.map((fact, index) => (
        <DetailFactRow key={fact.kind} fact={fact} showDivider={index < facts.length - 1} />
      ))}
    </DetailRowsCard>
  );
}
