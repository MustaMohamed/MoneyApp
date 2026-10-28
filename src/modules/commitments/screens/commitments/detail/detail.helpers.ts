import { type DetailFact, detailFact } from '@/components/ui/detail_fact_row.helpers';
import type { DetailHeroBadge, DetailHeroModel } from '@/components/ui/detail_hero';
import type { DetailLoadErrorCopy } from '@/components/ui/detail_load_error.helpers';
import { formatConvertedAmount } from '@/components/ui/form_sheet.helpers';
import { HERO_GRADIENT_COLORS } from '@/components/ui/hero_gradient';
import { CURRENCY_CONFIG } from '@/constants/currency';
import { AccountType, AmountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import { resolveBadgeColors } from '@/modules/accounts/constants/account_badge_color';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Category } from '@/modules/categories/entities/category.entity';
import {
  buildDetailAccountFact,
  buildDetailCategoryFact,
  resolveCategoryGlyph,
  resolveHeroTileGlyphColor,
  resolveHollowGraphiteTile,
} from '@/modules/transactions/components/transaction_row.helpers';
import { formatDisplayAmount } from '@/utils/format_amount';
import { formatWeekdayDate } from '@/utils/format_date';

import { resolveCommitmentRowLegEgp } from '../../../domain/commitment_section_sums';
import { isPaidPayment, isUnpaidPayment } from '../../../domain/payment_state';
import type { Commitment } from '../../../entities/commitment.entity';
import type {
  CommitmentMonthPayment,
  CommitmentPayment,
} from '../../../entities/commitment_payment.entity';
import { buildCommitmentEndsLabel } from '../../../utils/commitment_ends_label';
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

// Decision 2026-10-27: Amount in EGP sits third, where the transaction detail puts its amount row.
const USD_COMMITMENT_FACT_KINDS = [
  'account',
  'category',
  'amount',
  'repeats',
  'started',
  'ends',
  'currency',
] as const;

export type CommitmentDetailFactKind = (typeof USD_COMMITMENT_FACT_KINDS)[number];

const EGP_COMMITMENT_FACT_KINDS: readonly CommitmentDetailFactKind[] =
  USD_COMMITMENT_FACT_KINDS.filter((kind) => kind !== 'amount');

/** No commitment, the skeleton with no hint, reads the six rows an EGP commitment draws. */
export function resolveCommitmentDetailFactKinds(
  commitment: Pick<Commitment, 'currency'> | undefined,
): CommitmentDetailFactKind[] {
  return [
    ...(commitment?.currency === Currency.USD
      ? USD_COMMITMENT_FACT_KINDS
      : EGP_COMMITMENT_FACT_KINDS),
  ];
}

/** A paid cycle reads its transaction's stored EGP; any other reads ≈ the amount at the live rate. */
export function resolveCommitmentAmountInEgpText(input: {
  commitment: Commitment;
  payment: CommitmentMonthPayment | undefined;
  liveRate: number | undefined;
}): string {
  const { commitment, payment, liveRate } = input;
  if (payment !== undefined && isPaidPayment(payment)) {
    return payment.paid_egp_amount === null
      ? Strings.addTxConvertedAmountNone
      : formatDisplayAmount(payment.paid_egp_amount, Currency.EGP);
  }
  const leg = resolveCommitmentRowLegEgp({
    payment: payment ?? {
      paid_date: null,
      skipped_date: null,
      currency: commitment.currency,
      paid_egp_amount: null,
    },
    amount: resolveDisplayAmount(payment, commitment).amount,
    rate: liveRate,
  });
  return formatConvertedAmount(
    leg === undefined ? undefined : { amount: leg, currency: Currency.EGP },
  );
}

export interface CommitmentDetailFactsInput {
  commitment: Commitment;
  payment: CommitmentMonthPayment | undefined;
  category: Category | undefined;
  accountsById: ReadonlyMap<string, Account>;
  liveRate: number | undefined;
}

type CommitmentDetailFact = DetailFact<CommitmentDetailFactKind>;

function accountFact(
  commitment: Commitment,
  accountsById: ReadonlyMap<string, Account>,
): CommitmentDetailFact {
  if (commitment.account_id === null) {
    return detailFact('account', Strings.detailAccount, {
      value: Strings.commitmentsStripNoAccount,
      leading: { kind: 'tile', tile: resolveHollowGraphiteTile(AccountType.Bank) },
    });
  }
  return buildDetailAccountFact(accountsById.get(commitment.account_id));
}

export function buildCommitmentDetailFacts({
  commitment,
  payment,
  category,
  accountsById,
  liveRate,
}: CommitmentDetailFactsInput): CommitmentDetailFact[] {
  return resolveCommitmentDetailFactKinds(commitment).map((kind): CommitmentDetailFact => {
    switch (kind) {
      case 'account':
        return accountFact(commitment, accountsById);
      case 'category':
        return buildDetailCategoryFact(category);
      case 'amount':
        return detailFact(kind, Strings.detailAmountInEgp, {
          value: resolveCommitmentAmountInEgpText({ commitment, payment, liveRate }),
          fitsValue: true,
        });
      case 'repeats':
        return detailFact(kind, Strings.commitmentsDetailRepeats, {
          value: buildRecurrenceLabel(commitment),
        });
      case 'started':
        return detailFact(kind, Strings.commitmentsDetailStarted, {
          value: formatWeekdayDate(commitment.start_date),
        });
      case 'ends':
        return detailFact(kind, Strings.commitmentsDetailEnds, {
          value: buildCommitmentEndsLabel(commitment),
        });
      case 'currency':
        return detailFact(kind, Strings.commitmentsDetailCurrency, {
          value: commitment.currency,
        });
      default: {
        const unhandled: never = kind;
        return unhandled;
      }
    }
  });
}
