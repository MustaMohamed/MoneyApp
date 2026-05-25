import { currentYearMonth, lastMonths } from '@/repositories/budget.repository';

describe('currentYearMonth', () => {
  it('formats YYYY-MM with zero-padded month', () => {
    expect(currentYearMonth(new Date('2026-05-09T00:00:00.000Z'))).toBe('2026-05');
    expect(currentYearMonth(new Date('2026-01-31T00:00:00.000Z'))).toBe('2026-01');
  });
});

describe('lastMonths', () => {
  it('returns N months ending at `end`, oldest first', () => {
    expect(lastMonths('2026-05', 4)).toEqual(['2026-02', '2026-03', '2026-04', '2026-05']);
  });
  it('crosses a year boundary correctly', () => {
    expect(lastMonths('2026-02', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });
  it('n=1 returns just the end month', () => {
    expect(lastMonths('2026-05', 1)).toEqual(['2026-05']);
  });
});
