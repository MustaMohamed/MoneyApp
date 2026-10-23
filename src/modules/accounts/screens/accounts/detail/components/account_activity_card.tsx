import React from 'react';
import { useWindowDimensions } from 'react-native';

import { DetailRowsCard } from '@/components/ui/detail_rows_card';
import { LoadErrorAlert } from '@/components/ui/load_error_alert';
import { SectionHeader } from '@/components/ui/section_header';
import { Strings } from '@/constants/strings';
import type { AccountActivityStatus } from '@/modules/accounts/store/account_activity.store';
import { TransactionRowBody } from '@/modules/transactions/components/transaction_row';
import type { TransactionRowPresentation } from '@/modules/transactions/components/transaction_row.helpers';
import { TransactionRowsSkeleton } from '@/modules/transactions/components/transaction_rows_skeleton';

import { resolveActivityCardView } from './account_activity.helpers';
import { resolveActivitySeeAllHitSlop } from './account_detail_touch.geometry';
import { ActivityEmptyBlock } from './activity_empty_block';

const SKELETON_ROWS = 3;

interface AccountActivityRow {
  id: string;
  presentation: TransactionRowPresentation;
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
  const { fontScale } = useWindowDimensions();

  return (
    <>
      {showSeeAll ? (
        <SectionHeader
          title={Strings.accountActivityTitle}
          action={{
            label: Strings.accountActivitySeeAll,
            onPress: onSeeAll,
            hitSlop: resolveActivitySeeAllHitSlop(fontScale, body === 'error' ? 'error' : 'rows'),
          }}
        />
      ) : (
        <SectionHeader title={Strings.accountActivityTitle} />
      )}
      <DetailRowsCard>
        {body === 'loading' ? (
          <TransactionRowsSkeleton rows={SKELETON_ROWS} showTile={false} />
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
              onPress={() => onRowPress(row.id)}
            />
          ))
        )}
      </DetailRowsCard>
    </>
  );
}
