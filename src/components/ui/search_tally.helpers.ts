import type { SearchTallyModel } from './search_tally';

export const NO_TALLY_TEXT = {
  count: undefined,
  label: '',
  filterSummary: undefined,
  sum: undefined,
  accessibilityLabel: undefined,
} as const;

type SearchTallyLine = Omit<SearchTallyModel, 'accessibilityLabel' | 'filterSummary'> & {
  filterSummary?: string | undefined;
};

/** `spokenSum` is the sum as the money formatter joins it to its code. */
export function withTallyAccessibilityLabel(
  line: SearchTallyLine,
  spokenSum: string | undefined,
): SearchTallyModel {
  const { filterSummary } = line;
  const parts = [line.count, line.label, filterSummary, spokenSum];
  return {
    ...line,
    filterSummary,
    accessibilityLabel: parts.filter((part): part is string => part !== undefined).join(' '),
  };
}
