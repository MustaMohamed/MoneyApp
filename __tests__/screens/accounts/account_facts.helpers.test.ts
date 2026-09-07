import { AccountType, Currency } from '@/constants/enums';
import { buildAccountFacts } from '@/modules/accounts/screens/accounts/detail/components/account_facts.helpers';
import type { Account } from '@/store/account.store';

function mkAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'a1',
    name: 'CIB',
    type: AccountType.Bank,
    currency: Currency.EGP,
    opening_balance: 30000,
    current_balance: 30000,
    color: '#1B2B4B',
    credit_limit: null,
    revolving_balance: null,
    minimum_payment: null,
    statement_due_day: null,
    interest_tracking: 0,
    apr: null,
    is_archived: 0,
    balance_review_required: 0,
    sort_order: 0,
    created_at: '2026-05-23T00:00:00.000Z',
    updated_at: '2026-05-23T00:00:00.000Z',
    ...overrides,
  };
}

function mkCard(overrides: Partial<Account> = {}): Account {
  return mkAccount({
    type: AccountType.CreditCard,
    credit_limit: 50000,
    current_balance: 4080,
    minimum_payment: 2500,
    statement_due_day: 23,
    apr: 24.5,
    interest_tracking: 1,
    ...overrides,
  });
}

describe('buildAccountFacts — non-card types', () => {
  it('a bank account shows currency and opening balance', () => {
    expect(buildAccountFacts(mkAccount())).toEqual([
      { label: 'Currency', value: 'EGP' },
      { label: 'Opening balance', value: '30,000 EGP' },
    ]);
  });

  it('takes the opening balance decimals from the account currency', () => {
    const facts = buildAccountFacts(
      mkAccount({ currency: Currency.USD, opening_balance: 1250.5, current_balance: 1250.5 }),
    );
    expect(facts[1]).toEqual({ label: 'Opening balance', value: '1,250.50 USD' });
  });

  it.each([
    AccountType.Bank,
    AccountType.SmartWallet,
    AccountType.PhysicalWallet,
    AccountType.PhysicalSavings,
  ])('%s gives exactly two rows', (type) => {
    expect(buildAccountFacts(mkAccount({ type }))).toHaveLength(2);
  });
});

describe('buildAccountFacts — credit cards', () => {
  it('a fully filled card shows limit, minimum payment, due day and APR', () => {
    expect(buildAccountFacts(mkCard())).toEqual([
      { label: 'Credit limit', value: '50,000 EGP' },
      { label: 'Minimum payment', value: '2,500 EGP' },
      { label: 'Due day', value: '23rd of the month' },
      { label: 'APR', value: '24.50% · interest tracked' },
    ]);
  });

  it('prints an em dash for every unset card field', () => {
    const facts = buildAccountFacts(
      mkCard({
        credit_limit: null,
        minimum_payment: null,
        statement_due_day: null,
        apr: null,
        interest_tracking: 0,
      }),
    );
    expect(facts.map((fact) => fact.value)).toEqual(['—', '—', '—', '—']);
  });

  it('appends the tracking note to an unset APR', () => {
    const facts = buildAccountFacts(mkCard({ apr: null, interest_tracking: 1 }));
    expect(facts[3]).toEqual({ label: 'APR', value: '— · interest tracked' });
  });

  it('drops the tracking note when interest tracking is off', () => {
    const facts = buildAccountFacts(mkCard({ interest_tracking: 0 }));
    expect(facts[3]).toEqual({ label: 'APR', value: '24.50%' });
  });

  it.each([
    [1, '1st of the month'],
    [2, '2nd of the month'],
    [11, '11th of the month'],
    [31, '31st of the month'],
  ])('spells due day %i as %s', (day, expected) => {
    expect(buildAccountFacts(mkCard({ statement_due_day: day }))[2]?.value).toBe(expected);
  });

  it('treats a zero due day as unset', () => {
    expect(buildAccountFacts(mkCard({ statement_due_day: 0 }))[2]?.value).toBe('—');
  });

  it('takes the card amount decimals from the account currency', () => {
    const facts = buildAccountFacts(
      mkCard({ currency: Currency.USD, credit_limit: 500, minimum_payment: 25 }),
    );
    expect(facts[0]).toEqual({ label: 'Credit limit', value: '500.00 USD' });
    expect(facts[1]).toEqual({ label: 'Minimum payment', value: '25.00 USD' });
  });
});
