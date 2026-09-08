import { Strings } from '@/constants/strings';

// 11, 12 and 13 read "th" despite their last digit; every other teen follows the last digit alone.
const TEEN_EXCEPTIONS = new Set([11, 12, 13]);

/** A day number as its English ordinal — "1st", "23rd". No date arithmetic. */
export function formatOrdinal(day: number): string {
  const suffixes = Strings.ordinalSuffixes;
  if (TEEN_EXCEPTIONS.has(day % 100)) return `${day}${suffixes.other}`;
  switch (day % 10) {
    case 1:
      return `${day}${suffixes.one}`;
    case 2:
      return `${day}${suffixes.two}`;
    case 3:
      return `${day}${suffixes.few}`;
    default:
      return `${day}${suffixes.other}`;
  }
}
