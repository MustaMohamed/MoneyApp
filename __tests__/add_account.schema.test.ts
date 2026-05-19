// Run zod_config side-effect before any test so the global error map is set
import '@/utils/zod_config';
import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/store/account.store';
import { createAddAccountSchema } from '@/utils/schemas/add_account.schema';

const emptyAccounts: Account[] = [];

const accountFixture = (name: string): Account => ({
  id: name,
  name,
  type: AccountType.Bank,
  currency: Currency.EGP,
  opening_balance: 0,
  current_balance: 0,
  color: null,
  credit_limit: null,
  revolving_balance: null,
  minimum_payment: null,
  statement_due_day: null,
  interest_tracking: 0,
  apr: null,
  is_archived: 0,
  sort_order: 0,
  created_at: '2026-04-29T00:00:00.000Z',
  updated_at: '2026-04-29T00:00:00.000Z',
});

const baseData = (overrides: Record<string, unknown> = {}) => ({
  name: 'My Account',
  balance: '1000',
  selected_type: AccountType.Bank,
  selected_color: '#1B2B4B',
  currency: Currency.EGP,
  interest_tracking: false,
  credit_limit: '',
  apr: '',
  revolving_balance: '',
  min_payment: '',
  due_day: '',
  ...overrides,
});

function fieldErrors(
  data: Record<string, unknown>,
  accounts: Account[] = emptyAccounts,
): Record<string, string> {
  const result = createAddAccountSchema(accounts).safeParse(data);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((i) => [String(i.path[0]), i.message]));
}

describe('createAddAccountSchema — add_account Zod schema', () => {
  describe('name', () => {
    it('empty name → errNameRequired', () => {
      expect(fieldErrors(baseData({ name: '' })).name).toBe(Strings.errNameRequired);
    });

    it('name > 30 chars → errNameTooLong', () => {
      expect(fieldErrors(baseData({ name: 'a'.repeat(31) })).name).toBe(Strings.errNameTooLong);
    });

    it('name exactly 30 chars → valid', () => {
      expect(fieldErrors(baseData({ name: 'a'.repeat(30) })).name).toBeUndefined();
    });

    it('duplicate name (case-insensitive) → errNameDuplicate', () => {
      const errs = fieldErrors(baseData({ name: 'CIB SAVINGS' }), [accountFixture('CIB Savings')]);
      expect(errs.name).toBe(Strings.errNameDuplicate);
    });

    it('duplicate match ignores surrounding whitespace', () => {
      const errs = fieldErrors(baseData({ name: '  Bank One  ' }), [accountFixture('bank one')]);
      expect(errs.name).toBe(Strings.errNameDuplicate);
    });
  });

  describe('balance', () => {
    it('empty balance → errBalanceInvalid', () => {
      expect(fieldErrors(baseData({ balance: '' })).balance).toBe(Strings.errBalanceInvalid);
    });

    it('negative balance → errBalanceInvalid', () => {
      expect(fieldErrors(baseData({ balance: '-1' })).balance).toBe(Strings.errBalanceInvalid);
    });

    it('non-numeric balance → errBalanceInvalid', () => {
      expect(fieldErrors(baseData({ balance: 'abc' })).balance).toBe(Strings.errBalanceInvalid);
    });

    it('balance of 0 → valid', () => {
      expect(fieldErrors(baseData({ balance: '0' })).balance).toBeUndefined();
    });
  });

  describe('credit card fields', () => {
    it('CC type + empty credit_limit → errCreditLimitRequired', () => {
      const errs = fieldErrors(
        baseData({ selected_type: AccountType.CreditCard, credit_limit: '' }),
      );
      expect(errs.credit_limit).toBe(Strings.errCreditLimitRequired);
    });

    it('CC type + non-empty credit_limit → valid', () => {
      const errs = fieldErrors(
        baseData({ selected_type: AccountType.CreditCard, credit_limit: '5000' }),
      );
      expect(errs.credit_limit).toBeUndefined();
    });

    it('non-CC type + empty credit_limit → valid', () => {
      expect(
        fieldErrors(baseData({ selected_type: AccountType.Bank, credit_limit: '' })).credit_limit,
      ).toBeUndefined();
    });

    it('CC + interest ON + empty APR → errAprRequired', () => {
      const errs = fieldErrors(
        baseData({
          selected_type: AccountType.CreditCard,
          credit_limit: '5000',
          interest_tracking: true,
          apr: '',
        }),
      );
      expect(errs.apr).toBe(Strings.errAprRequired);
    });

    it('CC + interest OFF + empty APR → valid', () => {
      const errs = fieldErrors(
        baseData({
          selected_type: AccountType.CreditCard,
          credit_limit: '5000',
          interest_tracking: false,
          apr: '',
        }),
      );
      expect(errs.apr).toBeUndefined();
    });

    it('CC + interest ON + provided APR → valid', () => {
      const errs = fieldErrors(
        baseData({
          selected_type: AccountType.CreditCard,
          credit_limit: '5000',
          interest_tracking: true,
          apr: '24.99',
        }),
      );
      expect(errs.apr).toBeUndefined();
    });
  });

  it('all valid → no errors', () => {
    expect(fieldErrors(baseData())).toEqual({});
  });
});
