import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Alert } from 'heroui-native';
import React from 'react';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { FormErrorText } from '@/components/ui/form_error_text';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { SemanticTokens } from '@/constants/theme_tokens';
import { DetailRowsCard } from '@/modules/transactions/screens/transactions/detail/components/detail_rows_card';

import type { Account } from '../../../../store/account.store';
import { AccountFactRow } from './account_fact_row';
import { buildArchivedAccountFacts } from './account_facts.helpers';
import { BalanceHero } from './balance_hero';

interface ArchivedDetailBodyProps {
  account: Account;
  transactionCount: number;
  activeCommitmentCount: number;
  onUnarchive: () => void;
  onDelete: () => void;
  isUnarchiving: boolean;
  errorMessage?: string;
}

export function ArchivedDetailBody({
  account,
  transactionCount,
  activeCommitmentCount,
  onUnarchive,
  onDelete,
  isUnarchiving,
  errorMessage,
}: ArchivedDetailBodyProps): React.ReactElement {
  const facts = buildArchivedAccountFacts(account, { transactionCount, activeCommitmentCount });

  return (
    <>
      <Alert status="warning" className="mx-4 mt-4">
        <Alert.Indicator>
          <MaterialCommunityIcons
            name="archive-outline"
            size={Size.iconSm}
            color={SemanticTokens.warning}
          />
        </Alert.Indicator>
        <Alert.Content>
          <Alert.Title>{Strings.accountDetailArchivedTitle}</Alert.Title>
          <Alert.Description>{Strings.accountDetailArchivedBody}</Alert.Description>
        </Alert.Content>
      </Alert>

      <BalanceHero account={account} />

      <DetailRowsCard>
        {facts.map((fact, index) => (
          <AccountFactRow
            key={fact.label}
            label={fact.label}
            value={fact.value}
            valueColor={fact.valueColor}
            showDivider={index < facts.length - 1}
          />
        ))}
      </DetailRowsCard>

      <Box className="mx-4 mt-4">
        <Button
          variant="secondary"
          flat
          tone="accent"
          icon="archive-arrow-up-outline"
          label={Strings.accountDetailUnarchive}
          onPress={onUnarchive}
          isLoading={isUnarchiving}
          isDisabled={isUnarchiving}
        />
      </Box>
      <Box className="mx-4 mt-2">
        <Button
          variant="ghost"
          flat
          tone="danger"
          icon="trash-can-outline"
          label={Strings.accountDetailDelete}
          onPress={onDelete}
        />
      </Box>
      <FormErrorText message={errorMessage} className="mx-4" />
    </>
  );
}
