import { Strings } from '@/constants/strings';
import type { Account } from '@/store/accountStore';
import { validateAccountForm, type ValidationValues } from '@/utils/validation';

const baseValues = (overrides: Partial<ValidationValues> = {}): ValidationValues => ({
  name: 'My Account',
  balance: '1000',
  type: 'bank',
  creditLimit: '',
  interestTracking: false,
  apr: '',
  ...overrides,
});

const accountFixture = (name: string): Account => ({
  id: name,
  name,
  type: 'bank',
  currency: 'EGP',
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

describe('validateAccountForm — TC-08', () => {
  describe('name', () => {
    it('1. empty name → errNameRequired', () => {
      const errs = validateAccountForm(baseValues({ name: '' }), []);
      expect(errs.name).toBe(Strings.errNameRequired);
    });

    it('1. whitespace-only name is treated as empty', () => {
      const errs = validateAccountForm(baseValues({ name: '   ' }), []);
      expect(errs.name).toBe(Strings.errNameRequired);
    });

    it('2. name > 30 chars → errNameTooLong', () => {
      const errs = validateAccountForm(baseValues({ name: 'a'.repeat(31) }), []);
      expect(errs.name).toBe(Strings.errNameTooLong);
    });

    it('2. name exactly 30 chars is valid', () => {
      const errs = validateAccountForm(baseValues({ name: 'a'.repeat(30) }), []);
      expect(errs.name).toBeUndefined();
    });

    it('7. duplicate name (case-insensitive) → errNameDuplicate', () => {
      const errs = validateAccountForm(baseValues({ name: 'CIB SAVINGS' }), [
        accountFixture('CIB Savings'),
      ]);
      expect(errs.name).toBe(Strings.errNameDuplicate);
    });

    it('7. duplicate match ignores surrounding whitespace', () => {
      const errs = validateAccountForm(baseValues({ name: '  Bank One  ' }), [
        accountFixture('bank one'),
      ]);
      expect(errs.name).toBe(Strings.errNameDuplicate);
    });
  });

  describe('balance', () => {
    it('3. negative balance → errBalanceInvalid', () => {
      const errs = validateAccountForm(baseValues({ balance: '-1' }), []);
      expect(errs.balance).toBe(Strings.errBalanceInvalid);
    });

    it('3. non-numeric balance → errBalanceInvalid', () => {
      const errs = validateAccountForm(baseValues({ balance: 'abc' }), []);
      expect(errs.balance).toBe(Strings.errBalanceInvalid);
    });

    it('3. empty balance → errBalanceInvalid', () => {
      const errs = validateAccountForm(baseValues({ balance: '' }), []);
      expect(errs.balance).toBe(Strings.errBalanceInvalid);
    });

    it('4. balance exactly 0 is valid', () => {
      const errs = validateAccountForm(baseValues({ balance: '0' }), []);
      expect(errs.balance).toBeUndefined();
    });
  });

  describe('credit_card fields', () => {
    it('5. CC type + empty credit limit → errCreditLimitRequired', () => {
      const errs = validateAccountForm(baseValues({ type: 'credit_card', creditLimit: '' }), []);
      expect(errs.creditLimit).toBe(Strings.errCreditLimitRequired);
    });

    it('5. CC type + zero credit limit → errCreditLimitRequired', () => {
      const errs = validateAccountForm(baseValues({ type: 'credit_card', creditLimit: '0' }), []);
      expect(errs.creditLimit).toBe(Strings.errCreditLimitRequired);
    });

    it('5. CC type + negative credit limit → errCreditLimitRequired', () => {
      const errs = validateAccountForm(
        baseValues({ type: 'credit_card', creditLimit: '-100' }),
        [],
      );
      expect(errs.creditLimit).toBe(Strings.errCreditLimitRequired);
    });

    it('5. non-CC type leaves creditLimit ungated even when empty', () => {
      const errs = validateAccountForm(baseValues({ type: 'bank', creditLimit: '' }), []);
      expect(errs.creditLimit).toBeUndefined();
    });

    it('6. CC + interest ON + empty APR → errAprRequired', () => {
      const errs = validateAccountForm(
        baseValues({
          type: 'credit_card',
          creditLimit: '5000',
          interestTracking: true,
          apr: '',
        }),
        [],
      );
      expect(errs.apr).toBe(Strings.errAprRequired);
    });

    it('6. CC + interest OFF + empty APR is valid', () => {
      const errs = validateAccountForm(
        baseValues({
          type: 'credit_card',
          creditLimit: '5000',
          interestTracking: false,
          apr: '',
        }),
        [],
      );
      expect(errs.apr).toBeUndefined();
    });

    it('6. CC + interest ON + valid APR is valid', () => {
      const errs = validateAccountForm(
        baseValues({
          type: 'credit_card',
          creditLimit: '5000',
          interestTracking: true,
          apr: '24.99',
        }),
        [],
      );
      expect(errs.apr).toBeUndefined();
    });
  });

  it('all fields valid → empty errors object', () => {
    const errs = validateAccountForm(baseValues(), []);
    expect(errs).toEqual({});
  });
});
