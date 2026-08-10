// Run zod_config side-effect before any test so the global error map is set
import '@/utils/zod_config';
import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/store/account.store';
import { createAddAccountSchema } from '@/modules/accounts/utils/add_account.schema';

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
  balance_review_required: 0,
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

const NON_CREDIT_TYPES = Object.values(AccountType).filter((t) => t !== AccountType.CreditCard);

// MA-007's rejected/accepted case table (spec.md:298), applied to every new
// amount field this task adds to the credit block.
const REJECTED_AMOUNTS = [
  '5abc',
  '5.5.5',
  '0x10',
  '1e3',
  '1_000',
  '.5',
  '5.',
  '12,34',
  '-3',
  'Infinity',
  '٥',
];
const ACCEPTED_AMOUNTS: Array<[string, number]> = [
  ['5,000', 5000],
  ['  7  ', 7],
];

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

    it('duplicate name (case-insensitive) → errNameDuplicateNamed, carrying the typed casing', () => {
      const errs = fieldErrors(baseData({ name: 'CIB SAVINGS' }), [accountFixture('CIB Savings')]);
      expect(errs.name).toBe(Strings.errNameDuplicateNamed('CIB SAVINGS'));
    });

    it('duplicate match ignores surrounding whitespace; message uses the trimmed typed name, not the stored casing', () => {
      const errs = fieldErrors(baseData({ name: '  Bank One  ' }), [accountFixture('bank one')]);
      expect(errs.name).toBe(Strings.errNameDuplicateNamed('Bank One'));
    });
  });

  describe('balance', () => {
    it('empty balance → errAmountInvalid', () => {
      expect(fieldErrors(baseData({ balance: '' })).balance).toBe(Strings.errAmountInvalid);
    });

    it('negative balance → errAmountInvalid', () => {
      expect(fieldErrors(baseData({ balance: '-1' })).balance).toBe(Strings.errAmountInvalid);
    });

    it('non-numeric balance → errAmountInvalid', () => {
      expect(fieldErrors(baseData({ balance: 'abc' })).balance).toBe(Strings.errAmountInvalid);
    });

    it('balance of 0 → valid', () => {
      expect(fieldErrors(baseData({ balance: '0' })).balance).toBeUndefined();
    });
  });

  describe('balance — the MA-007 case table', () => {
    it.each([
      ['5,000', true],
      ['5,000.50', true],
      ['1,234,567.89', true],
      ['  7  ', true],
      ['0', true],
      ['00.5', true],
      ['5abc', false],
      ['5.5.5', false],
      ['0x10', false],
      ['1e3', false],
      ['1_000', false],
      ['.5', false],
      ['5.', false],
      ['12,34', false],
      ['', false],
      ['abc', false],
      ['-3', false],
      ['Infinity', false],
      ['٥', false],
    ])('balance %p → accepted: %p', (balance, accepted) => {
      const errs = fieldErrors(baseData({ balance }));
      expect(errs.balance === undefined).toBe(accepted);
    });

    it('rejects with errAmountInvalid, not a generic message', () => {
      expect(fieldErrors(baseData({ balance: '5abc' })).balance).toBe(Strings.errAmountInvalid);
    });
  });

  describe('credit card fields — required/APR-gate smoke tests', () => {
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

  // The credit-rule accept/reject table — MA-009 plan step 3, spec.md:284-296.
  describe('credit card fields — the MA-009 accept/reject table', () => {
    const cc = (overrides: Record<string, unknown> = {}) =>
      baseData({
        selected_type: AccountType.CreditCard,
        credit_limit: '50000',
        ...overrides,
      });

    it('#1 limit 50,000, min blank, day blank, interest off → accept', () => {
      expect(fieldErrors(cc({ credit_limit: '50,000' }))).toEqual({});
    });

    it('#2 limit blank → reject credit_limit / errCreditLimitRequired', () => {
      expect(fieldErrors(cc({ credit_limit: '' })).credit_limit).toBe(
        Strings.errCreditLimitRequired,
      );
    });

    it('#3 limit 0 → reject credit_limit / errCreditLimitPositive', () => {
      expect(fieldErrors(cc({ credit_limit: '0' })).credit_limit).toBe(
        Strings.errCreditLimitPositive,
      );
    });

    it('#4 limit 0.00 → reject credit_limit / errCreditLimitPositive', () => {
      expect(fieldErrors(cc({ credit_limit: '0.00' })).credit_limit).toBe(
        Strings.errCreditLimitPositive,
      );
    });

    it.each(['abc', '-1', '5.5.5', '1e3'])(
      '#5/#5b limit %p (unparseable) → reject credit_limit / errAmountInvalid, not errCreditLimitPositive',
      (value) => {
        expect(fieldErrors(cc({ credit_limit: value })).credit_limit).toBe(
          Strings.errAmountInvalid,
        );
      },
    );

    it('#6 balance 8,450, limit 5,000 → accept — an over-limit card is representable', () => {
      expect(fieldErrors(cc({ balance: '8,450', credit_limit: '5,000' }))).toEqual({});
    });

    it('#7 balance 8,450, min 9,000 → reject min_payment / errMinPaymentExceedsOwed', () => {
      expect(fieldErrors(cc({ balance: '8,450', min_payment: '9,000' })).min_payment).toBe(
        Strings.errMinPaymentExceedsOwed,
      );
    });

    it('#8 balance 8,450, min 8,450 → accept — the boundary is not exceeded', () => {
      expect(fieldErrors(cc({ balance: '8,450', min_payment: '8,450' }))).toEqual({});
    });

    it('#9 balance 0, min 0 → accept — explicit zero on a paid-off card', () => {
      expect(fieldErrors(cc({ balance: '0', min_payment: '0' }))).toEqual({});
    });

    it('#10 min 5abc → reject min_payment / errAmountInvalid', () => {
      expect(fieldErrors(cc({ min_payment: '5abc' })).min_payment).toBe(Strings.errAmountInvalid);
    });

    it('#11 min blank → accept', () => {
      expect(fieldErrors(cc({ min_payment: '' }))).toEqual({});
    });

    it.each(['0', '32', '15.5', 'abc'])(
      '#12 day %p → reject due_day / errDueDayRange',
      (value) => {
        expect(fieldErrors(cc({ due_day: value })).due_day).toBe(Strings.errDueDayRange);
      },
    );

    it.each(['1', '31', '15'])('#13 day %p → accept', (value) => {
      expect(fieldErrors(cc({ due_day: value }))).toEqual({});
    });

    it('#14 day blank → accept', () => {
      expect(fieldErrors(cc({ due_day: '' }))).toEqual({});
    });

    it('#15 interest on, apr blank → reject apr / errAprRequired', () => {
      expect(fieldErrors(cc({ interest_tracking: true, apr: '' })).apr).toBe(
        Strings.errAprRequired,
      );
    });

    it('#16 interest on, apr abc → reject apr / errAmountInvalid', () => {
      expect(fieldErrors(cc({ interest_tracking: true, apr: 'abc' })).apr).toBe(
        Strings.errAmountInvalid,
      );
    });

    it('#17 interest on, apr 0 → accept', () => {
      expect(fieldErrors(cc({ interest_tracking: true, apr: '0' }))).toEqual({});
    });

    it('#18 interest off, apr abc → accept — the rule only exists while tracking is on', () => {
      expect(fieldErrors(cc({ interest_tracking: false, apr: 'abc' }))).toEqual({});
    });
  });

  // Decision 4's trap: a stale credit draft must never block a non-credit save.
  describe('off-type gating — every credit rule opens on selected_type === CreditCard', () => {
    it.each(NON_CREDIT_TYPES)('%s with every credit field invalid → accept, zero issues', (type) => {
      const errs = fieldErrors(
        baseData({
          selected_type: type,
          credit_limit: '',
          min_payment: '9,000',
          due_day: '99',
          apr: 'abc',
          interest_tracking: true,
        }),
      );
      expect(errs).toEqual({});
    });
  });

  // The parser case table, applied to the three new credit amount fields plus
  // due_day (which additionally rejects anything parseable but out of range).
  describe('the MA-007 parser case table, applied to the new amount fields', () => {
    describe('credit_limit', () => {
      it.each(REJECTED_AMOUNTS)('%p → errAmountInvalid', (value) => {
        expect(
          fieldErrors(baseData({ selected_type: AccountType.CreditCard, credit_limit: value }))
            .credit_limit,
        ).toBe(Strings.errAmountInvalid);
      });

      it.each(ACCEPTED_AMOUNTS)('%p → accepted', (value) => {
        expect(
          fieldErrors(baseData({ selected_type: AccountType.CreditCard, credit_limit: value }))
            .credit_limit,
        ).toBeUndefined();
      });
    });

    describe('min_payment', () => {
      it.each(REJECTED_AMOUNTS)('%p → errAmountInvalid', (value) => {
        expect(
          fieldErrors(
            baseData({
              selected_type: AccountType.CreditCard,
              credit_limit: '1000',
              min_payment: value,
            }),
          ).min_payment,
        ).toBe(Strings.errAmountInvalid);
      });

      it.each(ACCEPTED_AMOUNTS)('%p → accepted', (value) => {
        expect(
          fieldErrors(
            baseData({
              selected_type: AccountType.CreditCard,
              credit_limit: '1000',
              balance: '1000000',
              min_payment: value,
            }),
          ).min_payment,
        ).toBeUndefined();
      });
    });

    describe('apr — interest tracking on', () => {
      it.each(REJECTED_AMOUNTS)('%p → errAmountInvalid', (value) => {
        expect(
          fieldErrors(
            baseData({
              selected_type: AccountType.CreditCard,
              credit_limit: '1000',
              interest_tracking: true,
              apr: value,
            }),
          ).apr,
        ).toBe(Strings.errAmountInvalid);
      });

      it.each(ACCEPTED_AMOUNTS)('%p → accepted', (value) => {
        expect(
          fieldErrors(
            baseData({
              selected_type: AccountType.CreditCard,
              credit_limit: '1000',
              interest_tracking: true,
              apr: value,
            }),
          ).apr,
        ).toBeUndefined();
      });
    });

    describe('due_day', () => {
      it.each(REJECTED_AMOUNTS)('%p (unparseable) → errDueDayRange', (value) => {
        expect(
          fieldErrors(
            baseData({ selected_type: AccountType.CreditCard, credit_limit: '1000', due_day: value }),
          ).due_day,
        ).toBe(Strings.errDueDayRange);
      });

      it('"5,000" parses but is out of the 1-31 range → errDueDayRange', () => {
        expect(
          fieldErrors(
            baseData({
              selected_type: AccountType.CreditCard,
              credit_limit: '1000',
              due_day: '5,000',
            }),
          ).due_day,
        ).toBe(Strings.errDueDayRange);
      });

      it('"  7  " parses and is in range → accepted', () => {
        expect(
          fieldErrors(
            baseData({
              selected_type: AccountType.CreditCard,
              credit_limit: '1000',
              due_day: '  7  ',
            }),
          ).due_day,
        ).toBeUndefined();
      });
    });
  });

  it('all valid → no errors', () => {
    expect(fieldErrors(baseData())).toEqual({});
  });
});
