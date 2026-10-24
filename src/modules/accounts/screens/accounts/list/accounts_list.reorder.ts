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

/** A row's measured box in the list, from its `onLayout`. */
export interface RowBox {
  top: number;
  height: number;
}

/** `undefined` for a hole or an index past the boxes measured so far. */
function boxAt(boxes: readonly RowBox[], index: number): RowBox | undefined {
  'worklet';
  return index in boxes ? boxes[index] : undefined;
}

/** The slot's top, from the first row's top, once the row at `fromIndex` moves to `toIndex` by remove-then-insert; `0` before the boxes it reads are measured. */
export function resolveSlotOffset(input: {
  fromIndex: number;
  toIndex: number;
  boxes: readonly RowBox[];
}): number {
  'worklet';
  const { fromIndex, toIndex, boxes } = input;
  const first = boxAt(boxes, 0);
  const lifted = boxAt(boxes, fromIndex);
  const target = boxAt(boxes, toIndex);
  if (first === undefined || lifted === undefined || target === undefined) return 0;
  if (toIndex <= fromIndex) return target.top - first.top;
  return target.top + target.height - lifted.height - first.top;
}

/** The slot's index under a drag: the row whose slot sits nearest the lifted row's own slot plus the translation, a tie taking the higher index. */
export function resolveDropIndex(input: {
  fromIndex: number;
  translationY: number;
  boxes: readonly RowBox[];
  count: number;
}): number {
  'worklet';
  const { fromIndex, translationY, boxes, count } = input;
  if (count <= 0 || boxes.length < count) return fromIndex;
  for (let i = 0; i < count; i += 1) {
    const box = boxAt(boxes, i);
    if (box === undefined || box.height <= 0) return fromIndex;
  }
  const aim = resolveSlotOffset({ fromIndex, toIndex: fromIndex, boxes }) + translationY;
  let nearest = fromIndex;
  let nearestGap = Infinity;
  for (let i = 0; i < count; i += 1) {
    const gap = Math.abs(resolveSlotOffset({ fromIndex, toIndex: i, boxes }) - aim);
    if (gap <= nearestGap) {
      nearest = i;
      nearestGap = gap;
    }
  }
  return nearest;
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

/** Signed px a second under a held finger: ramps to `maxRate` at the viewport's edge, and the nearer edge wins where the zones overlap. */
export function resolveEdgeScrollRate(input: {
  fingerY: number;
  viewportHeight: number;
  zoneHeight: number;
  maxRate: number;
}): number {
  'worklet';
  const { fingerY, viewportHeight, zoneHeight, maxRate } = input;
  if (viewportHeight <= 0 || zoneHeight <= 0 || maxRate <= 0) return 0;
  const bottomZoneTop = viewportHeight - zoneHeight;
  const inTop = fingerY < zoneHeight;
  const inBottom = fingerY > bottomZoneTop;
  if (inTop && (!inBottom || fingerY < viewportHeight / 2)) {
    return -maxRate * Math.min(1, (zoneHeight - fingerY) / zoneHeight);
  }
  if (inBottom) return maxRate * Math.min(1, (fingerY - bottomZoneTop) / zoneHeight);
  return 0;
}

/** The offset after one step: up no further than the first row's top, down no further than the last row's bottom, never backwards. */
export function resolveEdgeScrollOffset(input: {
  offset: number;
  step: number;
  firstRowTop: number;
  lastRowBottom: number;
  viewportHeight: number;
}): number {
  'worklet';
  const { offset, step, firstRowTop, lastRowBottom, viewportHeight } = input;
  if (step < 0) return Math.max(offset + step, Math.min(offset, firstRowTop));
  if (step > 0) return Math.min(offset + step, Math.max(offset, lastRowBottom - viewportHeight));
  return offset;
}
