import { Strings } from '@/constants/strings';

export type ReorderDirection = 'up' | 'down';

export const MOVE_UP_ACTION = 'moveUp';
export const MOVE_DOWN_ACTION = 'moveDown';

/** The row's and the grip's accessibility actions: each label beside the name that moves that way. */
export const MOVE_ACTIONS: ReadonlyArray<{ name: string; label: string }> = [
  { name: MOVE_UP_ACTION, label: Strings.accountsReorderMoveUp },
  { name: MOVE_DOWN_ACTION, label: Strings.accountsReorderMoveDown },
];

export function resolveMoveActionDirection(actionName: string): ReorderDirection | undefined {
  if (actionName === MOVE_UP_ACTION) return 'up';
  if (actionName === MOVE_DOWN_ACTION) return 'down';
  return undefined;
}

export function resolveMoveTarget(
  index: number,
  direction: ReorderDirection,
  count: number,
): number | undefined {
  if (index < 0 || index >= count) return undefined;
  const target = direction === 'up' ? index - 1 : index + 1;
  return target < 0 || target >= count ? undefined : target;
}

/** Remove-then-insert: adjacent indices swap, a far move shifts the rows between. */
export function resolveReorderedIds(
  ids: readonly string[],
  fromIndex: number,
  toIndex: number,
): string[] | undefined {
  const inList = (i: number) => i >= 0 && i < ids.length;
  if (!inList(fromIndex) || !inList(toIndex) || fromIndex === toIndex) return undefined;
  const next = [...ids];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/** A pending order that is not a permutation of the items' ids is stale, and the items win. */
export function applyPendingOrder<T>(
  items: T[],
  pendingOrder: readonly string[] | undefined,
  idOf: (item: T) => string,
): T[] {
  if (pendingOrder === undefined || pendingOrder.length !== items.length) return items;
  const byId = new Map(items.map((item) => [idOf(item), item]));
  if (new Set(pendingOrder).size !== pendingOrder.length) return items;
  const ordered: T[] = [];
  for (const id of pendingOrder) {
    const item = byId.get(id);
    if (item === undefined) return items;
    ordered.push(item);
  }
  return ordered;
}

/** The slot's index under a drag: the nearest cell to the translation, clamped to the rows on screen. */
export function resolveDropIndex(input: {
  fromIndex: number;
  translationY: number;
  cellHeight: number;
  count: number;
}): number {
  'worklet';
  const { fromIndex, translationY, cellHeight, count } = input;
  if (count <= 0 || cellHeight <= 0) return fromIndex;
  const target = fromIndex + Math.round(translationY / cellHeight);
  return Math.min(Math.max(target, 0), count - 1);
}

/** The cells a row moves to make room for the slot: rows between the lift and its target shift one toward the lift. */
export function resolveRowShift(input: {
  index: number;
  fromIndex: number;
  toIndex: number;
}): -1 | 0 | 1 {
  'worklet';
  const { index, fromIndex, toIndex } = input;
  if (fromIndex < index && index <= toIndex) return -1;
  if (toIndex <= index && index < fromIndex) return 1;
  return 0;
}
