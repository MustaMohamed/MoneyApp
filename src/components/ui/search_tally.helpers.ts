export type SearchTallyMode = 'empty' | 'skeleton' | 'failed' | 'figures';

export type SearchTallyPolarity = 'good' | 'bad' | 'neutral';

export interface SearchTallyModel {
  mode: SearchTallyMode;
  count: string | undefined;
  label: string;
  filterSummary: string | undefined;
  sum: { text: string; polarity: SearchTallyPolarity; currencyCode: string } | undefined;
  accessibilityLabel: string | undefined;
}

// Frame A1 and the money-colour ADR's decision 5: In in success, Net by sign and neutral at 0; both neutral on a dash.
export const FLOW_CLASS: Record<SearchTallyPolarity, string> = {
  good: 'text-success',
  bad: 'text-danger',
  neutral: 'text-foreground',
};
