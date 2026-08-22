import { Strings } from '@/constants/strings';

// Logic-only drift guard for the shared ErrorState presentation (MA-017 §6.1). Repo policy
// forbids UI-component render tests, so this does not — and cannot — prove that either
// StartupError or RouteErrorFallback actually renders its own copy; that is the emulator
// walk's job (MA-017 c4 walk items 1 and 4). What this guards against is the two callers
// collapsing onto one shared copy, or either Strings key being deleted out from under its
// caller.
describe('shared error-presentation Strings keys', () => {
  it('has all six keys present and non-empty', () => {
    const keys = [
      Strings.startupErrorTitle,
      Strings.startupErrorDescription,
      Strings.startupErrorRetry,
      Strings.renderErrorTitle,
      Strings.renderErrorDescription,
      Strings.renderErrorRetry,
    ];

    for (const value of keys) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('keeps the render-boundary copy distinct from the startup copy', () => {
    expect(Strings.renderErrorTitle).not.toBe(Strings.startupErrorTitle);
    expect(Strings.renderErrorDescription).not.toBe(Strings.startupErrorDescription);
  });
});
