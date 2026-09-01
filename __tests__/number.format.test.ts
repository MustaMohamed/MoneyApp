const fmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

describe('number formatting — TC-17', () => {
  it('groups thousands with commas (US style)', () => {
    expect(fmt.format(122300)).toBe('122,300');
  });

  it('handles 7-digit values', () => {
    expect(fmt.format(1500000)).toBe('1,500,000');
  });

  it('leaves small values without grouping', () => {
    expect(fmt.format(500)).toBe('500');
  });

  it('formats zero as "0"', () => {
    expect(fmt.format(0)).toBe('0');
  });

  it('does NOT use Indian-style grouping (1,22,300)', () => {
    expect(fmt.format(122300)).not.toMatch(/^1,22,300$/);
  });
});
