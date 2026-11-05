import { AmountType, Currency } from '@/constants/enums';
import { resolveStopConfirmBody } from '@/modules/commitments/screens/commitments/components/stop_confirm_dialog.helpers';
import { resolveSkipConfirmBody } from '@/modules/commitments/screens/commitments/detail/components/skip_confirm_dialog.helpers';
import { makeTestCommitment, makeTestPayment } from '@/test_helpers/commitment';

describe('resolveSkipConfirmBody', () => {
  it('names a fixed EGP row, its short weekday date, its amount and the month it leaves', () => {
    const commitment = makeTestCommitment();
    const payment = makeTestPayment({ due_date: '2026-10-01', amount_due: 8000 });

    expect(resolveSkipConfirmBody({ payment, commitment, today: '2026-10-20' })).toBe(
      "Rent · Thu 1 Oct · 8,000 EGP won't count toward October. The commitment keeps going.",
    );
  });

  it('prints a variable row with an estimate as the row prints it, with a tilde', () => {
    const commitment = makeTestCommitment({
      name: 'Electricity',
      amount_type: AmountType.Variable,
      amount: null,
    });
    const payment = makeTestPayment({ due_date: '2026-10-01', amount_due: 600 });

    expect(resolveSkipConfirmBody({ payment, commitment, today: '2026-10-20' })).toBe(
      "Electricity · Thu 1 Oct · ~ 600 EGP won't count toward October. The commitment keeps going.",
    );
  });

  it('prints a variable row with no estimate as the tilde alone', () => {
    const commitment = makeTestCommitment({
      name: 'Electricity',
      amount_type: AmountType.Variable,
      amount: null,
    });
    const payment = makeTestPayment({ due_date: '2026-10-01', amount_due: null });

    expect(resolveSkipConfirmBody({ payment, commitment, today: '2026-10-20' })).toBe(
      "Electricity · Thu 1 Oct · ~ won't count toward October. The commitment keeps going.",
    );
  });

  it('prints a USD row at two decimals with its code', () => {
    const commitment = makeTestCommitment({
      name: 'Netflix',
      amount: 12.5,
      currency: Currency.USD,
    });
    const payment = makeTestPayment({
      due_date: '2026-11-15',
      amount_due: 12.5,
      currency: Currency.USD,
    });

    expect(resolveSkipConfirmBody({ payment, commitment, today: '2026-10-20' })).toBe(
      "Netflix · Sun 15 Nov · 12.50 USD won't count toward November. The commitment keeps going.",
    );
  });

  it('shows the year of a row due in another year than today', () => {
    const commitment = makeTestCommitment();
    const payment = makeTestPayment({ due_date: '2027-01-01', amount_due: 8000 });

    expect(resolveSkipConfirmBody({ payment, commitment, today: '2026-12-20' })).toBe(
      "Rent · Fri 1 Jan 2027 · 8,000 EGP won't count toward January. The commitment keeps going.",
    );
  });

  it('names January for a row due 31 Jan read on a leap February day', () => {
    const commitment = makeTestCommitment();
    const payment = makeTestPayment({ due_date: '2028-01-31', amount_due: 8000 });

    expect(resolveSkipConfirmBody({ payment, commitment, today: '2028-02-29' })).toBe(
      "Rent · Mon 31 Jan · 8,000 EGP won't count toward January. The commitment keeps going.",
    );
  });
});

describe('resolveStopConfirmBody', () => {
  it.each([
    [
      3,
      9,
      'Its 3 unpaid payments are removed. The 9 paid ones stay in your history. Nothing is charged.',
    ],
    [
      1,
      1,
      'Its 1 unpaid payment is removed. The 1 paid one stays in your history. Nothing is charged.',
    ],
    [2, 0, 'Its 2 unpaid payments are removed. Nothing is charged.'],
    [0, 4, 'The 4 paid ones stay in your history. Nothing is charged.'],
    [0, 0, 'Nothing is charged.'],
    [1200, 0, 'Its 1,200 unpaid payments are removed. Nothing is charged.'],
  ])('reads %i unpaid and %i paid as %j', (unpaid, paid, body) => {
    expect(resolveStopConfirmBody({ unpaid, paid })).toBe(body);
  });
});
