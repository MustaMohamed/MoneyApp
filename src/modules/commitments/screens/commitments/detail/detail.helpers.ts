import type { DetailHeroBadge, DetailHeroModel } from '@/components/ui/detail_hero';
import type { DetailLoadErrorCopy } from '@/components/ui/detail_load_error.helpers';
import { HERO_GRADIENT_COLORS } from '@/components/ui/hero_gradient';
import { CURRENCY_CONFIG } from '@/constants/currency';
import { AmountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import { resolveBadgeColors } from '@/modules/accounts/constants/account_badge_color';
import type { Category } from '@/modules/categories/entities/category.entity';
import {
  resolveCategoryGlyph,
  resolveHeroTileGlyphColor,
} from '@/modules/transactions/components/transaction_row.helpers';
import { formatWeekdayDate } from '@/utils/format_date';

import { isUnpaidPayment } from '../../../domain/payment_state';
import type { Commitment } from '../../../entities/commitment.entity';
import type { CommitmentPayment } from '../../../entities/commitment_payment.entity';
import { composeCommitmentAmount, resolveDisplayAmount } from '../../../utils/commitment_status';
import { buildRecurrenceLabel } from '../../../utils/recurrence_label';
import type { CommitmentDetailLoadStatus } from './detail.state';

export type CommitmentDetailViewState =
  | 'loading'
  | 'notFound'
  | 'firstLoadError'
  | 'refreshErrorWithData'
  | 'ready';

export interface CommitmentDetailViewStateInput {
  /** The data entry for the route's id holds a commitment. */
  hasCommitment: boolean;
  /** The UI entry's load belongs to the commitment now on the route. */
  ownsStatus: boolean;
  status: CommitmentDetailLoadStatus;
  refreshError: boolean;
}

export function resolveCommitmentDetailViewState({
  hasCommitment,
  ownsStatus,
  status,
  refreshError,
}: CommitmentDetailViewStateInput): CommitmentDetailViewState {
  if (!ownsStatus || status === 'loading') return hasCommitment ? 'ready' : 'loading';
  if (status === 'firstLoadError') return hasCommitment ? 'refreshErrorWithData' : 'firstLoadError';
  if (!hasCommitment) return 'notFound';
  if (refreshError) return 'refreshErrorWithData';
  return 'ready';
}

export function commitmentDetailShowsEdit(viewState: CommitmentDetailViewState): boolean {
  return viewState === 'ready' || viewState === 'refreshErrorWithData';
}

/** `payments` in due-date order; the param's row, then the previous due date, then the earliest unpaid row, then the last. */
export function resolveCommitmentDetailCycle(
  payments: readonly CommitmentPayment[],
  cycleId: string | undefined,
  previousDueDate: string | undefined,
): CommitmentPayment | undefined {
  return (
    payments.find((p) => p.id === cycleId) ??
    (previousDueDate === undefined
      ? undefined
      : payments.find((p) => p.due_date === previousDueDate)) ??
    payments.find(isUnpaidPayment) ??
    payments[payments.length - 1]
  );
}

/** The store's month array is the optimistic one, so a row both hold reads the store's status. */
export function overlayStorePayments<T extends CommitmentPayment>(
  rows: T[],
  storePayments: T[],
): T[] {
  if (rows.length === 0 || storePayments.length === 0) return rows;
  const storeById = new Map(storePayments.map((p) => [p.id, p]));
  if (!rows.some((row) => storeById.has(row.id))) return rows;
  return rows.map((row) => storeById.get(row.id) ?? row);
}

export const COMMITMENT_DETAIL_LOAD_ERROR_COPY: DetailLoadErrorCopy = {
  loadTitle: Strings.commitmentsDetailLoadErrorTitle,
  refreshTitle: Strings.commitmentsDetailRefreshErrorTitle,
  description: Strings.commitmentsDetailLoadErrorDescription,
  retryLabel: Strings.commitmentsDetailLoadRetry,
};

export const COMMITMENT_DETAIL_LOAD_ERROR_TEST_ID = 'commitment-detail-load-error';

// Frame C1 `.badge`: `text2` at a 0.22 share of the fill over the hero gradient's middle stop, `text1` ink.
const CADENCE_BADGE_COLORS = resolveBadgeColors({
  tone: CoreTokens.text2,
  backdrop: HERO_GRADIENT_COLORS[1],
  fillShare: 0.22,
  ink: CoreTokens.text1,
  inkShare: 1,
});

export function resolveCommitmentCadenceBadge(
  commitment: Pick<Commitment, 'amount_type' | 'recurrence_every' | 'recurrence_period'>,
): DetailHeroBadge {
  const recurrence = buildRecurrenceLabel(commitment);
  return {
    badgeLabel:
      commitment.amount_type === AmountType.Variable
        ? Strings.commitmentsCadenceVaries(recurrence)
        : recurrence,
    badgeIcon: 'clock-outline',
    badgeFill: CADENCE_BADGE_COLORS.fill,
    badgeForeground: CADENCE_BADGE_COLORS.foreground,
  };
}

export interface CommitmentDetailHeroInput {
  commitment: Commitment;
  payment: CommitmentPayment | undefined;
  category: Category | undefined;
  /** The local calendar date, `YYYY-MM-DD`. */
  today: string;
}

export function buildCommitmentDetailHero({
  commitment,
  payment,
  category,
  today,
}: CommitmentDetailHeroInput): DetailHeroModel {
  const { glyphName, glyphColor } = resolveCategoryGlyph(category);
  const currency = payment?.currency ?? commitment.currency;
  const code = CURRENCY_CONFIG[currency].code;
  const amount = composeCommitmentAmount(resolveDisplayAmount(payment, commitment), currency, code);
  const categoryName = category?.name ?? Strings.uncategorized;
  const startDate = formatWeekdayDate(commitment.start_date);
  return {
    title: commitment.name,
    ...resolveCommitmentCadenceBadge(commitment),
    tileColor: glyphColor,
    tileGlyph: glyphName,
    tileGlyphColor: resolveHeroTileGlyphColor(glyphColor),
    amountValue: amount.text,
    amountCode: code,
    amountColor: CoreTokens.text1,
    amountAccessibilityLabel: amount.spoken,
    caption:
      commitment.start_date > today
        ? Strings.commitmentsDetailCaptionStarts(categoryName, startDate)
        : Strings.commitmentsDetailCaptionSince(categoryName, startDate),
  };
}
