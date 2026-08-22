import { resolveMonthSpendUsdAmount } from '@/modules/dashboard/screens/dashboard/components/stat_cards.helpers';

// #277 spec §6.4: USD-only by construction (a literal `USD` node sits beside this amount),
// so it carries two USD fixtures instead of two currency directions (F2). Extracted in the
// { value, code } shape c5 keeps -- this is exactly resolveAccountRowAmount's shape
// (more_accounts.geometry.ts:113) -- so c5's adoption (06e4d7b) was a body swap with zero
// test churn.
describe('resolveMonthSpendUsdAmount — stat_cards.tsx:249', () => {
  it('shows cents on a non-whole USD month spend — base value: 1,251, head: 1,250.75', () => {
    expect(resolveMonthSpendUsdAmount(1250.75)).toEqual({ value: '1,250.75', code: 'USD' });
  });

  it('shows the row-12 whole-number shape — base value: 100, head: 100.00', () => {
    expect(resolveMonthSpendUsdAmount(100)).toEqual({ value: '100.00', code: 'USD' });
  });
});
