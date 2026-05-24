import '@/utils/zod_config';
import { z } from 'zod';

import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/store/account.store';

// Mirrors the editSchema built in screens/accounts_v2/detail/account_detail.hook.ts.
// Kept in lock-step with the hook: name min(1)/max(30) + self-excluding duplicate refine.
function makeEditSchema(accounts: Account[], id: string) {
  return z.object({
    name: z
      .string()
      .min(1, Strings.errNameRequired)
      .max(30, Strings.errNameTooLong)
      .refine(
        (n) =>
          !accounts.some(
            (a) => a.id !== id && a.name.trim().toLowerCase() === n.trim().toLowerCase(),
          ),
        { message: Strings.errNameDuplicate },
      ),
    color: z.string(),
  });
}

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

function err(schema: ReturnType<typeof makeEditSchema>, data: { name: string; color: string }) {
  const r = schema.safeParse(data);
  return r.success ? undefined : r.error.issues[0]?.message;
}

describe('edit account schema', () => {
  const accounts = [acct('id-self', 'My Bank'), acct('id-other', 'Other Bank')];

  it('A-07: duplicate name of another account (diff case) → errNameDuplicate', () => {
    const schema = makeEditSchema(accounts, 'id-self');
    expect(err(schema, { name: 'OTHER BANK', color: '#fff' })).toBe(Strings.errNameDuplicate);
  });

  it('A-08: own current name is valid (self excluded by id)', () => {
    const schema = makeEditSchema(accounts, 'id-self');
    expect(err(schema, { name: 'My Bank', color: '#fff' })).toBeUndefined();
  });

  it('empty name → errNameRequired', () => {
    const schema = makeEditSchema(accounts, 'id-self');
    expect(err(schema, { name: '', color: '#fff' })).toBe(Strings.errNameRequired);
  });

  it('name > 30 chars → errNameTooLong', () => {
    const schema = makeEditSchema(accounts, 'id-self');
    expect(err(schema, { name: 'a'.repeat(31), color: '#fff' })).toBe(Strings.errNameTooLong);
  });
});
