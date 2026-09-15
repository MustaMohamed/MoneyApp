import { RecurrencePeriod } from '@/constants/enums';
import { buildRecurrenceLabel } from '@/modules/commitments/screens/commitments/recurrence_label';

describe('buildRecurrenceLabel', () => {
  it.each([
    [RecurrencePeriod.Days, 'Every day', 'Every 3 days'],
    [RecurrencePeriod.Weeks, 'Every week', 'Every 3 weeks'],
    [RecurrencePeriod.Months, 'Every month', 'Every 3 months'],
    [RecurrencePeriod.Years, 'Every year', 'Every 3 years'],
  ])('reads %s once and every 3', (recurrence_period, one, three) => {
    expect(buildRecurrenceLabel({ recurrence_every: 1, recurrence_period })).toBe(one);
    expect(buildRecurrenceLabel({ recurrence_every: 3, recurrence_period })).toBe(three);
  });
});
