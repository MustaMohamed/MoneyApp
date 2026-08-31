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

export interface ApproximationPill {
  ratePill: { rate: number } | undefined;
  approxPill: { currency: Currency; value: number } | undefined;
}

/** `outcome` must resolve from this same `input`, or the pill decouples from the hero value. */
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
