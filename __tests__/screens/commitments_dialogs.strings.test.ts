import { Strings } from '@/constants/strings';

const strings: Record<string, unknown> = Strings;

describe('Commitments copy sweep (MA-224)', () => {
  // A function-valued string is read with one lowercase placeholder per parameter.
  const commitmentValues = Object.entries(strings).flatMap(([key, value]): [string, string][] => {
    if (!/commitment/i.test(key)) return [];
    if (typeof value === 'string') return [[key, value]];
    if (typeof value !== 'function') return [];
    const read = value as (...args: string[]) => unknown;
    const text = read(...Array.from({ length: read.length }, () => 'x'));
    return typeof text === 'string' ? [[key, text]] : [];
  });

  it('says no Could not, Please try again, Retry or Deactivate in any commitments string', () => {
    expect(commitmentValues.length).toBeGreaterThan(0);
    const offending = commitmentValues.filter(([, value]) =>
      /Could not|Please try again|Retry|Deactivate/.test(value),
    );

    expect(offending).toEqual([]);
  });

  it('reads no commitments string in Title Case', () => {
    const offending = commitmentValues.filter(([, value]) =>
      /\b[A-Z][a-z]+ [A-Z][a-z]+/.test(value),
    );

    expect(offending).toEqual([]);
  });
});
