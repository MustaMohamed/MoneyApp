import { AccountType, AmountType, CommitmentPaymentStatus, Currency } from '@/constants/enums';
import { AcctTokens, CoreTokens, GoldTokens } from '@/constants/theme_tokens';
import {
  contrastRatio,
  NON_TEXT_MIN_CONTRAST_RATIO,
} from '@/modules/accounts/constants/account_palette';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Category } from '@/modules/categories/entities/category.entity';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentMonthPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import {
  buildCommitmentRowPresentation,
  COMMITMENT_STATUS_TAG_COLORS,
  COMMITMENT_STATUS_TAG_TEXT_MIN_CONTRAST,
  resolveCommitmentRowAccountId,
  resolveCommitmentRowHeight,
} from '@/modules/commitments/screens/commitments/components/commitment_row.helpers';
import { STATUS_ICONS, STATUS_LABELS } from '@/modules/commitments/utils/commitment_status';
import { TRANSACTION_ROW_HEIGHT } from '@/modules/transactions/components/transaction_row.helpers';
import { makeTestCommitment, makeTestMonthPayment } from '@/test_helpers/commitment';
import { makeTestAccount, makeTestCategory } from '@/test_helpers/transaction';

const TODAY = '2026-10-22';
const RATE = 50.5;
const HEX = /^#[0-9A-F]{6}$/i;
const ALL_STATUSES = Object.values(CommitmentPaymentStatus);

const cib = makeTestAccount({
  id: 'cib',
  name: 'CIB',
  type: AccountType.Bank,
  color: AcctTokens.lapis.rich,
});
const nbe = makeTestAccount({
  id: 'nbe',
  name: 'NBE',
  type: AccountType.SmartWallet,
  color: AcctTokens.jade.rich,
});
const deletedWallet = makeTestAccount({
  id: 'gone',
  name: '',
  type: AccountType.PhysicalWallet,
  color: AcctTokens.lapis.rich,
  is_deleted: 1,
});
const housing = makeTestCategory({
  id: 'housing',
  name: 'Housing',
  icon: 'home',
  color: '#5C7FC4',
});

const hollowBank = { color: AcctTokens.graphite.rich, type: AccountType.Bank, hollow: true };

function present(over: {
  payment?: CommitmentMonthPayment;
  commitment?: Commitment | undefined;
  category?: Category | undefined;
  account?: Account | undefined;
  today?: string;
  liveRate?: number | undefined;
}) {
  return buildCommitmentRowPresentation({
    payment: over.payment ?? makeTestMonthPayment(),
    commitment: 'commitment' in over ? over.commitment : makeTestCommitment(),
    category: 'category' in over ? over.category : housing,
    account: 'account' in over ? over.account : cib,
    today: over.today ?? TODAY,
    liveRate: 'liveRate' in over ? over.liveRate : RATE,
  });
}

describe('resolveCommitmentRowHeight', () => {
  it('keeps the transaction row height at font scale 1 and below', () => {
    expect(resolveCommitmentRowHeight(1)).toBe(TRANSACTION_ROW_HEIGHT);
    expect(resolveCommitmentRowHeight(0.85)).toBe(TRANSACTION_ROW_HEIGHT);
  });

  it('is 48 dp or taller at font scale 1', () => {
    expect(resolveCommitmentRowHeight(1)).toBeGreaterThanOrEqual(48);
  });

  it('grows with the font scale', () => {
    expect(resolveCommitmentRowHeight(1.3)).toBeGreaterThan(resolveCommitmentRowHeight(1));
    expect(resolveCommitmentRowHeight(2)).toBeGreaterThan(resolveCommitmentRowHeight(1.3));
  });
});

describe('COMMITMENT_STATUS_TAG_COLORS', () => {
  it.each(ALL_STATUSES)('gives %s a hex fill and foreground', (status) => {
    expect(COMMITMENT_STATUS_TAG_COLORS[status].fill).toMatch(HEX);
    expect(COMMITMENT_STATUS_TAG_COLORS[status].foreground).toMatch(HEX);
  });

  it.each(ALL_STATUSES)('gives %s a label ink that clears the text floor on its fill', (status) => {
    const { fill, foreground } = COMMITMENT_STATUS_TAG_COLORS[status];

    expect(COMMITMENT_STATUS_TAG_TEXT_MIN_CONTRAST).toBe(4.5);
    expect(contrastRatio(fill, foreground)).toBeGreaterThanOrEqual(
      COMMITMENT_STATUS_TAG_TEXT_MIN_CONTRAST,
    );
  });

  it.each(ALL_STATUSES)(
    'gives %s an icon ink that clears the non-text floor on the card',
    (status) => {
      const { foreground } = COMMITMENT_STATUS_TAG_COLORS[status];

      expect(contrastRatio(CoreTokens.surface, foreground)).toBeGreaterThanOrEqual(
        NON_TEXT_MIN_CONTRAST_RATIO,
      );
    },
  );

  it('keeps the gold tone as the Due ink', () => {
    expect(COMMITMENT_STATUS_TAG_COLORS[CommitmentPaymentStatus.Due].foreground.toUpperCase()).toBe(
      GoldTokens[500].toUpperCase(),
    );
  });
});

describe('resolveCommitmentRowAccountId', () => {
  it('takes the paid-from account on a paid row though the commitment names another', () => {
    const payment = makeTestMonthPayment({ paid_date: '2026-09-02', account_id: 'nbe' });

    expect(resolveCommitmentRowAccountId(payment, makeTestCommitment({ account_id: 'cib' }))).toBe(
      'nbe',
    );
  });

  it('takes the commitment account on an unpaid row though the payment names another', () => {
    const payment = makeTestMonthPayment({ account_id: 'nbe' });

    expect(resolveCommitmentRowAccountId(payment, makeTestCommitment({ account_id: 'cib' }))).toBe(
      'cib',
    );
  });

  it('takes the commitment account on a skipped row though the payment names another', () => {
    const payment = makeTestMonthPayment({ skipped_date: '2026-09-02', account_id: 'nbe' });

    expect(resolveCommitmentRowAccountId(payment, makeTestCommitment({ account_id: 'cib' }))).toBe(
      'cib',
    );
  });

  it('gives no id for a paid row with no paid-from account', () => {
    const payment = makeTestMonthPayment({ paid_date: '2026-09-02', account_id: null });

    expect(resolveCommitmentRowAccountId(payment, makeTestCommitment())).toBeUndefined();
  });

  it('gives no id for an unpaid row whose commitment has no account', () => {
    const payment = makeTestMonthPayment({ account_id: 'nbe' });

    expect(
      resolveCommitmentRowAccountId(payment, makeTestCommitment({ account_id: null })),
    ).toBeUndefined();
  });

  it('gives no id for an unpaid row with no commitment', () => {
    expect(
      resolveCommitmentRowAccountId(makeTestMonthPayment({ account_id: 'nbe' }), undefined),
    ).toBeUndefined();
  });
});

describe('buildCommitmentRowPresentation tile', () => {
  it('fills the tile in an active account colour and type', () => {
    expect(present({ account: cib }).tile).toEqual({
      color: AcctTokens.lapis.rich,
      type: AccountType.Bank,
      hollow: false,
    });
  });

  it('fills the tile in the paid-from account colour on a paid row', () => {
    const payment = makeTestMonthPayment({
      paid_date: '2026-09-02',
      amount_paid: 8000,
      account_id: 'nbe',
    });

    expect(present({ payment, account: nbe }).tile).toEqual({
      color: AcctTokens.jade.rich,
      type: AccountType.SmartWallet,
      hollow: false,
    });
  });

  it('draws a soft-deleted account as the hollow graphite tile of its type', () => {
    expect(present({ account: deletedWallet }).tile).toEqual({
      color: AcctTokens.graphite.rich,
      type: AccountType.PhysicalWallet,
      hollow: true,
    });
  });

  it('draws an id the lookup missed as the hollow graphite tile', () => {
    expect(present({ account: undefined }).tile).toEqual(hollowBank);
  });

  it('draws a commitment with no account as the hollow graphite tile', () => {
    const commitment = makeTestCommitment({ account_id: null });

    expect(present({ commitment, account: undefined }).tile).toEqual(hollowBank);
  });
});

describe('buildCommitmentRowPresentation label', () => {
  it('speaks the name, account, status, due day and amount with its code', () => {
    expect(present({}).accessibilityLabel).toBe('Rent, CIB, Overdue, Tue 1 Sep, 8,000 EGP');
  });

  it('speaks a soft-deleted account as Deleted Account', () => {
    expect(present({ account: deletedWallet }).accessibilityLabel).toBe(
      'Rent, Deleted Account, Overdue, Tue 1 Sep, 8,000 EGP',
    );
  });

  it('speaks an id the lookup missed as Unknown account', () => {
    expect(present({ account: undefined }).accessibilityLabel).toBe(
      'Rent, Unknown account, Overdue, Tue 1 Sep, 8,000 EGP',
    );
  });

  it('speaks no account when the commitment has none', () => {
    const commitment = makeTestCommitment({ account_id: null });

    expect(present({ commitment, account: undefined }).accessibilityLabel).toBe(
      'Rent, Overdue, Tue 1 Sep, 8,000 EGP',
    );
  });

  it('speaks the paid-from account on a paid row', () => {
    const payment = makeTestMonthPayment({
      paid_date: '2026-09-02',
      amount_paid: 8000,
      account_id: 'nbe',
    });

    expect(present({ payment, account: nbe }).accessibilityLabel).toBe(
      'Rent, NBE, Paid, Tue 1 Sep, 8,000 EGP',
    );
  });
});

describe('buildCommitmentRowPresentation name and glyph', () => {
  it('shows the commitment name and the category glyph in its colour', () => {
    const row = present({});

    expect(row.name).toBe('Rent');
    expect(row.glyphName).toBe('home');
    expect(row.glyphColor).toBe('#5C7FC4');
  });
});

describe('buildCommitmentRowPresentation amount', () => {
  const variable = makeTestCommitment({ amount_type: AmountType.Variable, amount: 600 });

  it('shows an EGP amount at 0 dp beside its code', () => {
    const row = present({});

    expect(row.amountText).toBe('8,000');
    expect(row.currencyCode).toBe('EGP');
  });

  it('shows a USD amount at 2 dp beside its code', () => {
    const payment = makeTestMonthPayment({ amount_due: 15, currency: Currency.USD });
    const commitment = makeTestCommitment({ amount: 15, currency: Currency.USD });
    const row = present({ payment, commitment });

    expect(row.amountText).toBe('15.00');
    expect(row.currencyCode).toBe('USD');
  });

  it('shows the amount paid with no tilde on a paid variable row', () => {
    const payment = makeTestMonthPayment({
      paid_date: '2026-09-02',
      amount_due: 600,
      amount_paid: 640,
      account_id: 'cib',
    });
    const row = present({ payment, commitment: variable });

    expect(row.amountText).toBe('640');
    expect(row.accessibilityLabel).toBe('Rent, CIB, Paid, Tue 1 Sep, 640 EGP');
  });

  it('shows a tilde and a space before the estimate on an unpaid variable row', () => {
    const row = present({
      payment: makeTestMonthPayment({ amount_due: 600 }),
      commitment: variable,
    });

    expect(row.amountText).toBe('~ 600');
    expect(row.currencyCode).toBe('EGP');
    expect(row.accessibilityLabel).toBe('Rent, CIB, Overdue, Tue 1 Sep, ~ 600 EGP');
  });

  it('shows a tilde and a space before the estimate on a skipped variable row', () => {
    const payment = makeTestMonthPayment({ skipped_date: '2026-09-02', amount_due: 600 });
    const row = present({ payment, commitment: variable });

    expect(row.amountText).toBe('~ 600');
    expect(row.accessibilityLabel).toBe('Rent, CIB, Skipped, Tue 1 Sep, ~ 600 EGP');
  });

  it('shows the tilde alone beside its code on a variable row with no estimate', () => {
    const payment = makeTestMonthPayment({ amount_due: null });
    const commitment = makeTestCommitment({ amount_type: AmountType.Variable, amount: null });
    const row = present({ payment, commitment });

    expect(row.amountText).toBe('~');
    expect(row.currencyCode).toBe('EGP');
    expect(row.accessibilityLabel).toBe('Rent, CIB, Overdue, Tue 1 Sep, ~ EGP');
  });
});

describe('buildCommitmentRowPresentation status tag', () => {
  function expectTag(row: ReturnType<typeof present>, status: CommitmentPaymentStatus): void {
    expect(row.statusLabel).toBe(STATUS_LABELS[status]);
    expect(row.statusIcon).toBe(STATUS_ICONS[status]);
    expect(row.statusFill).toBe(COMMITMENT_STATUS_TAG_COLORS[status].fill);
    expect(row.statusForeground).toBe(COMMITMENT_STATUS_TAG_COLORS[status].foreground);
  }

  it('reads Overdue for an unpaid row due before today', () => {
    expectTag(
      present({ payment: makeTestMonthPayment({ due_date: '2026-10-21' }) }),
      CommitmentPaymentStatus.Overdue,
    );
  });

  it('reads Due for an unpaid row due today at a month end', () => {
    const row = present({
      payment: makeTestMonthPayment({ due_date: '2026-10-31' }),
      today: '2026-10-31',
    });

    expectTag(row, CommitmentPaymentStatus.Due);
    expect(row.dueDay).toBe('Sat 31 Oct');
  });

  it('reads Upcoming for an unpaid row due after today', () => {
    expectTag(
      present({ payment: makeTestMonthPayment({ due_date: '2026-10-23' }) }),
      CommitmentPaymentStatus.Upcoming,
    );
  });

  it('reads Paid for a paid row due before today', () => {
    const payment = makeTestMonthPayment({
      paid_date: '2026-09-02',
      amount_paid: 8000,
      account_id: 'cib',
    });

    expectTag(present({ payment }), CommitmentPaymentStatus.Paid);
  });

  it('reads Skipped for a skipped row due before today', () => {
    expectTag(
      present({ payment: makeTestMonthPayment({ skipped_date: '2026-09-02' }) }),
      CommitmentPaymentStatus.Skipped,
    );
  });
});

describe('buildCommitmentRowPresentation due day', () => {
  it('prints a due day in the year of today without its year', () => {
    expect(present({}).dueDay).toBe('Tue 1 Sep');
  });

  it('prints a due day in another year with its year', () => {
    const row = present({
      payment: makeTestMonthPayment({ due_date: '2025-12-28' }),
      today: '2026-01-05',
    });

    expect(row.dueDay).toBe('Sun 28 Dec 2025');
  });
});

describe('buildCommitmentRowPresentation USD leg', () => {
  const usdCommitment = makeTestCommitment({ currency: Currency.USD, amount: 15.5 });
  const usdRow = (overrides: Partial<CommitmentMonthPayment> = {}) =>
    makeTestMonthPayment({ currency: Currency.USD, amount_due: 15.5, ...overrides });

  it('prints the due day alone on an EGP row', () => {
    const row = present({});

    expect(row.caption).toBe(row.dueDay);
  });

  it.each<[string, Partial<CommitmentMonthPayment>]>([
    ['unpaid', {}],
    ['skipped', { skipped_date: '2026-09-02' }],
  ])(
    'appends the live-rate EGP leg at 0 dp after the due day on a %s USD row',
    (_state, overrides) => {
      const row = present({ payment: usdRow(overrides), commitment: usdCommitment });

      expect(row.caption).toBe(`${row.dueDay} · ≈ 783 EGP`);
    },
  );

  it.each([RATE, 99, undefined])(
    'appends a paid USD row’s transaction EGP amount at live rate %p',
    (liveRate) => {
      const row = present({
        payment: usdRow({ paid_date: '2026-09-02', amount_paid: 15.5, paid_egp_amount: 760.25 }),
        commitment: usdCommitment,
        liveRate,
      });

      expect(row.caption).toBe(`${row.dueDay} · ≈ 760 EGP`);
    },
  );

  it('draws no leg on an unpaid USD row before the live rate loads', () => {
    const row = present({ payment: usdRow(), commitment: usdCommitment, liveRate: undefined });

    expect(row.caption).toBe(row.dueDay);
  });

  it('draws no leg on a USD row with no amount', () => {
    const row = present({
      payment: usdRow({ amount_due: null }),
      commitment: makeTestCommitment({
        currency: Currency.USD,
        amount_type: AmountType.Variable,
        amount: null,
      }),
    });

    expect(row.caption).toBe(row.dueDay);
  });

  it('speaks the leg with the due day', () => {
    const row = present({ payment: usdRow(), commitment: usdCommitment });

    expect(row.accessibilityLabel).toContain(`${row.dueDay} · ≈ 783 EGP`);
  });
});
