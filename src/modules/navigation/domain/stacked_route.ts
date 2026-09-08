export const STACKED_PREFIX = '/stacked' as const;

export type StackedPrefix = '' | typeof STACKED_PREFIX;

// The stacked twins live above `(tabs)` on the `(app)` Stack, so a jump out of one keeps the prefix.
export function stackedPrefixOf(pathname: string): StackedPrefix {
  const [, firstSegment] = pathname.split('/');
  return firstSegment === STACKED_PREFIX.slice(1) ? STACKED_PREFIX : '';
}

export function stackedTransactionDetailRoute(
  transactionId: string,
): `${typeof STACKED_PREFIX}/transactions/detail/${string}` {
  return `${STACKED_PREFIX}/transactions/detail/${transactionId}`;
}

export function commitmentEditRoute<P extends StackedPrefix>(
  commitmentId: string,
  prefix: P,
): `${P}/commitments/${string}/edit` {
  return `${prefix}/commitments/${commitmentId}/edit`;
}

// The mirror is transaction detail → commitment payment → commitment edit, so leaving the edit pops both.
export const STACKED_EDIT_POP_COUNT = 2;
