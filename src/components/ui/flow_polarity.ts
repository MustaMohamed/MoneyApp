export type PolaritySignal = 'good' | 'bad' | 'neutral';

// Frame A1 and the money-colour ADR's decision 5: In in success, Net by sign and neutral at 0; both neutral on a dash.
export const FLOW_CLASS: Record<PolaritySignal, string> = {
  good: 'text-success',
  bad: 'text-danger',
  neutral: 'text-foreground',
};
