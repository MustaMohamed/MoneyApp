import { act, renderHook } from '@testing-library/react-native';

import { AmountType, Currency, RecurrencePreset } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import { useCommitmentsScreenState } from '@/modules/commitments/screens/commitments/commitments.state';
import { useCommitmentsScreenStore } from '@/modules/commitments/screens/commitments/commitments.store';
import { useCommitmentFilterSheet } from '@/modules/commitments/screens/commitments/filter/filter.hook';
import { useCommitmentFilterState } from '@/modules/commitments/screens/commitments/filter/filter.state';
import {
  EMPTY_COMMITMENT_FILTERS,
  useCommitmentFilterStore,
} from '@/modules/commitments/screens/commitments/filter/filter.store';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { makeTestCommitment } from '@/test_helpers/commitment';
import { makeTestAccount } from '@/test_helpers/transaction';

beforeEach(() => {
  useCommitmentFilterStore.getState().resetDraft();
  useCommitmentsScreenState.getState().reset();
  useCommitmentFilterState.getState().reset();
  useAccountStore.getState().reset();
});

const INVALID_AMOUNT = 'Enter a valid amount of 0 or more';
const RANGE_INVALID = 'Minimum must be less than or equal to maximum';

describe('useCommitmentFilterSheet', () => {
  it('names a blank-named account "Unnamed account" in the draft account summary', async () => {
    useAccountStore.setState({
      accounts: [
        makeTestAccount({ id: 'a1', name: '' }),
        makeTestAccount({ id: 'a2', name: 'Wallet' }),
      ],
    });
    const { result } = await renderHook(() => useCommitmentFilterSheet());
    expect(result.current.state.accountSummary).toBe(Strings.filterSummaryAccountsEmpty);

    await act(() => result.current.toggleAccountId('a1'));
    await act(() => result.current.toggleAccountId('a2'));

    expect(result.current.state.accountSummary).toBe(`${Strings.unnamedAccount}, Wallet`);
  });

  it('disables Apply when draft and applied filters match', async () => {
    const { result } = await renderHook(() => useCommitmentFilterSheet());

    expect(result.current.state.canApply).toBe(false);
  });

  it('enables Apply when amount type or recurrence filters change', async () => {
    const { result } = await renderHook(() => useCommitmentFilterSheet());

    await act(() => result.current.toggleAmountType(AmountType.Variable));
    expect(result.current.state.draftCount).toBe(1);
    expect(result.current.state.canApply).toBe(true);

    await act(() => result.current.toggleRecurrencePreset(RecurrencePreset.Monthly));
    expect(result.current.state.draftCount).toBe(2);
  });

  it('allows Reset then Apply to clear already-applied filters', async () => {
    useCommitmentsScreenState.getState().setAppliedFilters({
      ...EMPTY_COMMITMENT_FILTERS,
      categoryIds: ['cat-rent'],
    });
    useCommitmentFilterStore.getState().setDraft({
      ...EMPTY_COMMITMENT_FILTERS,
      categoryIds: ['cat-rent'],
    });

    const { result } = await renderHook(() => useCommitmentFilterSheet());
    expect(result.current.state.canApply).toBe(false);

    await act(() => result.current.resetDraft());
    expect(result.current.state.draft).toEqual(EMPTY_COMMITMENT_FILTERS);
    expect(result.current.state.canApply).toBe(true);

    await act(() => result.current.applyDraft());
    expect(useCommitmentsScreenState.getState().appliedFilters).toEqual(EMPTY_COMMITMENT_FILTERS);
  });

  it('tracks amount currency only when amount range is active', async () => {
    const { result } = await renderHook(() => useCommitmentFilterSheet());

    await act(() => result.current.setAmountCurrency(Currency.USD));
    expect(result.current.state.canApply).toBe(false);

    await act(() => result.current.setAmountMin(100));
    expect(result.current.state.canApply).toBe(true);
  });
});

describe('useCommitmentFilterSheet takes the transactions sheet amount and reset rules (MA-212)', () => {
  it('reads every section summary as its empty copy, with Reset off, on an empty draft', async () => {
    const { result } = await renderHook(() => useCommitmentFilterSheet());

    expect(result.current.state.accountSummary).toBe('All accounts');
    expect(result.current.state.categorySummary).toBe('All categories');
    expect(result.current.state.amountSummary).toBe('Any amount');
    expect(result.current.state.amountTypeSummary).toBe('All types');
    expect(result.current.state.recurrenceSummary).toBe('All');
    expect(result.current.state.canReset).toBe(false);
  });

  it('turns Reset on for a dimension with no amount text', async () => {
    const { result } = await renderHook(() => useCommitmentFilterSheet());

    await act(() => result.current.toggleAmountType(AmountType.Variable));

    expect(result.current.state.canReset).toBe(true);
  });

  it('prints two bounds through the shared formatter, grouped, with an en dash', async () => {
    const { result } = await renderHook(() => useCommitmentFilterSheet());

    await act(() => {
      result.current.setAmountMinText('1000');
      result.current.setAmountMaxText('5000');
    });

    expect(result.current.state.amountSummary).toBe('1,000\u20135,000 EGP');
  });

  it('keeps malformed amount text, drops its bound, shows the error and blocks Apply', async () => {
    const { result } = await renderHook(() => useCommitmentFilterSheet());

    await act(() => result.current.setAmountMinText('50abc'));

    expect(result.current.state.amountMinText).toBe('50abc');
    expect(result.current.state.draft.amountMin).toBeUndefined();
    expect(result.current.state.amountMinError).toBe(INVALID_AMOUNT);
    expect(result.current.state.canApply).toBe(false);
    expect(result.current.state.canReset).toBe(true);
    expect(result.current.state.amountActive).toBe(true);
  });

  it('reads "Fix amount range" for a bound past 2 decimals', async () => {
    const { result } = await renderHook(() => useCommitmentFilterSheet());

    await act(() => result.current.setAmountMinText('1.234'));

    expect(result.current.state.amountMinError).toBe(INVALID_AMOUNT);
    expect(result.current.state.amountSummary).toBe('Fix amount range');
  });

  it('blocks a reversed range until the bounds are ordered', async () => {
    const { result } = await renderHook(() => useCommitmentFilterSheet());

    await act(() => {
      result.current.setAmountMinText('500');
      result.current.setAmountMaxText('100');
    });

    expect(result.current.state.amountRangeError).toBe(RANGE_INVALID);
    expect(result.current.state.amountSummary).toBe('Fix amount range');
    expect(result.current.state.canApply).toBe(false);

    await act(() => result.current.setAmountMaxText('600'));

    expect(result.current.state.amountRangeError).toBeUndefined();
    expect(result.current.state.canApply).toBe(true);
  });

  it('holds an invalid draft open and unpublished, then publishes it once fixed and closes', async () => {
    useCommitmentFilterState.getState().open();
    const { result } = await renderHook(() => useCommitmentFilterSheet());

    await act(() => result.current.setAmountMaxText('-1'));
    await act(() => result.current.applyDraft());

    expect(useCommitmentsScreenState.getState().appliedFilters).toEqual(EMPTY_COMMITMENT_FILTERS);
    expect(useCommitmentFilterState.getState().visible).toBe(true);

    await act(() => result.current.setAmountMaxText('5,000'));
    await act(() => result.current.applyDraft());

    expect(useCommitmentsScreenState.getState().appliedFilters).toEqual({
      ...EMPTY_COMMITMENT_FILTERS,
      amountMax: 5000,
    });
    expect(useCommitmentFilterState.getState().visible).toBe(false);
  });

  it('clears all five dimensions and both amount texts on Reset', async () => {
    const { result } = await renderHook(() => useCommitmentFilterSheet());

    await act(() => {
      result.current.toggleAccountId('a1');
      result.current.toggleCategoryId('c1');
      result.current.toggleAmountType(AmountType.Variable);
      result.current.toggleRecurrencePreset(RecurrencePreset.Monthly);
      result.current.setAmountMinText('100');
      result.current.setAmountMaxText('200');
    });
    expect(result.current.state.draftCount).toBe(5);
    expect(result.current.state.canReset).toBe(true);

    await act(() => result.current.resetDraft());

    expect(result.current.state.draft).toEqual(EMPTY_COMMITMENT_FILTERS);
    expect(result.current.state.amountMinText).toBe('');
    expect(result.current.state.amountMaxText).toBe('');
    expect(result.current.state.canReset).toBe(false);
  });
});

describe('the commitment draft (MA-213)', () => {
  function draftCommitmentId(): string | undefined {
    return useCommitmentFilterStore.getState().draft.commitmentId;
  }

  it('lights one commitment, moves the light on another and clears on the lit one', () => {
    useCommitmentFilterStore.getState().toggleCommitmentId('rent');
    expect(draftCommitmentId()).toBe('rent');

    useCommitmentFilterStore.getState().toggleCommitmentId('gym');
    expect(draftCommitmentId()).toBe('gym');

    useCommitmentFilterStore.getState().toggleCommitmentId('gym');
    expect(draftCommitmentId()).toBeUndefined();
  });

  it('turns Reset on for a lit commitment, and Reset clears it', async () => {
    const { result } = await renderHook(() => useCommitmentFilterSheet());

    await act(() => useCommitmentFilterStore.getState().toggleCommitmentId('rent'));
    expect(result.current.state.canReset).toBe(true);

    await act(() => result.current.resetDraft());

    expect(draftCommitmentId()).toBeUndefined();
    expect(result.current.state.canReset).toBe(false);
  });
});

describe('useCommitmentFilterSheet commitment section (MA-213)', () => {
  const rent = makeTestCommitment({ id: 'rent', name: 'Rent' });
  const gym = makeTestCommitment({ id: 'gym', name: 'Gym' });
  const stopped = makeTestCommitment({ id: 'old', name: 'Old gym', is_active: 0 });

  function holdRead(commitment: Commitment): void {
    useCommitmentsScreenStore.setState({
      rowsRead: { commitmentId: commitment.id, commitment, rows: [], today: '2026-10-22' },
    });
  }

  function applyCommitment(commitmentId: string): void {
    useCommitmentsScreenState
      .getState()
      .setAppliedFilters({ ...EMPTY_COMMITMENT_FILTERS, commitmentId });
    useCommitmentFilterState.getState().open();
  }

  function optionIds(state: { commitmentOptions: readonly Commitment[] }): string[] {
    return state.commitmentOptions.map((option) => option.id);
  }

  beforeEach(() => {
    useCommitmentStore.getState().reset();
    useCommitmentsScreenStore.getState().reset();
  });

  it('reads the lit option in the summary, and All commitments with none lit', async () => {
    useCommitmentStore.setState({ commitments: [rent, gym] });
    const { result } = await renderHook(() => useCommitmentFilterSheet());
    expect(result.current.state.commitmentSummary).toBe('All commitments');

    await act(() => result.current.toggleCommitmentId('rent'));
    expect(result.current.state.commitmentSummary).toBe('Rent');

    await act(() => result.current.toggleCommitmentId('gym'));
    expect(result.current.state.commitmentSummary).toBe('Gym');

    await act(() => result.current.toggleCommitmentId('gym'));
    expect(result.current.state.commitmentSummary).toBe('All commitments');
  });

  it('lists a stopped commitment the applied dimension holds, lit', async () => {
    useCommitmentStore.setState({ commitments: [rent] });
    holdRead(stopped);
    applyCommitment('old');

    const { result } = await renderHook(() => useCommitmentFilterSheet());

    expect(optionIds(result.current.state)).toEqual(['rent', 'old']);
    expect(result.current.state.draft.commitmentId).toBe('old');
    expect(result.current.state.commitmentSummary).toBe('Old gym');
  });

  it('leaves out an unlit stopped commitment with a month row', async () => {
    useCommitmentStore.setState({ commitments: [rent, stopped] });

    const { result } = await renderHook(() => useCommitmentFilterSheet());

    expect(optionIds(result.current.state)).toEqual(['rent']);
  });

  it('drops the held commitment once the applied dimension clears', async () => {
    useCommitmentStore.setState({ commitments: [rent] });
    holdRead(stopped);
    applyCommitment('old');
    const { result } = await renderHook(() => useCommitmentFilterSheet());
    expect(optionIds(result.current.state)).toEqual(['rent', 'old']);

    await act(() =>
      useCommitmentsScreenState.getState().setAppliedFilters(EMPTY_COMMITMENT_FILTERS),
    );

    expect(optionIds(result.current.state)).toEqual(['rent']);
  });

  it('keeps a lit stopped commitment listed after a tap clears it in the draft', async () => {
    useCommitmentStore.setState({ commitments: [rent, stopped] });
    holdRead(stopped);
    applyCommitment('old');
    const { result } = await renderHook(() => useCommitmentFilterSheet());

    await act(() => result.current.toggleCommitmentId('old'));

    expect(result.current.state.draft.commitmentId).toBeUndefined();
    expect(optionIds(result.current.state)).toEqual(['rent', 'old']);
    expect(result.current.state.commitmentSummary).toBe('All commitments');
  });

  it('counts the commitment on Apply and writes it to the applied filters', async () => {
    useCommitmentStore.setState({ commitments: [rent] });
    useCommitmentFilterState.getState().open();
    const { result } = await renderHook(() => useCommitmentFilterSheet());

    await act(() => result.current.toggleCommitmentId('rent'));
    expect(result.current.state.draftCount).toBe(1);
    expect(result.current.state.canApply).toBe(true);

    await act(() => result.current.applyDraft());

    expect(useCommitmentsScreenState.getState().appliedFilters).toEqual({
      ...EMPTY_COMMITMENT_FILTERS,
      commitmentId: 'rent',
    });
    expect(useCommitmentFilterState.getState().visible).toBe(false);
  });
});
