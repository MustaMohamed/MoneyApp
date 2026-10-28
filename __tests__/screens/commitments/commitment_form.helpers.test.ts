import { act, renderHook } from '@testing-library/react-native';
import { useController } from 'react-hook-form';

import type { AccountStripChip } from '@/components/ui/form_sheet.helpers';
import { AccountType, DurationType, RecurrencePeriod, RecurrencePreset } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import {
  NO_ACCOUNT_CHIP_ID,
  applyCommitmentAmountText,
  parseCommitmentAmountText,
  resolveAccountIdFromChip,
  resolveAmountHeroSyncText,
  resolveCommitmentStripChips,
  resolveEndsRowValue,
  resolveRepeatsRowValue,
  parseWholeNumberInput,
} from '@/modules/commitments/screens/commitments/commitment_form.helpers';
import { detectPreset } from '@/modules/commitments/screens/commitments/commitment_form.shared';
import { useAddCommitment } from '@/modules/commitments/screens/commitments/commitment_form/add_commitment.hook';
import { useAddCommitmentState } from '@/modules/commitments/screens/commitments/commitment_form/add_commitment.state';
import { useCommitmentFormBodyFaults } from '@/modules/commitments/screens/commitments/components/commitment_form_body.hook';
import { useDurationPickerFaults } from '@/modules/commitments/screens/commitments/components/duration_picker.hook';
import { useRecurrenceEveryFault } from '@/modules/commitments/screens/commitments/components/recurrence_picker.hook';
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
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({ accounts: [] }));
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
    [undefined, RecurrencePeriod.Months, 'Custom'],
  ] as const)('reads Every %p %p as %p', (every, period, label) => {
    expect(resolveRepeatsRowValue(every, period)).toBe(label);
  });
});

describe('parseWholeNumberInput (MA-255)', () => {
  it.each([
    ['', null],
    ['0', 0],
    ['2', 2],
    ['12', 12],
    ['366', 366],
    ['-', undefined],
    ['abc', undefined],
  ] as const)('maps %p to %p', (text, value) => {
    expect(parseWholeNumberInput(text)).toBe(value);
  });
});

describe('resolveEndsRowValue (MA-255)', () => {
  it.each([
    [DurationType.Forever, undefined, undefined, 'Never'],
    [DurationType.AfterCount, 1, undefined, 'After 1 payment'],
    [DurationType.AfterCount, 3, undefined, 'After 3 payments'],
    [DurationType.AfterCount, undefined, undefined, 'After N payments'],
    [DurationType.UntilDate, undefined, '2026-10-20', 'Until Tue 20 Oct 2026'],
    [DurationType.UntilDate, undefined, '2028-02-29', 'Until Tue 29 Feb 2028'],
    [DurationType.UntilDate, undefined, undefined, 'Until date'],
    [DurationType.UntilDate, undefined, '', 'Until date'],
  ] as const)('reads %p with count %p and date %p as %p', (type, count, date, label) => {
    expect(resolveEndsRowValue(type, count, date)).toBe(label);
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

  it.each([[parseWholeNumberInput('')], [0], [366]])(
    'rings Repeats on a Save with Every %p',
    async (every) => {
      const result = await mountFilled();
      await act(async () => result.current.every.onChange(every));

      await save(result);

      expect(addCommitmentMock).not.toHaveBeenCalled();
      expect(result.current.body.faults.recurrenceEvery).toEqual(expect.any(String));
    },
  );

  it('rings Ends on a Save with After and no count', async () => {
    const result = await mountFilled();
    await act(async () => result.current.form.setValue('durationType', DurationType.AfterCount));

    await save(result);

    expect(result.current.body.faults.endAfterCount).toBe(Strings.commitmentsErrAfterCountRequired);
  });

  it('reads an emptied Every back as empty, not as its default', async () => {
    const result = await mountFilled();
    await act(async () => result.current.every.onChange(parseWholeNumberInput('')));

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
    await act(async () => result.current.count.onChange(parseWholeNumberInput('')));

    expect(result.current.count.value).toBeNull();
  });

  it('rings Ends on a Save with After and its stored count emptied', async () => {
    const result = await mountWithStoredCount();
    await act(async () => result.current.count.onChange(parseWholeNumberInput('')));

    await save(result);

    expect(addCommitmentMock).not.toHaveBeenCalled();
    expect(result.current.body.faults.endAfterCount).toBe(Strings.commitmentsErrAfterCountRequired);
  });

  it.each([[DurationType.Forever], [DurationType.UntilDate]])(
    'saves with Ends %p after the count was emptied',
    async (type) => {
      const result = await mountWithStoredCount();
      await act(async () => {
        result.current.count.onChange(parseWholeNumberInput(''));
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

  describe('read by the pickers (MA-250)', () => {
    // A second root re-renders only through its own subscription, as the compiled body's reused picker does.
    async function mountPickers(result: Mounted) {
      const { result: pickers } = await renderHook(() => ({
        every: useRecurrenceEveryFault(result.current.form),
        ends: useDurationPickerFaults(result.current.form),
      }));
      return pickers;
    }

    it('draws the Every message on the Save that refuses an emptied Every', async () => {
      const result = await mountFilled();
      const pickers = await mountPickers(result);
      await act(async () => result.current.every.onChange(parseWholeNumberInput('')));

      await save(result);

      expect(pickers.current.every).toEqual(expect.any(String));
      expect(pickers.current.every).toBe(result.current.body.faults.recurrenceEvery);
    });

    it('draws the Every minimum on the Save that refuses a custom Every of 0', async () => {
      const result = await mountFilled();
      const pickers = await mountPickers(result);
      await act(async () => result.current.every.onChange(0));
      const period = result.current.form.getValues('recurrencePeriod');

      await save(result);

      expect(detectPreset(0, period)).toBe(RecurrencePreset.Custom);
      expect(pickers.current.every).toBe(Strings.commitmentsErrEveryMin);
    });

    it('draws the count message on the Save that refuses After with no count', async () => {
      const result = await mountFilled();
      const pickers = await mountPickers(result);
      await act(async () => result.current.form.setValue('durationType', DurationType.AfterCount));

      await save(result);

      expect(pickers.current.ends.countError).toBe(Strings.commitmentsErrAfterCountRequired);
    });

    it('draws the date message on the Save that refuses Until date with no date', async () => {
      const result = await mountFilled();
      const pickers = await mountPickers(result);
      await act(async () => result.current.form.setValue('durationType', DurationType.UntilDate));

      await save(result);

      expect(pickers.current.ends.dateError).toBe(Strings.commitmentsErrEndDateRequired);
    });

    it('drops the count message on the change that enters a count', async () => {
      const result = await mountFilled();
      const pickers = await mountPickers(result);
      await act(async () => result.current.form.setValue('durationType', DurationType.AfterCount));
      await save(result);
      expect(pickers.current.ends.countError).toBe(Strings.commitmentsErrAfterCountRequired);

      await act(async () => result.current.count.onChange(3));

      expect(pickers.current.ends.countError).toBeUndefined();
      expect(result.current.body.faults.endAfterCount).toBeUndefined();
    });

    it('drops the date message on the change that picks a date', async () => {
      const result = await mountFilled();
      const pickers = await mountPickers(result);
      await act(async () => result.current.form.setValue('durationType', DurationType.UntilDate));
      await save(result);
      expect(pickers.current.ends.dateError).toBe(Strings.commitmentsErrEndDateRequired);

      await act(async () =>
        result.current.form.setValue('endDate', '2027-01-31', { shouldValidate: true }),
      );

      expect(pickers.current.ends.dateError).toBeUndefined();
    });
  });

  it('rings Repeats and Ends on one Save with Every emptied and After with no count', async () => {
    const result = await mountFilled();
    await act(async () => {
      result.current.every.onChange(parseWholeNumberInput(''));
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
});
