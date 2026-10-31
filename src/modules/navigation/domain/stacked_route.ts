import type { Edge } from 'react-native-safe-area-context';

export const STACKED_PREFIX = '/stacked' as const;

export type StackedPrefix = '' | typeof STACKED_PREFIX;

export const TABBED_ORIGIN = 'tabbed' as const;

// The stacked twins live above `(tabs)` on the `(app)` Stack, so a jump out of one keeps the prefix.
export function stackedPrefixOf(pathname: string): StackedPrefix {
  const [, firstSegment] = pathname.split('/');
  return firstSegment === STACKED_PREFIX.slice(1) ? STACKED_PREFIX : '';
}

const TABBED_SCREEN_EDGES: Edge[] = ['top'];
const STACKED_SCREEN_EDGES: Edge[] = ['top', 'bottom'];

/** Under `(tabs)` the tab bar pays the bottom inset; a stacked twin has no tab bar, so the screen pays it. */
export function resolveDetailScreenEdges(prefix: StackedPrefix): Edge[] {
  return prefix === STACKED_PREFIX ? STACKED_SCREEN_EDGES : TABBED_SCREEN_EDGES;
}

export function commitmentDetailRoute<P extends StackedPrefix>(
  prefix: P,
  commitmentId: string,
  paymentId: string,
): `${P}/commitments/${string}?cycle=${string}` {
  return `${prefix}/commitments/${commitmentId}?cycle=${paymentId}`;
}

export function stackedTransactionDetailRoute(
  transactionId: string,
): `${typeof STACKED_PREFIX}/transactions/detail/${string}` {
  return `${STACKED_PREFIX}/transactions/detail/${transactionId}`;
}
