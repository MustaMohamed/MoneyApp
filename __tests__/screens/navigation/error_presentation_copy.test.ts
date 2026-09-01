import { Strings } from '@/constants/strings';

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
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('keeps the render-boundary copy distinct from the startup copy', () => {
    expect(Strings.renderErrorTitle).not.toBe(Strings.startupErrorTitle);
    expect(Strings.renderErrorDescription).not.toBe(Strings.startupErrorDescription);
  });
});
