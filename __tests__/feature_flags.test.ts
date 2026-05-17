import { FeatureFlags } from '@/constants/feature_flags';

describe('FeatureFlags', () => {
  it('has all 6 remaining section flags (newDashboard removed in §5 cleanup)', () => {
    expect(FeatureFlags).toMatchObject({
      newOnboarding: expect.any(Boolean),
      newSettings: expect.any(Boolean),
      newTransactions: expect.any(Boolean),
      newAddTransaction: expect.any(Boolean),
      newCommitments: expect.any(Boolean),
      newAccounts: expect.any(Boolean),
    });
  });

  it('matches the current migration state (forces deliberate test update on each flag flip)', () => {
    expect(FeatureFlags).toEqual({
      newOnboarding: false, // §2
      newSettings: false, // §4
      newTransactions: false, // §6
      newAddTransaction: false, // §7
      newCommitments: false, // §8
      newAccounts: false, // §9
    });
  });
});
