import { resolveDayIndicator } from '@/modules/commitments/utils/day_indicator';

describe('resolveDayIndicator', () => {
  describe('an unpaid row', () => {
    it.each([
      [3, '3 days late'],
      [1, '1 day late'],
      [1095, '1,095 days late'],
    ])('past due by %s reads "%s" in danger', (days, text) => {
      expect(resolveDayIndicator({ settlement: 'unpaid', days })).toEqual({
        text,
        tone: 'danger',
      });
    });

    it('due today reads "Due today" in gold', () => {
      expect(resolveDayIndicator({ settlement: 'unpaid', days: 0 })).toEqual({
        text: 'Due today',
        tone: 'gold',
      });
    });

    it.each([
      [-1, 'in 1 day'],
      [-2, 'in 2 days'],
      [-1095, 'in 1,095 days'],
    ])('due ahead by %s reads "%s" in the caption colour', (days, text) => {
      expect(resolveDayIndicator({ settlement: 'unpaid', days })).toEqual({
        text,
        tone: 'caption',
      });
    });
  });

  describe('a paid row', () => {
    it.each([
      [3, '3 days late'],
      [1, '1 day late'],
      [1095, '1,095 days late'],
    ])('paid %s days after its due day reads "%s" in danger', (days, text) => {
      expect(resolveDayIndicator({ settlement: 'paid', days })).toEqual({ text, tone: 'danger' });
    });

    it.each([
      [-1, '1 day early'],
      [-4, '4 days early'],
      [-1095, '1,095 days early'],
    ])('paid %s days from its due day reads "%s" in success', (days, text) => {
      expect(resolveDayIndicator({ settlement: 'paid', days })).toEqual({ text, tone: 'success' });
    });

    it('paid on its due day reads "on the day" in success', () => {
      expect(resolveDayIndicator({ settlement: 'paid', days: 0 })).toEqual({
        text: 'on the day',
        tone: 'success',
      });
    });
  });

  describe('a skipped row', () => {
    it.each([
      [2, '2 days late'],
      [1, '1 day late'],
      [-1, '1 day early'],
      [-3, '3 days early'],
      [0, 'on the day'],
    ])('skipped %s days from its due day reads "%s" in the caption colour', (days, text) => {
      expect(resolveDayIndicator({ settlement: 'skipped', days })).toEqual({
        text,
        tone: 'caption',
      });
    });
  });
});
