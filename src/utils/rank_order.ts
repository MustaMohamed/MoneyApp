/** The record's keys by ascending rank, in a new array; a `satisfies Record<Enum, number>` rank makes the list exhaustive. */
export function orderByRank<K extends string>(rank: Readonly<Record<K, number>>): K[] {
  const keys: K[] = [];
  const keyByRank = new Map<number, K>();
  for (const key in rank) {
    const held = keyByRank.get(rank[key]);
    if (held !== undefined) {
      throw new Error(`orderByRank: ${held} and ${key} share rank ${rank[key]}`);
    }
    keyByRank.set(rank[key], key);
    keys.push(key);
  }
  return keys.sort((a, b) => rank[a] - rank[b]);
}
