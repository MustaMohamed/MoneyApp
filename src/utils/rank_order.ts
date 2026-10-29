/** The record's keys by ascending rank, in a new array; a `satisfies Record<Enum, number>` rank makes the list exhaustive. */
export function orderByRank<K extends string>(rank: Readonly<Record<K, number>>): K[] {
  const keys: K[] = [];
  for (const key in rank) keys.push(key);
  return keys.sort((a, b) => rank[a] - rank[b]);
}
