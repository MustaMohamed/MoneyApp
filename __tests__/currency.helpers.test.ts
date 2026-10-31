import {
  RATE_REFRESH_MAX_AGE_MS,
  isRateStale,
  parsePersistedRate,
  parsePersistedTimestamp,
  parseRemoteRate,
  resolveRateStaleDelayMs,
  shouldRefreshRate,
} from '@/modules/currency/store/currency.helpers';

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_AGE_MS = 30 * DAY_MS;
const MAX_TIMER_MS = 2 ** 31 - 1;

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

  describe('parsePersistedTimestamp', () => {
    it('preserves a valid timestamp', () => {
      expect(parsePersistedTimestamp('2026-07-23T10:30:00.000Z')).toBe('2026-07-23T10:30:00.000Z');
    });

    it.each([null, '', 'not-a-date', '2026-07-23', '57'])(
      'drops an invalid timestamp %s',
      (value) => {
        expect(parsePersistedTimestamp(value)).toBeNull();
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

  describe('resolveRateStaleDelayMs (MA-272)', () => {
    it.each([
      ['the first of a month', '2026-09-01T12:00:00.000Z'],
      ['day 31, crossing a 30-day month', '2026-08-31T12:00:00.000Z'],
      ['before a leap day, crossing it', '2028-02-15T12:00:00.000Z'],
    ])(
      'waits a 29-day-old rate from %s to the first instant isRateStale reads true',
      (_label, updatedAt) => {
        const now = Date.parse(updatedAt) + 29 * DAY_MS;

        const delay = resolveRateStaleDelayMs(updatedAt, now);

        expect(delay).toBeDefined();
        expect(isRateStale(updatedAt, now + (delay as number))).toBe(true);
        expect(isRateStale(updatedAt, now + (delay as number) - 1)).toBe(false);
      },
    );

    const now = Date.parse('2026-09-30T12:00:00.000Z');

    it('caps a 1-day-old rate at the longest single setTimeout', () => {
      const updatedAt = new Date(now - DAY_MS).toISOString();

      expect(resolveRateStaleDelayMs(updatedAt, now)).toBe(MAX_TIMER_MS);
    });

    it('gives an update time a day ahead of the clock the same cap', () => {
      const updatedAt = new Date(now + DAY_MS).toISOString();

      expect(resolveRateStaleDelayMs(updatedAt, now)).toBe(MAX_TIMER_MS);
    });

    it.each([
      ['no update time', null],
      ['an unparseable update time', 'not a date'],
      ['a rate already stale', new Date(now - STALE_AGE_MS - 1).toISOString()],
    ])('gives undefined for %s, which no later read can change', (_label, updatedAt) => {
      expect(resolveRateStaleDelayMs(updatedAt, now)).toBeUndefined();
    });
  });
});
