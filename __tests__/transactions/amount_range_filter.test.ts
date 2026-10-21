import { Currency } from '@/constants/enums';
import {
  parseAmountInput,
  resolveAmountRangeDraft,
} from '@/modules/transactions/utils/amount_range_filter';

const INVALID_AMOUNT = 'Enter a valid amount of 0 or more';
const RANGE_INVALID = 'Minimum must be less than or equal to maximum';
const FIX_RANGE = 'Fix amount range';

// Both sheets' stores parse each text into its bound, so the cases build bounds the same way.
function resolve(minText: string, maxText: string, amountCurrency: Currency = Currency.EGP) {
  return resolveAmountRangeDraft(minText, maxText, {
    amountCurrency,
    amountMin: parseAmountInput(minText),
    amountMax: parseAmountInput(maxText),
  });
}

describe('resolveAmountRangeDraft', () => {
  it('reads an empty range as valid, textless and "Any amount"', () => {
    expect(resolve('', '')).toEqual({
      isValid: true,
      hasText: false,
      summary: 'Any amount',
      minError: undefined,
      maxError: undefined,
      rangeError: undefined,
    });
  });

  it('counts whitespace-only text as no text', () => {
    expect(resolve(' ', '').hasText).toBe(false);
  });

  it('prints two EGP bounds grouped, with an en dash between them', () => {
    const draft = resolve('1,000', '5,000');
    expect(draft.isValid).toBe(true);
    expect(draft.hasText).toBe(true);
    expect(draft.summary).toBe('1,000–5,000 EGP');
  });

  it('prints a lone maximum as "Up to" and a lone minimum as "From", grouped', () => {
    expect(resolve('', '5000').summary).toBe('Up to 5,000 EGP');
    expect(resolve('1000', '').summary).toBe('From 1,000 EGP');
  });

  it('prints a whole USD bound at its currency decimals and a fractional EGP bound at 2', () => {
    expect(resolve('500', '', Currency.USD).summary).toBe('From 500.00 USD');
    expect(resolve('99.6', '').summary).toBe('From 99.60 EGP');
  });

  it('refuses a bound past 2 decimals, never rounding it', () => {
    expect(resolve('1.234', '')).toEqual({
      isValid: false,
      hasText: true,
      summary: FIX_RANGE,
      minError: INVALID_AMOUNT,
      maxError: undefined,
      rangeError: undefined,
    });
  });

  it('refuses a negative maximum under its field', () => {
    const draft = resolve('', '-1');
    expect(draft.isValid).toBe(false);
    expect(draft.maxError).toBe(INVALID_AMOUNT);
    expect(draft.minError).toBeUndefined();
    expect(draft.summary).toBe(FIX_RANGE);
  });

  it('refuses a minimum above the maximum with the range error', () => {
    expect(resolve('500', '100')).toEqual({
      isValid: false,
      hasText: true,
      summary: FIX_RANGE,
      minError: undefined,
      maxError: undefined,
      rangeError: RANGE_INVALID,
    });
  });
});
