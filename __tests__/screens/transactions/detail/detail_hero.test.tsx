import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { InfoTokens } from '@/constants/theme_tokens';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { DetailHero } from '@/modules/transactions/screens/transactions/detail/components/detail_hero';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('@/components/ui/hero_shell', () => {
  const ReactLocal = jest.requireActual<typeof import('react')>('react');
  const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    HeroShell: ({ children, glowColor }: { children: ReactNode; glowColor: string }) =>
      ReactLocal.createElement(
        RNView,
        { testID: 'detail-hero-shell', accessibilityLabel: glowColor },
        children,
      ),
  };
});
jest.mock('@/components/ui/type_badge', () => ({ TypeBadge: () => null }));

const cardCredit: Transaction = {
  id: 'credit-1',
  type: TransactionType.Income,
  amount: 250,
  currency: Currency.EGP,
  egp_amount: 250,
  exchange_rate: null,
  to_amount: null,
  minimum_payment_snapshot: null,
  revolving_balance_delta: null,
  account_id: 'credit-card',
  to_account_id: null,
  category_id: null,
  budget_id: null,
  note: null,
  transaction_date: '2026-07-20',
  transaction_time: '12:00:00',
  commitment_payment_id: null,
  installment_id: null,
  created_at: '2026-07-20T12:00:00.000Z',
  updated_at: '2026-07-20T12:00:00.000Z',
};

describe('DetailHero', () => {
  it('renders the presentation-ready card-credit identity instead of generic income', () => {
    const screen = render(
      <DetailHero
        tx={cardCredit}
        amountText="+250 EGP"
        title={Strings.cardCreditTitle}
        dateTimeText="July 20, 2026 · 12:00 PM"
        badgeLabel={Strings.cardCreditTitle}
        heroColor={InfoTokens[500]}
      />,
    );

    expect(screen.getAllByText(Strings.cardCreditTitle)).toHaveLength(2);
    expect(screen.queryByText(Strings.typeBadgeIncome)).toBeNull();
    expect(screen.getByTestId('detail-hero-shell')).toHaveProp(
      'accessibilityLabel',
      InfoTokens[500],
    );
  });
});
