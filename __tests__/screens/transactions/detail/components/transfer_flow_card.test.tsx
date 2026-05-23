import { render } from '@testing-library/react-native';
import React from 'react';

import { AccountType, Currency } from '@/constants/enums';
import type { Account } from '@/database/entities/account.entity';
import { TransferFlowCard } from '@/screens/transactions/detail/components/transfer_flow_card';

// MaterialCommunityIcons is mocked to a plain string component — the icon
// glyph then surfaces as the `name` prop on a host element with type
// "MaterialCommunityIcons", which we can walk via UNSAFE_root.findAll.
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');

function mkAccount(type: AccountType, name = 'My Account'): Account {
  return {
    id: type + '-acct',
    name,
    type,
    currency: Currency.EGP,
    opening_balance: 1000,
    current_balance: 1000,
    color: null,
    credit_limit: null,
    revolving_balance: null,
    minimum_payment: null,
    statement_due_day: null,
    interest_tracking: 0,
    apr: null,
    is_archived: 0,
    sort_order: 0,
    created_at: 'X',
    updated_at: 'X',
  };
}

// Minimal shape of a react-test-renderer instance — we only touch `type`
// and `props.name`. Avoids dragging in the full ReactTestInstance type.
type TestNode = { type: string | React.ComponentType<unknown>; props: { name?: string } };

function iconNames(tree: ReturnType<typeof render>): string[] {
  // Walk every host node, keep the ones whose underlying component type
  // matches our mock string "MaterialCommunityIcons", and grab the `name`
  // prop. There is also the arrow icon between cells, but that's a literal
  // "arrow-right" — the From / To cell icons appear at indices 0 and 2.
  // We assert on the full list so additions/removals are visible.
  return tree.UNSAFE_root.findAll((n: TestNode) => n.type === 'MaterialCommunityIcons').map(
    (n: TestNode) => n.props.name as string,
  );
}

describe('TransferFlowCard — From / To icons by account type', () => {
  // The TransferFlowCard sits at the top of every Transfer and CC Payment
  // detail screen. Before this fix it hardcoded `name="bank"` on both
  // cells, so a piggy-bank → credit-card transfer would show up as two
  // bank glyphs — visually wrong and inconsistent with the dashboard's
  // per-type icons. Lock the mapping so a regression is caught in CI.

  const cases: Array<[AccountType, string]> = [
    [AccountType.Bank, 'bank'],
    [AccountType.SmartWallet, 'cellphone-nfc'],
    [AccountType.PhysicalWallet, 'wallet'],
    [AccountType.PhysicalSavings, 'piggy-bank'],
    [AccountType.CreditCard, 'credit-card'],
  ];

  for (const [type, glyph] of cases) {
    it(`uses "${glyph}" when the From account is ${type}`, () => {
      const tree = render(
        <TransferFlowCard
          fromAccount={mkAccount(type, 'From')}
          toAccount={mkAccount(AccountType.Bank, 'To')}
          fromAmount={100}
          fromCurrency={Currency.EGP}
          toAmount={100}
          toCurrency={Currency.EGP}
        />,
      );
      const icons = iconNames(tree);
      // First MaterialCommunityIcons in DOM order is the From cell's.
      expect(icons[0]).toBe(glyph);
    });

    it(`uses "${glyph}" when the To account is ${type}`, () => {
      const tree = render(
        <TransferFlowCard
          fromAccount={mkAccount(AccountType.Bank, 'From')}
          toAccount={mkAccount(type, 'To')}
          fromAmount={100}
          fromCurrency={Currency.EGP}
          toAmount={100}
          toCurrency={Currency.EGP}
        />,
      );
      const icons = iconNames(tree);
      // Order: [fromIcon, arrowIcon, toIcon] — so the To cell is at [2].
      expect(icons[2]).toBe(glyph);
    });
  }

  it('renders From, arrow, and To icons in that visual order', () => {
    // Sanity check that the index assumption in the tests above is correct.
    const tree = render(
      <TransferFlowCard
        fromAccount={mkAccount(AccountType.SmartWallet, 'Wallet')}
        toAccount={mkAccount(AccountType.CreditCard, 'CC')}
        fromAmount={100}
        fromCurrency={Currency.EGP}
        toAmount={100}
        toCurrency={Currency.EGP}
      />,
    );
    expect(iconNames(tree)).toEqual(['cellphone-nfc', 'arrow-right', 'credit-card']);
  });
});
