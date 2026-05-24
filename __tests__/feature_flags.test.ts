import { FeatureFlags } from '@/constants/feature_flags';

describe('FeatureFlags', () => {
  it('has all 3 remaining section flags (newDashboard removed in §5, newTransactions removed in §6, newAddTransaction removed in §7, newCommitments removed in §8)', () => {
    expect(FeatureFlags).toMatchObject({
      newOnboarding: expect.any(Boolean),
      newSettings: expect.any(Boolean),
      newAccounts: expect.any(Boolean),
    });
  });

  it('matches the current migration state (forces deliberate test update on each flag flip)', () => {
    expect(FeatureFlags).toEqual({
      newOnboarding: false, // §2
      newSettings: false, // §4
      newAccounts: false, // §9
    });
  });
});
