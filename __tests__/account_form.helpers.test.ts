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
  revolving_balance: '',
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

    it.each(['5abc', '5.5.5', '0x10', '1e3', '1_000', '.5', '5.', '12,34', '', 'abc', '-3', 'Infinity', '٥'])(
      'opening balance %p throws rather than persisting a wrong number',
      (balance) => {
        expect(() => toNewAccountInput(baseData({ balance }), { sortOrder: 0 })).toThrow(
          AccountFormMappingError,
        );
      },
    );
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

    it.each(['5abc', '5.5.5', '0x10', '1e3', '1_000', '.5', '5.', '12,34', 'abc', '-3', 'Infinity', '٥'])(
      'credit limit %p → null, not a corrupted number',
      (value) => {
        expect(toNewAccountInput(cc(value), { sortOrder: 0 }).credit_limit).toBeNull();
      },
    );
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

    it.each(['5abc', '5.5.5', '0x10', '1e3', '1_000', '.5', '5.', '12,34', 'abc', '-3', 'Infinity', '٥'])(
      'min payment %p → null, not a corrupted number',
      (value) => {
        expect(toNewAccountInput(cc(value), { sortOrder: 0 }).minimum_payment).toBeNull();
      },
    );
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

    it.each(['5abc', '5.5.5', '0x10', '1e3', '1_000', '.5', '5.', '12,34', 'abc', '-3', 'Infinity', '٥'])(
      'apr %p → null, not a corrupted number',
      (value) => {
        expect(toNewAccountInput(cc(value), { sortOrder: 0 }).apr).toBeNull();
      },
    );
  });
});

describe('toNewAccountInput — rounding, roundMoney half-even', () => {
  it('0.005 rounds down to the even cent on opening_balance', () => {
    expect(toNewAccountInput(baseData({ balance: '0.005' }), { sortOrder: 0 }).opening_balance).toBe(
      0,
    );
  });

  it('0.015 rounds up to the even cent on opening_balance', () => {
    expect(toNewAccountInput(baseData({ balance: '0.015' }), { sortOrder: 0 }).opening_balance).toBe(
      0.02,
    );
  });

  it('0.005 / 0.015 round the same way on credit_limit', () => {
    const cc = (credit_limit: string) =>
      baseData({ selected_type: AccountType.CreditCard, credit_limit });
    expect(toNewAccountInput(cc('0.005'), { sortOrder: 0 }).credit_limit).toBe(0);
    expect(toNewAccountInput(cc('0.015'), { sortOrder: 0 }).credit_limit).toBe(0.02);
  });

  it('0.005 / 0.015 round the same way on minimum_payment', () => {
    const cc = (min_payment: string) =>
      baseData({ selected_type: AccountType.CreditCard, credit_limit: '1000', min_payment });
    expect(toNewAccountInput(cc('0.005'), { sortOrder: 0 }).minimum_payment).toBe(0);
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

describe('toNewAccountInput — credit vs non-credit', () => {
  it('AccountType.Bank with every credit input filled still persists all credit fields absent', () => {
    const data = baseData({
      selected_type: AccountType.Bank,
      credit_limit: '5,000',
      revolving_balance: '1,500',
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
    expect(result.interest_tracking).toBe(0);
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
    const data = baseData({ selected_type: AccountType.CreditCard, credit_limit: '1000', min_payment: '' });
    expect(toNewAccountInput(data, { sortOrder: 0 }).minimum_payment).toBeNull();
  });

  it('explicit zero min_payment on a credit card → 0', () => {
    const data = baseData({ selected_type: AccountType.CreditCard, credit_limit: '1000', min_payment: '0' });
    expect(toNewAccountInput(data, { sortOrder: 0 }).minimum_payment).toBe(0);
  });
});

describe('toNewAccountInput — revolving_balance preserves the || 0 fallback', () => {
  const cc = (revolving_balance: string) =>
    baseData({ selected_type: AccountType.CreditCard, credit_limit: '1000', revolving_balance });

  it('unparseable → 0', () => {
    expect(toNewAccountInput(cc('abc'), { sortOrder: 0 }).revolving_balance).toBe(0);
  });

  it('blank → null', () => {
    expect(toNewAccountInput(cc(''), { sortOrder: 0 }).revolving_balance).toBeNull();
  });

  it('parseable, thousands-separated → the real number, not a truncated one', () => {
    expect(toNewAccountInput(cc('1,500'), { sortOrder: 0 }).revolving_balance).toBe(1500);
  });
});

describe('toNewAccountInput — statement_due_day', () => {
  const cc = (due_day: string) => baseData({ selected_type: AccountType.CreditCard, credit_limit: '1000', due_day });

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
    expect(
      toNewAccountInput(baseData({ name: '  CIB Savings  ' }), { sortOrder: 0 }).name,
    ).toBe('CIB Savings');
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
    expect(defaults.revolving_balance).toBe('');
    expect(defaults.min_payment).toBe('');
    expect(defaults.due_day).toBe('');
    expect(defaults.interest_tracking).toBe(false);
  });
});
