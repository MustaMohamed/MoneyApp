import { render } from '@testing-library/react-native';
import React from 'react';

import { TransactionType, Currency } from '@/constants/enums';
import { AccentCCTokens, InfoTokens, SemanticTokens } from '@/constants/theme_tokens';
import type { Transaction } from '@/database/entities/transaction.entity';
import { DetailHero } from '@/screens/transactions/detail/components/detail_hero';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');

function mkTx(p: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    type: TransactionType.Expense,
    amount: 100,
    currency: Currency.EGP,
    egp_amount: 100,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    account_id: 'a1',
    to_account_id: null,
    category_id: 'c1',
    note: null,
    transaction_date: '2026-05-19',
    transaction_time: '12:00:00',
    commitment_payment_id: null,
    created_at: 'X',
    updated_at: 'X',
    ...p,
  } as Transaction;
}

describe('DetailHero — type-color contract', () => {
  // Lock the mapping so the detail screen always matches the rest of the
  // app's four-type colour system (TypeTabs, AmountHero, list rows).
  const cases: Array<[TransactionType, string, string]> = [
    [TransactionType.Expense, SemanticTokens.negative, 'red (danger)'],
    [TransactionType.Income, SemanticTokens.positive, 'green (success)'],
    [TransactionType.Transfer, InfoTokens[500], 'blue (info)'],
    [TransactionType.CCPayment, AccentCCTokens[500], 'purple (accent-cc)'],
  ];

  for (const [type, hex, label] of cases) {
    it(`amount text uses ${label} for ${type}`, () => {
      const { getByText } = render(
        <DetailHero
          tx={mkTx({ type })}
          amountText="−100 EGP"
          title="Test"
          dateTimeText="May 19, 2026 · 12:00 PM"
        />,
      );
      const amountNode = getByText('−100 EGP');
      // Hex is passed via inline style.color — flatten if needed.
      const style = amountNode.props.style;
      const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
      expect(flat.color).toBe(hex);
    });
  }
});
