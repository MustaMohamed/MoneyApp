import { FeatureFlags } from '@/constants/feature_flags';

describe('FeatureFlags', () => {
  it('has all 7 section flags', () => {
    expect(FeatureFlags).toMatchObject({
      newOnboarding: expect.any(Boolean),
      newSettings: expect.any(Boolean),
      newDashboard: expect.any(Boolean),
      newTransactions: expect.any(Boolean),
      newAddTransaction: expect.any(Boolean),
      newCommitments: expect.any(Boolean),
      newAccounts: expect.any(Boolean),
    });
  });

  it('all flags are false in §1 (pre-migration state)', () => {
    Object.entries(FeatureFlags).forEach(([key, value]) => {
      expect(value).toBe(false);
    });
  });
});
