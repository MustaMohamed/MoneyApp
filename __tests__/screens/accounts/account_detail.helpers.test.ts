import {
  resolveViewState,
  type AccountDetailViewInput,
  type AccountDetailViewState,
} from '@/modules/accounts/screens/accounts/detail/account_detail.helpers';

describe('resolveViewState', () => {
  it.each<[string, AccountDetailViewInput, AccountDetailViewState]>([
    [
      'the active list wins over a ready slot holding the id',
      { isActive: true, isArchived: false, slotStatus: 'ready', slotHoldsId: true },
      'active',
    ],
    [
      'the active list wins over a failed slot',
      { isActive: true, isArchived: false, slotStatus: 'initialError', slotHoldsId: false },
      'active',
    ],
    [
      'a slot row for the id is the archived detail',
      { isActive: false, isArchived: true, slotStatus: 'ready', slotHoldsId: true },
      'archived',
    ],
    [
      'a ready slot for the id with no row is not found',
      { isActive: false, isArchived: false, slotStatus: 'ready', slotHoldsId: true },
      'notFound',
    ],
    [
      'a failed slot read is the load error',
      { isActive: false, isArchived: false, slotStatus: 'initialError', slotHoldsId: false },
      'loadError',
    ],
    [
      'a slot still reading is loading',
      { isActive: false, isArchived: false, slotStatus: 'initialLoading', slotHoldsId: false },
      'loading',
    ],
    [
      'a ready slot for another id is loading, not not found',
      { isActive: false, isArchived: false, slotStatus: 'ready', slotHoldsId: false },
      'loading',
    ],
    [
      'an idle slot is loading',
      { isActive: false, isArchived: false, slotStatus: 'idle', slotHoldsId: false },
      'loading',
    ],
  ])('%s', (_name, input, expected) => {
    expect(resolveViewState(input)).toBe(expected);
  });
});
