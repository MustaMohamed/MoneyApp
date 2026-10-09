import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { SemanticTokens } from '@/constants/theme_tokens';
import { creditBandColor } from '@/modules/accounts/constants/available_credit_color';
import {
  buildHeroCaption,
  buildHeroHeading,
} from '@/modules/accounts/screens/accounts/detail/components/balance_hero.helpers';
import type { Account } from '@/store/account.store';
import { MINUS_SIGN } from '@/utils/format_amount';

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
    expect(cap.text).toBe('Opening 100.00 USD');
  });

  it('#277: takes decimals from CURRENCY_CONFIG for a non-whole EGP opening balance', () => {
    const cap = buildHeroCaption(mkAccount({ opening_balance: 1250.75, current_balance: 1250.75 }));
    expect(cap.text).toBe('Opening 1,251 EGP');
  });
});

describe('buildHeroCaption — an opening balance below zero (MA-156)', () => {
  // A minus put on by hand would print −0 for -0.4, so the zero case sits beside the overdrawn one.
  it('takes the owned sign: a minus below zero, none on a figure that prints as zero', () => {
    const overdrawn = buildHeroCaption(
      mkAccount({ opening_balance: -1900, current_balance: -1900 }),
    ).text;
    expect(overdrawn).toBe(`Opening ${MINUS_SIGN}1,900 EGP`);
    expect(overdrawn).toContain(String.fromCodePoint(0x2212));
    expect(overdrawn).not.toContain('-');
    expect(buildHeroCaption(mkAccount({ opening_balance: -0.4, current_balance: -0.4 })).text).toBe(
      'Opening 0 EGP',
    );
  });

  it('keeps two decimals under the owned minus on an overdrawn USD opening balance', () => {
    const overdrawn = buildHeroCaption(
      mkAccount({ currency: Currency.USD, opening_balance: -42.5, current_balance: -42.5 }),
    ).text;
    expect(overdrawn).toBe(`Opening ${MINUS_SIGN}42.50 USD`);
    expect(overdrawn).toContain(String.fromCodePoint(0x2212));
    expect(overdrawn).not.toContain('-');
  });
});

describe('buildHeroCaption — credit cards', () => {
  it('E-2: shows available credit and is colored positive at low utilisation', () => {
    const cap = buildHeroCaption(
      mkAccount({ type: AccountType.CreditCard, credit_limit: 50000, current_balance: 4080 }),
    );
    expect(cap.text).toBe('Available 45,920 EGP of 50,000');
    expect(cap.color).toBe(creditBandColor(4080, 50000));
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

  it('captions Over limit in the negative colour when the balance exceeds the limit', () => {
    const cap = buildHeroCaption(
      mkAccount({ type: AccountType.CreditCard, credit_limit: 1000, current_balance: 1500 }),
    );
    expect(cap.text).toBe(Strings.accountOverLimit);
    expect(cap.color).toBe(SemanticTokens.negative);
    expect(cap.adjusted).toBe(false);
  });

  it('captions Over limit on USD too', () => {
    const cap = buildHeroCaption(
      mkAccount({
        currency: Currency.USD,
        type: AccountType.CreditCard,
        credit_limit: 500,
        current_balance: 500.01,
      }),
    );
    expect(cap.text).toBe(Strings.accountOverLimit);
    expect(cap.color).toBe(SemanticTokens.negative);
  });

  it('a balance exactly at the limit still reads Available 0', () => {
    const cap = buildHeroCaption(
      mkAccount({ type: AccountType.CreditCard, credit_limit: 1000, current_balance: 1000 }),
    );
    expect(cap.text).toBe('Available 0 EGP of 1,000');
    expect(cap.color).toBe(creditBandColor(1000, 1000));
  });

  it('a balance one float step past the limit reads Available 0, and 0.01 past it reads Over limit', () => {
    const card = (balance: number): Account =>
      mkAccount({ type: AccountType.CreditCard, credit_limit: 1000, current_balance: balance });

    expect(buildHeroCaption(card(1000.01)).text).toBe(Strings.accountOverLimit);

    const tie = buildHeroCaption(card(1000.0000000000001));
    expect(tie.text).toBe('Available 0 EGP of 1,000');
    expect(tie.color).toBe(SemanticTokens.negative);
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

describe('buildHeroCaption — archived credit cards', () => {
  const archivedCard = (balance: number) =>
    mkAccount({
      type: AccountType.CreditCard,
      credit_limit: 50000,
      opening_balance: balance,
      current_balance: balance,
      is_archived: 1,
    });

  it('gives an archived card with headroom the opening caption, not its available credit', () => {
    expect(buildHeroCaption(archivedCard(12000))).toEqual({
      text: 'Opening 12,000 EGP',
      adjusted: false,
    });
  });

  it('gives an archived card over its limit the opening caption, not the over-limit line', () => {
    expect(buildHeroCaption(archivedCard(60000))).toEqual({
      text: 'Opening 60,000 EGP',
      adjusted: false,
    });
  });
});

describe('buildHeroHeading', () => {
  it('labels an active balance as current, on a filled tile', () => {
    expect(buildHeroHeading(mkAccount({ is_archived: 0 }))).toEqual({
      label: 'Current balance',
      hollow: false,
    });
  });

  it('labels an archived balance as the one it was archived with, on a hollow tile', () => {
    expect(buildHeroHeading(mkAccount({ is_archived: 1 }))).toEqual({
      label: 'Balance when archived',
      hollow: true,
    });
  });
});
