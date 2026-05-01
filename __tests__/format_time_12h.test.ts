import { formatTime12h } from '@/utils/format_time_12h';

describe('formatTime12h', () => {
  it('formats midnight as 12:00 AM', () => {
    expect(formatTime12h('00:00:00')).toBe('12:00 AM');
  });

  it('formats early-morning hours with leading 12 hour', () => {
    expect(formatTime12h('00:05:00')).toBe('12:05 AM');
  });

  it('formats noon as 12:00 PM', () => {
    expect(formatTime12h('12:00:00')).toBe('12:00 PM');
  });

  it('formats afternoon time', () => {
    expect(formatTime12h('14:30:00')).toBe('2:30 PM');
  });

  it('formats end-of-day', () => {
    expect(formatTime12h('23:59:00')).toBe('11:59 PM');
  });

  it('zero-pads minutes', () => {
    expect(formatTime12h('09:05:30')).toBe('9:05 AM');
  });
});
