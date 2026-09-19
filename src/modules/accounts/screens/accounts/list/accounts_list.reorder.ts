export type ReorderDirection = 'up' | 'down';

export const MOVE_UP_ACTION = 'moveUp';
export const MOVE_DOWN_ACTION = 'moveDown';

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
