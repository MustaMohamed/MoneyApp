import { FeatureFlags } from '@/constants/feature_flags';

describe('FeatureFlags', () => {
  it('has the 1 remaining section flag (newDashboard removed in §5, newTransactions removed in §6, newAddTransaction removed in §7, newCommitments removed in §8, newAccounts removed in §9; newSettings dropped — §4 shipped in-place so the flag was never wired and is now removed as dead code)', () => {
    expect(FeatureFlags).toMatchObject({
      newOnboarding: expect.any(Boolean),
    });
  });

  it('matches the current migration state (forces deliberate test update on each flag flip)', () => {
    expect(FeatureFlags).toEqual({
      newOnboarding: false, // §2
    });
  });
});
