import { RecurrencePeriod, DurationType } from '@/constants/enums';
import { computeDueDates } from '@/utils/compute_due_dates';

describe('computeDueDates', () => {
  describe('days period', () => {
    it('generates daily dates', () => {
      const result = computeDueDates({
        startDate: '2026-01-01',
        every: 1,
        period: RecurrencePeriod.Days,
        durationType: DurationType.Forever,
        maxCount: 5,
      });
      expect(result).toEqual([
        '2026-01-01',
        '2026-01-02',
        '2026-01-03',
        '2026-01-04',
        '2026-01-05',
      ]);
    });

    it('generates every 3 days', () => {
      const result = computeDueDates({
        startDate: '2026-01-01',
        every: 3,
        period: RecurrencePeriod.Days,
        durationType: DurationType.Forever,
        maxCount: 4,
      });
      expect(result).toEqual(['2026-01-01', '2026-01-04', '2026-01-07', '2026-01-10']);
    });
  });

  describe('weeks period', () => {
    it('generates weekly dates', () => {
      const result = computeDueDates({
        startDate: '2026-01-05',
        every: 1,
        period: RecurrencePeriod.Weeks,
        durationType: DurationType.Forever,
        maxCount: 4,
      });
      expect(result).toEqual(['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26']);
    });

    it('generates biweekly dates', () => {
      const result = computeDueDates({
        startDate: '2026-01-05',
        every: 2,
        period: RecurrencePeriod.Weeks,
        durationType: DurationType.Forever,
        maxCount: 3,
      });
      expect(result).toEqual(['2026-01-05', '2026-01-19', '2026-02-02']);
    });
  });

  describe('months period', () => {
    it('generates monthly dates', () => {
      const result = computeDueDates({
        startDate: '2026-01-15',
        every: 1,
        period: RecurrencePeriod.Months,
        durationType: DurationType.Forever,
        maxCount: 4,
      });
      expect(result).toEqual(['2026-01-15', '2026-02-15', '2026-03-15', '2026-04-15']);
    });

    it('clamps to end of month (Jan 31 + 1 month = Feb 28)', () => {
      const result = computeDueDates({
        startDate: '2026-01-31',
        every: 1,
        period: RecurrencePeriod.Months,
        durationType: DurationType.Forever,
        maxCount: 3,
      });
      expect(result).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
    });

    it('handles quarterly (every 3 months)', () => {
      const result = computeDueDates({
        startDate: '2026-01-01',
        every: 3,
        period: RecurrencePeriod.Months,
        durationType: DurationType.Forever,
        maxCount: 4,
      });
      expect(result).toEqual(['2026-01-01', '2026-04-01', '2026-07-01', '2026-10-01']);
    });
  });

  describe('years period', () => {
    it('generates annual dates', () => {
      const result = computeDueDates({
        startDate: '2026-03-15',
        every: 1,
        period: RecurrencePeriod.Years,
        durationType: DurationType.Forever,
        maxCount: 3,
      });
      expect(result).toEqual(['2026-03-15', '2027-03-15', '2028-03-15']);
    });

    it('handles leap year (Feb 29 → Feb 28 on non-leap year)', () => {
      const result = computeDueDates({
        startDate: '2028-02-29',
        every: 1,
        period: RecurrencePeriod.Years,
        durationType: DurationType.Forever,
        maxCount: 3,
      });
      expect(result).toEqual(['2028-02-29', '2029-02-28', '2030-02-28']);
    });
  });

  describe('duration types', () => {
    it('AfterCount stops at end_after_count', () => {
      const result = computeDueDates({
        startDate: '2026-01-01',
        every: 1,
        period: RecurrencePeriod.Months,
        durationType: DurationType.AfterCount,
        endAfterCount: 3,
        maxCount: 64,
      });
      expect(result).toHaveLength(3);
    });

    it('UntilDate stops at end_date', () => {
      const result = computeDueDates({
        startDate: '2026-01-01',
        every: 1,
        period: RecurrencePeriod.Months,
        durationType: DurationType.UntilDate,
        endDate: '2026-03-15',
        maxCount: 64,
      });
      expect(result).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
    });

    it('Forever generates up to maxCount', () => {
      const result = computeDueDates({
        startDate: '2026-01-01',
        every: 1,
        period: RecurrencePeriod.Months,
        durationType: DurationType.Forever,
        maxCount: 64,
      });
      expect(result).toHaveLength(64);
    });

    it('AfterCount respects maxCount cap', () => {
      const result = computeDueDates({
        startDate: '2026-01-01',
        every: 1,
        period: RecurrencePeriod.Days,
        durationType: DurationType.AfterCount,
        endAfterCount: 100,
        maxCount: 64,
      });
      expect(result).toHaveLength(64);
    });
  });
});
