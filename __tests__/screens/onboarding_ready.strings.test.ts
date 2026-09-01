import { Strings } from '@/constants/strings';

describe('N4 pill copy — both pluralisation points', () => {
  it.each([
    ['n4PillAccounts', 1, '1 account'],
    ['n4PillAccounts', 3, '3 accounts'],
    ['n4PillOpeningBal', 1, 'opening balance'],
    ['n4PillOpeningBal', 3, 'opening balances'],
    ['n4PillNeedsRate', 1, '1 needs a rate'],
    ['n4PillNeedsRate', 2, '2 need a rate'],
  ] as const)('%s(%i)', (key, count, expected) => {
    expect(Strings[key](count)).toBe(expected);
  });
});

describe('N4 hero captions — the parameterised codes and their plural points', () => {
  it('pluralises the foreign account noun on foreignCount', () => {
    expect(Strings.n4CaptionConverted(1, 'USD')).toBe(
      'Includes 1 USD account, converted using your saved rate.',
    );
    expect(Strings.n4CaptionConverted(2, 'USD')).toBe(
      'Includes 2 USD accounts, converted using your saved rate.',
    );
  });

  it('renders the drawn EGP sentence byte-exact, and the USD-base one it also has to cover', () => {
    expect(Strings.n4CaptionAllBase(3, 'EGP')).toBe(
      'All 3 accounts are in EGP, so nothing needed converting.',
    );
    expect(Strings.n4CaptionAllBase(2, 'USD')).toBe(
      'All 2 accounts are in USD, so nothing needed converting.',
    );
  });

  it('pluralises the credit-card-only caption on accountCount', () => {
    expect(Strings.n4CaptionCreditOnly(1)).toBe(
      'Your only account is a credit card, so this is what you owe. Add a bank or cash account for the full picture.',
    );
    expect(Strings.n4CaptionCreditOnly(2)).toBe(
      'Your accounts are all credit cards, so this is what you owe. Add a bank or cash account for the full picture.',
    );
    expect(Strings.n4CaptionCreditOnly(3)).toBe(
      'Your accounts are all credit cards, so this is what you owe. Add a bank or cash account for the full picture.',
    );
  });
});
