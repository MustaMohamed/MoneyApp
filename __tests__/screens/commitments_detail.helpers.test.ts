import { AmountType, Currency } from '@/constants/enums';
import { CoreTokens, GoldTokens } from '@/constants/theme_tokens';
import { BADGE_TEXT_MIN_CONTRAST } from '@/modules/accounts/constants/account_badge_color';
import { contrastRatio } from '@/modules/accounts/constants/account_palette';
import type { Category } from '@/modules/categories/entities/category.entity';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import {
  buildCommitmentDetailHero,
  commitmentDetailShowsEdit,
  overlayStorePayments,
  resolveCommitmentCadenceBadge,
  resolveCommitmentDetailCycle,
  resolveCommitmentDetailViewState,
  type CommitmentDetailViewState,
  type CommitmentDetailViewStateInput,
} from '@/modules/commitments/screens/commitments/detail/detail.helpers';
import { makeTestCommitment, makeTestPayment } from '@/test_helpers/commitment';
import { makeTestCategory } from '@/test_helpers/transaction';

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
