import { Currency } from '@/constants/enums';
import {
  type StartingNetPositionInput,
  countForeignAccounts,
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
 * one (`StartingNetPositionInput.rateUpdatedAt` stays `null` because it is).
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
 */
export function selectApproximationPill(input: StartingNetPositionInput): ApproximationPill {
  const outcome = resolveStartingNetPosition(input);
  const foreignCount = countForeignAccounts(input.accounts, input.baseCurrency);

  if (outcome.kind !== 'amount' || foreignCount < 1) {
    return { ratePill: undefined, approxPill: undefined };
  }

  const isEgpBase = input.baseCurrency === Currency.EGP;
  const converted = isEgpBase ? outcome.value / input.rate : outcome.value * input.rate;

  return {
    ratePill: { rate: input.rate },
    approxPill: {
      currency: isEgpBase ? Currency.USD : Currency.EGP,
      value: normalizeNegativeZero(roundMoney(converted)),
    },
  };
}
