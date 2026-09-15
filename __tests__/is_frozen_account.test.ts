import { isFrozenAccount } from '@/modules/accounts/utils/is_frozen_account';
import { makeTestAccount } from '@/test_helpers/transaction';

describe('isFrozenAccount', () => {
  it('is false for an active account', () => {
    expect(isFrozenAccount(makeTestAccount({ is_archived: 0, is_deleted: 0 }))).toBe(false);
  });

  it('is true for an archived account', () => {
    expect(isFrozenAccount(makeTestAccount({ is_archived: 1, is_deleted: 0 }))).toBe(true);
  });

  it('is false for a deleted account, which is archived too', () => {
    expect(isFrozenAccount(makeTestAccount({ is_archived: 1, is_deleted: 1 }))).toBe(false);
  });
});
