import { foreignCurrencyFor } from '@/constants/currency';
import { Currency } from '@/constants/enums';
import {
  convertCurrency,
  countForeignAccounts,
} from '@/modules/accounts/domain/account_aggregation';
import {
  type StartingNetPosition,
  type StartingNetPositionInput,
  normalizeNegativeZero,
  resolveStartingNetPosition,
} from '@/modules/onboarding/domain/starting_net_position';
import { roundMoney } from '@/utils/money';

/**
 * N4's two currency pills, as VALUES — the rate the hero was converted with,
 * and the same net position expressed in the other currency. Formatting is the
 * screen's; this file never builds a string.
 *
 * Both fields are `undefined` rather than `null` when the gate is closed:
 * `null` is reserved for DB-mapped nullable columns, and neither of these is
 * one (`RateProvenance.rateUpdatedAt` stays `null` because it is).
 */
export interface ApproximationPill {
  ratePill: { rate: number } | undefined;
  approxPill: { currency: Currency; value: number } | undefined;
}

/**
 * One gate covers both pills: there is no state where one renders without the
 * other. It is closed whenever nothing needed converting — a saved rate that no
 * account used does not earn a pill — and whenever the resolver refused.
 *
 * The app has exactly two currencies, so "the other one" is unambiguous: an EGP
 * base approximates into USD and divides, a USD base approximates into EGP and
 * multiplies. The sign always matches the hero value; it is the same fact in the
 * other currency, never a friendlier one.
 *
 * `outcome` is a parameter with a default rather than an unconditional resolve:
 * `selectReadySummaryState` has already resolved the same input and passes its
 * result in, so the two share one resolve structurally instead of by accident.
 * The default keeps the function callable on its own — the pill table drives it
 * with an input alone — and it must stay the SAME resolve, never a substitute:
 * passing an outcome computed from a different input would silently decouple
 * the pill from the hero value it approximates.
 */
export function selectApproximationPill(
  input: StartingNetPositionInput,
  outcome: StartingNetPosition = resolveStartingNetPosition(input),
): ApproximationPill {
  const foreignCount = countForeignAccounts(input.accounts, input.baseCurrency);

  if (outcome.kind !== 'amount' || foreignCount < 1) {
    return { ratePill: undefined, approxPill: undefined };
  }

  const foreignCurrency = foreignCurrencyFor(input.baseCurrency);
  const converted = convertCurrency({
    amount: outcome.value,
    from: input.baseCurrency,
    to: foreignCurrency,
    rate: input.rate,
  });

  return {
    ratePill: { rate: input.rate },
    approxPill: {
      currency: foreignCurrency,
      value: normalizeNegativeZero(roundMoney(converted)),
    },
  };
}
