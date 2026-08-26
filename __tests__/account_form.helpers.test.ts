import { AccountType, Currency } from '@/constants/enums';
import {
  AccountFormMappingError,
  createAccountFormDefaults,
  toNewAccountInput,
} from '@/modules/accounts/components/account_form/account_form.helpers';
import { DEFAULT_ACCOUNT_COLOR } from '@/modules/accounts/constants/account_palette';
import type { AddAccountFormData } from '@/modules/accounts/utils/add_account.schema';

const baseData = (overrides: Partial<AddAccountFormData> = {}): AddAccountFormData => ({
  name: 'CIB Savings',
  balance: '1000',
  selected_type: AccountType.Bank,
  selected_color: DEFAULT_ACCOUNT_COLOR,
  currency: Currency.EGP,
  interest_tracking: false,
  credit_limit: '',
  apr: '',
  min_payment: '',
  due_day: '',
  ...overrides,
});

describe('toNewAccountInput — the MA-007 case table, against the mapping', () => {
  describe('opening_balance', () => {
    it.each([
      ['5,000', 5000],
      ['5,000.50', 5000.5],
      ['1,234,567.89', 1234567.89],
      ['  7  ', 7],
      ['0', 0],
      ['00.5', 0.5],
    ])('opening balance %p → %p', (balance, expected) => {
      expect(toNewAccountInput(baseData({ balance }), { sortOrder: 0 }).opening_balance).toBe(
        expected,
      );
    });

    it.each([
      '5abc',
      '5.5.5',
      '0x10',
      '1e3',
      '1_000',
      '.5',
      '5.',
      '12,34',
      '',
      'abc',
      '-3',
      'Infinity',
      '٥',
    ])('opening balance %p throws rather than persisting a wrong number', (balance) => {
      expect(() => toNewAccountInput(baseData({ balance }), { sortOrder: 0 })).toThrow(
        AccountFormMappingError,
      );
    });
  });

  describe('credit_limit — same table, on a credit card', () => {
    const cc = (credit_limit: string) =>
      baseData({ selected_type: AccountType.CreditCard, credit_limit });

    it.each([
      ['5,000', 5000],
      ['5,000.50', 5000.5],
      ['1,234,567.89', 1234567.89],
      ['  7  ', 7],
      ['0', 0],
      ['00.5', 0.5],
    ])('credit limit %p → %p', (value, expected) => {
      expect(toNewAccountInput(cc(value), { sortOrder: 0 }).credit_limit).toBe(expected);
    });

    it.each([
      '5abc',
      '5.5.5',
      '0x10',
      '1e3',
      '1_000',
      '.5',
      '5.',
      '12,34',
      'abc',
      '-3',
      'Infinity',
      '٥',
    ])('credit limit %p → null, not a corrupted number', (value) => {
      expect(toNewAccountInput(cc(value), { sortOrder: 0 }).credit_limit).toBeNull();
    });
  });

  describe('minimum_payment — same table, on a credit card', () => {
    const cc = (min_payment: string) =>
      baseData({ selected_type: AccountType.CreditCard, credit_limit: '1000', min_payment });

    it.each([
      ['5,000', 5000],
      ['5,000.50', 5000.5],
      ['1,234,567.89', 1234567.89],
      ['  7  ', 7],
      ['0', 0],
      ['00.5', 0.5],
    ])('min payment %p → %p', (value, expected) => {
      expect(toNewAccountInput(cc(value), { sortOrder: 0 }).minimum_payment).toBe(expected);
    });

    it.each([
      '5abc',
      '5.5.5',
      '0x10',
      '1e3',
      '1_000',
      '.5',
      '5.',
      '12,34',
      'abc',
      '-3',
      'Infinity',
      '٥',
    ])('min payment %p → null, not a corrupted number', (value) => {
      expect(toNewAccountInput(cc(value), { sortOrder: 0 }).minimum_payment).toBeNull();
    });
  });

  describe('apr — same table, on a credit card with interest tracking on', () => {
    const cc = (apr: string) =>
      baseData({
        selected_type: AccountType.CreditCard,
        credit_limit: '1000',
        interest_tracking: true,
        apr,
      });

    it.each([
      ['5,000', 5000],
      ['5,000.50', 5000.5],
      ['1,234,567.89', 1234567.89],
      ['  7  ', 7],
      ['0', 0],
      ['00.5', 0.5],
    ])('apr %p → %p', (value, expected) => {
      expect(toNewAccountInput(cc(value), { sortOrder: 0 }).apr).toBe(expected);
    });

    it.each([
      '5abc',
      '5.5.5',
      '0x10',
      '1e3',
      '1_000',
      '.5',
      '5.',
      '12,34',
      'abc',
      '-3',
      'Infinity',
      '٥',
    ])('apr %p → null, not a corrupted number', (value) => {
      expect(toNewAccountInput(cc(value), { sortOrder: 0 }).apr).toBeNull();
    });
  });
});

describe('toNewAccountInput — rounding, roundMoney half-even', () => {
  it('0.005 is below MIN_MONEY_AMOUNT and is rejected, not rounded to 0', () => {
    expect(() => toNewAccountInput(baseData({ balance: '0.005' }), { sortOrder: 0 })).toThrow(
      AccountFormMappingError,
    );
  });

  it('0.015 rounds up to the even cent on opening_balance', () => {
    expect(
      toNewAccountInput(baseData({ balance: '0.015' }), { sortOrder: 0 }).opening_balance,
    ).toBe(0.02);
  });

  it('0.005 is below MIN_MONEY_AMOUNT on credit_limit; 0.015 still rounds', () => {
    const cc = (credit_limit: string) =>
      baseData({ selected_type: AccountType.CreditCard, credit_limit });
    expect(toNewAccountInput(cc('0.005'), { sortOrder: 0 }).credit_limit).toBeNull();
    expect(toNewAccountInput(cc('0.015'), { sortOrder: 0 }).credit_limit).toBe(0.02);
  });

  it('0.005 is below MIN_MONEY_AMOUNT on minimum_payment; 0.015 still rounds', () => {
    const cc = (min_payment: string) =>
      baseData({ selected_type: AccountType.CreditCard, credit_limit: '1000', min_payment });
    expect(toNewAccountInput(cc('0.005'), { sortOrder: 0 }).minimum_payment).toBeNull();
    expect(toNewAccountInput(cc('0.015'), { sortOrder: 0 }).minimum_payment).toBe(0.02);
  });

  it('apr rounds too, even though it is not currency: 24.999 → 25', () => {
    const data = baseData({
      selected_type: AccountType.CreditCard,
      credit_limit: '1000',
      interest_tracking: true,
      apr: '24.999',
    });
    expect(toNewAccountInput(data, { sortOrder: 0 }).apr).toBe(25);
  });
});

// W2E §3.2 row 3 / §8.3 — apr now maps through optionalPercent
// (parseDecimalText + roundMoney quantization), not optionalAmount: below
// MIN_MONEY_AMOUNT is a valid, quantized percentage, not a rejected amount.
describe('toNewAccountInput — apr, optionalPercent quantization (§3.3)', () => {
  const cc = (apr: string) =>
    baseData({
      selected_type: AccountType.CreditCard,
      credit_limit: '1000',
      interest_tracking: true,
      apr,
    });

  it('0.005 quantizes to 0 at 2dp half-even, not rejected as below the money floor', () => {
    expect(toNewAccountInput(cc('0.005'), { sortOrder: 0 }).apr).toBe(0);
  });

  it('17.999 quantizes to 18', () => {
    expect(toNewAccountInput(cc('17.999'), { sortOrder: 0 }).apr).toBe(18);
  });

  it('blank stays null', () => {
    expect(toNewAccountInput(cc(''), { sortOrder: 0 }).apr).toBeNull();
  });
});

describe('toNewAccountInput — credit vs non-credit', () => {
  it('AccountType.Bank with every credit input filled still persists all credit fields absent', () => {
    const data = baseData({
      selected_type: AccountType.Bank,
      credit_limit: '5,000',
      min_payment: '200',
      due_day: '15',
      apr: '24.99',
    });
    const result = toNewAccountInput(data, { sortOrder: 0 });
    expect(result.credit_limit).toBeNull();
    expect(result.revolving_balance).toBeNull();
    expect(result.minimum_payment).toBeNull();
    expect(result.statement_due_day).toBeNull();
    expect(result.apr).toBeNull();
  });

  // interest_tracking now gates on isCC (spec.md:296 — "interest_tracking
  // persists 0" on every non-credit type). MA-007 left this write ungated
  // deliberately and named this task in its own comment; this test used to
  // pin the ungated write and now pins the gate it was left for. Draft
  // retention across a type switch (MA-009 plan decision 4) is exactly what
  // makes a retained credit draft's interest_tracking=true reachable on a
  // Bank save, so the gate has to hold here, not just in the UI.
  it('interest_tracking is gated by isCC — a retained credit draft never leaks true onto a non-credit save', () => {
    const data = baseData({ selected_type: AccountType.Bank, interest_tracking: true });
    expect(toNewAccountInput(data, { sortOrder: 0 }).interest_tracking).toBe(0);
  });

  it('AccountType.CreditCard persists every filled credit field', () => {
    const data = baseData({
      selected_type: AccountType.CreditCard,
      credit_limit: '5,000',
      min_payment: '0',
      due_day: '15',
      interest_tracking: true,
      apr: '24.99',
    });
    const result = toNewAccountInput(data, { sortOrder: 0 });
    expect(result.credit_limit).toBe(5000);
    expect(result.minimum_payment).toBe(0);
    expect(result.statement_due_day).toBe(15);
    expect(result.interest_tracking).toBe(1);
    expect(result.apr).toBe(24.99);
  });
});

describe('toNewAccountInput — blank vs explicit zero', () => {
  it('blank min_payment on a credit card → null', () => {
    const data = baseData({
      selected_type: AccountType.CreditCard,
      credit_limit: '1000',
      min_payment: '',
    });
    expect(toNewAccountInput(data, { sortOrder: 0 }).minimum_payment).toBeNull();
  });

  it('explicit zero min_payment on a credit card → 0', () => {
    const data = baseData({
      selected_type: AccountType.CreditCard,
      credit_limit: '1000',
      min_payment: '0',
    });
    expect(toNewAccountInput(data, { sortOrder: 0 }).minimum_payment).toBe(0);
  });

  it('explicit zero apr with interest tracking on → 0, not null', () => {
    const data = baseData({
      selected_type: AccountType.CreditCard,
      credit_limit: '1000',
      interest_tracking: true,
      apr: '0',
    });
    expect(toNewAccountInput(data, { sortOrder: 0 }).apr).toBe(0);
  });
});

// @layla's ruling, spec.md § "revolving_balance at creation — ruled": a pure
// derivation from `type` alone, never a validated user input, never mirrored
// from opening_balance. Part A is her table verbatim; Parts B and C
// (confirmation tests over the unmodified transactions domain) live in
// __tests__/transactions/card_revolving_seed.test.ts.
describe("toNewAccountInput — revolving_balance, @layla's Part A", () => {
  it.each([
    ['A1 New bank account', AccountType.Bank, 5000, null],
    ['A2 New wallet account', AccountType.SmartWallet, 0, null],
    ['A3 New credit card, positive amount owed', AccountType.CreditCard, 8450, 0],
    ['A4 New credit card, paid off at creation', AccountType.CreditCard, 0, 0],
  ])('%s → %p', (_scenario, type, openingBalance, expected) => {
    const data = baseData({
      selected_type: type,
      balance: String(openingBalance),
      ...(type === AccountType.CreditCard ? { credit_limit: '1000' } : {}),
    });
    expect(toNewAccountInput(data, { sortOrder: 0 }).revolving_balance).toBe(expected);
  });

  it.each(Object.values(AccountType))(
    '%s → 0 for CreditCard, null for every other type (catches a sixth type on the wrong side)',
    (type) => {
      const data = baseData({
        selected_type: type,
        ...(type === AccountType.CreditCard ? { credit_limit: '1000' } : {}),
      });
      const expected = type === AccountType.CreditCard ? 0 : null;
      expect(toNewAccountInput(data, { sortOrder: 0 }).revolving_balance).toBe(expected);
    },
  );

  // The assertion that fails if anyone re-derives revolving_balance from the
  // balance — the outcome @layla explicitly rejected (spec.md:308).
  it('is independent of opening_balance — same type, any balance, identical result', () => {
    const results = ['0', '8450', '1,234,567.89'].map(
      (balance) =>
        toNewAccountInput(
          baseData({ selected_type: AccountType.CreditCard, credit_limit: '1000', balance }),
          { sortOrder: 0 },
        ).revolving_balance,
    );
    expect(results).toEqual([0, 0, 0]);
  });
});

// Decision 4's persistence half: every credit-only column, including
// interest_tracking, must come back null/0 on a non-credit save even when a
// retained credit draft still carries values in RHF (the validation half is
// the schema's off-type gating test).
describe('toNewAccountInput — off-type leakage, every credit column', () => {
  it.each(Object.values(AccountType).filter((type) => type !== AccountType.CreditCard))(
    '%s with a full retained credit draft → every credit column absent',
    (type) => {
      const data = baseData({
        selected_type: type,
        credit_limit: '50,000',
        min_payment: '900',
        due_day: '14',
        apr: '24',
        interest_tracking: true,
      });
      const result = toNewAccountInput(data, { sortOrder: 0 });
      expect(result.credit_limit).toBeNull();
      expect(result.minimum_payment).toBeNull();
      expect(result.statement_due_day).toBeNull();
      expect(result.apr).toBeNull();
      expect(result.revolving_balance).toBeNull();
      expect(result.interest_tracking).toBe(0);
    },
  );
});

describe('toNewAccountInput — statement_due_day', () => {
  const cc = (due_day: string) =>
    baseData({ selected_type: AccountType.CreditCard, credit_limit: '1000', due_day });

  it("'15' → 15", () => {
    expect(toNewAccountInput(cc('15'), { sortOrder: 0 }).statement_due_day).toBe(15);
  });

  it("'5abc' → null (no truncated guess)", () => {
    expect(toNewAccountInput(cc('5abc'), { sortOrder: 0 }).statement_due_day).toBeNull();
  });

  it("'15.5' → null (non-integer rejected, not floored)", () => {
    expect(toNewAccountInput(cc('15.5'), { sortOrder: 0 }).statement_due_day).toBeNull();
  });

  it("'' → null", () => {
    expect(toNewAccountInput(cc(''), { sortOrder: 0 }).statement_due_day).toBeNull();
  });
});

describe('toNewAccountInput — name and identity', () => {
  it('trims the name', () => {
    expect(toNewAccountInput(baseData({ name: '  CIB Savings  ' }), { sortOrder: 0 }).name).toBe(
      'CIB Savings',
    );
  });

  it('sort_order is the passed sortOrder', () => {
    expect(toNewAccountInput(baseData(), { sortOrder: 3 }).sort_order).toBe(3);
  });

  it('color passes through unchanged', () => {
    expect(toNewAccountInput(baseData({ selected_color: '#5BA597' }), { sortOrder: 0 }).color).toBe(
      '#5BA597',
    );
  });

  it('the returned object carries no current_balance key', () => {
    expect(toNewAccountInput(baseData(), { sortOrder: 0 })).not.toHaveProperty('current_balance');
  });
});

describe('createAccountFormDefaults', () => {
  it('starts the draft on the passed currency', () => {
    expect(createAccountFormDefaults(Currency.USD).currency).toBe(Currency.USD);
  });

  it('defaults to the shared default colour', () => {
    expect(createAccountFormDefaults(Currency.EGP).selected_color).toBe(DEFAULT_ACCOUNT_COLOR);
  });

  it('defaults type to Bank', () => {
    expect(createAccountFormDefaults(Currency.EGP).selected_type).toBe(AccountType.Bank);
  });

  it('defaults every string field to empty and interest tracking to false', () => {
    const defaults = createAccountFormDefaults(Currency.EGP);
    expect(defaults.name).toBe('');
    expect(defaults.balance).toBe('');
    expect(defaults.credit_limit).toBe('');
    expect(defaults.apr).toBe('');
    expect(defaults.min_payment).toBe('');
    expect(defaults.due_day).toBe('');
    expect(defaults.interest_tracking).toBe(false);
  });
});
