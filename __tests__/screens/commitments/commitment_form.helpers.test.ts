import { act, renderHook } from '@testing-library/react-native';
import { useController } from 'react-hook-form';

import type { AccountStripChip } from '@/components/ui/form_sheet.helpers';
import { AccountType, DurationType, RecurrencePeriod, RecurrencePreset } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useAccountsById } from '@/modules/accounts/store/use_accounts_by_id.hook';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import {
  type CommitmentFormSchedule,
  NO_ACCOUNT_CHIP_ID,
  NO_SETTLED_DUE_DATES,
  applyCommitmentAmountText,
  applyEndsDraft,
  countCommitmentFormFaults,
  countEndsThroughDate,
  parseCommitmentAmountText,
  pickRepeatsPreset,
  resolveAccountIdFromChip,
  resolveAmountHeroSyncText,
  resolveCommitmentFirstPaymentFootnote,
  resolveCommitmentFormStatus,
  resolveCommitmentStripChips,
  resolveEndsLastDueDate,
  resolveEndsOptions,
  resolveEndsRowValue,
  resolveEndsSheetLine,
  resolveRepeatsNextDueDate,
  resolveRepeatsOptions,
  resolveRepeatsRowValue,
  resolveRepeatsTrack,
  seedEndsDraft,
  seedRepeatsDraft,
  setCommitmentEndDate,
  setCommitmentStartDate,
} from '@/modules/commitments/screens/commitments/commitment_form.helpers';
import type {
  CommitmentFormValues,
  EndsDraft,
  RepeatsDraft,
} from '@/modules/commitments/screens/commitments/commitment_form.shared';
import { useAddCommitment } from '@/modules/commitments/screens/commitments/commitment_form/add_commitment.hook';
import { useAddCommitmentState } from '@/modules/commitments/screens/commitments/commitment_form/add_commitment.state';
import {
  resolveCommitmentFormStripError,
  useCommitmentFirstPaymentFootnote,
  useCommitmentFormBodyFaults,
  useCommitmentFormStatus,
} from '@/modules/commitments/screens/commitments/components/commitment_form_body.hook';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { resolveHollowGraphiteTile } from '@/modules/transactions/components/transaction_row.helpers';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { makeTestAccount } from '@/test_helpers/transaction';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: unknown) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: jest.fn(),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/modules/commitments/screens/commitments/commitment_form/add_commitment.state', () => ({
  useAddCommitmentState: jest.fn(),
}));

const cash = makeTestAccount({ id: 'acc-cash', name: 'Cash', type: AccountType.PhysicalWallet });
const bank = makeTestAccount({
  id: 'acc-bank',
  name: 'Bank',
  type: AccountType.Bank,
  color: '#2255aa',
});
const archived = makeTestAccount({
  id: 'acc-archived',
  name: 'Old savings',
  type: AccountType.PhysicalSavings,
  color: '#aa5522',
  is_archived: 1,
});
const deleted = makeTestAccount({
  id: 'acc-deleted',
  name: 'Closed card',
  type: AccountType.CreditCard,
  color: '#22aa55',
  is_deleted: 1,
});

const activeAccounts: readonly Account[] = [cash, bank];
const accountsById: ReadonlyMap<string, Account> = new Map(
  [cash, bank, archived, deleted].map((account) => [account.id, account]),
);

const chipOf = (account: Account, selected: boolean) => ({
  id: account.id,
  name: account.name,
  tile: { color: account.color, type: account.type, hollow: false },
  selected,
  locked: false,
  dimmed: false,
});

describe('resolveCommitmentStripChips', () => {
  it('on add lights No account, first on the hollow graphite tile, then every active account unlit', () => {
    const chips = resolveCommitmentStripChips({
      activeAccounts,
      accountId: undefined,
      accountsById,
    });

    expect(chips).toEqual([
      {
        id: NO_ACCOUNT_CHIP_ID,
        name: 'No account',
        tile: resolveHollowGraphiteTile(AccountType.Bank),
        selected: true,
        locked: false,
        dimmed: false,
      },
      chipOf(cash, false),
      chipOf(bank, false),
    ]);
  });

  it('on edit on an active account lights that chip and adds no extra chip', () => {
    const chips = resolveCommitmentStripChips({ activeAccounts, accountId: bank.id, accountsById });

    expect(chips.map((chip: AccountStripChip) => chip.id)).toEqual([
      NO_ACCOUNT_CHIP_ID,
      cash.id,
      bank.id,
    ]);
    expect(chips.map((chip: AccountStripChip) => chip.selected)).toEqual([false, false, true]);
  });

  it('on edit on an archived account lights it at index 1 with its name on its own tile', () => {
    const chips = resolveCommitmentStripChips({
      activeAccounts,
      accountId: archived.id,
      accountsById,
    });

    expect(chips).toHaveLength(4);
    expect(chips[0]).toMatchObject({ id: NO_ACCOUNT_CHIP_ID, selected: false });
    expect(chips[1]).toEqual(chipOf(archived, true));
    expect(chips.slice(2)).toEqual([chipOf(cash, false), chipOf(bank, false)]);
  });

  it('on edit on a deleted account lights Deleted Account at index 1 on the hollow graphite tile', () => {
    const chips = resolveCommitmentStripChips({
      activeAccounts,
      accountId: deleted.id,
      accountsById,
    });

    expect(chips).toHaveLength(4);
    expect(chips[1]).toEqual({
      id: deleted.id,
      name: Strings.deletedAccount,
      tile: resolveHollowGraphiteTile(AccountType.CreditCard),
      selected: true,
      locked: false,
      dimmed: false,
    });
    expect(chips[1].tile.hollow).toBe(true);
  });

  it('names an id missing from the map Unknown account on the hollow tile', () => {
    const chips = resolveCommitmentStripChips({
      activeAccounts,
      accountId: 'acc-missing',
      accountsById,
    });

    expect(chips[1]).toEqual({
      id: 'acc-missing',
      name: Strings.unknownAccount,
      tile: resolveHollowGraphiteTile(AccountType.Bank),
      selected: true,
      locked: false,
      dimmed: false,
    });
  });
});

describe('resolveAccountIdFromChip', () => {
  it('reads No account as no account and any other chip as its account id', () => {
    expect(resolveAccountIdFromChip(NO_ACCOUNT_CHIP_ID)).toBeUndefined();
    expect(resolveAccountIdFromChip(bank.id)).toBe(bank.id);
  });
});

describe('parseCommitmentAmountText', () => {
  it.each([
    ['', undefined],
    ['.', undefined],
    ['0', 0],
    ['0.', 0],
    ['48.', 48],
    ['12.5', 12.5],
    ['0.001', 0.001],
  ] as const)('parses %p to %p, unrounded', (text, amount) => {
    expect(parseCommitmentAmountText(text)).toBe(amount);
  });
});

describe('resolveAmountHeroSyncText', () => {
  it.each([
    ['', 900, '900'],
    ['12', 12.5, '12.5'],
    ['12', undefined, ''],
  ] as const)('replaces the text %p under the stored %p with %p', (text, value, next) => {
    expect(resolveAmountHeroSyncText(text, value)).toBe(next);
  });

  it.each([
    ['900', 900],
    ['48.', 48],
    ['0.', 0],
    ['.', undefined],
    ['', undefined],
  ] as const)('keeps the text %p over the stored %p', (text, value) => {
    expect(resolveAmountHeroSyncText(text, value)).toBeUndefined();
  });
});

function attachAddCommitmentStores(addCommitment: jest.Mock) {
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    commitments: [],
    payments: [],
    addCommitment,
    generatePayments: jest.fn().mockResolvedValue(undefined),
  }));
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: [],
    archivedAccounts: [],
    accountLookupById: {},
    accountLookupError: false,
  }));
  attachMockSelectorStore(useCategoryStore as unknown as jest.Mock, () => ({ categories: [] }));
  attachMockSelectorStore(useAddCommitmentState as unknown as jest.Mock, () => ({
    saving: false,
    saveError: undefined,
    setSaving: jest.fn(),
    setSaveError: jest.fn(),
    reset: jest.fn(),
  }));
}

describe('applyCommitmentAmountText after a refused Save (MA-115)', () => {
  const onSaved = jest.fn();
  const addCommitmentMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    attachAddCommitmentStores(addCommitmentMock);
  });

  function useAddWithAmountField() {
    const hook = useAddCommitment({ onSaved });
    const { field } = useController({ control: hook.form.control, name: 'amount' });
    return { ...hook, field };
  }

  type Mounted = { current: ReturnType<typeof useAddWithAmountField> };

  const amountError = (result: Mounted) =>
    result.current.form.getFieldState('amount').error?.message;

  async function mountRefused(): Promise<Mounted> {
    const { result } = await renderHook(() => useAddWithAmountField());
    await act(async () => {
      await result.current.onSubmit();
    });
    expect(addCommitmentMock).not.toHaveBeenCalled();
    expect(amountError(result)).toBe(Strings.commitmentsErrAmountRequired);
    return result;
  }

  async function type(result: Mounted, text: string) {
    await act(async () => {
      applyCommitmentAmountText(result.current.form, text, result.current.field.onChange);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  it("holds '0.' as 0 and clears the amount error", async () => {
    const result = await mountRefused();

    await type(result, '0.');

    expect(result.current.form.getValues('amount')).toBe(0);
    expect(amountError(result)).toBeUndefined();
  });

  it("stores '0.001' unrounded and validates it to the floor message", async () => {
    const result = await mountRefused();

    await type(result, '0.001');

    expect(result.current.form.getValues('amount')).toBe(0.001);
    expect(amountError(result)).toBe(Strings.commitmentsErrAmountPositive);
  });

  it("validates '' after a held '0.' back to the required message", async () => {
    const result = await mountRefused();
    await type(result, '0.');
    expect(amountError(result)).toBeUndefined();

    await type(result, '');

    expect(result.current.form.getValues('amount')).toBeUndefined();
    expect(amountError(result)).toBe(Strings.commitmentsErrAmountRequired);
  });
});

describe('resolveRepeatsRowValue (MA-255)', () => {
  it.each([
    [1, RecurrencePeriod.Months, 'Every month'],
    [2, RecurrencePeriod.Weeks, 'Every 2 weeks'],
    [0, RecurrencePeriod.Months, 'Every 0 months'],
    [366, RecurrencePeriod.Days, 'Every 366 days'],
  ] as const)('reads Every %p %p as %p', (every, period, label) => {
    expect(resolveRepeatsRowValue(every, period)).toBe(label);
  });
});

describe('seedRepeatsDraft (MA-276)', () => {
  it.each([
    [1, RecurrencePeriod.Months, RecurrencePreset.Monthly],
    [1, RecurrencePeriod.Weeks, RecurrencePreset.Weekly],
    [1, RecurrencePeriod.Years, RecurrencePreset.Annually],
    [2, RecurrencePeriod.Weeks, RecurrencePreset.Custom],
    [1, RecurrencePeriod.Days, RecurrencePreset.Custom],
  ] as const)('lights Every %p %p as %p, holding the count and unit', (every, period, preset) => {
    expect(seedRepeatsDraft(every, period)).toStrictEqual({ preset, every, period });
  });
});

describe('pickRepeatsPreset (MA-276)', () => {
  it.each([
    [RecurrencePreset.Weekly, RecurrencePeriod.Weeks],
    [RecurrencePreset.Monthly, RecurrencePeriod.Months],
    [RecurrencePreset.Annually, RecurrencePeriod.Years],
  ] as const)('Custom from %p starts the stepper at 2 %p', (preset, period) => {
    const draft: RepeatsDraft = { preset, every: 1, period };

    expect(pickRepeatsPreset(draft, RecurrencePreset.Custom)).toStrictEqual({
      preset: RecurrencePreset.Custom,
      every: 2,
      period,
    });
  });

  it('Custom while Custom keeps the draft', () => {
    const draft: RepeatsDraft = {
      preset: RecurrencePreset.Custom,
      every: 5,
      period: RecurrencePeriod.Days,
    };

    expect(pickRepeatsPreset(draft, RecurrencePreset.Custom)).toBe(draft);
  });

  it.each([
    [RecurrencePreset.Weekly, RecurrencePeriod.Weeks],
    [RecurrencePreset.Monthly, RecurrencePeriod.Months],
    [RecurrencePreset.Annually, RecurrencePeriod.Years],
  ] as const)('%p from Every 5 days reads 1 %p', (preset, period) => {
    const draft: RepeatsDraft = {
      preset: RecurrencePreset.Custom,
      every: 5,
      period: RecurrencePeriod.Days,
    };

    expect(pickRepeatsPreset(draft, preset)).toStrictEqual({ preset, every: 1, period });
  });
});

describe('resolveRepeatsOptions (MA-276)', () => {
  it('lists Every week, Every month, Every year and Custom, in that order', () => {
    expect(resolveRepeatsOptions()).toStrictEqual([
      { value: RecurrencePreset.Weekly, label: 'Every week' },
      { value: RecurrencePreset.Monthly, label: 'Every month' },
      { value: RecurrencePreset.Annually, label: 'Every year' },
      { value: RecurrencePreset.Custom, label: 'Custom' },
    ]);
  });
});

describe('resolveEndsOptions (MA-277)', () => {
  it('lists Never, After a number of payments and On a date, in that order', () => {
    expect(resolveEndsOptions()).toStrictEqual([
      { value: DurationType.Forever, label: 'Never' },
      { value: DurationType.AfterCount, label: 'After a number of payments' },
      { value: DurationType.UntilDate, label: 'On a date' },
    ]);
  });
});

describe('seedEndsDraft (MA-277)', () => {
  type SeedValues = Pick<
    CommitmentFormValues,
    'durationType' | 'endAfterCount' | 'endDate' | 'startDate'
  >;
  const STARTS = '2026-10-20';
  const NOTHING_HELD: SeedValues = {
    durationType: DurationType.Forever,
    endAfterCount: undefined,
    endDate: undefined,
    startDate: STARTS,
  };

  it.each<[string, Partial<SeedValues>, EndsDraft]>([
    ['Never with nothing held', {}, { type: DurationType.Forever, count: 12, date: '2026-12-31' }],
    [
      'After with a count of 5 held',
      { durationType: DurationType.AfterCount, endAfterCount: 5 },
      { type: DurationType.AfterCount, count: 5, date: '2026-12-31' },
    ],
    [
      'After with an emptied count',
      { durationType: DurationType.AfterCount, endAfterCount: null },
      { type: DurationType.AfterCount, count: 12, date: '2026-12-31' },
    ],
    [
      'After with no count',
      { durationType: DurationType.AfterCount, endAfterCount: undefined },
      { type: DurationType.AfterCount, count: 12, date: '2026-12-31' },
    ],
    [
      'After with a count of 0',
      { durationType: DurationType.AfterCount, endAfterCount: 0 },
      { type: DurationType.AfterCount, count: 12, date: '2026-12-31' },
    ],
    [
      'On a date with a day after Starts',
      { durationType: DurationType.UntilDate, endDate: '2027-03-15' },
      { type: DurationType.UntilDate, count: 12, date: '2027-03-15' },
    ],
    [
      'On a date with the Starts day',
      { durationType: DurationType.UntilDate, endDate: STARTS },
      { type: DurationType.UntilDate, count: 12, date: STARTS },
    ],
    [
      'On a date with a day earlier than Starts',
      { durationType: DurationType.UntilDate, endDate: '2026-10-19' },
      { type: DurationType.UntilDate, count: 12, date: STARTS },
    ],
    [
      'On a date with an empty day',
      { durationType: DurationType.UntilDate, endDate: '' },
      { type: DurationType.UntilDate, count: 12, date: '2026-12-31' },
    ],
    [
      'Never with a count and a day still held',
      { endAfterCount: 5, endDate: '2027-03-15' },
      { type: DurationType.Forever, count: 5, date: '2027-03-15' },
    ],
    [
      'Never from a 29 February Starts',
      { startDate: '2028-02-29' },
      { type: DurationType.Forever, count: 12, date: '2028-12-31' },
    ],
    [
      'Never from a 31 January Starts',
      { startDate: '2026-01-31' },
      { type: DurationType.Forever, count: 12, date: '2026-12-31' },
    ],
  ])('seeds %s', (_name, held, draft) => {
    expect(seedEndsDraft({ ...NOTHING_HELD, ...held })).toStrictEqual(draft);
  });

  it('seeds the Starts day from a held day earlier than Starts, while the row reads the held day', () => {
    const held: SeedValues = {
      ...NOTHING_HELD,
      durationType: DurationType.UntilDate,
      endDate: '2026-10-19',
    };

    expect(seedEndsDraft(held).date).toBe(STARTS);
    expect(
      resolveEndsRowValue(
        { ...held, recurrenceEvery: 1, recurrencePeriod: RecurrencePeriod.Months },
        NO_SETTLED_DUE_DATES,
      ),
    ).toBe('On Mon 19 Oct 2026 · 0 payments');
  });
});

// Starts Tue 20 Oct 2026, Every month, Never: the add sheet's schedule on its today.
const FORM_SCHEDULE: CommitmentFormSchedule = {
  startDate: '2026-10-20',
  recurrenceEvery: 1,
  recurrencePeriod: RecurrencePeriod.Months,
  durationType: DurationType.Forever,
  endAfterCount: undefined,
  endDate: undefined,
};
const DAILY_FROM_2026: Partial<CommitmentFormSchedule> = {
  startDate: '2026-01-01',
  recurrencePeriod: RecurrencePeriod.Days,
};
const scheduleOf = (overrides: Partial<CommitmentFormSchedule>): CommitmentFormSchedule => ({
  ...FORM_SCHEDULE,
  ...overrides,
});
const endsAfter = (count: number | undefined): Partial<CommitmentFormSchedule> => ({
  durationType: DurationType.AfterCount,
  endAfterCount: count,
});
const endsOn = (endDate: string | undefined): Partial<CommitmentFormSchedule> => ({
  durationType: DurationType.UntilDate,
  endDate,
});

describe('resolveEndsRowValue (MA-280)', () => {
  it.each<[string, Partial<CommitmentFormSchedule>, readonly string[], string]>([
    ['Never', {}, NO_SETTLED_DUE_DATES, 'Never'],
    ['After 12', endsAfter(12), NO_SETTLED_DUE_DATES, 'After 12 payments · last Mon 20 Sep 2027'],
    ['After 1', endsAfter(1), NO_SETTLED_DUE_DATES, 'After 1 payment · last Tue 20 Oct 2026'],
    [
      'After 1,096 daily',
      { ...DAILY_FROM_2026, ...endsAfter(1096) },
      NO_SETTLED_DUE_DATES,
      'After 1,096 payments · last Sun 31 Dec 2028',
    ],
    ['After with no count', endsAfter(undefined), NO_SETTLED_DUE_DATES, 'After N payments'],
    [
      'On 31 December',
      endsOn('2026-12-31'),
      NO_SETTLED_DUE_DATES,
      'On Thu 31 Dec 2026 · 3 payments',
    ],
    [
      'On a day earlier than Starts, on add',
      endsOn('2026-10-19'),
      NO_SETTLED_DUE_DATES,
      'On Mon 19 Oct 2026 · 0 payments',
    ],
    [
      'On a day earlier than Starts, on edit with one settled row through it',
      endsOn('2026-10-19'),
      ['2026-09-20'],
      'On Mon 19 Oct 2026 · 1 payment',
    ],
    ['On with no date', endsOn(undefined), NO_SETTLED_DUE_DATES, 'Until date'],
    ['On with an empty date', endsOn(''), NO_SETTLED_DUE_DATES, 'Until date'],
  ])('reads %s', (_name, overrides, settled, label) => {
    expect(resolveEndsRowValue(scheduleOf(overrides), settled)).toBe(label);
  });
});

describe('resolveEndsSheetLine (MA-280)', () => {
  it.each<[string, Partial<CommitmentFormSchedule>, string | undefined]>([
    ['Never', {}, undefined],
    ['After with no count', endsAfter(undefined), undefined],
    ['On with an empty date', endsOn(''), undefined],
    ['After 12', endsAfter(12), 'Last payment Mon 20 Sep 2027'],
    ['On the Starts day', endsOn('2026-10-20'), '1 payment through Tue 20 Oct 2026'],
    ['On 31 December', endsOn('2026-12-31'), '3 payments through Thu 31 Dec 2026'],
    [
      'On 31 December 2028, daily',
      { ...DAILY_FROM_2026, ...endsOn('2028-12-31') },
      '1,096 payments through Sun 31 Dec 2028',
    ],
  ])('reads %s', (_name, overrides, line) => {
    expect(resolveEndsSheetLine(scheduleOf(overrides), NO_SETTLED_DUE_DATES)).toBe(line);
  });
});

describe('resolveEndsLastDueDate (MA-280)', () => {
  it.each<[string, Partial<CommitmentFormSchedule>, number, string]>([
    ['12 monthly from 20 October (F3)', {}, 12, '2027-09-20'],
    ['3 monthly from 31 January', { startDate: '2026-01-31' }, 3, '2026-03-31'],
    [
      '2 yearly from 29 February',
      { startDate: '2028-02-29', recurrencePeriod: RecurrencePeriod.Years },
      2,
      '2029-02-28',
    ],
    ['4 monthly from a Starts in the past', { startDate: '2020-03-15' }, 4, '2020-06-15'],
    ['12 monthly, ignoring a held On day', endsOn('2026-12-31'), 12, '2027-09-20'],
    ['12 monthly with Every emptied', { recurrenceEvery: null }, 12, '2027-09-20'],
  ])('reads %s', (_name, overrides, count, day) => {
    expect(resolveEndsLastDueDate(scheduleOf(overrides), count, NO_SETTLED_DUE_DATES)).toBe(day);
  });

  it('on edit reads the latest settled day when the settled rows already reach the count', () => {
    expect(resolveEndsLastDueDate(FORM_SCHEDULE, 1, ['2026-10-20', '2026-12-20'])).toBe(
      '2026-12-20',
    );
  });

  it('on edit reads a settled day past the last new day', () => {
    expect(resolveEndsLastDueDate(FORM_SCHEDULE, 3, ['2026-10-20', '2027-03-20'])).toBe(
      '2027-03-20',
    );
  });

  it('on edit reads the last new day when it falls after every settled day', () => {
    expect(resolveEndsLastDueDate(FORM_SCHEDULE, 4, ['2026-10-20', '2026-11-20'])).toBe(
      '2027-01-20',
    );
  });
});

describe('countEndsThroughDate (MA-280)', () => {
  it.each<[string, Partial<CommitmentFormSchedule>, string, number]>([
    ['monthly from 20 October through 31 December, not F4 14', {}, '2026-12-31', 3],
    ['daily from 1 January 2026 through 31 December 2028', DAILY_FROM_2026, '2028-12-31', 1096],
    ['a day earlier than Starts, on add', {}, '2026-10-19', 0],
    ['monthly from 31 January through 28 February', { startDate: '2026-01-31' }, '2026-02-28', 2],
    [
      'yearly from 29 February 2028 through 1 March 2029',
      { startDate: '2028-02-29', recurrencePeriod: RecurrencePeriod.Years },
      '2029-03-01',
      2,
    ],
    ['monthly, ignoring a held After count', endsAfter(1), '2026-12-31', 3],
  ])('counts %s', (_name, overrides, day, count) => {
    expect(countEndsThroughDate(scheduleOf(overrides), day, NO_SETTLED_DUE_DATES)).toBe(count);
  });

  it('on edit counts the settled days through a day earlier than Starts', () => {
    expect(
      countEndsThroughDate(FORM_SCHEDULE, '2026-10-19', ['2026-08-20', '2026-09-20', '2026-11-20']),
    ).toBe(2);
  });

  it('on edit counts a settled day on the schedule once', () => {
    expect(countEndsThroughDate(FORM_SCHEDULE, '2026-12-31', ['2026-10-20', '2026-11-20'])).toBe(3);
  });
});

describe('resolveRepeatsNextDueDate (MA-280)', () => {
  const TODAY = '2026-10-20';

  it.each<[string, Partial<CommitmentFormSchedule>, string, string | undefined]>([
    ['monthly from today', {}, TODAY, '2026-11-20'],
    [
      'every 2 weeks from today',
      { recurrenceEvery: 2, recurrencePeriod: RecurrencePeriod.Weeks },
      TODAY,
      '2026-11-03',
    ],
    ['monthly from a past 31 January', { startDate: '2026-01-31' }, TODAY, '2026-10-31'],
    [
      'yearly from 29 February 2028, the day after',
      { startDate: '2028-02-29', recurrencePeriod: RecurrencePeriod.Years },
      '2028-03-01',
      '2029-02-28',
    ],
    ['After 1 from today', endsAfter(1), TODAY, undefined],
    ['an end day earlier than Starts', endsOn('2026-10-19'), TODAY, undefined],
    [
      'daily Forever from 2020',
      { startDate: '2020-01-01', recurrencePeriod: RecurrencePeriod.Days },
      TODAY,
      '2026-10-21',
    ],
    ['On with an empty date', endsOn(''), TODAY, '2026-11-20'],
    ['monthly with Every emptied', { recurrenceEvery: null }, TODAY, '2026-11-20'],
  ])('reads %s', (_name, overrides, today, day) => {
    expect(resolveRepeatsNextDueDate(scheduleOf(overrides), NO_SETTLED_DUE_DATES, today)).toBe(day);
  });

  it('on edit passes over a settled next cycle', () => {
    expect(resolveRepeatsNextDueDate(FORM_SCHEDULE, ['2026-11-20'], TODAY)).toBe('2026-12-20');
  });

  it('on edit reads nothing for After 2 with both rows settled', () => {
    expect(
      resolveRepeatsNextDueDate(scheduleOf(endsAfter(2)), ['2026-10-20', '2026-11-20'], TODAY),
    ).toBeUndefined();
  });
});

describe('resolveRepeatsTrack (MA-280)', () => {
  const TODAY = '2026-10-20';

  it.each<[string, Partial<CommitmentFormSchedule>, string, string]>([
    ['Every month', {}, TODAY, 'Every month · next Fri 20 Nov'],
    [
      'Every 2 weeks',
      { recurrenceEvery: 2, recurrencePeriod: RecurrencePeriod.Weeks },
      TODAY,
      'Every 2 weeks · next Tue 3 Nov',
    ],
    [
      'Every month with the next day in the following year',
      { startDate: '2026-12-20' },
      '2026-12-25',
      'Every month · next Wed 20 Jan 2027',
    ],
    ['Every month, After 1, with no day after today', endsAfter(1), TODAY, 'Every month'],
  ])('reads %s', (_name, overrides, today, track) => {
    expect(resolveRepeatsTrack(scheduleOf(overrides), NO_SETTLED_DUE_DATES, today)).toBe(track);
  });

  it('on edit names the cycle after a settled one', () => {
    expect(resolveRepeatsTrack(FORM_SCHEDULE, ['2026-11-20'], TODAY)).toBe(
      'Every month · next Sun 20 Dec',
    );
  });
});

describe('resolveCommitmentFirstPaymentFootnote (MA-256)', () => {
  const TODAY = '2026-10-31';
  const SUNDAY_LINE = 'First payment due Sun 1 Nov.';
  const SCHEDULE = {
    startDate: '2026-11-01',
    recurrenceEvery: 1,
    recurrencePeriod: RecurrencePeriod.Months,
    durationType: DurationType.Forever,
    endAfterCount: undefined,
    endDate: undefined,
  };

  it.each([
    ['in the year of today', {}, SUNDAY_LINE],
    ['in another year', { startDate: '2027-02-01' }, 'First payment due Mon 1 Feb 2027.'],
    ['on a leap day', { startDate: '2028-02-29' }, 'First payment due Tue 29 Feb 2028.'],
    ['with Every emptied', { recurrenceEvery: null }, SUNDAY_LINE],
    [
      'with the count emptied',
      { durationType: DurationType.AfterCount, endAfterCount: null },
      SUNDAY_LINE,
    ],
    [
      'with Until and an empty date',
      { durationType: DurationType.UntilDate, endDate: '' },
      SUNDAY_LINE,
    ],
    ['with Until and no date', { durationType: DurationType.UntilDate }, SUNDAY_LINE],
    [
      'with Ends on Starts',
      { durationType: DurationType.UntilDate, endDate: '2026-11-01' },
      SUNDAY_LINE,
    ],
  ])('reads the Starts day %s', (_name, overrides, line) => {
    expect(resolveCommitmentFirstPaymentFootnote({ ...SCHEDULE, ...overrides }, TODAY)).toBe(line);
  });

  it.each([
    ['with Ends before Starts', { durationType: DurationType.UntilDate, endDate: '2026-10-31' }],
    ['with a count of 0', { durationType: DurationType.AfterCount, endAfterCount: 0 }],
  ])('reads nothing %s', (_name, overrides) => {
    expect(
      resolveCommitmentFirstPaymentFootnote({ ...SCHEDULE, ...overrides }, TODAY),
    ).toBeUndefined();
  });
});

describe('the track line from the faults (MA-256)', () => {
  const NONE = {
    name: undefined,
    amount: undefined,
    categoryId: undefined,
    startDate: undefined,
    recurrenceEvery: undefined,
    endAfterCount: undefined,
    endDate: undefined,
  };

  it('counts After and Until on the one Ends row, and every other field as its own', () => {
    expect(countCommitmentFormFaults(NONE)).toBe(0);
    expect(countCommitmentFormFaults({ ...NONE, endAfterCount: 'a', endDate: 'b' })).toBe(1);
    expect(countCommitmentFormFaults({ ...NONE, name: 'a', amount: 'b', endDate: 'c' })).toBe(3);
  });

  it('reads the count while a field is refused, else the save error, else nothing', () => {
    expect(resolveCommitmentFormStatus({ ...NONE, name: 'a' }, 'Failed')).toBe(
      'Fix the 1 field marked above.',
    );
    expect(resolveCommitmentFormStatus(NONE, 'Failed')).toBe('Failed');
    expect(resolveCommitmentFormStatus(NONE, undefined)).toBeUndefined();
  });
});

describe('useCommitmentFormBodyFaults (MA-255)', () => {
  const onSaved = jest.fn();
  const addCommitmentMock = jest.fn().mockResolvedValue(undefined);

  const NO_FAULTS = {
    name: undefined,
    amount: undefined,
    categoryId: undefined,
    startDate: undefined,
    recurrenceEvery: undefined,
    endAfterCount: undefined,
    endDate: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    attachAddCommitmentStores(addCommitmentMock);
  });

  function useAddWithBodyFaults() {
    const hook = useAddCommitment({ onSaved });
    const every = useController({ control: hook.form.control, name: 'recurrenceEvery' });
    const count = useController({ control: hook.form.control, name: 'endAfterCount' });
    return {
      ...hook,
      every: every.field,
      count: count.field,
      body: useCommitmentFormBodyFaults(hook.form),
    };
  }

  type Mounted = { current: ReturnType<typeof useAddWithBodyFaults> };

  // A form Save accepts, so each case's fault is the only one it adds.
  async function mountFilled(): Promise<Mounted> {
    const { result } = await renderHook(() => useAddWithBodyFaults());
    await act(async () => {
      result.current.form.setValue('name', 'Rent');
      result.current.form.setValue('amount', 900);
      result.current.form.setValue('categoryId', 'cat-rent');
      result.current.form.setValue('startDate', '2026-10-20');
    });
    return result;
  }

  async function save(result: Mounted) {
    await act(async () => {
      await result.current.onSubmit();
    });
  }

  it.each([[null], [0], [366]])('rings Repeats on a Save with Every %p', async (every) => {
    const result = await mountFilled();
    await act(async () => result.current.every.onChange(every));

    await save(result);

    expect(addCommitmentMock).not.toHaveBeenCalled();
    expect(result.current.body.faults.recurrenceEvery).toEqual(expect.any(String));
  });

  it('rings Ends on a Save with After and no count', async () => {
    const result = await mountFilled();
    await act(async () => result.current.form.setValue('durationType', DurationType.AfterCount));

    await save(result);

    expect(result.current.body.faults.endAfterCount).toBe(Strings.commitmentsErrAfterCountRequired);
  });

  it('reads an emptied Every back as empty, not as its default', async () => {
    const result = await mountFilled();
    await act(async () => result.current.every.onChange(null));

    expect(result.current.every.value).toBeNull();
  });

  async function mountWithStoredCount(): Promise<Mounted> {
    const result = await mountFilled();
    await act(async () => {
      result.current.form.setValue('durationType', DurationType.AfterCount);
      result.current.form.resetField('endAfterCount', { defaultValue: 12 });
    });
    return result;
  }

  it('reads an emptied stored count back as empty, not as the stored count', async () => {
    const result = await mountWithStoredCount();
    await act(async () => result.current.count.onChange(null));

    expect(result.current.count.value).toBeNull();
  });

  it('rings Ends on a Save with After and its stored count emptied', async () => {
    const result = await mountWithStoredCount();
    await act(async () => result.current.count.onChange(null));

    await save(result);

    expect(addCommitmentMock).not.toHaveBeenCalled();
    expect(result.current.body.faults.endAfterCount).toBe(Strings.commitmentsErrAfterCountRequired);
  });

  it.each([[DurationType.Forever], [DurationType.UntilDate]])(
    'saves with Ends %p after the count was emptied',
    async (type) => {
      const result = await mountWithStoredCount();
      await act(async () => {
        result.current.count.onChange(null);
        result.current.form.setValue('durationType', type);
        result.current.form.setValue('endDate', '2027-01-31');
      });

      await save(result);

      expect(addCommitmentMock).toHaveBeenCalledTimes(1);
      expect(result.current.body.faults).toEqual(NO_FAULTS);
    },
  );

  it('rings Ends on a Save with Until date and no date', async () => {
    const result = await mountFilled();
    await act(async () => result.current.form.setValue('durationType', DurationType.UntilDate));

    await save(result);

    expect(result.current.body.faults.endDate).toBe(Strings.commitmentsErrEndDateRequired);
  });

  it('rings Repeats and Ends on one Save with Every emptied and After with no count', async () => {
    const result = await mountFilled();
    await act(async () => {
      result.current.every.onChange(null);
      result.current.form.setValue('durationType', DurationType.AfterCount);
    });

    await save(result);

    expect(result.current.body.faults.recurrenceEvery).toEqual(expect.any(String));
    expect(result.current.body.faults.endAfterCount).toBe(Strings.commitmentsErrAfterCountRequired);
  });

  it('rings Name and Category and no other row on a Save with both empty', async () => {
    const result = await mountFilled();
    await act(async () => {
      result.current.form.setValue('name', '');
      result.current.form.setValue('categoryId', '');
    });

    await save(result);

    expect(result.current.body.faults).toStrictEqual({
      ...NO_FAULTS,
      name: Strings.commitmentsErrNameRequired,
      categoryId: Strings.commitmentsErrCategoryRequired,
    });
  });

  it('holds all seven faults, each undefined, after a Save it accepts', async () => {
    const result = await mountFilled();

    await save(result);

    expect(addCommitmentMock).toHaveBeenCalledTimes(1);
    expect(result.current.body.faults).toStrictEqual(NO_FAULTS);
  });

  describe('Ends earlier than Starts (MA-256)', () => {
    const LEAP_DAY = '2028-02-29';
    const DAY_BEFORE = '2028-02-28';
    const TWO_DAYS_BEFORE = '2028-02-27';
    const DAY_AFTER = '2028-03-01';

    async function moveStarts(result: Mounted, next: string) {
      await act(async () => {
        setCommitmentStartDate(result.current.form, next, result.current.body.isSubmitted);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }

    async function moveEnds(result: Mounted, next: string) {
      await act(async () => {
        setCommitmentEndDate(result.current.form, next, result.current.body.isSubmitted);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }

    // The Ends sheet's path: seeded from the form, the type picked, then Done.
    async function chooseEnds(result: Mounted, next: DurationType) {
      await act(async () => {
        const { form, body } = result.current;
        applyEndsDraft(form, { ...seedEndsDraft(form.getValues()), type: next }, body.isSubmitted);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }

    async function mountUntil(starts: string, ends: string): Promise<Mounted> {
      const result = await mountFilled();
      await act(async () => result.current.form.setValue('durationType', DurationType.UntilDate));
      await moveStarts(result, starts);
      await moveEnds(result, ends);
      return result;
    }

    async function mountRefused(): Promise<Mounted> {
      const result = await mountUntil(LEAP_DAY, DAY_BEFORE);
      await save(result);
      expect(addCommitmentMock).not.toHaveBeenCalled();
      expect(result.current.body.faults.endDate).toBe(Strings.commitmentsErrEndsBeforeStarts);
      return result;
    }

    // The Ends sheet's Done.
    async function applyDraft(result: Mounted, draft: EndsDraft) {
      await act(async () => {
        applyEndsDraft(result.current.form, draft, result.current.body.isSubmitted);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }

    const formEnds = (result: Mounted) => ({
      durationType: result.current.form.getValues('durationType'),
      endAfterCount: result.current.form.getValues('endAfterCount'),
      endDate: result.current.form.getValues('endDate'),
    });

    it('clears the ring with Done on a date at the Starts day (MA-277)', async () => {
      const result = await mountRefused();

      await applyDraft(result, { type: DurationType.UntilDate, count: 12, date: LEAP_DAY });

      expect(formEnds(result)).toStrictEqual({
        durationType: DurationType.UntilDate,
        endAfterCount: undefined,
        endDate: LEAP_DAY,
      });
      expect(result.current.body.faults).toStrictEqual(NO_FAULTS);
    });

    it.each([DurationType.Forever, DurationType.AfterCount])(
      'clears the ring with Done on %s, the held day left as it was (MA-277)',
      async (type) => {
        const result = await mountRefused();

        await applyDraft(result, { type, count: 12, date: LEAP_DAY });

        expect(formEnds(result)).toMatchObject({ durationType: type, endDate: DAY_BEFORE });
        expect(result.current.body.faults).toStrictEqual(NO_FAULTS);
      },
    );

    it('writes 12 with Done on After and leaves the held day (MA-277)', async () => {
      const result = await mountRefused();

      await applyDraft(result, { type: DurationType.AfterCount, count: 12, date: LEAP_DAY });

      expect(formEnds(result)).toStrictEqual({
        durationType: DurationType.AfterCount,
        endAfterCount: 12,
        endDate: DAY_BEFORE,
      });
    });

    it.each<[string, EndsDraft]>([
      ['Never', { type: DurationType.Forever, count: 12, date: LEAP_DAY }],
      ['After 12', { type: DurationType.AfterCount, count: 12, date: LEAP_DAY }],
      [
        'On a date earlier than Starts',
        { type: DurationType.UntilDate, count: 12, date: DAY_BEFORE },
      ],
    ])('rings nothing with Done on %s before any Save (MA-277)', async (_name, draft) => {
      const result = await mountUntil(LEAP_DAY, DAY_BEFORE);

      await applyDraft(result, draft);

      expect(formEnds(result).durationType).toBe(draft.type);
      expect(result.current.body.faults).toStrictEqual(NO_FAULTS);
    });

    it('leaves Ends unringed at an earlier date before a Save', async () => {
      const result = await mountUntil(LEAP_DAY, DAY_BEFORE);

      expect(result.current.body.faults).toStrictEqual(NO_FAULTS);
    });

    it('rings Ends alone on a Save', async () => {
      const result = await mountRefused();

      expect(result.current.body.faults).toStrictEqual({
        ...NO_FAULTS,
        endDate: Strings.commitmentsErrEndsBeforeStarts,
      });
    });

    it('clears the ring with Starts moved onto Ends', async () => {
      const result = await mountRefused();

      await moveStarts(result, DAY_BEFORE);

      expect(result.current.body.faults.endDate).toBeUndefined();
    });

    it('holds the ring with Starts moved and still past Ends', async () => {
      const result = await mountRefused();

      await moveStarts(result, DAY_AFTER);

      expect(result.current.body.faults.endDate).toBe(Strings.commitmentsErrEndsBeforeStarts);
    });

    it('rings Ends again with Starts moved back past Ends', async () => {
      const result = await mountRefused();
      await moveStarts(result, DAY_BEFORE);

      await moveStarts(result, LEAP_DAY);

      expect(result.current.body.faults.endDate).toBe(Strings.commitmentsErrEndsBeforeStarts);
    });

    it('clears the ring with Ends moved onto Starts', async () => {
      const result = await mountRefused();

      await moveEnds(result, LEAP_DAY);

      expect(result.current.body.faults.endDate).toBeUndefined();
    });

    it('holds the ring with Ends moved and still before Starts', async () => {
      const result = await mountRefused();

      await moveEnds(result, TWO_DAYS_BEFORE);

      expect(result.current.body.faults.endDate).toBe(Strings.commitmentsErrEndsBeforeStarts);
    });

    it.each([DurationType.Forever, DurationType.AfterCount])(
      'clears the ring with Ends moved to %s',
      async (next) => {
        const result = await mountRefused();

        await chooseEnds(result, next);

        expect(result.current.body.faults.endDate).toBeUndefined();
      },
    );
  });

  describe('the status track (MA-256)', () => {
    const NOW = new Date(2026, 9, 31);

    function useAddWithFooter(saveError: string | undefined) {
      const hook = useAddWithBodyFaults();
      return {
        ...hook,
        lookup: useAccountsById(),
        status: useCommitmentFormStatus(hook.form, saveError),
        footnote: useCommitmentFirstPaymentFootnote(hook.form, NOW),
      };
    }

    async function mountFooter(saveError?: string) {
      const hook = await renderHook(
        (props: { saveError: string | undefined }) => useAddWithFooter(props.saveError),
        { initialProps: { saveError } },
      );
      await act(async () => {
        hook.result.current.form.setValue('name', 'Rent');
        hook.result.current.form.setValue('amount', 900);
        hook.result.current.form.setValue('categoryId', 'cat-rent');
        hook.result.current.form.setValue('startDate', '2026-10-20');
      });
      return hook.result;
    }

    it('reads a moved Starts day, then goes idle with Ends before it and no row ringed', async () => {
      const result = await mountFooter();
      await act(async () => result.current.form.setValue('startDate', '2026-11-01'));

      expect(result.current.footnote).toBe('First payment due Sun 1 Nov.');

      await act(async () => {
        result.current.form.setValue('durationType', DurationType.UntilDate);
        result.current.form.setValue('endDate', '2026-10-31');
      });

      expect(result.current.footnote).toBeUndefined();
      expect(result.current.status).toBeUndefined();
      expect(result.current.body.faults).toStrictEqual(NO_FAULTS);
    });

    it('goes idle with a count of 0 on After and no row ringed', async () => {
      const result = await mountFooter();
      await act(async () => result.current.form.setValue('durationType', DurationType.AfterCount));
      await act(async () => result.current.count.onChange(0));

      expect(result.current.footnote).toBeUndefined();
      expect(result.current.status).toBeUndefined();
      expect(result.current.body.faults).toStrictEqual(NO_FAULTS);
    });

    it('counts name, category and amount on a Save, and a failed account lookup adds none', async () => {
      attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
        accounts: [],
        archivedAccounts: [],
        accountLookupById: {},
        accountLookupError: true,
      }));
      const result = await mountFooter();
      await act(async () => {
        result.current.form.setValue('name', '');
        result.current.form.setValue('categoryId', '');
        result.current.form.setValue('amount', undefined);
        result.current.form.setValue('accountId', 'acc-missing');
      });

      await save(result);

      expect(result.current.lookup.lookupFailed).toBe(true);
      expect(
        resolveCommitmentFormStripError(
          result.current.lookup,
          result.current.form.getValues('accountId'),
        ),
      ).toBe(Strings.transactionsAccountLookupError);
      expect(result.current.status).toBe('Fix the 3 fields marked above.');
    });

    it('reads one field on a Save with only Ends earlier than Starts', async () => {
      const result = await mountFooter();
      await act(async () => {
        result.current.form.setValue('durationType', DurationType.UntilDate);
        result.current.form.setValue('endDate', '2026-10-19');
      });

      await save(result);

      expect(addCommitmentMock).not.toHaveBeenCalled();
      expect(result.current.status).toBe('Fix the 1 field marked above.');
    });

    it('returns to the save error at zero faults', async () => {
      const result = await mountFooter(Strings.commitmentsSaveError);
      await act(async () => result.current.form.setValue('name', ''));
      await save(result);

      expect(result.current.status).toBe('Fix the 1 field marked above.');

      await act(async () => {
        result.current.form.setValue('name', 'Rent', { shouldValidate: true });
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.status).toBe(Strings.commitmentsSaveError);
    });
  });
});
