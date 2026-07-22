import {
  RATE_REFRESH_MAX_AGE_MS,
  parsePersistedRate,
  parseRemoteRate,
  shouldRefreshRate,
} from '@/modules/currency/store/currency.helpers';

describe('currency rate policy', () => {
  describe('parsePersistedRate', () => {
    it.each([
      ['50.25', 50.25],
      ['1', 1],
      [' 48.5 ', 48.5],
    ])('accepts a complete positive decimal %s', (value, expected) => {
      expect(parsePersistedRate(value)).toBe(expected);
    });

    it.each([null, '', '0', '-1', '50abc', 'NaN', 'Infinity', '5,000'])(
      'rejects an invalid persisted value %s',
      (value) => {
        expect(parsePersistedRate(value)).toBeUndefined();
      },
    );
  });

  describe('parseRemoteRate', () => {
    it('returns a valid positive EGP rate', () => {
      expect(parseRemoteRate({ rates: { EGP: 55.25 } })).toBe(55.25);
    });

    it.each([
      undefined,
      null,
      {},
      { rates: {} },
      { rates: { EGP: 0 } },
      { rates: { EGP: -1 } },
      { rates: { EGP: '55' } },
    ])('rejects an invalid remote payload', (payload) => {
      expect(() => parseRemoteRate(payload)).toThrow();
    });
  });

  describe('shouldRefreshRate', () => {
    const now = Date.UTC(2026, 6, 23, 12);

    it('never auto-refreshes a manual override', () => {
      expect(
        shouldRefreshRate({
          isManualOverride: true,
          lastFetched: null,
          now,
        }),
      ).toBe(false);
    });

    it('refreshes when no remote timestamp exists', () => {
      expect(
        shouldRefreshRate({
          isManualOverride: false,
          lastFetched: null,
          now,
        }),
      ).toBe(true);
    });

    it('keeps a rate fresh until the 24-hour boundary', () => {
      expect(
        shouldRefreshRate({
          isManualOverride: false,
          lastFetched: new Date(now - RATE_REFRESH_MAX_AGE_MS + 1).toISOString(),
          now,
        }),
      ).toBe(false);
    });

    it('refreshes at the 24-hour boundary', () => {
      expect(
        shouldRefreshRate({
          isManualOverride: false,
          lastFetched: new Date(now - RATE_REFRESH_MAX_AGE_MS).toISOString(),
          now,
        }),
      ).toBe(true);
    });

    it('refreshes when the persisted timestamp is invalid', () => {
      expect(
        shouldRefreshRate({
          isManualOverride: false,
          lastFetched: 'not-a-date',
          now,
        }),
      ).toBe(true);
    });
  });
});
