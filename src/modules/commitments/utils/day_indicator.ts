import { Strings } from '@/constants/strings';
import { formatAmount } from '@/utils/format_amount';

import type { PaymentDayDistance } from '../domain/payment_day_distance';

export type DayIndicatorTone = 'danger' | 'gold' | 'caption' | 'success';

export const DAY_INDICATOR_CLASS: Record<DayIndicatorTone, string> = {
  danger: 'font-inter text-danger',
  gold: 'font-inter-semibold text-accent',
  caption: 'font-inter text-content-secondary',
  success: 'font-inter text-success',
};

export interface DayIndicator {
  text: string;
  tone: DayIndicatorTone;
}

function dayCountText(days: number, one: string, many: (count: string) => string): string {
  return days === 1 ? one : many(formatAmount(days));
}

function lateText(days: number): string {
  return dayCountText(days, Strings.commitmentDayLateOne, Strings.commitmentDayLateMany);
}

/** A settled row's day against its due day. */
function settledText(days: number): string {
  if (days > 0) return lateText(days);
  if (days < 0) {
    return dayCountText(-days, Strings.commitmentDayEarlyOne, Strings.commitmentDayEarlyMany);
  }
  return Strings.commitmentDayOnTheDay;
}

/** The tones mark timing, never money. */
export function resolveDayIndicator({ settlement, days }: PaymentDayDistance): DayIndicator {
  if (settlement === 'skipped') return { text: settledText(days), tone: 'caption' };
  if (settlement === 'paid') {
    return { text: settledText(days), tone: days > 0 ? 'danger' : 'success' };
  }
  if (days > 0) return { text: lateText(days), tone: 'danger' };
  if (days < 0) {
    return {
      text: dayCountText(-days, Strings.commitmentDayAheadOne, Strings.commitmentDayAheadMany),
      tone: 'caption',
    };
  }
  return { text: Strings.commitmentDayDueToday, tone: 'gold' };
}
