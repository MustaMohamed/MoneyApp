import { canProceed } from '@/app/(onboarding)/security/security.helpers';

describe('canProceed', () => {
  it('returns false when no choice has been made', () => {
    expect(canProceed(null)).toBe(false);
  });

  it('returns true for "pin"', () => {
    expect(canProceed('pin')).toBe(true);
  });

  it('returns true for "biometric"', () => {
    expect(canProceed('biometric')).toBe(true);
  });

  it('returns true for "skip"', () => {
    expect(canProceed('skip')).toBe(true);
  });
});
