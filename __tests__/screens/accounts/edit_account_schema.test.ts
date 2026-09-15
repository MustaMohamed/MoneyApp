import '@/utils/zod_config';
import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/store/account.store';
import { createEditAccountSchema } from '@/modules/accounts/utils/edit_account.schema';

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
