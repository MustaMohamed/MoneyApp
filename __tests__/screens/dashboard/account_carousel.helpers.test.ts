import { AccountType, Currency } from '@/constants/enums';
import { Spacing } from '@/constants/theme';
import type { Account } from '@/modules/accounts/entities/account.entity';
import {
  buildAccountCarouselItems,
  getAccountCarouselItemKey,
  getAccountCarouselItemLayout,
  shouldVirtualizeAccountCarousel,
} from '@/modules/dashboard/screens/dashboard/components/account_carousel';

jest.mock('@/modules/dashboard/screens/dashboard/components/account_card', () => ({
  AccountCard: () => null,
}));
jest.mock('@/modules/dashboard/screens/dashboard/components/add_card', () => ({
  AddCard: () => null,
}));

function account(id: string): Account {
  return {
    id,
    name: id,
    type: AccountType.Bank,
    currency: Currency.EGP,
    opening_balance: 0,
    current_balance: 0,
    color: null,
    credit_limit: null,
    revolving_balance: null,
    minimum_payment: null,
    statement_due_day: null,
    interest_tracking: 0,
    apr: null,
    is_archived: 0,
    balance_review_required: 0,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

describe('account carousel helpers', () => {
  it('virtualizes groups starting at eight accounts', () => {
    expect(shouldVirtualizeAccountCarousel(7)).toBe(false);
    expect(shouldVirtualizeAccountCarousel(8)).toBe(true);
  });

  it('builds stable account keys with Add Account last', () => {
    const accountA = account('a');
    const accountB = account('b');
    const items = buildAccountCarouselItems(AccountType.Bank, [accountA, accountB]);

    expect(items).toEqual([
      { kind: 'account', account: accountA },
      { kind: 'account', account: accountB },
      { kind: 'add', accountType: AccountType.Bank },
    ]);
    expect(items.map(getAccountCarouselItemKey)).toEqual(['account:a', 'account:b', 'add:bank']);
  });

  it('includes card width, leading margin, and separator gap in item geometry', () => {
    const cardWidth = 214.5;
    const length = cardWidth + Spacing.xxs + Spacing.xs;

    expect(getAccountCarouselItemLayout(cardWidth, 0)).toEqual({
      index: 0,
      length,
      offset: 0,
    });
    expect(getAccountCarouselItemLayout(cardWidth, 3)).toEqual({
      index: 3,
      length,
      offset: 3 * length,
    });
  });
});
