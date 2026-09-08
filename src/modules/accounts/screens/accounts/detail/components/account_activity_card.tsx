import React from 'react';

import { LoadErrorAlert } from '@/components/ui/load_error_alert';
import { SectionHeader } from '@/components/ui/section_header';
import { Strings } from '@/constants/strings';
import type { Category } from '@/modules/categories/entities/category.entity';
import { TransactionRowBody } from '@/modules/transactions/screens/transactions/components/transaction_row';
import type { TransactionRowPresentation } from '@/modules/transactions/screens/transactions/components/transaction_row.helpers';
import { TransactionRowsSkeleton } from '@/modules/transactions/screens/transactions/components/transaction_rows_skeleton';
import { DetailRowsCard } from '@/modules/transactions/screens/transactions/detail/components/detail_rows_card';

import type { AccountActivityStatus } from '../account_activity.store';
import { resolveActivityCardView } from './account_activity.helpers';
import { ActivityEmptyBlock } from './activity_empty_block';

const SKELETON_ROWS = 3;

interface AccountActivityRow {
  id: string;
  presentation: TransactionRowPresentation;
  category?: Category;
}

interface Props {
  status: AccountActivityStatus;
  rows: AccountActivityRow[];
  onRowPress: (id: string) => void;
  onSeeAll: () => void;
  onAdd: () => void;
  onRetry: () => void;
}

export function AccountActivityCard({
  status,
  rows,
  onRowPress,
  onSeeAll,
  onAdd,
  onRetry,
}: Props): React.ReactElement {
  const { body, showSeeAll } = resolveActivityCardView(status, rows.length);

  return (
    <>
      {showSeeAll ? (
        <SectionHeader
          title={Strings.accountActivityTitle}
          action={{ label: Strings.accountActivitySeeAll, onPress: onSeeAll }}
        />
      ) : (
        <SectionHeader title={Strings.accountActivityTitle} />
      )}
      <DetailRowsCard>
        {body === 'loading' ? (
          <TransactionRowsSkeleton rows={SKELETON_ROWS} showDateHeader={false} />
        ) : body === 'error' ? (
          <LoadErrorAlert
            mode="inline"
            flatRetry
            title={Strings.accountActivityLoadError}
            retryLabel={Strings.accountActivityLoadRetry}
            onRetry={onRetry}
            testID="account-activity-error"
          />
        ) : body === 'empty' ? (
          <ActivityEmptyBlock onAdd={onAdd} />
        ) : (
          rows.map((row) => (
            <TransactionRowBody
              key={row.id}
              presentation={row.presentation}
              category={row.category}
              onPress={() => onRowPress(row.id)}
            />
          ))
        )}
      </DetailRowsCard>
    </>
  );
}
