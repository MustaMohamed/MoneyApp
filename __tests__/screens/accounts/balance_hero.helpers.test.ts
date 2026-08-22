import { AccountType, Currency } from '@/constants/enums';
import {
  availableCreditColor,
  buildHeroBalanceText,
  buildHeroCaption,
} from '@/modules/accounts/screens/accounts/detail/components/balance_hero.helpers';
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
    sort_order: 0,
    created_at: '2026-05-23T00:00:00.000Z',
    updated_at: '2026-05-23T00:00:00.000Z',
    ...overrides,
  } as Account;
}

describe('buildHeroCaption — non-CC types', () => {
  it('E-1: shows opening only when current === opening', () => {
    const cap = buildHeroCaption(mkAccount({ opening_balance: 30000, current_balance: 30000 }));
    expect(cap.text).toBe('Opening 30,000 EGP');
    expect(cap.adjusted).toBe(false);
  });

  it('E-1: appends adjusted flag when current !== opening', () => {
    const cap = buildHeroCaption(mkAccount({ opening_balance: 30000, current_balance: 28100 }));
    expect(cap.text).toBe('Opening 30,000 EGP');
    expect(cap.adjusted).toBe(true);
  });

  it('E-4: uses the account currency (USD), no conversion', () => {
    const cap = buildHeroCaption(
      mkAccount({ currency: Currency.USD, opening_balance: 100, current_balance: 100 }),
    );
    // #277 base -> head: 'Opening 100 USD' -> 'Opening 100.00 USD'. Written to expect the
    // 0dp bug before this ticket; USD's decimals now come from CURRENCY_CONFIG like every
    // other site (spec §6.4).
    expect(cap.text).toBe('Opening 100.00 USD');
  });

  it('#277: takes decimals from CURRENCY_CONFIG for a non-whole EGP opening balance', () => {
    const cap = buildHeroCaption(mkAccount({ opening_balance: 1250.75, current_balance: 1250.75 }));
    expect(cap.text).toBe('Opening 1,251 EGP');
  });
});

describe('buildHeroCaption — credit cards', () => {
  it('E-2: shows available credit and is colored positive at low utilisation', () => {
    const cap = buildHeroCaption(
      mkAccount({ type: AccountType.CreditCard, credit_limit: 50000, current_balance: 4080 }),
    );
    expect(cap.text).toBe('Available 45,920 EGP of 50,000');
    expect(cap.color).toBe(availableCreditColor(45920, 50000));
  });

  it('E-5: CC paid off shows full available, positive', () => {
    const cap = buildHeroCaption(
      mkAccount({ type: AccountType.CreditCard, credit_limit: 50000, current_balance: 0 }),
    );
    expect(cap.text).toBe('Available 50,000 EGP of 50,000');
  });

  it('§3.8: CC with null credit_limit falls back to Opening caption (no divide-by-zero)', () => {
    const cap = buildHeroCaption(
      mkAccount({
        type: AccountType.CreditCard,
        credit_limit: null,
        opening_balance: 0,
        current_balance: 1000,
      }),
    );
    expect(cap.text).toBe('Opening 0 EGP');
  });

  it('§3.8: CC with zero credit_limit falls back to Opening caption', () => {
    const cap = buildHeroCaption(
      mkAccount({
        type: AccountType.CreditCard,
        credit_limit: 0,
        opening_balance: 500,
        current_balance: 500,
      }),
    );
    expect(cap.text).toBe('Opening 500 EGP');
  });

  it('clamps available at zero when balance exceeds limit', () => {
    const cap = buildHeroCaption(
      mkAccount({ type: AccountType.CreditCard, credit_limit: 1000, current_balance: 1500 }),
    );
    expect(cap.text).toBe('Available 0 EGP of 1,000');
  });

  it('#277: USD direction — both amounts on the caption take CURRENCY_CONFIG decimals', () => {
    const cap = buildHeroCaption(
      mkAccount({
        currency: Currency.USD,
        type: AccountType.CreditCard,
        credit_limit: 500,
        current_balance: 0,
      }),
    );
    expect(cap.text).toBe('Available 500.00 USD of 500.00');
  });
});

describe('availableCreditColor — thresholds match §5 AccountCard', () => {
  it('returns text2 grey when limit <= 0', () => {
    expect(availableCreditColor(0, 0)).toBe('#6B7F99');
  });
  it('positive when > 50% available', () => {
    expect(availableCreditColor(600, 1000)).toBe('#4CAF82');
  });
  it('warning when 20%–50% available', () => {
    expect(availableCreditColor(300, 1000)).toBe('#E8B130');
  });
  it('negative when < 20% available', () => {
    expect(availableCreditColor(100, 1000)).toBe('#E05A42');
  });
});

describe('buildHeroBalanceText — #277 balance_hero.tsx:64', () => {
  it('shows USD cents — base: 1,251 USD, head: 1,250.75 USD', () => {
    expect(
      buildHeroBalanceText(mkAccount({ currency: Currency.USD, current_balance: 1250.75 })),
    ).toBe('1,250.75 USD');
  });

  it('leaves EGP unchanged (spec row 11)', () => {
    expect(buildHeroBalanceText(mkAccount({ current_balance: 1250.75 }))).toBe('1,251 EGP');
  });
});
