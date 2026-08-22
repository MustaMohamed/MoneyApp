import { resolveNetWorthUsdCaption } from '@/modules/dashboard/screens/dashboard/components/net_worth_breakdown_sheet.helpers';

// #277 spec §6.4: USD-only by construction (a literal `USD` node sits beside this amount),
// so it carries two USD fixtures instead of two currency directions (F2). M1 (USD 2->0)
// reds both; M2 (EGP 0->2) is a structural no-op here.
describe('resolveNetWorthUsdCaption — net_worth_breakdown_sheet.tsx:164', () => {
  it('shows cents on a non-whole USD net worth — base: 1,251, head: 1,250.75', () => {
    expect(resolveNetWorthUsdCaption(1250.75)).toBe('≈ 1,250.75 USD');
  });

  it('shows the row-12 whole-number shape — base: 100, head: 100.00', () => {
    expect(resolveNetWorthUsdCaption(100)).toBe('≈ 100.00 USD');
  });

  it('renders the absent-rate placeholder unchanged when netWorthUsd is undefined', () => {
    // Keyed on the FIELD being absent, not on `rate > 0` — see the comment this resolver
    // carries. A `?? 0` here would silently print `≈ 0.00 USD` for a user who never fetched
    // a rate.
    expect(resolveNetWorthUsdCaption(undefined)).toBe('— USD');
  });
});
