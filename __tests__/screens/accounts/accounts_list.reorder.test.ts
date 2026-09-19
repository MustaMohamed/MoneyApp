import { Strings } from '@/constants/strings';
import {
  applyPendingOrder,
  MOVE_ACTIONS,
  MOVE_DOWN_ACTION,
  MOVE_UP_ACTION,
  resolveDropIndex,
  resolveEdgeScrollOffset,
  resolveEdgeScrollRate,
  resolveMoveActionDirection,
  resolveMoveTarget,
  resolveReorderedIds,
  resolveRowShift,
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

describe('resolveDropIndex', () => {
  const cell = { cellHeight: 64, count: 4 };

  it('stays on the lifted row with no translation', () => {
    expect(resolveDropIndex({ ...cell, fromIndex: 1, translationY: 0 })).toBe(1);
  });

  it('keeps the row in place short of half a cell', () => {
    expect(resolveDropIndex({ ...cell, fromIndex: 1, translationY: 31 })).toBe(1);
    expect(resolveDropIndex({ ...cell, fromIndex: 1, translationY: -31 })).toBe(1);
  });

  it('rounds half a cell down, or past half a cell up, to the neighbour', () => {
    expect(resolveDropIndex({ ...cell, fromIndex: 1, translationY: 32 })).toBe(2);
    expect(resolveDropIndex({ ...cell, fromIndex: 1, translationY: -40 })).toBe(0);
  });

  it('moves as many rows as the translation spans', () => {
    expect(resolveDropIndex({ fromIndex: 1, translationY: 130, cellHeight: 65, count: 4 })).toBe(3);
    expect(resolveDropIndex({ ...cell, fromIndex: 3, translationY: -128 })).toBe(1);
  });

  it('keeps the slot on the first row above the first row', () => {
    expect(resolveDropIndex({ ...cell, fromIndex: 1, translationY: -500 })).toBe(0);
    expect(resolveDropIndex({ ...cell, fromIndex: 0, translationY: -64 })).toBe(0);
  });

  it('keeps the slot on the last row below the last row', () => {
    expect(resolveDropIndex({ ...cell, fromIndex: 1, translationY: 1000 })).toBe(3);
    expect(resolveDropIndex({ ...cell, fromIndex: 3, translationY: 64 })).toBe(3);
  });

  it('returns the lifted index when the cell height is not measured yet', () => {
    expect(resolveDropIndex({ fromIndex: 2, translationY: 200, cellHeight: 0, count: 4 })).toBe(2);
    expect(resolveDropIndex({ fromIndex: 2, translationY: 200, cellHeight: -64, count: 4 })).toBe(
      2,
    );
  });

  it('returns the lifted index for an empty list', () => {
    expect(resolveDropIndex({ fromIndex: 0, translationY: 200, cellHeight: 64, count: 0 })).toBe(0);
  });
});

describe('resolveRowShift', () => {
  const shifts = (fromIndex: number, toIndex: number) =>
    [0, 1, 2, 3, 4].map((index) => resolveRowShift({ index, fromIndex, toIndex }));

  it('shifts the rows between a downward lift and its target up one cell', () => {
    expect(shifts(1, 3)).toEqual([0, 0, -1, -1, 0]);
  });

  it('shifts the rows between an upward lift and its target down one cell', () => {
    expect(shifts(3, 1)).toEqual([0, 1, 1, 0, 0]);
  });

  it('shifts only the neighbour for a one-row move', () => {
    expect(shifts(0, 1)).toEqual([0, -1, 0, 0, 0]);
    expect(shifts(4, 3)).toEqual([0, 0, 0, 1, 0]);
  });

  it('shifts nothing while the slot is on the lifted row', () => {
    expect(shifts(2, 2)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('resolveEdgeScrollRate', () => {
  const zone = { viewportHeight: 600, zoneHeight: 64, maxRate: 256 };
  const rateAt = (fingerY: number) => resolveEdgeScrollRate({ ...zone, fingerY });
  // -0 and 0 both mean no scroll, and `toBe` tells them apart.
  const expectNoScroll = (rate: number) => expect(Math.abs(rate)).toBe(0);

  it('scrolls nothing mid-viewport', () => {
    expectNoScroll(rateAt(300));
  });

  it('scrolls nothing on the inner edge of either zone', () => {
    expectNoScroll(rateAt(64));
    expectNoScroll(rateAt(536));
  });

  it('scrolls up in the top zone and down in the bottom zone', () => {
    expect(rateAt(10)).toBeLessThan(0);
    expect(rateAt(590)).toBeGreaterThan(0);
  });

  it('runs at half the rate half-way into each zone', () => {
    expect(rateAt(32)).toBe(-128);
    expect(rateAt(568)).toBe(128);
  });

  it('runs at the full rate on the viewport edge', () => {
    expect(rateAt(0)).toBe(-256);
    expect(rateAt(600)).toBe(256);
  });

  it('holds the full rate for a finger past either edge', () => {
    expect(rateAt(-20)).toBe(-256);
    expect(rateAt(620)).toBe(256);
  });

  it('scrolls nothing before the viewport is measured, or with no zone or no rate', () => {
    expectNoScroll(resolveEdgeScrollRate({ ...zone, viewportHeight: 0, fingerY: 0 }));
    expectNoScroll(resolveEdgeScrollRate({ ...zone, zoneHeight: 0, fingerY: 0 }));
    expectNoScroll(resolveEdgeScrollRate({ ...zone, maxRate: 0, fingerY: 0 }));
    expectNoScroll(resolveEdgeScrollRate({ ...zone, maxRate: -256, fingerY: 600 }));
  });

  it('takes the nearer edge when the two zones overlap', () => {
    const short = { viewportHeight: 100, zoneHeight: 64, maxRate: 256 };

    expect(resolveEdgeScrollRate({ ...short, fingerY: 40 })).toBe(-96);
    expect(resolveEdgeScrollRate({ ...short, fingerY: 60 })).toBe(96);
  });
});

describe('resolveEdgeScrollOffset', () => {
  const card = { firstRowTop: 200, lastRowBottom: 1400, viewportHeight: 600 };
  const nextOffset = (offset: number, step: number) =>
    resolveEdgeScrollOffset({ ...card, offset, step });

  it('steps up by the whole step short of the first row', () => {
    expect(nextOffset(500, -4)).toBe(496);
  });

  it('stops on the first row when the step would pass it', () => {
    expect(nextOffset(202, -4)).toBe(200);
    expect(nextOffset(200, -4)).toBe(200);
  });

  it('stays put going up once the header above the first row is on screen', () => {
    expect(nextOffset(150, -4)).toBe(150);
  });

  it('steps down by the whole step short of the last row', () => {
    expect(nextOffset(500, 4)).toBe(504);
  });

  it('stops with the last row on the viewport bottom when the step would pass it', () => {
    expect(nextOffset(798, 4)).toBe(800);
    expect(nextOffset(800, 4)).toBe(800);
  });

  it('stays put going down once the content below the last row is on screen', () => {
    expect(nextOffset(850, 4)).toBe(850);
  });

  it('returns the offset for a zero step', () => {
    expect(nextOffset(500, 0)).toBe(500);
    expect(nextOffset(150, 0)).toBe(150);
  });

  it('never scrolls down when the last row already sits inside the viewport', () => {
    expect(resolveEdgeScrollOffset({ ...card, lastRowBottom: 500, offset: 0, step: 4 })).toBe(0);
  });
});
