import { SecurityChoice } from '@/constants/enums';
import { canProceed } from '@/screens/onboarding/security/security.helpers';

describe('canProceed', () => {
  it('returns false when no choice has been made', () => {
    expect(canProceed(undefined)).toBe(false);
  });

  it('returns true for "pin"', () => {
    expect(canProceed(SecurityChoice.Pin)).toBe(true);
  });

  it('returns true for "biometric"', () => {
    expect(canProceed(SecurityChoice.Biometric)).toBe(true);
  });

  it('returns true for "skip"', () => {
    expect(canProceed(SecurityChoice.Skip)).toBe(true);
  });
});
