import { Strings } from '@/constants/strings';
import {
  applyPendingOrder,
  MOVE_ACTIONS,
  MOVE_DOWN_ACTION,
  MOVE_UP_ACTION,
  resolveMoveActionDirection,
  resolveMoveTarget,
  resolveReorderedIds,
} from '@/modules/accounts/screens/accounts/list/accounts_list.reorder';

describe('resolveMoveTarget', () => {
  it('moves a middle row one place up or down', () => {
    expect(resolveMoveTarget(1, 'up', 3)).toBe(0);
    expect(resolveMoveTarget(1, 'down', 3)).toBe(2);
  });

  it('has no target above the first row or below the last', () => {
    expect(resolveMoveTarget(0, 'up', 3)).toBeUndefined();
    expect(resolveMoveTarget(2, 'down', 3)).toBeUndefined();
    expect(resolveMoveTarget(0, 'up', 1)).toBeUndefined();
    expect(resolveMoveTarget(0, 'down', 1)).toBeUndefined();
  });

  it('has no target for an index outside the list, even when the step lands inside it', () => {
    expect(resolveMoveTarget(-1, 'down', 3)).toBeUndefined();
    expect(resolveMoveTarget(3, 'up', 3)).toBeUndefined();
    expect(resolveMoveTarget(0, 'down', 0)).toBeUndefined();
  });
});

describe('resolveReorderedIds', () => {
  const ids = ['a', 'b', 'c'];

  it('swaps adjacent rows', () => {
    expect(resolveReorderedIds(ids, 0, 1)).toEqual(['b', 'a', 'c']);
    expect(resolveReorderedIds(ids, 2, 1)).toEqual(['a', 'c', 'b']);
  });

  it('moves a row to a far index and shifts the rows between', () => {
    expect(resolveReorderedIds(ids, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(resolveReorderedIds(ids, 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('returns undefined when the indices are equal', () => {
    expect(resolveReorderedIds(ids, 1, 1)).toBeUndefined();
  });

  it('returns undefined when either index is outside the list', () => {
    expect(resolveReorderedIds(ids, 3, 0)).toBeUndefined();
    expect(resolveReorderedIds(ids, 0, 3)).toBeUndefined();
    expect(resolveReorderedIds(ids, -1, 0)).toBeUndefined();
  });

  it('returns a new array and leaves the input as it was', () => {
    const input = ['a', 'b', 'c'];

    const next = resolveReorderedIds(input, 0, 2);

    expect(next).not.toBe(input);
    expect(input).toEqual(['a', 'b', 'c']);
  });
});

describe('applyPendingOrder', () => {
  const a = { id: 'a' };
  const b = { id: 'b' };
  const c = { id: 'c' };
  const items = [a, b, c];
  const idOf = (item: { id: string }) => item.id;

  it('returns the input itself when no order is pending', () => {
    expect(applyPendingOrder(items, undefined, idOf)).toBe(items);
  });

  it('returns the input itself when the pending order misses an id or adds one', () => {
    expect(applyPendingOrder(items, ['a', 'b'], idOf)).toBe(items);
    expect(applyPendingOrder(items, ['a', 'b', 'c', 'd'], idOf)).toBe(items);
    expect(applyPendingOrder(items, ['a', 'b', 'x'], idOf)).toBe(items);
    expect(applyPendingOrder(items, ['a', 'a', 'b'], idOf)).toBe(items);
  });

  it('returns the same objects in the pending order', () => {
    const ordered = applyPendingOrder(items, ['c', 'a', 'b'], idOf);

    expect(ordered).toEqual([c, a, b]);
    expect(ordered[0]).toBe(c);
    expect(ordered[1]).toBe(a);
    expect(ordered[2]).toBe(b);
  });
});

describe('resolveMoveActionDirection', () => {
  it('maps the Move up action to up', () => {
    expect(resolveMoveActionDirection(MOVE_UP_ACTION)).toBe('up');
  });

  it('maps the Move down action to down', () => {
    expect(resolveMoveActionDirection(MOVE_DOWN_ACTION)).toBe('down');
  });

  it('pairs each announced label with the action that moves that way, and carries only those two', () => {
    const nameOf = (label: string) => MOVE_ACTIONS.find((action) => action.label === label)?.name;

    expect(MOVE_ACTIONS).toHaveLength(2);
    expect(resolveMoveActionDirection(nameOf(Strings.accountsReorderMoveUp) ?? '')).toBe('up');
    expect(resolveMoveActionDirection(nameOf(Strings.accountsReorderMoveDown) ?? '')).toBe('down');
  });

  it('maps any other action name to nothing', () => {
    expect(resolveMoveActionDirection('activate')).toBeUndefined();
    expect(resolveMoveActionDirection('')).toBeUndefined();
  });
});
