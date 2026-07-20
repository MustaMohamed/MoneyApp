import { shouldHideGlobalFab } from '@/components/ui/fab_visibility';

describe('global FAB visibility', () => {
  it.each(['/transactions/detail/tx-1', '/commitments/payment-1', '/budget/plan/plan-1'])(
    'hides the list-level FAB on the %s subroute',
    (pathname) => {
      expect(shouldHideGlobalFab(pathname, false)).toBe(true);
    },
  );

  it('keeps the FAB available on list routes', () => {
    expect(shouldHideGlobalFab('/transactions', false)).toBe(false);
  });

  it('hides the FAB whenever a sheet is open', () => {
    expect(shouldHideGlobalFab('/transactions', true)).toBe(true);
  });
});
