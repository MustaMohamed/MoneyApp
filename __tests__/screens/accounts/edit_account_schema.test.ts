import '@/utils/zod_config';
import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/store/account.store';
import {
  createEditAccountFormSchema,
  createEditAccountSchema,
  type EditAccountFormData,
} from '@/modules/accounts/utils/edit_account.schema';
import { makeTestAccount } from '@/test_helpers/transaction';

const acct = (id: string, name: string): Account =>
  ({
    id,
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
    created_at: '2026-05-23T00:00:00.000Z',
    updated_at: '2026-05-23T00:00:00.000Z',
  }) as Account;

function err(
  schema: ReturnType<typeof createEditAccountSchema>,
  data: { name: string; color: string },
) {
  const r = schema.safeParse(data);
  return r.success ? undefined : r.error.issues[0]?.message;
}

function nameMessages(
  schema: ReturnType<typeof createEditAccountSchema>,
  data: { name: string; color: string },
) {
  const r = schema.safeParse(data);
  return r.success ? [] : r.error.issues.filter((i) => i.path[0] === 'name').map((i) => i.message);
}

describe('edit account schema', () => {
  const accounts = [acct('id-self', 'My Bank'), acct('id-other', 'Other Bank')];

  it('A-07: duplicate name of another account (diff case) → errNameDuplicate', () => {
    const schema = createEditAccountSchema(accounts, 'id-self');
    expect(err(schema, { name: 'OTHER BANK', color: '#fff' })).toBe(Strings.errNameDuplicate);
  });

  it('A-08: own current name is valid (self excluded by id)', () => {
    const schema = createEditAccountSchema(accounts, 'id-self');
    expect(err(schema, { name: 'My Bank', color: '#fff' })).toBeUndefined();
  });

  it('empty name → errNameRequired', () => {
    const schema = createEditAccountSchema(accounts, 'id-self');
    expect(err(schema, { name: '', color: '#fff' })).toBe(Strings.errNameRequired);
  });

  it('name > 30 chars → errNameTooLong', () => {
    const schema = createEditAccountSchema(accounts, 'id-self');
    expect(err(schema, { name: 'a'.repeat(31), color: '#fff' })).toBe(Strings.errNameTooLong);
  });

  it('whitespace-only name → errNameRequired alone', () => {
    const schema = createEditAccountSchema(accounts, 'id-self');
    expect(nameMessages(schema, { name: '   ', color: '#fff' })).toEqual([Strings.errNameRequired]);
  });

  it('whitespace-only name beside a blank-named account → errNameRequired alone, no duplicate', () => {
    const schema = createEditAccountSchema([...accounts, acct('id-blank', '')], 'id-self');
    expect(nameMessages(schema, { name: '   ', color: '#fff' })).toEqual([Strings.errNameRequired]);
  });

  it('surrounding spaces are removed from the parsed name', () => {
    const schema = createEditAccountSchema([acct('id-self', 'My Bank')], 'id-self');
    const r = schema.safeParse({ name: ' Cash ', color: '#fff' });
    expect(r.success).toBe(true);
    expect(r.data?.name).toBe('Cash');
  });

  it('surrounding spaces against another active "cash" → errNameDuplicate', () => {
    const schema = createEditAccountSchema([...accounts, acct('id-other-cash', 'cash')], 'id-self');
    expect(err(schema, { name: ' Cash ', color: '#fff' })).toBe(Strings.errNameDuplicate);
  });

  it('30 chars inside surrounding spaces → valid, the limit reads the trimmed name', () => {
    const schema = createEditAccountSchema(accounts, 'id-self');
    expect(err(schema, { name: ` ${'a'.repeat(30)} `, color: '#fff' })).toBeUndefined();
  });

  describe('invisible-only names', () => {
    describe.each([
      ['a right-to-left mark', '\u200F'],
      ['a zero-width space', '\u200B'],
      ['a mark and a zero-width space among spaces', ' \u200F \u200B '],
    ])('%s', (_label, name) => {
      it.each([
        ['the two named accounts', accounts],
        ['a blank-named account', [...accounts, acct('id-blank', '')]],
        ['an account named only a mark', [...accounts, acct('id-mark', '\u200F')]],
      ])('→ errNameRequired alone, beside %s', (_beside, list) => {
        const schema = createEditAccountSchema(list, 'id-self');
        expect(nameMessages(schema, { name, color: '#fff' })).toEqual([Strings.errNameRequired]);
      });
    });

    it("a leading mark on another account's name → errNameDuplicate", () => {
      const schema = createEditAccountSchema(accounts, 'id-self');
      expect(nameMessages(schema, { name: '\u200FOther Bank', color: '#fff' })).toEqual([
        Strings.errNameDuplicate,
      ]);
    });

    it('a zero-width joiner inside a name parses as typed', () => {
      const schema = createEditAccountSchema(accounts, 'id-self');
      const r = schema.safeParse({ name: 'My\u200DBank', color: '#fff' });
      expect(r.data?.name).toBe('My\u200DBank');
    });
  });
});

describe('createEditAccountFormSchema', () => {
  const card = makeTestAccount({
    id: 'id-card',
    name: 'CIB Visa',
    type: AccountType.CreditCard,
    current_balance: 8450,
  });
  const activeOther = makeTestAccount({
    id: 'id-active',
    name: 'Other Bank',
    type: AccountType.Bank,
  });
  const archived = makeTestAccount({
    id: 'id-archived',
    name: 'Old Wallet',
    type: AccountType.PhysicalWallet,
    is_archived: 1,
  });

  const formData = (overrides: Partial<EditAccountFormData> = {}): EditAccountFormData => ({
    name: 'CIB Visa',
    color: '#1B2B4B',
    interest_tracking: false,
    credit_limit: '10,000',
    apr: '',
    min_payment: '',
    due_day: '',
    ...overrides,
  });

  function fieldErrors(
    data: EditAccountFormData,
    account: Pick<Account, 'id' | 'type' | 'current_balance'> = card,
  ): Record<string, string> {
    const r = createEditAccountFormSchema([card, activeOther], [archived], account).safeParse(data);
    if (r.success) return {};
    return Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]));
  }

  describe('name', () => {
    it("an archived account's name (diff case, surrounding spaces) → errNameDuplicateNamed with the trimmed typed name", () => {
      expect(fieldErrors(formData({ name: '  OLD WALLET  ' })).name).toBe(
        Strings.errNameDuplicateNamed('OLD WALLET'),
      );
    });

    it("the edited account's own name passes", () => {
      expect(fieldErrors(formData({ name: 'cib visa' }))).toEqual({});
    });

    it('an active duplicate → errNameDuplicateNamed', () => {
      expect(fieldErrors(formData({ name: 'Other Bank' })).name).toBe(
        Strings.errNameDuplicateNamed('Other Bank'),
      );
    });
  });

  describe('credit fields on a card owing 8,450', () => {
    it('min payment 9,000 → errMinPaymentExceedsOwed', () => {
      expect(fieldErrors(formData({ min_payment: '9,000' })).min_payment).toBe(
        Strings.errMinPaymentExceedsOwed,
      );
    });

    it('min payment 8,450 passes', () => {
      expect(fieldErrors(formData({ min_payment: '8,450' }))).toEqual({});
    });

    it('blank credit limit → errCreditLimitRequired', () => {
      expect(fieldErrors(formData({ credit_limit: '' })).credit_limit).toBe(
        Strings.errCreditLimitRequired,
      );
    });

    it('credit limit 0 → errCreditLimitPositive', () => {
      expect(fieldErrors(formData({ credit_limit: '0' })).credit_limit).toBe(
        Strings.errCreditLimitPositive,
      );
    });

    it.each([
      ['credit_limit', { credit_limit: 'abc' }],
      ['min_payment', { min_payment: '5abc' }],
      ['apr', { interest_tracking: true, apr: 'abc' }],
    ])('non-numeric %s → errAmountInvalid', (field, overrides) => {
      expect(fieldErrors(formData(overrides))[field]).toBe(Strings.errAmountInvalid);
    });

    it.each(['0', '32', '15.5'])('due day %p → errDueDayRange', (due_day) => {
      expect(fieldErrors(formData({ due_day })).due_day).toBe(Strings.errDueDayRange);
    });

    it('blank APR with tracking on → errAprRequired', () => {
      expect(fieldErrors(formData({ interest_tracking: true, apr: '' })).apr).toBe(
        Strings.errAprRequired,
      );
    });

    it('APR 100.01 → errAprRange', () => {
      expect(fieldErrors(formData({ interest_tracking: true, apr: '100.01' })).apr).toBe(
        Strings.errAprRange,
      );
    });

    it('a non-numeric APR with tracking off passes', () => {
      expect(fieldErrors(formData({ interest_tracking: false, apr: 'abc' }))).toEqual({});
    });
  });

  describe('a card at zero', () => {
    const paidOff = { ...card, current_balance: 0 };

    it('refuses a minimum payment of 1', () => {
      expect(fieldErrors(formData({ min_payment: '1' }), paidOff).min_payment).toBe(
        Strings.errMinPaymentExceedsOwed,
      );
    });

    it('accepts a minimum payment of 0', () => {
      expect(fieldErrors(formData({ min_payment: '0' }), paidOff)).toEqual({});
    });
  });

  it('a Bank account with a leftover credit draft raises no issue at all', () => {
    const bank = makeTestAccount({ id: 'id-bank', name: 'CIB', type: AccountType.Bank });
    const r = createEditAccountFormSchema([card, bank], [archived], bank).safeParse(
      formData({
        name: 'CIB',
        credit_limit: '',
        min_payment: '9,000',
        interest_tracking: true,
        apr: '',
      }),
    );
    expect(r.success).toBe(true);
  });
});
