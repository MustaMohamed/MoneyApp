import { Strings } from '@/constants/strings';
import { formatAmount } from '@/utils/format_amount';

import type { PaymentDayDistance } from '../domain/payment_day_distance';

export type DayIndicatorTone = 'danger' | 'gold' | 'caption' | 'success';

export interface DayIndicator {
  text: string;
  tone: DayIndicatorTone;
}

function lateText(days: number): string {
  return days === 1
    ? Strings.commitmentDayLateOne
    : Strings.commitmentDayLateMany(formatAmount(days));
}

function aheadText(days: number): string {
  return days === 1
    ? Strings.commitmentDayAheadOne
    : Strings.commitmentDayAheadMany(formatAmount(days));
}

function earlyText(days: number): string {
  return days === 1
    ? Strings.commitmentDayEarlyOne
    : Strings.commitmentDayEarlyMany(formatAmount(days));
}

/** A settled row's day against its due day. */
function settledText(days: number): string {
  if (days > 0) return lateText(days);
  if (days < 0) return earlyText(-days);
  return Strings.commitmentDayOnTheDay;
}

/** The tones mark timing, never money. */
export function resolveDayIndicator({ settlement, days }: PaymentDayDistance): DayIndicator {
  if (settlement === 'skipped') return { text: settledText(days), tone: 'caption' };
  if (settlement === 'paid') {
    return { text: settledText(days), tone: days > 0 ? 'danger' : 'success' };
  }
  if (days > 0) return { text: lateText(days), tone: 'danger' };
  if (days < 0) return { text: aheadText(-days), tone: 'caption' };
  return { text: Strings.commitmentDayDueToday, tone: 'gold' };
}
