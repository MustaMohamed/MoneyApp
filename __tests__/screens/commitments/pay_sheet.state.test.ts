import {
  INITIAL_PAY_SHEET_ENTRY,
  usePaySheetState,
} from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.state';

const OWNER = 'owner-a';
const OPENED_ON = '2026-10-20';
const LABEL = 'Rent paid · 8,000 EGP';

const store = () => usePaySheetState.getState();
const entry = () => store().entries[OWNER];

describe('pay sheet state: the add-account hand-off (MA-219)', () => {
  beforeEach(() => store().reset());

  it('starts every entry with no hand-off pending', () => {
    expect(INITIAL_PAY_SHEET_ENTRY.postCloseAction).toBeUndefined();

    store().open(OWNER, OPENED_ON);

    expect(entry().postCloseAction).toBeUndefined();
  });

  it('hides a visible entry once and reads addAccount once on the close that follows', () => {
    store().open(OWNER, OPENED_ON);

    expect(store().requestAccountCreation(OWNER)).toBe(true);
    expect(entry()).toMatchObject({ visible: false, postCloseAction: 'addAccount' });
    expect(store().requestAccountCreation(OWNER)).toBe(false);

    expect(store().completeClose(OWNER)).toBe('addAccount');
    expect(entry().postCloseAction).toBeUndefined();
    expect(store().completeClose(OWNER)).toBeUndefined();
  });

  it('refuses a hand-off while the payment is saving', () => {
    store().open(OWNER, OPENED_ON);
    store().setSaving(OWNER, true);

    expect(store().requestAccountCreation(OWNER)).toBe(false);
    expect(entry()).toMatchObject({ visible: true, saving: true, postCloseAction: undefined });
    expect(store().completeClose(OWNER)).toBeUndefined();
  });

  it('refuses a hand-off on a hidden entry', () => {
    store().open(OWNER, OPENED_ON);
    store().setVisible(OWNER, false);

    expect(store().requestAccountCreation(OWNER)).toBe(false);
    expect(entry().postCloseAction).toBeUndefined();
    expect(store().completeClose(OWNER)).toBeUndefined();
  });

  it('refuses a hand-off on a released owner and writes no entry back', () => {
    store().open(OWNER, OPENED_ON);
    store().release(OWNER);

    expect(store().requestAccountCreation(OWNER)).toBe(false);
    expect(store().completeClose(OWNER)).toBeUndefined();
    expect(OWNER in store().entries).toBe(false);
  });

  it('clears a pending hand-off on the next open, so the close after it reads nothing', () => {
    store().open(OWNER, OPENED_ON);
    expect(store().requestAccountCreation(OWNER)).toBe(true);

    store().open(OWNER, OPENED_ON);

    expect(entry()).toMatchObject({ visible: true, postCloseAction: undefined });
    expect(store().completeClose(OWNER)).toBeUndefined();
  });
});

describe('pay sheet state: the paid toast of a close (MA-215)', () => {
  beforeEach(() => store().reset());

  it('hides a visible entry and reads the toast once on the close that follows', () => {
    store().open(OWNER, OPENED_ON);

    expect(store().closeWithToast(OWNER, LABEL)).toBe(true);
    expect(entry()).toMatchObject({ visible: false, postCloseAction: { paidToast: LABEL } });

    expect(store().completeClose(OWNER)).toEqual({ paidToast: LABEL });
    expect(entry().postCloseAction).toBeUndefined();
    expect(store().completeClose(OWNER)).toBeUndefined();
  });

  it('closes while the payment still reads as saving, where the write path calls it', () => {
    store().open(OWNER, OPENED_ON);
    store().setSaving(OWNER, true);

    expect(store().closeWithToast(OWNER, LABEL)).toBe(true);
    expect(entry()).toMatchObject({ visible: false, postCloseAction: { paidToast: LABEL } });
  });

  it('returns false with nothing changed on a hidden entry', () => {
    store().open(OWNER, OPENED_ON);
    store().setVisible(OWNER, false);
    const before = entry();

    expect(store().closeWithToast(OWNER, LABEL)).toBe(false);
    expect(entry()).toBe(before);
    expect(store().completeClose(OWNER)).toBeUndefined();
  });

  it('returns false and writes no entry back on an absent owner', () => {
    expect(store().closeWithToast(OWNER, LABEL)).toBe(false);
    expect(OWNER in store().entries).toBe(false);

    store().open(OWNER, OPENED_ON);
    store().release(OWNER);

    expect(store().closeWithToast(OWNER, LABEL)).toBe(false);
    expect(OWNER in store().entries).toBe(false);
  });
});
