import { Strings } from '@/constants/strings';

export function formatStoredRateLine(rateUpdatedAt: string | null): string {
  if (rateUpdatedAt === null) return Strings.addTxRateSourceStored;
  const date = new Date(rateUpdatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${Strings.addTxRateSourceStored} · ${Strings.addTxRateLastUpdated(date)}`;
}
