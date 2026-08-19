import { Strings } from '@/constants/strings';

/**
 * N4's five parameterised copy functions — mockup § F (F1-F9).
 *
 * These are the only place the plural FORMS live. Steps 3 and 13 assert pill
 * descriptors (`{ kind, count }`) and the screen has no render suite, so
 * deleting the ternary from `n4PillAccounts` would ship "1 accounts" — the
 * exact tell §4.2 and mockup F6 exist to prevent — with every other suite in
 * the tree still green.
 *
 * Every expected string is a LITERAL, never rebuilt from the same template the
 * implementation uses, and both sides of each `n === 1` boundary are asserted.
 * `n4CaptionAllBase(3, 'EGP')` doubles as the byte-exact check against
 * mockup.html:2335, which is what keeps the "byte-identical when code === EGP"
 * claim on that function's parameterisation deviation honest.
 */
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

describe('N4 hero captions — the parameterised code and its third plural point', () => {
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
});
