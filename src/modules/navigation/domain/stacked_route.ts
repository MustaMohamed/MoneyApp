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
  // Required, never optional: an omitted origin is a silent wrong landing, so it must not compile.
  originTransactionId: string | undefined,
): `${P}/commitments/${string}/edit` | `${P}/commitments/${string}/edit?originTxId=${string}` {
  // Only the mirror needs the origin; the tabbed href stays byte-identical whatever the caller passes.
  if (prefix === STACKED_PREFIX && originTransactionId) {
    return `${prefix}/commitments/${commitmentId}/edit?originTxId=${originTransactionId}`;
  }
  return `${prefix}/commitments/${commitmentId}/edit`;
}
