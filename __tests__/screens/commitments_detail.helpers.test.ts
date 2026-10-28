import { AccountType, AmountType, Currency, DurationType } from '@/constants/enums';
import { AcctTokens, CoreTokens, GoldTokens } from '@/constants/theme_tokens';
import { BADGE_TEXT_MIN_CONTRAST } from '@/modules/accounts/constants/account_badge_color';
import { contrastRatio } from '@/modules/accounts/constants/account_palette';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Category } from '@/modules/categories/entities/category.entity';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type {
  CommitmentMonthPayment,
  CommitmentPayment,
} from '@/modules/commitments/entities/commitment_payment.entity';
import {
  buildCommitmentDetailFacts,
  buildCommitmentDetailHero,
  commitmentDetailShowsEdit,
  overlayStorePayments,
  resolveCommitmentAmountInEgpText,
  resolveCommitmentCadenceBadge,
  resolveCommitmentDetailCycle,
  resolveCommitmentDetailFactKinds,
  resolveCommitmentDetailViewState,
  type CommitmentDetailFactKind,
  type CommitmentDetailFactsInput,
  type CommitmentDetailViewState,
  type CommitmentDetailViewStateInput,
} from '@/modules/commitments/screens/commitments/detail/detail.helpers';
import { buildCommitmentEndsLabel } from '@/modules/commitments/utils/commitment_ends_label';
import {
  makeTestCommitment,
  makeTestMonthPayment,
  makeTestPayment,
} from '@/test_helpers/commitment';
import { makeTestAccount, makeTestCategory } from '@/test_helpers/transaction';

function makePayment(overrides: Partial<CommitmentPayment> = {}): CommitmentPayment {
  return makeTestPayment({
    id: 'pay-1',
    commitment_id: 'commitment-1',
    due_date: '2026-05-01',
    amount_due: 5000,
    account_id: 'account-1',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  });
}

describe('resolveCommitmentDetailViewState', () => {
  // `hasCommitment`: the data entry for the route's id holds a commitment.
  const cases: [string, CommitmentDetailViewStateInput, CommitmentDetailViewState][] = [
    [
      'a cold load with no commitment yet reads loading, never not found',
      { hasCommitment: false, ownsStatus: true, status: 'loading', refreshError: false },
      'loading',
    ],
    [
      'a re-read over a loaded commitment reads ready',
      { hasCommitment: true, ownsStatus: true, status: 'loading', refreshError: false },
      'ready',
    ],
    [
      "another commitment's ready status with no commitment here reads loading",
      { hasCommitment: false, ownsStatus: false, status: 'ready', refreshError: false },
      'loading',
    ],
    [
      "another commitment's first-load error with no commitment here reads loading",
      { hasCommitment: false, ownsStatus: false, status: 'firstLoadError', refreshError: false },
      'loading',
    ],
    [
      "another commitment's refresh error never floats over this commitment",
      { hasCommitment: true, ownsStatus: false, status: 'ready', refreshError: true },
      'ready',
    ],
    [
      'a cold failure reads firstLoadError, never not found',
      { hasCommitment: false, ownsStatus: true, status: 'firstLoadError', refreshError: false },
      'firstLoadError',
    ],
    [
      'a first-load error over a loaded commitment reads refreshErrorWithData',
      { hasCommitment: true, ownsStatus: true, status: 'firstLoadError', refreshError: false },
      'refreshErrorWithData',
    ],
    [
      'an answered read with no commitment reads notFound',
      { hasCommitment: false, ownsStatus: true, status: 'ready', refreshError: false },
      'notFound',
    ],
    [
      'an answered read with no commitment reads notFound over a refresh error',
      { hasCommitment: false, ownsStatus: true, status: 'ready', refreshError: true },
      'notFound',
    ],
    [
      'a warm failure reads refreshErrorWithData',
      { hasCommitment: true, ownsStatus: true, status: 'ready', refreshError: true },
      'refreshErrorWithData',
    ],
    [
      'an answered read with a commitment reads ready',
      { hasCommitment: true, ownsStatus: true, status: 'ready', refreshError: false },
      'ready',
    ],
  ];

  it('reads the view state from the commitment, not from loaded rows', () => {
    const actual = Object.fromEntries(
      cases.map(([label, input]) => [label, resolveCommitmentDetailViewState(input)]),
    );
    const expected = Object.fromEntries(cases.map(([label, , state]) => [label, state]));

    expect(actual).toEqual(expected);
  });
});

describe('resolveCommitmentDetailCycle', () => {
  const unpaid = (id: string, due_date: string) => makePayment({ id, due_date });
  const paid = (id: string, due_date: string) =>
    makePayment({ id, due_date, paid_date: due_date, amount_paid: 5000 });
  const skipped = (id: string, due_date: string) =>
    makePayment({ id, due_date, skipped_date: due_date });

  it("opens at the param's row over an earlier unpaid row and over the previous due date", () => {
    const earlier = unpaid('pay-apr', '2026-04-01');
    const named = unpaid('pay-may', '2026-05-01');

    expect(resolveCommitmentDetailCycle([earlier, named], 'pay-may', '2026-04-01')).toBe(named);
  });

  it('opens at a settled row the param names, past an earlier unpaid row', () => {
    const earlier = unpaid('pay-apr', '2026-04-01');
    const settled = paid('pay-may', '2026-05-01');

    expect(resolveCommitmentDetailCycle([earlier, settled], 'pay-may', undefined)).toBe(settled);
  });

  it('keeps the previous due date on a leap day when the param names no row', () => {
    const january = unpaid('new-jan', '2028-01-29');
    const leapDay = unpaid('new-feb', '2028-02-29');
    const march = unpaid('new-mar', '2028-03-29');

    expect(resolveCommitmentDetailCycle([january, leapDay, march], 'old-feb', '2028-02-29')).toBe(
      leapDay,
    );
  });

  it('keeps the previous due date on a month-end when the param names no row', () => {
    const december = unpaid('new-dec', '2025-12-31');
    const january = unpaid('new-jan', '2026-01-31');
    const february = unpaid('new-feb', '2026-02-28');

    expect(
      resolveCommitmentDetailCycle([december, january, february], 'old-jan', '2026-01-31'),
    ).toBe(january);
  });

  it('opens at the earliest unpaid row past a skipped first row when no row has the due date', () => {
    const rows = [
      skipped('pay-mar', '2026-03-01'),
      paid('pay-apr', '2026-04-01'),
      unpaid('pay-may', '2026-05-01'),
      unpaid('pay-jun', '2026-06-01'),
    ];

    expect(resolveCommitmentDetailCycle(rows, 'gone', '2026-07-15')).toBe(rows[2]);
  });

  it('opens at the earliest unpaid row with no param and no previous due date', () => {
    const rows = [paid('pay-apr', '2026-04-01'), unpaid('pay-may', '2026-05-01')];

    expect(resolveCommitmentDetailCycle(rows, undefined, undefined)).toBe(rows[1]);
  });

  it('opens at the last row when every row is settled', () => {
    const rows = [
      paid('pay-mar', '2026-03-01'),
      skipped('pay-apr', '2026-04-01'),
      paid('pay-may', '2026-05-01'),
    ];

    expect(resolveCommitmentDetailCycle(rows, 'gone', undefined)).toBe(rows[2]);
  });

  it('reads undefined with no rows', () => {
    expect(resolveCommitmentDetailCycle([], 'pay-1', '2026-05-01')).toBeUndefined();
  });
});

describe('commitmentDetailShowsEdit', () => {
  it.each<[CommitmentDetailViewState, boolean]>([
    ['ready', true],
    ['refreshErrorWithData', true],
    ['loading', false],
    ['notFound', false],
    ['firstLoadError', false],
  ])('%s -> %s', (viewState, expected) => {
    expect(commitmentDetailShowsEdit(viewState)).toBe(expected);
  });
});

describe('overlayStorePayments', () => {
  it("replaces a Due history row with the store's Paid row", () => {
    const due = makePayment({ id: 'pay-1' });
    const paid = makePayment({ id: 'pay-1', paid_date: '2026-05-02' });

    const result = overlayStorePayments([due], [paid]);

    expect(result).toEqual([paid]);
    expect(result[0]).toBe(paid);
  });

  it('leaves unmatched rows untouched and keeps order and length', () => {
    const older = makePayment({ id: 'pay-0', due_date: '2026-04-01' });
    const current = makePayment({ id: 'pay-1', due_date: '2026-05-01' });
    const next = makePayment({ id: 'pay-2', due_date: '2026-06-01' });
    const skipped = makePayment({ id: 'pay-1', skipped_date: '2026-05-02' });
    const elsewhere = makePayment({ id: 'pay-9', commitment_id: 'commitment-2' });

    const result = overlayStorePayments([older, current, next], [elsewhere, skipped]);

    expect(result).toHaveLength(3);
    expect(result[0]).toBe(older);
    expect(result[1]).toBe(skipped);
    expect(result[2]).toBe(next);
  });

  it('returns the same reference when nothing matches', () => {
    const rows = [makePayment({ id: 'pay-1' })];

    expect(overlayStorePayments(rows, [makePayment({ id: 'pay-9' })])).toBe(rows);
    expect(overlayStorePayments(rows, [])).toBe(rows);
  });
});

const TODAY = '2026-05-08';
const bills: Category = makeTestCategory({
  id: 'housing',
  name: 'Bills',
  color: '#5C7FC4',
  icon: 'cart',
});
const variableCommitment = (overrides: Partial<Commitment> = {}): Commitment =>
  makeTestCommitment({ amount_type: AmountType.Variable, amount: 500, ...overrides });

describe('resolveCommitmentCadenceBadge', () => {
  it('reads Every month on a fixed monthly commitment, the clock glyph on a legible fill', () => {
    const badge = resolveCommitmentCadenceBadge(makeTestCommitment());

    expect(badge.badgeLabel).toBe('Every month');
    expect(badge.badgeIcon).toBe('clock-outline');
    expect(contrastRatio(badge.badgeFill, badge.badgeForeground)).toBeGreaterThanOrEqual(
      BADGE_TEXT_MIN_CONTRAST,
    );
  });

  it('appends · varies on a variable commitment', () => {
    const badge = resolveCommitmentCadenceBadge(variableCommitment());

    expect(badge.badgeLabel).toBe('Every month · varies');
    expect(badge.badgeIcon).toBe('clock-outline');
    expect(contrastRatio(badge.badgeFill, badge.badgeForeground)).toBeGreaterThanOrEqual(
      BADGE_TEXT_MIN_CONTRAST,
    );
  });
});

describe('buildCommitmentDetailHero', () => {
  it('heroes an unpaid fixed EGP cycle: name, cadence badge, category tile and the neutral amount', () => {
    const commitment = makeTestCommitment();

    const hero = buildCommitmentDetailHero({
      commitment,
      payment: makeTestPayment(),
      category: bills,
      today: TODAY,
    });

    expect(hero).toEqual({
      ...resolveCommitmentCadenceBadge(commitment),
      title: 'Rent',
      tileColor: '#5C7FC4',
      tileGlyph: 'cart',
      tileGlyphColor: CoreTokens.text1,
      amountValue: '8,000',
      amountCode: 'EGP',
      amountColor: CoreTokens.text1,
      amountAccessibilityLabel: '8,000 EGP',
      caption: 'Bills · since Thu 1 Jan 2026',
    });
  });

  it('reads ~ before an unpaid variable estimate', () => {
    const hero = buildCommitmentDetailHero({
      commitment: variableCommitment(),
      payment: makeTestPayment({ amount_due: 600 }),
      category: bills,
      today: TODAY,
    });

    expect(hero).toMatchObject({
      amountValue: '~ 600',
      amountCode: 'EGP',
      amountAccessibilityLabel: '~ 600 EGP',
      amountColor: CoreTokens.text1,
    });
  });

  it('reads ~ alone on a variable commitment with no estimate', () => {
    const hero = buildCommitmentDetailHero({
      commitment: variableCommitment({ amount: null }),
      payment: makeTestPayment({ amount_due: null }),
      category: bills,
      today: TODAY,
    });

    expect(hero).toMatchObject({
      amountValue: '~',
      amountCode: 'EGP',
      amountAccessibilityLabel: '~ EGP',
    });
  });

  it('reads — on a fixed commitment with no amount', () => {
    const hero = buildCommitmentDetailHero({
      commitment: makeTestCommitment({ amount: null }),
      payment: makeTestPayment({ amount_due: null }),
      category: bills,
      today: TODAY,
    });

    expect(hero).toMatchObject({
      amountValue: '—',
      amountCode: 'EGP',
      amountAccessibilityLabel: '— EGP',
    });
  });

  it('reads the amount paid on a paid variable cycle, with no ~', () => {
    const hero = buildCommitmentDetailHero({
      commitment: variableCommitment(),
      payment: makeTestPayment({ amount_due: 600, paid_date: '2026-09-01', amount_paid: 640 }),
      category: bills,
      today: TODAY,
    });

    expect(hero).toMatchObject({ amountValue: '640', amountAccessibilityLabel: '640 EGP' });
    expect(hero.amountValue).not.toContain('~');
    expect(hero.amountAccessibilityLabel).not.toContain('~');
  });

  it('reads a USD amount at its own two decimals and code', () => {
    const hero = buildCommitmentDetailHero({
      commitment: makeTestCommitment({ currency: Currency.USD, amount: 12.5 }),
      payment: makeTestPayment({ currency: Currency.USD, amount_due: 12.5 }),
      category: bills,
      today: TODAY,
    });

    expect(hero).toMatchObject({
      amountValue: '12.50',
      amountCode: 'USD',
      amountAccessibilityLabel: '12.50 USD',
    });
  });

  it("reads the commitment's own amount with no payment", () => {
    const hero = buildCommitmentDetailHero({
      commitment: makeTestCommitment({ amount: 7500 }),
      payment: undefined,
      category: bills,
      today: TODAY,
    });

    expect(hero).toMatchObject({ amountValue: '7,500', amountAccessibilityLabel: '7,500 EGP' });
  });

  it('puts · varies on the badge alone, never on the amount or the caption', () => {
    const hero = buildCommitmentDetailHero({
      commitment: variableCommitment(),
      payment: makeTestPayment({ amount_due: 600 }),
      category: bills,
      today: TODAY,
    });

    expect(hero.badgeLabel).toBe('Every month · varies');
    expect(hero.amountValue).not.toContain('· varies');
    expect(hero.amountAccessibilityLabel).not.toContain('· varies');
    expect(hero.caption).not.toContain('· varies');
  });

  it.each([
    [
      'a month-end start, the day before',
      '2026-01-31',
      '2026-01-30',
      'Bills · starts Sat 31 Jan 2026',
    ],
    ['a month-end start, on the day', '2026-01-31', '2026-01-31', 'Bills · since Sat 31 Jan 2026'],
    [
      'a start after a 30-day month ends, the day before',
      '2026-05-01',
      '2026-04-30',
      'Bills · starts Fri 1 May 2026',
    ],
    [
      'a start after a 30-day month ends, on the day',
      '2026-05-01',
      '2026-05-01',
      'Bills · since Fri 1 May 2026',
    ],
    [
      'a leap-day start, the day before',
      '2028-02-29',
      '2028-02-28',
      'Bills · starts Tue 29 Feb 2028',
    ],
    ['a leap-day start, on the day', '2028-02-29', '2028-02-29', 'Bills · since Tue 29 Feb 2028'],
  ])('captions %s', (_name, startDate, today, caption) => {
    const hero = buildCommitmentDetailHero({
      commitment: makeTestCommitment({ start_date: startDate }),
      payment: makeTestPayment(),
      category: bills,
      today,
    });

    expect(hero.caption).toBe(caption);
  });

  it('captions Uncategorized on the gold fallback tile when no category resolves', () => {
    const hero = buildCommitmentDetailHero({
      commitment: makeTestCommitment(),
      payment: makeTestPayment(),
      category: undefined,
      today: TODAY,
    });

    expect(hero).toMatchObject({
      caption: 'Uncategorized · since Thu 1 Jan 2026',
      tileColor: GoldTokens[500],
      tileGlyph: 'shape-outline',
      tileGlyphColor: CoreTokens.bg,
    });
  });
});

describe('resolveCommitmentDetailFactKinds (MA-261)', () => {
  const SIX: CommitmentDetailFactKind[] = [
    'account',
    'category',
    'repeats',
    'started',
    'ends',
    'currency',
  ];

  it('reads six kinds on an EGP commitment', () => {
    expect(resolveCommitmentDetailFactKinds(makeTestCommitment())).toEqual(SIX);
  });

  it('reads six kinds with no commitment, the skeleton with no hint', () => {
    expect(resolveCommitmentDetailFactKinds(undefined)).toEqual(SIX);
  });

  it('reads seven kinds on a USD commitment, amount third after category and currency last', () => {
    expect(
      resolveCommitmentDetailFactKinds(makeTestCommitment({ currency: Currency.USD })),
    ).toEqual(['account', 'category', 'amount', 'repeats', 'started', 'ends', 'currency']);
  });
});

describe('buildCommitmentEndsLabel (MA-261)', () => {
  it.each([
    ['no end', DurationType.Forever, null, null, 'Never'],
    ['one payment', DurationType.AfterCount, 1, null, 'After 1 payment'],
    ['three payments', DurationType.AfterCount, 3, null, 'After 3 payments'],
    ['a count that is null', DurationType.AfterCount, null, null, 'After N payments'],
    ['a month-end date', DurationType.UntilDate, null, '2026-04-30', 'Until Thu 30 Apr 2026'],
    ['a leap-day date', DurationType.UntilDate, null, '2028-02-29', 'Until Tue 29 Feb 2028'],
    ['a date that is null', DurationType.UntilDate, null, null, 'Until date'],
  ])('reads %s', (_name, durationType, endAfterCount, endDate, label) => {
    expect(
      buildCommitmentEndsLabel(
        makeTestCommitment({
          duration_type: durationType,
          end_after_count: endAfterCount,
          end_date: endDate,
        }),
      ),
    ).toBe(label);
  });
});

describe('buildCommitmentDetailFacts (MA-261)', () => {
  type CommitmentFact = ReturnType<typeof buildCommitmentDetailFacts>[number];

  const cib: Account = makeTestAccount({
    id: 'cib',
    name: 'CIB',
    type: AccountType.Bank,
    currency: Currency.EGP,
    color: AcctTokens.lapis.rich,
  });
  const usdSavings: Account = makeTestAccount({
    id: 'usd-savings',
    name: 'USD Savings',
    type: AccountType.Bank,
    currency: Currency.USD,
    color: AcctTokens.nile.rich,
  });
  const graphiteHollow = (type: AccountType) => ({
    color: AcctTokens.graphite.rich,
    type,
    hollow: true,
  });
  const usdCommitment = (overrides: Partial<Commitment> = {}): Commitment =>
    makeTestCommitment({ currency: Currency.USD, amount: 50, ...overrides });
  const usdPayment = (overrides: Partial<CommitmentMonthPayment> = {}): CommitmentMonthPayment =>
    makeTestMonthPayment({ currency: Currency.USD, amount_due: 50, ...overrides });

  function factsInput(
    overrides: Partial<CommitmentDetailFactsInput> = {},
  ): CommitmentDetailFactsInput {
    return {
      commitment: makeTestCommitment(),
      payment: makeTestMonthPayment(),
      category: bills,
      accountsById: new Map([
        [cib.id, cib],
        [usdSavings.id, usdSavings],
      ]),
      liveRate: 48,
      ...overrides,
    };
  }

  function factOf(facts: readonly CommitmentFact[], kind: CommitmentDetailFactKind) {
    return facts.find((fact) => fact.kind === kind);
  }

  function accountFact(input: Partial<CommitmentDetailFactsInput>) {
    return factOf(buildCommitmentDetailFacts(factsInput(input)), 'account');
  }

  describe('rows and order', () => {
    it('labels an EGP commitment’s six rows in order, every value in Sora, none fitting', () => {
      const facts = buildCommitmentDetailFacts(factsInput());

      expect(facts.map((fact) => [fact.kind, fact.label])).toEqual([
        ['account', 'Account'],
        ['category', 'Category'],
        ['repeats', 'Repeats'],
        ['started', 'Started'],
        ['ends', 'Ends'],
        ['currency', 'Currency'],
      ]);
      expect(facts.map((fact) => fact.valueFace)).toEqual(Array(6).fill('sora'));
      expect(facts.filter((fact) => fact.fitsValue)).toEqual([]);
      expect(factOf(facts, 'currency')?.value).toBe('EGP');
    });

    it('puts Amount in EGP third on a USD commitment, Currency last, and only the amount fits', () => {
      const facts = buildCommitmentDetailFacts(
        factsInput({ commitment: usdCommitment(), payment: usdPayment() }),
      );

      expect(facts.map((fact) => [fact.kind, fact.label])).toEqual([
        ['account', 'Account'],
        ['category', 'Category'],
        ['amount', 'Amount in EGP'],
        ['repeats', 'Repeats'],
        ['started', 'Started'],
        ['ends', 'Ends'],
        ['currency', 'Currency'],
      ]);
      expect(facts.map((fact) => fact.valueFace)).toEqual(Array(7).fill('sora'));
      expect(facts.filter((fact) => fact.fitsValue).map((fact) => fact.kind)).toEqual(['amount']);
      expect(facts[6].value).toBe('USD');
    });
  });

  describe('Category', () => {
    it('reads the category name on its glyph', () => {
      expect(factOf(buildCommitmentDetailFacts(factsInput()), 'category')).toMatchObject({
        value: 'Bills',
        leading: { kind: 'glyph', glyphName: 'cart', glyphColor: '#5C7FC4' },
      });
    });

    it('reads Uncategorized on the gold fallback glyph when no category resolves', () => {
      expect(
        factOf(buildCommitmentDetailFacts(factsInput({ category: undefined })), 'category'),
      ).toMatchObject({
        value: 'Uncategorized',
        leading: { kind: 'glyph', glyphName: 'shape-outline', glyphColor: GoldTokens[500] },
      });
    });
  });

  describe('Repeats, Started and Ends', () => {
    it('reads Repeats as the recurrence with no · varies on a variable commitment', () => {
      const repeats = factOf(
        buildCommitmentDetailFacts(factsInput({ commitment: variableCommitment() })),
        'repeats',
      );

      expect(repeats?.value).toBe('Every month');
    });

    it.each([
      ['a first-of-month start', '2026-01-01', 'Thu 1 Jan 2026'],
      ['a month-end start', '2026-01-31', 'Sat 31 Jan 2026'],
      ['a leap-day start', '2028-02-29', 'Tue 29 Feb 2028'],
    ])('reads Started on %s', (_name, startDate, value) => {
      const started = factOf(
        buildCommitmentDetailFacts(
          factsInput({ commitment: makeTestCommitment({ start_date: startDate }) }),
        ),
        'started',
      );

      expect(started?.value).toBe(value);
    });

    it('reads Ends After 1 payment on a commitment that ends after one payment', () => {
      const ends = factOf(
        buildCommitmentDetailFacts(
          factsInput({
            commitment: makeTestCommitment({
              duration_type: DurationType.AfterCount,
              end_after_count: 1,
            }),
          }),
        ),
        'ends',
      );

      expect(ends?.value).toBe('After 1 payment');
    });

    it('reads Ends Until the date as Started prints it', () => {
      const ends = factOf(
        buildCommitmentDetailFacts(
          factsInput({
            commitment: makeTestCommitment({
              duration_type: DurationType.UntilDate,
              end_date: '2026-04-30',
            }),
          }),
        ),
        'ends',
      );

      expect(ends?.value).toBe('Until Thu 30 Apr 2026');
    });
  });

  describe('Account', () => {
    it('reads an active account by its name on its own filled tile, with no badge', () => {
      const fact = accountFact({});

      expect(fact).toMatchObject({
        value: 'CIB',
        leading: {
          kind: 'tile',
          tile: { color: AcctTokens.lapis.rich, type: AccountType.Bank, hollow: false },
        },
      });
      expect(fact?.badge).toBeUndefined();
    });

    it('reads an archived account by its name with Archived on the graphite hollow tile', () => {
      const oldHsbc = makeTestAccount({
        id: 'cib',
        name: 'Old HSBC',
        type: AccountType.CreditCard,
        color: AcctTokens.lapis.rich,
        is_archived: 1,
      });

      expect(accountFact({ accountsById: new Map([[oldHsbc.id, oldHsbc]]) })).toMatchObject({
        value: 'Old HSBC',
        badge: { label: 'Archived', tone: 'neutral' },
        leading: { kind: 'tile', tile: graphiteHollow(AccountType.CreditCard) },
      });
    });

    it('reads a deleted account as Deleted Account on the graphite hollow tile, never archived', () => {
      const deleted = makeTestAccount({
        id: 'cib',
        name: '',
        type: AccountType.SmartWallet,
        color: AcctTokens.lapis.rich,
        is_archived: 1,
        is_deleted: 1,
      });

      const fact = accountFact({ accountsById: new Map([[deleted.id, deleted]]) });

      expect(fact).toMatchObject({
        value: 'Deleted Account',
        leading: { kind: 'tile', tile: graphiteHollow(AccountType.SmartWallet) },
      });
      expect(fact?.badge).toBeUndefined();
    });

    it('reads an id the read cannot resolve as Unknown account on the graphite hollow tile', () => {
      const fact = accountFact({ accountsById: new Map() });

      expect(fact).toMatchObject({
        value: 'Unknown account',
        leading: { kind: 'tile', tile: graphiteHollow(AccountType.Bank) },
      });
      expect(fact?.badge).toBeUndefined();
    });

    it('reads No account on the graphite hollow tile when the commitment has none', () => {
      const fact = accountFact({ commitment: makeTestCommitment({ account_id: null }) });

      expect(fact).toMatchObject({
        value: 'No account',
        leading: { kind: 'tile', tile: graphiteHollow(AccountType.Bank) },
      });
      expect(fact?.badge).toBeUndefined();
    });
  });

  describe('Amount in EGP, live rate 48', () => {
    // A paid figure is the stored EGP, set off `amount_paid × 48` so the live rate cannot pass for it.
    it.each<[string, Commitment, CommitmentMonthPayment | undefined, number | undefined, string]>([
      [
        'USD on an EGP account, paid: the stored 2,350 EGP with no ≈',
        usdCommitment(),
        usdPayment({
          paid_date: '2026-05-02',
          amount_paid: 50,
          account_id: 'cib',
          paid_egp_amount: 2350,
        }),
        48,
        '2,350 EGP',
      ],
      [
        'USD on a USD account, paid: the stored 2,410 EGP with no ≈',
        usdCommitment(),
        usdPayment({
          paid_date: '2026-05-02',
          amount_paid: 50,
          account_id: 'usd-savings',
          paid_egp_amount: 2410,
        }),
        48,
        '2,410 EGP',
      ],
      [
        'USD 50 unpaid: ≈ the amount at the live rate',
        usdCommitment(),
        usdPayment(),
        48,
        '≈ 2,400 EGP',
      ],
      [
        'USD 50 unpaid before the live rate loads: ≈ —',
        usdCommitment(),
        usdPayment(),
        undefined,
        '≈ —',
      ],
      [
        'USD variable with no estimate: ≈ —',
        usdCommitment({ amount_type: AmountType.Variable, amount: null }),
        usdPayment({ amount_due: null }),
        48,
        '≈ —',
      ],
      [
        'USD paid with no stored EGP amount: ≈ —',
        usdCommitment(),
        usdPayment({
          paid_date: '2026-05-02',
          amount_paid: 50,
          account_id: 'cib',
          paid_egp_amount: null,
        }),
        48,
        '≈ —',
      ],
      [
        'USD 40 skipped: ≈ the amount at the live rate',
        usdCommitment(),
        usdPayment({ amount_due: 40, skipped_date: '2026-05-02' }),
        48,
        '≈ 1,920 EGP',
      ],
      [
        'USD 25 with no payment: ≈ the commitment’s amount at the live rate',
        usdCommitment({ amount: 25 }),
        undefined,
        48,
        '≈ 1,200 EGP',
      ],
    ])('%s', (_name, commitment, payment, liveRate, text) => {
      const facts = buildCommitmentDetailFacts(factsInput({ commitment, payment, liveRate }));

      expect(resolveCommitmentAmountInEgpText({ commitment, payment, liveRate })).toBe(text);
      expect(facts[2]).toMatchObject({ kind: 'amount', label: 'Amount in EGP', value: text });
    });

    it.each([
      ['EGP on an EGP account', 'cib', 8000],
      ['EGP on a USD account', 'usd-savings', 8000],
    ])('%s, paid: no Amount in EGP row', (_name, accountId, paidEgpAmount) => {
      const facts = buildCommitmentDetailFacts(
        factsInput({
          payment: makeTestMonthPayment({
            paid_date: '2026-09-02',
            amount_paid: 8000,
            account_id: accountId,
            paid_egp_amount: paidEgpAmount,
          }),
        }),
      );

      expect(factOf(facts, 'amount')).toBeUndefined();
      expect(facts).toHaveLength(6);
    });
  });
});
