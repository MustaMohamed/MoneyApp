import { FeatureFlags } from '@/constants/feature_flags';

describe('FeatureFlags', () => {
  it('has all 5 remaining section flags (newDashboard removed in §5, newTransactions removed in §6)', () => {
    expect(FeatureFlags).toMatchObject({
      newOnboarding: expect.any(Boolean),
      newSettings: expect.any(Boolean),
      newAddTransaction: expect.any(Boolean),
      newCommitments: expect.any(Boolean),
      newAccounts: expect.any(Boolean),
    });
  });

  it('matches the current migration state (forces deliberate test update on each flag flip)', () => {
    expect(FeatureFlags).toEqual({
      newOnboarding: false, // §2
      newSettings: false, // §4
      newAddTransaction: true, // §7 — promoted to active route 2026-05-19
      newCommitments: false, // §8
      newAccounts: false, // §9
    });
  });
});
